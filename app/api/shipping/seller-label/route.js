import { NextResponse } from 'next/server'
import { shippo } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/shipping/seller-label
// Allows a seller to generate (or retrieve) Label A for their own order.
// If label_a_url already exists, returns it immediately.
// If not, generates via Shippo, saves, and returns.
export async function POST(request) {
  try {
    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch order — only the seller of this order may call this
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        listing:listing_id (free_shipping),
        seller:seller_id (full_name, street1, street2, city, state, zip, country, email, phone),
        buyer:buyer_id  (full_name, street1, street2, city, state, zip, country, email, phone)
      `)
      .eq('id', order_id)
      .single()

    if (orderErr) {
      console.error('[seller-label] order query error:', orderErr, 'order_id:', order_id)
      return NextResponse.json({ error: 'Order lookup failed', _debug: orderErr.message }, { status: 500 })
    }
    if (!order) {
      console.error('[seller-label] order not found:', order_id)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'awaiting_shipment') {
      return NextResponse.json({ error: 'Order is not awaiting shipment' }, { status: 400 })
    }

    // Return existing label if already generated
    if (order.label_a_url) {
      return NextResponse.json({ label_url: order.label_a_url, tracking_number: order.tracking_a })
    }

    const isTier2 = order.auth_tier === 'physical'

    const sellerAddr = {
      name:    order.seller.full_name || 'Seller',
      street1: order.seller.street1,
      street2: order.seller.street2 || '',
      city:    order.seller.city,
      state:   order.seller.state,
      zip:     order.seller.zip,
      country: order.seller.country || 'US',
      email:   order.seller.email,
      phone:   order.seller.phone  || '2085550100',
    }

    let addressTo
    if (isTier2) {
      // Tier 2: seller → Chase Hollow auth center
      const { AUTH_CENTER_ADDRESS } = await import('@/lib/shippo')
      addressTo = { ...AUTH_CENTER_ADDRESS }
    } else {
      // Tier 1: seller → buyer directly
      addressTo = {
        name:    order.buyer.full_name || 'Buyer',
        street1: order.buyer.street1,
        street2: order.buyer.street2 || '',
        city:    order.buyer.city,
        state:   order.buyer.state,
        zip:     order.buyer.zip,
        country: order.buyer.country || 'US',
        email:   order.buyer.email,
        phone:   order.buyer.phone  || '2085550100',
      }
    }

    // Validate addresses
    if (!sellerAddr.street1 || !sellerAddr.city || !sellerAddr.zip) {
      return NextResponse.json({ error: 'Seller address is incomplete. Please update your profile.' }, { status: 400 })
    }
    if (!addressTo.street1 || !addressTo.city || !addressTo.zip) {
      return NextResponse.json({ error: 'Destination address is incomplete.' }, { status: 400 })
    }

    // Declared value = listing/sale price — used for carrier insurance.
    const declaredValue = parseFloat(order.declared_value || 0)

    // Create shipment
    const shipment = await shippo.shipments.create({
      addressFrom: sellerAddr,
      addressTo,
      parcels: [{
        length: '6', width: '4', height: '1',
        distanceUnit: 'in',
        weight: '0.5', massUnit: 'lb',
      }],
      extra: declaredValue > 0 ? {
        insurance: {
          amount:   declaredValue.toFixed(2),
          currency: 'USD',
          content:  'Trading Card',
        },
      } : undefined,
      async: false,
    })

    const bestRate = shipment.rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]
    if (!bestRate) return NextResponse.json({ error: 'No shipping rates available' }, { status: 400 })

    const transaction = await shippo.transactions.create({
      rate: bestRate.objectId,
      labelFileType: 'PDF',
      async: false,
    })

    if (transaction.status !== 'SUCCESS') {
      const msgs = (transaction.messages || []).map(m => m.text || m.message || JSON.stringify(m)).join(' | ')
      console.error('[seller-label] transaction failed:', transaction.status, transaction.messages)
      return NextResponse.json({ error: `Label purchase failed: ${msgs || transaction.status}` }, { status: 500 })
    }

    const labelCost = parseFloat(parseFloat(bestRate.amount).toFixed(2))

    // Save label URL + tracking to order.
    // For free_shipping orders the buyer paid $0 shipping but the seller chose a CH label —
    // record the actual label cost in shipping_cost for DB accounting and email breakdown.
    const dbUpdate = {
      label_a_url: transaction.labelUrl,
      tracking_a:  transaction.trackingNumber,
    }
    if (order.listing?.free_shipping) {
      dbUpdate.shipping_cost = labelCost
    }

    await supabaseAdmin
      .from('orders')
      .update(dbUpdate)
      .eq('id', order_id)

    return NextResponse.json({
      label_url:       transaction.labelUrl,
      tracking_number: transaction.trackingNumber,
    })

  } catch (err) {
    console.error('[seller-label]', err)
    return NextResponse.json({ error: 'Label generation failed' }, { status: 500 })
  }
}
