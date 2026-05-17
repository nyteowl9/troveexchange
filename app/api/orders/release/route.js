import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/orders/release
// Body: { order_id, tx_hash? }
// Auth: buyer of this order only.
// Order must be in inspection_window status.
//
// The on-chain releaseEscrow() call is made client-side BEFORE this route is
// invoked — contract requires msg.sender == order.buyer, so the buyer's wallet
// signs it. This route just updates the DB record (status + tx_hash) and
// fires emails. Status guard prevents double-execution.
export async function POST(request) {
  try {
    const { order_id, tx_hash } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, buyer_id, seller_id, onchain_order_id,
        platform_fee, creator_fee, shipping_cost,
        listing:listing_id (price),
        buyer:buyer_id (email, full_name),
        seller:seller_id (email, full_name)
      `)
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'inspection_window') {
      return NextResponse.json({ error: `Order is not in inspection_window (got: ${order.status})` }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updateFields = { status: 'released', released_at: now }
    if (tx_hash) updateFields.release_tx_hash = tx_hash

    // Status guard prevents double-execution if two clicks race
    let { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update(updateFields)
      .eq('id', order_id)
      .eq('status', 'inspection_window')
      .select('id')

    // If release_tx_hash column doesn't exist yet, retry without it
    if (updateErr?.code === '42703') {
      console.warn('[orders/release] release_tx_hash column missing — applying migration 040 is required. Retrying without tx_hash.')
      delete updateFields.release_tx_hash
      ;({ data: updated, error: updateErr } = await supabaseAdmin
        .from('orders')
        .update(updateFields)
        .eq('id', order_id)
        .eq('status', 'inspection_window')
        .select('id'))
    }

    if (updateErr || !updated?.length) {
      console.error('[orders/release] DB update failed or status raced:', updateErr, 'order:', order_id)
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
    }

    // Increment seller total_sales + recalculate tier
    await supabaseAdmin.rpc('increment_total_sales_and_recalculate', { p_user_id: order.seller_id })

    // Compute the payout breakdown for the seller email (matches cron)
    const listingPrice = parseFloat(order.listing?.price || 0)
    const platformFee  = parseFloat(order.platform_fee   || 0)
    const creatorFee   = parseFloat(order.creator_fee    || 0)
    const totalFee     = platformFee + creatorFee || listingPrice * 0.035
    const shippingCost = parseFloat(order.shipping_cost  || 0)
    const sellerPayout = Math.max(0, listingPrice - totalFee - shippingCost)

    // Emails (non-blocking)
    try {
      const { emailBuyerFundsReleased, emailSellerFundsReleased, emailReviewRequest } = await import('@/lib/emails')
      if (order.buyer?.email)  await emailBuyerFundsReleased({ to: order.buyer.email, order })
      if (order.seller?.email) await emailSellerFundsReleased({
        to: order.seller.email,
        order,
        listingPrice,
        platformFee: totalFee,
        shippingCost,
        sellerPayout,
      })
      emailReviewRequest({ to: order.buyer.email,  order, role: 'buyer'  }).catch(() => {})
      emailReviewRequest({ to: order.seller.email, order, role: 'seller' }).catch(() => {})
    } catch (err) {
      console.error('[orders/release] email failed:', err)
    }

    return NextResponse.json({ ok: true, status: 'released' })
  } catch (err) {
    console.error('[orders/release]', err)
    return NextResponse.json({ error: 'Release failed' }, { status: 500 })
  }
}
