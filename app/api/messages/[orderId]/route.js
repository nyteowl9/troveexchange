import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function userClient(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function getAuthedUser(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return { user: null, token: null }
  const { data: { user } } = await supabaseService.auth.getUser(token)
  return { user, token }
}

// GET /api/messages/[orderId]
// Returns messages for an order. Also marks unread messages as read.
export async function GET(req, { params }) {
  const { user } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  // Verify user is a party to this order
  const { data: order } = await supabaseService
    .from('orders')
    .select('id, buyer_id, seller_id')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (user.id !== order.buyer_id && user.id !== order.seller_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch messages
  const { data: messages } = await supabaseService
    .from('messages')
    .select('id, sender_id, body, image_url, read_at, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  // Mark messages sent by the OTHER party as read
  const unreadIds = (messages || [])
    .filter(m => m.sender_id !== user.id && !m.read_at)
    .map(m => m.id)

  if (unreadIds.length > 0) {
    await supabaseService
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  // Get the other party's username for display
  const otherPartyId = user.id === order.buyer_id ? order.seller_id : order.buyer_id
  const { data: otherUser } = await supabaseService
    .from('users')
    .select('username')
    .eq('id', otherPartyId)
    .single()

  return NextResponse.json({
    messages: messages || [],
    myId: user.id,
    otherUsername: otherUser?.username || 'Unknown',
  })
}

// POST /api/messages/[orderId]
// Body: { body: string }
export async function POST(req, { params }) {
  const { user } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params
  const { body, image_url } = await req.json()

  if (!body?.trim() && !image_url) {
    return NextResponse.json({ error: 'Message or image required' }, { status: 400 })
  }
  if (body && body.trim().length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })
  }

  // Verify user is a party
  const { data: order } = await supabaseService
    .from('orders')
    .select('id, buyer_id, seller_id, status')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (user.id !== order.buyer_id && user.id !== order.seller_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: message, error } = await supabaseService
    .from('messages')
    .insert({ order_id: orderId, sender_id: user.id, body: body?.trim() || null, image_url: image_url || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message })
}
