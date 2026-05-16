import { NextResponse } from 'next/server'
import { shippo, AUTH_CENTER_ADDRESS } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/shipping/seller-label-quote
// Body: { order_id }
// Returns the cheapest Shippo rate for the seller's Label A without purchasing it.
// Used to show the seller a cost preview before committing to a CH label on
// free_shipping orders where the cost is deducted from their payout.
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
        id, seller_id, auth_tier, declared_value, platform_fee, creator_fee, shipping_cost,
        listing:listing_id (price),
        seller:seller_id (full_name, street1, street2, city, state, zip, country),
        buyer:buyer_id  (full_name, street1, street2, city, state, zip, country)
      `)
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const sellerAddr = {
      name:    order.seller.full_name || 'Seller',
      street1: order.seller.street1,
      street2: order.seller.street2 || '',
      city:    order.seller.city,
      state:   order.seller.state,
      zip:     order.seller.zip,
      country: order.seller.country || 'US',
      phone:   order.seller.phone  || '2085550100',
    }

    if (!sellerAddr.street1 || !sellerAddr.city || !sellerAddr.zip) {
      return NextResponse.json({ error: 'Seller address is incomplete. Please update your profile.' }, { status: 400 })
    }

    const isTier2 = order.auth_tier === 'physical'
    const addressTo = isTier2
      ? AUTH_CENTER_ADDRESS
      : {
          name:    order.buyer.full_name || 'Buyer',
          street1: order.buyer.street1,
          street2: order.buyer.street2 || '',
          city:    order.buyer.city,
          state:   order.buyer.state,
          zip:     order.buyer.zip,
          country: order.buyer.country || 'US',
          phone:   order.buyer.phone  || '2085550100',
        }

    if (!addressTo.street1 || !addressTo.city || !addressTo.zip) {
      return NextResponse.json({ error: 'Destination address is incomplete.' }, { status: 400 })
    }

    const declaredValue = parseFloat(order.declared_value || 0)

    const shipment = await shippo.shipments.create({
      addressFrom: sellerAddr,
      addressTo,
      parcels: [{ length: '6', width: '4', height: '1', distanceUnit: 'in', weight: '0.5', massUnit: 'lb' }],
      extra: declaredValue > 0
        ? { insurance: { amount: declaredValue.toFixed(2), currency: 'USD', content: 'Trading Card' } }
        : undefined,
      async: false,
    })

    const bestRate = shipment.rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]
    if (!bestRate) return NextResponse.json({ error: 'No shipping rates available for this address.' }, { status: 400 })

    const labelCost = parseFloat(parseFloat(bestRate.amount).toFixed(2))

    // Calculate what the seller will net after this label cost
    const listingPrice  = parseFloat(order.listing?.price || 0)
    const platformFee   = parseFloat(order.platform_fee  || 0)
    const creatorFee    = parseFloat(order.creator_fee   || 0)
    const totalFees     = platformFee + creatorFee || listingPrice * 0.035
    const sellerPayout  = Math.max(0, listingPrice - totalFees - labelCost)

    return NextResponse.json({
      listing_price:  parseFloat(listingPrice.toFixed(2)),
      platform_fee:   parseFloat(totalFees.toFixed(2)),
      label_cost:     labelCost,
      seller_payout:  parseFloat(sellerPayout.toFixed(2)),
      carrier:        bestRate.provider,
      service:        bestRate.servicelevel?.name,
      estimated_days: bestRate.estimated_days,
    })

  } catch (err) {
    console.error('[seller-label-quote]', err)
    return NextResponse.json({ error: 'Failed to get rate' }, { status: 500 })
  }
}
