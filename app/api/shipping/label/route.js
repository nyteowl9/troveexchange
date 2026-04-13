import { NextResponse } from 'next/server'
import { shippo, AUTH_CENTER_ADDRESS } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/shipping/label
// Body: { order_id, label: 'A' | 'B' }
// Label A: seller → buyer (Tier 1) OR seller → auth center (Tier 2)
// Label B: auth center → buyer (Tier 2 only, generated after auth passes)
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

    if (!['staff', 'owner'].includes(profile?.role)) {
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

    let addressFrom, addressTo

    if (label === 'A') {
      // Seller → buyer (Tier 1) OR seller → auth center (Tier 2)
      addressFrom = {
        name: order.seller.full_name,
        street1: order.seller.street1,
        street2: order.seller.street2 || '',
        city: order.seller.city,
        state: order.seller.state,
        zip: order.seller.zip,
        country: order.seller.country || 'US',
        email: order.seller.email,
      }
      addressTo = isTier2
        ? { ...AUTH_CENTER_ADDRESS }
        : {
            name: order.buyer.full_name,
            street1: order.buyer.street1,
            street2: order.buyer.street2 || '',
            city: order.buyer.city,
            state: order.buyer.state,
            zip: order.buyer.zip,
            country: order.buyer.country || 'US',
            email: order.buyer.email,
          }
    } else {
      // Label B: auth center → buyer (Tier 2 only)
      if (!isTier2) {
        return NextResponse.json({ error: 'Label B only applies to Tier 2 orders' }, { status: 400 })
      }
      addressFrom = { ...AUTH_CENTER_ADDRESS }
      addressTo = {
        name: order.buyer.full_name,
        street1: order.buyer.street1,
        street2: order.buyer.street2 || '',
        city: order.buyer.city,
        state: order.buyer.state,
        zip: order.buyer.zip,
        country: order.buyer.country || 'US',
        email: order.buyer.email,
      }
    }

    // Create shipment
    const shipment = await shippo.shipments.create({
      address_from: addressFrom,
      address_to: addressTo,
      parcels: [{
        length: '6',
        width: '4',
        height: '1',
        distance_unit: 'in',
        weight: '0.5',
        mass_unit: 'lb',
      }],
      extra: {
        insurance: {
          amount: order.declared_value.toString(),
          currency: 'USD',
          provider: 'SHIPPO',
          content: 'Trading card — graded/raw collectible',
        },
      },
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
      label_file_type: 'PDF',
      async: false,
    })

    if (transaction.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Label purchase failed', details: transaction.messages }, { status: 500 })
    }

    // Save label URL and tracking to order
    const updateField = label === 'A'
      ? { label_a_url: transaction.labelUrl, tracking_a: transaction.trackingNumber }
      : { label_b_url: transaction.labelUrl, tracking_b: transaction.trackingNumber }

    await supabaseAdmin
      .from('orders')
      .update({
        ...updateField,
        status: label === 'A' ? 'awaiting_shipment' : 'auth_passed',
      })
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
