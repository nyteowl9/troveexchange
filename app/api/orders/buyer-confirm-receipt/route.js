import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { callMarkDelivered } from '@/lib/escrow'

// POST /api/orders/buyer-confirm-receipt
// Body: { order_id }
//
// Allows the buyer to manually confirm they received a self-shipped order.
// Applies only to self_ship / self_ship_untracked orders in in_transit status.
//
// On confirm: calls markDelivered on-chain → status → inspection_window
// Buyer can then release early or let the 72hr window auto-release.
export async function POST(request) {
  try {
    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, ship_method, buyer_id, onchain_order_id, shipped_at')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (order.status !== 'in_transit') {
      return NextResponse.json({ error: `Order is not in transit (status: ${order.status})` }, { status: 400 })
    }
    if (!['self_ship', 'self_ship_untracked'].includes(order.ship_method)) {
      return NextResponse.json({ error: 'Buyer receipt confirmation only applies to self-shipped orders' }, { status: 400 })
    }

    // Require at least 1 day since shipped_at to prevent premature confirmation
    if (order.shipped_at) {
      const shippedAt = new Date(order.shipped_at).getTime()
      const minWait = 24 * 60 * 60 * 1000
      if (Date.now() - shippedAt < minWait) {
        return NextResponse.json({ error: 'Cannot confirm receipt within 24 hours of shipment' }, { status: 400 })
      }
    }

    // Call markDelivered on-chain — advances contract from Active → Delivered
    await callMarkDelivered(order.onchain_order_id)

    const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    // Status guard prevents two concurrent confirms from both setting delivered_at
    const { data: updated } = await supabaseAdmin
      .from('orders')
      .update({
        status:          'inspection_window',
        delivered_at:    new Date().toISOString(),
        auto_release_at: autoReleaseAt,
      })
      .eq('id', order.id)
      .eq('status', 'in_transit')
      .select('id')

    if (!updated?.length) {
      return NextResponse.json({ error: 'Order status changed (already confirmed)' }, { status: 409 })
    }

    return NextResponse.json({ ok: true, auto_release_at: autoReleaseAt })
  } catch (err) {
    console.error('[buyer-confirm-receipt]', err)
    return NextResponse.json({ error: err.message || 'Failed to confirm receipt' }, { status: 500 })
  }
}
