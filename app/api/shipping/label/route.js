import { NextResponse } from 'next/server'
import { shippo, AUTH_CENTER_ADDRESS } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/shipping/label
// Body: { order_id, label: 'A' | 'B' | 'C' | 'D' }
// Label A: seller → buyer (Tier 1) OR seller → auth center (Tier 2)
// Label B: auth center → buyer (Tier 2 only, generated after auth passes)
// Label C: buyer → auth center (Tier 2 dispute return — buyer ships card back)
// Label D: auth center → seller (Tier 2 dispute return — after return verified)
export async function POST(request) {
  try {
    const { order_id, label = 'A' } = await request.json()

    const supabase = await createClient()

    // Auth check — staff/owner only
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Labels A/B: staff or owner only
    // Labels C/D: authenticator, staff, or owner (auth center generates return labels)
    const allowedRoles = ['C', 'D'].includes(label)
      ? ['authenticator', 'staff', 'owner']
      : ['staff', 'owner']
    if (!allowedRoles.includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get full order details
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        seller:seller_id (full_name, street1, street2, city, state, zip, country, email),
        buyer:buyer_id (full_name, street1, street2, city, state, zip, country, email)
      `)
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const isTier2 = order.auth_tier === 'physical'

    const buyerAddr = {
      name: order.buyer.full_name,
      street1: order.buyer.street1,
      street2: order.buyer.street2 || '',
      city: order.buyer.city,
      state: order.buyer.state,
      zip: order.buyer.zip,
      country: order.buyer.country || 'US',
      email: order.buyer.email,
    }
    const sellerAddr = {
      name: order.seller.full_name,
      street1: order.seller.street1,
      street2: order.seller.street2 || '',
      city: order.seller.city,
      state: order.seller.state,
      zip: order.seller.zip,
      country: order.seller.country || 'US',
      email: order.seller.email,
    }

    let addressFrom, addressTo

    if (label === 'A') {
      // Seller → buyer (Tier 1) OR seller → auth center (Tier 2)
      addressFrom = sellerAddr
      addressTo = isTier2 ? { ...AUTH_CENTER_ADDRESS } : buyerAddr

    } else if (label === 'B') {
      // Auth center → buyer (Tier 2 only, after auth passes)
      if (!isTier2) {
        return NextResponse.json({ error: 'Label B only applies to Tier 2 orders' }, { status: 400 })
      }
      addressFrom = { ...AUTH_CENTER_ADDRESS }
      addressTo = buyerAddr

    } else if (label === 'C') {
      // Dispute return label — buyer ships card back
      // Tier 1 (remote auth, <$300): buyer → seller directly
      // Tier 2 (physical auth, $301+): buyer → auth center (verify before returning to seller)
      //   Tier 2 MUST NOT route to seller — prevents "return a rock" fraud at auth center
      if (order.status !== 'awaiting_return') {
        return NextResponse.json({ error: 'Order must be in awaiting_return status' }, { status: 400 })
      }
      addressFrom = buyerAddr
      addressTo = isTier2 ? { ...AUTH_CENTER_ADDRESS } : sellerAddr

    } else if (label === 'D') {
      // Auth center → seller (Tier 2 only — after Chase Hollow verifies returned card)
      // Tier 1 returns go buyer → seller directly (Label C), no Label D step.
      if (!isTier2) {
        return NextResponse.json({ error: 'Label D only applies to Tier 2 (physical auth) orders' }, { status: 400 })
      }
      if (order.status !== 'return_received') {
        return NextResponse.json({ error: 'Order must be in return_received status' }, { status: 400 })
      }
      addressFrom = { ...AUTH_CENTER_ADDRESS }
      addressTo = sellerAddr

    } else {
      return NextResponse.json({ error: 'Invalid label type. Must be A, B, C, or D' }, { status: 400 })
    }

    // Create shipment
    const shipment = await shippo.shipments.create({
      addressFrom,
      addressTo,
      parcels: [{
        length: '6',
        width: '4',
        height: '1',
        distanceUnit: 'in',
        weight: '0.5',
        massUnit: 'lb',
      }],
      async: false,
    })

    // Pick cheapest rate across all carriers
    const bestRate = shipment.rates.sort((a, b) =>
      parseFloat(a.amount) - parseFloat(b.amount)
    )[0]

    if (!bestRate) {
      return NextResponse.json({ error: 'No shipping rates available' }, { status: 400 })
    }

    // Purchase label
    const transaction = await shippo.transactions.create({
      rate: bestRate.objectId,
      labelFileType: 'PDF',
      async: false,
    })

    if (transaction.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Label purchase failed', details: transaction.messages }, { status: 500 })
    }

    // Save label URL + tracking; advance order status
    const labelFieldMap = {
      A: { label_a_url: transaction.labelUrl, tracking_a: transaction.trackingNumber, status: 'awaiting_shipment' },
      B: { label_b_url: transaction.labelUrl, tracking_b: transaction.trackingNumber, status: 'auth_passed' },
      C: { label_c_url: transaction.labelUrl, tracking_c: transaction.trackingNumber },   // status already awaiting_return
      D: { label_d_url: transaction.labelUrl, tracking_d: transaction.trackingNumber, status: 'return_verified' },
    }

    await supabaseAdmin
      .from('orders')
      .update(labelFieldMap[label])
      .eq('id', order_id)

    return NextResponse.json({
      label_url: transaction.labelUrl,
      tracking_number: transaction.trackingNumber,
      carrier: 'FedEx',
      service: bestRate.servicelevel?.name,
    })

  } catch (err) {
    console.error('[shipping/label]', err)
    return NextResponse.json({ error: 'Label generation failed' }, { status: 500 })
  }
}
