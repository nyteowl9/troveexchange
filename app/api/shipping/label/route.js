import { NextResponse } from 'next/server'
import { shippo, AUTH_CENTER_ADDRESS } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ethers } from 'ethers'

// POST /api/shipping/label
// Body: { order_id, label: 'A' | 'B' | 'C' | 'D' }
// Label A: seller → buyer (Tier 1) OR seller → auth center (Tier 2)
// Label B: auth center → buyer (Tier 2 only, generated after auth passes)
// Label C: buyer → auth center (Tier 2 dispute return — buyer ships card back)
// Label D: auth center → seller (Tier 2 dispute return — after return verified)
export async function POST(request) {
  try {
    const { order_id, label = 'A', outcome } = await request.json()

    const supabase = await createClient()

    // Auth check — staff/owner only
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Labels A: staff or owner only (seller-side label)
    // Labels B/C/D: authenticator, staff, or owner (auth center operations)
    const allowedRoles = label === 'A'
      ? ['staff', 'owner']
      : ['authenticator', 'staff', 'owner']
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
      phone: order.buyer.phone  || '2085550100',
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
      phone: order.seller.phone  || '2085550100',
    }

    // Validate address completeness before calling Shippo
    const missingBuyer = ['street1', 'city', 'state', 'zip'].filter(f => !order.buyer?.[f])
    const missingSeller = ['street1', 'city', 'state', 'zip'].filter(f => !order.seller?.[f])
    if (label === 'A' && missingSeller.length) {
      return NextResponse.json({ error: `Seller address incomplete — missing: ${missingSeller.join(', ')}` }, { status: 400 })
    }
    if (label === 'B' && missingBuyer.length) {
      return NextResponse.json({ error: `Buyer address incomplete — missing: ${missingBuyer.join(', ')}` }, { status: 400 })
    }
    if (label === 'A' && !isTier2 && missingBuyer.length) {
      return NextResponse.json({ error: `Buyer address incomplete — missing: ${missingBuyer.join(', ')}` }, { status: 400 })
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
      // Auth center → seller (dispute valid, buyer_wins) OR auth center → buyer (dispute invalid, seller_wins)
      // Tier 1 returns go buyer → seller directly (Label C), no Label D step.
      if (!isTier2) {
        return NextResponse.json({ error: 'Label D only applies to Tier 2 (physical auth) orders' }, { status: 400 })
      }
      if (order.status !== 'return_received') {
        return NextResponse.json({ error: 'Order must be in return_received status' }, { status: 400 })
      }
      if (!['buyer_wins', 'seller_wins'].includes(outcome)) {
        return NextResponse.json({ error: 'outcome required for Label D: buyer_wins or seller_wins' }, { status: 400 })
      }
      addressFrom = { ...AUTH_CENTER_ADDRESS }
      // buyer_wins (dispute valid): card → seller, on-chain deferred to delivery
      // seller_wins (dispute invalid): card → buyer (return it), on-chain fires immediately
      addressTo = outcome === 'seller_wins' ? buyerAddr : sellerAddr

    } else {
      return NextResponse.json({ error: 'Invalid label type. Must be A, B, C, or D' }, { status: 400 })
    }

    // Declared value = listing/sale price — used for carrier insurance on every label.
    const declaredValue = parseFloat(order.declared_value || 0)

    // Create shipment — validate:false bypasses USPS CASS address disambiguation,
    // which rejects valid addresses it can't uniquely resolve (e.g. "multiple found").
    // Carriers accept the address as-is on label purchase.
    const shipment = await shippo.shipments.create({
      addressFrom: { ...addressFrom, validate: false },
      addressTo:   { ...addressTo,   validate: false },
      parcels: [{
        length: '6',
        width: '4',
        height: '1',
        distanceUnit: 'in',
        weight: '0.5',
        massUnit: 'lb',
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

    // Pick cheapest rate across all carriers
    const bestRate = shipment.rates.sort((a, b) =>
      parseFloat(a.amount) - parseFloat(b.amount)
    )[0]

    if (!bestRate) {
      return NextResponse.json({ error: 'No shipping rates available for this shipment. Check that both addresses are complete.' }, { status: 400 })
    }

    // Purchase label
    const transaction = await shippo.transactions.create({
      rate: bestRate.objectId,
      labelFileType: 'PDF',
      async: false,
    })

    if (transaction.status !== 'SUCCESS') {
      const msgs = transaction.messages || []
      const detail = msgs.map(m => m.text || m.message || JSON.stringify(m)).join('; ') || 'Unknown Shippo error'
      console.error('[shipping/label] Shippo transaction error:', msgs)
      // Detect address ambiguity and surface which party needs to fix their address
      const isAddrError = detail.toLowerCase().includes('address') || detail.toLowerCase().includes('recipient') || detail.toLowerCase().includes('multiple')
      const addrHint = isAddrError
        ? ` — Ask the ${label === 'A' ? 'seller' : 'buyer'} to update their address with a more specific street (add unit/apt number, or include directional like N/S/E/W).`
        : ''
      return NextResponse.json({ error: `Label purchase failed: ${detail}${addrHint}` }, { status: 500 })
    }

    // Label D — two paths depending on auth center's determination:
    //
    // buyer_wins (dispute valid — card doesn't match listing):
    //   Card → seller. On-chain resolveDispute(true) deferred to Label D delivery via webhook.
    //   Seller receives card first, then buyer gets refunded.
    //
    // seller_wins (dispute invalid — card matches listing, buyer was wrong):
    //   Card → buyer (returned to them). On-chain resolveDispute(false) fires immediately.
    //   Seller gets paid now. No review window needed.
    if (label === 'D') {
      const { data: dispute } = await supabaseAdmin
        .from('disputes')
        .select('id, outcome')
        .eq('order_id', order_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (outcome === 'seller_wins') {
        // Dispute invalid — fire on-chain immediately, release escrow to seller
        await supabaseAdmin.from('orders').update({
          label_d_url: transaction.labelUrl,
          tracking_d:  transaction.trackingNumber,
          status:      'released',
        }).eq('id', order_id)

        let txHash = null
        if (order.onchain_order_id) {
          try {
            const rpc         = process.env.ALCHEMY_RPC_URL
            const escrowAddr  = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
            const resolverKey = process.env.DISPUTE_RESOLVER_PRIVATE_KEY
            if (rpc && escrowAddr && resolverKey) {
              const provider = new ethers.JsonRpcProvider(rpc)
              const wallet   = new ethers.Wallet(resolverKey, provider)
              const escrow   = new ethers.Contract(escrowAddr, ['function resolveDispute(bytes32,bool) external'], wallet)
              const tx = await escrow.resolveDispute(order.onchain_order_id, false, { gasLimit: 300000n })
              await tx.wait()
              txHash = tx.hash
            }
          } catch (chainErr) {
            console.error('[shipping/label] Label D seller_wins on-chain failed:', chainErr.message)
          }
        }

        if (dispute) {
          await supabaseAdmin.from('disputes').update({
            outcome:         'seller_wins',
            resolved_at:     new Date().toISOString(),
            onchain_tx_hash: txHash,
          }).eq('id', dispute.id)
        }

        try {
          const { emailDisputeResolved } = await import('@/lib/emails')
          if (order.buyer?.email)  await emailDisputeResolved(order.buyer.email,  order.buyer.full_name,  'seller_wins', 'buyer')
          if (order.seller?.email) await emailDisputeResolved(order.seller.email, order.seller.full_name, 'seller_wins', 'seller')
        } catch (emailErr) {
          console.error('[shipping/label] Label D seller_wins emails failed:', emailErr.message)
        }

      } else {
        // buyer_wins — dispute valid, defer on-chain to Label D delivery via webhook
        await supabaseAdmin.from('orders').update({
          label_d_url: transaction.labelUrl,
          tracking_d:  transaction.trackingNumber,
          status:      'return_verified',
        }).eq('id', order_id)
        // Webhook fires handleBuyerWinsResolve on Label D delivery
      }

      return NextResponse.json({
        label_url:       transaction.labelUrl,
        tracking_number: transaction.trackingNumber,
        carrier:         'FedEx',
        service:         bestRate.servicelevel?.name,
      })
    }

    // Save label URL + tracking; advance order status (Labels A, B, C)
    const labelFieldMap = {
      A: { label_a_url: transaction.labelUrl, tracking_a: transaction.trackingNumber, status: 'awaiting_shipment' },
      B: { label_b_url: transaction.labelUrl, tracking_b: transaction.trackingNumber, status: 'auth_passed' },
      C: { label_c_url: transaction.labelUrl, tracking_c: transaction.trackingNumber },   // status already awaiting_return
    }

    await supabaseAdmin
      .from('orders')
      .update(labelFieldMap[label])
      .eq('id', order_id)

    return NextResponse.json({
      label_url:       transaction.labelUrl,
      tracking_number: transaction.trackingNumber,
      carrier:         'FedEx',
      service:         bestRate.servicelevel?.name,
    })

  } catch (err) {
    console.error('[shipping/label]', err)
    return NextResponse.json({ error: 'Label generation failed' }, { status: 500 })
  }
}
