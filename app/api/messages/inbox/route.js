import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/messages/inbox
// Returns all conversation threads for the authenticated user with unread counts and last message.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 1. Order threads ──────────────────────────────────────────────────────
  // Find all orders where user is buyer or seller that have at least one message
  const { data: orderIds } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, seller_id, status, listing:listing_id(card_name)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  const orderThreads = []
  if (orderIds?.length) {
    // Batch: get last message + unread count per order
    const { data: lastMessages } = await supabaseAdmin
      .from('messages')
      .select('order_id, sender_id, body, image_url, created_at, read_at')
      .in('order_id', orderIds.map(o => o.id))
      .not('order_id', 'is', null)
      .order('created_at', { ascending: false })

    // Group by order_id — first entry per order is the latest
    const seen = new Set()
    const unreadByOrder = {}
    for (const m of lastMessages || []) {
      if (!seen.has(m.order_id)) {
        seen.add(m.order_id)
      }
      if (m.sender_id !== user.id && !m.read_at) {
        unreadByOrder[m.order_id] = (unreadByOrder[m.order_id] || 0) + 1
      }
    }

    for (const order of orderIds) {
      const lastMsg = (lastMessages || []).find(m => m.order_id === order.id)
      if (!lastMsg) continue
      const otherPartyId = user.id === order.buyer_id ? order.seller_id : order.buyer_id
      const { data: otherUser } = await supabaseAdmin.from('users').select('username').eq('id', otherPartyId).single()
      orderThreads.push({
        type:          'order',
        id:            order.id,
        title:         order.listing?.card_name || 'Order',
        otherUsername: otherUser?.username || 'Unknown',
        lastMessage:   lastMsg.body || (lastMsg.image_url ? '📷 Photo' : ''),
        lastAt:        lastMsg.created_at,
        unread:        unreadByOrder[order.id] || 0,
      })
    }
  }

  // ── 2. Listing threads (pre-sale) ─────────────────────────────────────────
  const { data: listingMessages } = await supabaseAdmin
    .from('messages')
    .select('listing_id, sender_id, recipient_id, body, image_url, created_at, read_at')
    .not('listing_id', 'is', null)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const listingThreadMap = {}
  for (const m of listingMessages || []) {
    const key = m.listing_id
    if (!listingThreadMap[key]) {
      listingThreadMap[key] = { lastMsg: m, unread: 0 }
    }
    if (m.recipient_id === user.id && !m.read_at) {
      listingThreadMap[key].unread++
    }
  }

  const listingThreads = []
  for (const [listingId, { lastMsg, unread }] of Object.entries(listingThreadMap)) {
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('card_name')
      .eq('id', listingId)
      .single()
    const otherPartyId = lastMsg.sender_id === user.id ? lastMsg.recipient_id : lastMsg.sender_id
    const { data: otherUser } = otherPartyId
      ? await supabaseAdmin.from('users').select('username').eq('id', otherPartyId).single()
      : { data: null }
    listingThreads.push({
      type:          'listing',
      id:            listingId,
      title:         listing?.card_name || 'Listing',
      otherUsername: otherUser?.username || 'Unknown',
      lastMessage:   lastMsg.body || (lastMsg.image_url ? '📷 Photo' : ''),
      lastAt:        lastMsg.created_at,
      unread,
    })
  }

  // Merge + sort by most recent
  const all = [...orderThreads, ...listingThreads].sort(
    (a, b) => new Date(b.lastAt) - new Date(a.lastAt)
  )

  return NextResponse.json({ threads: all })
}
