import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { emailSellerSaleShipNow, emailBuyerPurchaseConfirmed } from '@/lib/emails'

// POST /api/listings/mark-sold
// Called by checkout after fundOrder succeeds. Uses service role to bypass RLS
// since the buyer doesn't own the listing.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { listing_id, order_id } = await request.json()
    if (!listing_id || !order_id) return NextResponse.json({ error: 'Missing listing_id or order_id' }, { status: 400 })

    // Verify the order belongs to this buyer
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        id, escrow_amount, auth_tier, ship_deadline,
        platform_fee, creator_fee, shipping_cost,
        listings ( card_name, price, free_shipping ),
        buyer:buyer_id ( email, full_name ),
        seller:seller_id ( email, full_name, wallet_address )
      `)
      .eq('id', order_id)
      .eq('buyer_id', user.id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Mark listing sold
    await supabaseAdmin
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing_id)

    // Compute seller payout for sale email.
    //   sellerPayout = listingPrice − platformFee − creatorFee − shippingCost
    // shipping_cost is 0 for non-free-shipping (buyer paid). For free_shipping
    // with CH label, shipping_cost is set when label is generated — at
    // mark-sold time it's still 0, so the payout shown is the maximum (no
    // label cost deducted yet). The seller sees the exact CH-label deduction
    // in the payout-breakdown modal before they choose CH label.
    const listingPrice = parseFloat(order.listings?.price || 0)
    const platformFee  = parseFloat(order.platform_fee   || 0) || listingPrice * 0.03
    const creatorFee   = parseFloat(order.creator_fee    || 0) || listingPrice * 0.005
    const shippingCost = parseFloat(order.shipping_cost  || 0)
    const sellerPayout = Math.max(0, listingPrice - platformFee - creatorFee - shippingCost)

    const emailOrder = {
      id: order.id,
      card_name: order.listings?.card_name || 'Card',
      escrow_amount: order.escrow_amount,
      auth_tier: order.auth_tier,
      ship_deadline: order.ship_deadline,
      seller_payout: sellerPayout,
    }

    // Fire emails — non-blocking, never fail the request
    try {
      if (order.seller?.email) {
        await emailSellerSaleShipNow({ to: order.seller.email, order: emailOrder })
      }
    } catch (err) {
      console.error('[mark-sold] seller email failed:', err.message)
    }

    try {
      if (order.buyer?.email) {
        await emailBuyerPurchaseConfirmed({ to: order.buyer.email, order: emailOrder })
      }
    } catch (err) {
      console.error('[mark-sold] buyer email failed:', err.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[listings/mark-sold]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
