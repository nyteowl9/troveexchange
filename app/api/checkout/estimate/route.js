import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { shippo, AUTH_CENTER_ADDRESS } from '@/lib/shippo'

/**
 * POST /api/checkout/estimate
 *
 * Pre-order shipping estimate — called on Step 2 before the order exists.
 * Returns the shipping fee the buyer will pay, plus the Label A cost that
 * will be deducted from the seller's payout (Tier 2 only).
 *
 * Body: { listing_id }
 *
 * Returns:
 *   { shipping_fee, label_a_cost, estimated_days }
 *   shipping_fee  — Label B (T2) or Label A (T1): what buyer pays
 *   label_a_cost  — Label A (T2): deducted from seller payout; 0 for T1
 */
export async function POST(request) {
  try {
    const { listing_id, auth_tier } = await request.json()
    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth — need logged-in buyer for their zip code
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch listing + seller address + buyer zip in parallel
    const [listingRes, buyerRes] = await Promise.all([
      supabase
        .from('listings')
        .select('price, auth_tier, seller:seller_id (street1, city, state, zip, country, full_name)')
        .eq('id', listing_id)
        .eq('status', 'active')
        .single(),
      supabase
        .from('users')
        .select('zip')
        .eq('id', user.id)
        .single(),
    ])

    if (listingRes.error || !listingRes.data) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const listing = listingRes.data
    const seller  = listing.seller
    const buyerZip = buyerRes.data?.zip || '90210' // fallback for estimate

    // Use buyer's auth choice — physical auth can be selected on any price point
    const isTier2 = auth_tier === 'physical'

    if (!seller?.street1 || !seller?.city || !seller?.zip) {
      // Seller address not set — return a flat estimate
      return NextResponse.json({
        shipping_fee: isTier2 ? 15 : 0,
        label_a_cost: isTier2 ? 12 : 8,
        estimated_days: 3,
        estimated: true,
      })
    }

    const sellerAddress = {
      name:    seller.full_name || 'Seller',
      street1: seller.street1,
      city:    seller.city,
      state:   seller.state,
      zip:     seller.zip,
      country: seller.country || 'US',
    }

    const parcel = {
      length: '6', width: '4', height: '1',
      distanceUnit: 'in', weight: '0.5', massUnit: 'lb',
    }

    // Fetch handling % from tier_config (default 15 if not set)
    const { data: cfg } = await supabase.from('tier_config').select('shipping_handling_pct').eq('id', 1).single()
    const handlingMult = 1 + ((cfg?.shipping_handling_pct ?? 15) / 100)

    // Only add declared-value insurance for cards >= $100 — carriers include ~$100 liability anyway
    const declaredValue = parseFloat(listing.price || 0)
    const insuranceExtra = declaredValue >= 100 ? {
      insurance: {
        amount:   declaredValue.toFixed(2),
        currency: 'USD',
        content:  'Trading Card',
      },
    } : undefined

    const cheapest = async (from, to) => {
      const shipment = await shippo.shipments.create({
        addressFrom: from,
        addressTo: to,
        parcels: [parcel],
        extra: insuranceExtra,
        async: false,
      })
      const best = shipment.rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]
      if (!best) throw new Error('No rates available')
      return { fee: parseFloat((parseFloat(best.amount) * handlingMult).toFixed(2)), days: best.estimated_days }
    }

    if (isTier2) {
      // Tier 2: Label A (seller → auth center) + Label B (auth center → buyer)
      const buyerAddr = {
        name: 'Buyer', street1: '1 Main St', city: 'Anytown',
        state: 'CA', zip: buyerZip, country: 'US',
      }
      const authAddr = {
        name: AUTH_CENTER_ADDRESS.name, street1: AUTH_CENTER_ADDRESS.street1,
        city: AUTH_CENTER_ADDRESS.city,  state: AUTH_CENTER_ADDRESS.state,
        zip:  AUTH_CENTER_ADDRESS.zip,   country: 'US',
      }

      const [labelA, labelB] = await Promise.all([
        cheapest(sellerAddress, authAddr),
        cheapest({ ...authAddr, name: AUTH_CENTER_ADDRESS.name }, buyerAddr),
      ])

      return NextResponse.json({
        shipping_fee: labelB.fee,
        label_a_cost: labelA.fee,
        estimated_days: (labelA.days || 2) + (labelB.days || 2),
      })
    } else {
      // Tier none/remote: single label seller → buyer; buyer pays $0, seller covers via payout deduction
      const buyerAddr = {
        name: 'Buyer', street1: '1 Main St', city: 'Anytown',
        state: 'CA', zip: buyerZip, country: 'US',
      }
      const label = await cheapest(sellerAddress, buyerAddr)
      return NextResponse.json({
        shipping_fee: 0,
        label_a_cost: label.fee,
        estimated_days: label.days,
      })
    }
  } catch (err) {
    console.error('[checkout/estimate]', err)
    // Return flat fallback rather than blocking checkout
    return NextResponse.json({
      shipping_fee: auth_tier === 'physical' ? 8 : 0,
      label_a_cost: 8,
      estimated_days: 3,
      estimated: true,
    })
  }
}
