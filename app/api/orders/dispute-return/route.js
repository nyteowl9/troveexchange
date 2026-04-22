import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/orders/dispute-return
// Body: { order_id, notes, evidence: string[] }
// Auth: seller of the order only.
// Called when seller claims the returned card is wrong (Tier 1 return review window).
// Attaches seller's photos/notes to the dispute, sets order → return_disputed_seller.
// Staff reviews evidence in /dispute-resolution and owner makes final call.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { order_id, notes, evidence = [] } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })
    if (!notes?.trim()) return NextResponse.json({ error: 'notes required — describe what was received' }, { status: 400 })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, auth_tier, buyer_id, seller_id')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden — seller only' }, { status: 403 })
    if (order.status !== 'return_received_seller') {
      return NextResponse.json({ error: `Order must be in return_received_seller status (got: ${order.status})` }, { status: 400 })
    }

    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('id, outcome')
      .eq('order_id', order_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!dispute) return NextResponse.json({ error: 'No dispute found for this order' }, { status: 404 })
    if (dispute.outcome && dispute.outcome !== 'pending') {
      return NextResponse.json({ error: 'Dispute already resolved' }, { status: 409 })
    }

    // Attach seller's return dispute evidence to the dispute record
    await supabaseAdmin.from('disputes').update({
      seller_return_notes:    notes.trim(),
      seller_return_evidence: evidence,
    }).eq('id', dispute.id)

    // Order enters staff review queue
    await supabaseAdmin.from('orders').update({ status: 'return_disputed_seller' }).eq('id', order_id)

    // Notify buyer
    try {
      const { emailBuyerReturnDisputedBySeller } = await import('@/lib/emails')
      const { data: buyer } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.buyer_id).single()
      if (buyer?.email) await emailBuyerReturnDisputedBySeller({ to: buyer.email, order: { ...order, id: order_id } })
    } catch (err) {
      console.error('[orders/dispute-return] email failed:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[orders/dispute-return]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
