import { NextResponse } from 'next/server'
import { shippo, AUTH_CENTER_ADDRESS } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'

// POST /api/shipping/rates
// Body: { order_id, buyer_zip }
// Returns: { rate, rate_with_handling, service, estimated_days }
//
// Auth required — caller must be the buyer or seller of the order.
// Otherwise an unauthenticated caller could spam Shippo (paid API).
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { order_id, buyer_zip } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    // Get order + seller address
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        seller:seller_id (street1, street2, city, state, zip, country, full_name),
        listing:listing_id (price, auth_tier)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Caller must be a party to this order
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const seller = order.seller
    if (!seller?.street1 || !seller?.city || !seller?.zip) {
      return NextResponse.json({ error: 'Seller address incomplete' }, { status: 400 })
    }

    const isTier2 = order.auth_tier === 'physical'

    // Tier 1: seller → buyer
    // Tier 2: seller → auth center (Label A)
    const toAddress = isTier2
      ? AUTH_CENTER_ADDRESS
      : { zip: buyer_zip, country: 'US' }

    const shipment = await shippo.shipments.create({
      address_from: {
        name: seller.full_name,
        street1: seller.street1,
        street2: seller.street2 || '',
        city: seller.city,
        state: seller.state,
        zip: seller.zip,
        country: seller.country || 'US',
      },
      address_to: {
        name: isTier2 ? AUTH_CENTER_ADDRESS.name : 'Buyer',
        street1: isTier2 ? AUTH_CENTER_ADDRESS.street1 : '1 Main St',
        city: isTier2 ? AUTH_CENTER_ADDRESS.city : 'Unknown',
        state: isTier2 ? AUTH_CENTER_ADDRESS.state : 'CA',
        zip: toAddress.zip,
        country: 'US',
      },
      parcels: [{
        length: '6',
        width: '4',
        height: '1',
        distance_unit: 'in',
        weight: '0.5',
        mass_unit: 'lb',
      }],
      async: false,
    })

    // Find cheapest rate across all carriers
    const bestRate = shipment.rates.sort((a, b) =>
      parseFloat(a.amount) - parseFloat(b.amount)
    )[0]

    if (!bestRate) {
      return NextResponse.json({ error: 'No shipping rates available' }, { status: 400 })
    }

    const baseRate = parseFloat(bestRate.amount)
    const rateWithHandling = parseFloat((baseRate * 1.15).toFixed(2))

    return NextResponse.json({
      rate: baseRate,
      rate_with_handling: rateWithHandling,
      service: bestRate.servicelevel?.name,
      estimated_days: bestRate.estimated_days,
      rate_object_id: bestRate.objectId,
    })

  } catch (err) {
    console.error('[shipping/rates]', err)
    return NextResponse.json({ error: 'Failed to get rates' }, { status: 500 })
  }
}
