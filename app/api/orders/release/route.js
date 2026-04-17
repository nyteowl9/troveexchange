import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/orders/release
// Body: { order_id }
// Auth: buyer of this order only
// Order must be in inspection_window status.
// Updates status → released, fires emails, increments seller sales.
// Phase 3: will also call on-chain releaseEscrow().
export async function POST(request) {
  try {
    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, buyer_id, seller_id,
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

    // Phase 3: call on-chain releaseEscrow() here before updating DB
    // await releaseEscrow(order.onchain_order_id, order.seller.wallet_address, settlementAmount)

    await supabaseAdmin
      .from('orders')
      .update({ status: 'released', released_at: now })
      .eq('id', order_id)

    // Increment seller total_sales + recalculate tier
    await supabaseAdmin.rpc('increment_total_sales_and_recalculate', { p_user_id: order.seller_id })

    // Emails (non-blocking)
    try {
      const { emailBuyerFundsReleased, emailSellerFundsReleased, emailReviewRequest } = await import('@/lib/emails')
      if (order.buyer?.email)  await emailBuyerFundsReleased({ to: order.buyer.email, order })
      if (order.seller?.email) await emailSellerFundsReleased({ to: order.seller.email, order })
      emailReviewRequest({ to: order.buyer.email,  order, role: 'buyer'  }).catch(() => {})
      emailReviewRequest({ to: order.seller.email, order, role: 'seller' }).catch(() => {})
    } catch (err) {
      console.error('[orders/release] email failed:', err)
    }

    return NextResponse.json({ ok: true, status: 'released' })
  } catch (err) {
    console.error('[orders/release]', err)
    return NextResponse.json({ error: err.message || 'Release failed' }, { status: 500 })
  }
}
