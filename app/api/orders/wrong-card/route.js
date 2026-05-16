import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/orders/wrong-card
// Body: { order_id, notes }
// Auth: authenticator | staff | owner
// Called when auth center receives a return but it's the wrong card.
// Sets wrong_card_flag, resets return_deadline_at +5 days, status → wrong_card_received.
// Buyer must ship the correct card within the new deadline or dispute reverses to seller.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (!['authenticator', 'staff', 'owner'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { order_id, notes } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, buyer_id, seller_id')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status !== 'return_received') {
      return NextResponse.json({ error: `Order must be in return_received status (got: ${order.status})` }, { status: 400 })
    }

    const newDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('orders').update({
      status:               'wrong_card_received',
      wrong_card_flag:      true,
      wrong_card_at:        new Date().toISOString(),
      wrong_card_notes:     notes || '',
      return_deadline_at:   newDeadline,
      return_warning_2_sent: false,
      return_warning_4_sent: false,
    }).eq('id', order_id)

    // Notify buyer and seller
    try {
      const { emailBuyerWrongCardReceived, emailSellerWrongCardReceived } = await import('@/lib/emails')
      const { data: buyer }  = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.buyer_id).single()
      const { data: seller } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.seller_id).single()
      if (buyer?.email)  await emailBuyerWrongCardReceived({ to: buyer.email,  order: { ...order, id: order_id }, notes: notes || '' })
      if (seller?.email) await emailSellerWrongCardReceived({ to: seller.email, order: { ...order, id: order_id } })
    } catch (err) {
      console.error('[orders/wrong-card] email failed:', err)
    }

    return NextResponse.json({ ok: true, new_deadline: newDeadline })
  } catch (err) {
    console.error('[orders/wrong-card]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
