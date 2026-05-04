import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Pre-sale listing-based messaging.
// Thread = all messages where listing_id = X and both participants match.
// Participants: the requester and the listing's seller_id.

async function resolveThread(listingId, userId) {
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, card_name, seller:seller_id(username)')
    .eq('id', listingId)
    .single()
  if (!listing) return { error: 'Listing not found' }

  const isSeller = userId === listing.seller_id
  const otherPartyId = isSeller ? null : listing.seller_id
  return { listing, isSeller, otherPartyId }
}

// GET /api/messages/listing/[listingId]
// Returns all messages in this pre-sale thread for the authenticated user.
export async function GET(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId } = await params
  const { data: listing, error: listingErr } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, card_name, seller:seller_id(username)')
    .eq('id', listingId)
    .single()
  if (listingErr || !listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const isSeller = user.id === listing.seller_id

  // Thread = messages for this listing where user is sender or recipient
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, recipient_id, body, image_url, read_at, created_at')
    .eq('listing_id', listingId)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: true })

  // Mark unread (messages where I'm the recipient)
  const unreadIds = (messages || [])
    .filter(m => m.recipient_id === user.id && !m.read_at)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await supabaseAdmin.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
  }

  // Resolve other party
  const otherPartyId = isSeller
    ? messages?.find(m => m.sender_id !== user.id)?.sender_id || null
    : listing.seller_id

  const otherUser = otherPartyId
    ? (await supabaseAdmin.from('users').select('username').eq('id', otherPartyId).single()).data
    : null

  return NextResponse.json({
    messages: messages || [],
    myId: user.id,
    otherUsername: otherUser?.username || 'Unknown',
    listingTitle: listing.card_name,
    sellerId: listing.seller_id,
  })
}

// POST /api/messages/listing/[listingId]
// Body: { body?, image_url?, recipient_id? }
// recipient_id only needed when the SELLER initiates (replies) — inferred from thread otherwise.
export async function POST(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId } = await params
  const { body, image_url, recipient_id: providedRecipient } = await req.json()

  if (!body?.trim() && !image_url) {
    return NextResponse.json({ error: 'Message or image required' }, { status: 400 })
  }
  if (body && body.trim().length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', listingId)
    .single()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // Sellers can reply to an existing thread (recipient is the buyer who messaged them).
  // Buyers message the seller directly.
  const isSeller = user.id === listing.seller_id
  let recipientId

  if (isSeller) {
    // Seller replying — recipient must be provided or inferred from existing thread
    if (providedRecipient) {
      recipientId = providedRecipient
    } else {
      const { data: existing } = await supabaseAdmin
        .from('messages')
        .select('sender_id, recipient_id')
        .eq('listing_id', listingId)
        .neq('sender_id', user.id)
        .limit(1)
        .single()
      recipientId = existing?.sender_id || existing?.recipient_id
    }
    if (!recipientId) return NextResponse.json({ error: 'Cannot determine recipient' }, { status: 400 })
  } else {
    // Buyer messaging seller
    recipientId = listing.seller_id
    // Can't message yourself
    if (user.id === listing.seller_id) {
      return NextResponse.json({ error: 'Cannot message your own listing' }, { status: 400 })
    }
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      listing_id:   listingId,
      sender_id:    user.id,
      recipient_id: recipientId,
      body:         body?.trim() || null,
      image_url:    image_url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message })
}
