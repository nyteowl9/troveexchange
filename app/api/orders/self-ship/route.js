import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/orders/self-ship
// Body: { order_id, carrier, tracking_number? }
// Marks an eligible awaiting_shipment order as self-shipped.
// Sets auto_release_at based on tier_config.self_ship_release_days.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { order_id, carrier, tracking_number } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    // Load order with listing price and buyer contact
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, seller_id, listing_id, ship_method,
        listing:listing_id (price, card_name),
        buyer:buyer_id (email, full_name)
      `)
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'awaiting_shipment') {
      return NextResponse.json({ error: `Order is not awaiting shipment (status: ${order.status})` }, { status: 400 })
    }

    // Load threshold from tier_config
    const { data: config } = await supabaseAdmin
      .from('tier_config')
      .select('self_ship_max_value, self_ship_release_days')
      .eq('id', 1)
      .single()

    const maxValue    = parseFloat(config?.self_ship_max_value ?? 100)
    const releaseDays = parseInt(config?.self_ship_release_days ?? 14)
    const listingPrice = parseFloat(order.listing?.price ?? 0)

    if (listingPrice > maxValue) {
      return NextResponse.json(
        { error: `Self-ship is only available for orders up to $${maxValue.toFixed(2)}` },
        { status: 400 }
      )
    }

    const tracking = tracking_number?.trim() || null
    const shipMethod = tracking ? 'self_ship' : 'self_ship_untracked'
    const now = new Date()
    const autoReleaseAt = new Date(now.getTime() + releaseDays * 24 * 60 * 60 * 1000).toISOString()

    const updates = {
      status:           'in_transit',
      ship_method:      shipMethod,
      shipped_at:       now.toISOString(),
      auto_release_at:  autoReleaseAt,
    }
    if (tracking) updates.tracking_a = tracking
    if (carrier)  updates.self_ship_carrier = carrier.trim()

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', order_id)

    if (updateError) throw updateError

    // Notify buyer (non-blocking) — augment order with tracking/carrier we just saved
    try {
      const { emailBuyerSellerShipped } = await import('@/lib/emails')
      if (order.buyer?.email) {
        await emailBuyerSellerShipped({
          to: order.buyer.email,
          order: { ...order, tracking_a: tracking || null, self_ship_carrier: carrier?.trim() || null },
        })
      }
    } catch (err) {
      console.error('[self-ship] email failed:', err)
    }

    return NextResponse.json({ ok: true, ship_method: shipMethod, auto_release_at: autoReleaseAt })
  } catch (err) {
    console.error('[self-ship]', err)
    return NextResponse.json({ error: err.message || 'Failed to mark as self-shipped' }, { status: 500 })
  }
}
