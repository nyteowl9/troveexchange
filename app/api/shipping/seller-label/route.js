import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { shippo } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/shipping/seller-label
// Body: { order_id, shortfall_tx_hash? }
// Allows a seller to generate (or retrieve) Label A for their own order.
// If label_a_url already exists, returns it immediately.
// For free_shipping orders where label cost exceeds the seller's settlement
// from escrow, the seller must pre-pay the shortfall in USDC via on-chain
// transfer to the platform's fee recipient. The tx hash is verified here
// before the label is purchased.
export async function POST(request) {
  try {
    const { order_id, shortfall_tx_hash } = await request.json()
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
        seller:seller_id (full_name, street1, street2, city, state, zip, country, email),
        buyer:buyer_id  (full_name, street1, street2, city, state, zip, country, email)
      `)
      .eq('id', order_id)
      .single()

    if (orderErr) {
      console.error('[seller-label] order query error:', orderErr, 'order_id:', order_id)
      return NextResponse.json({ error: 'Order lookup failed' }, { status: 500 })
    }
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
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

    const labelCostPreview = parseFloat(parseFloat(bestRate.amount).toFixed(2))

    // ── For free_shipping orders: seller must pay the full label cost upfront ──
    // The seller's settlement (price − 3.5%) releases normally to them on delivery;
    // the label is paid for separately by the seller via on-chain USDC transfer
    // to the platform's fee recipient (Safe). This avoids the platform losing money
    // on cheap free_shipping listings where the sale price doesn't cover the label.
    if (order.listing?.free_shipping) {
      if (!shortfall_tx_hash) {
        return NextResponse.json({
          error: 'Payment required',
          requires_payment: true,
          label_cost: labelCostPreview,
          message: `This label costs $${labelCostPreview.toFixed(2)}. Please pay via the CH Label confirmation modal — the page will guide you through the USDC transfer.`,
        }, { status: 402 })
      }

      // Reject if this tx hash has already been used for another order
      const { data: prior } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('label_payment_tx_hash', shortfall_tx_hash)
        .neq('id', order_id)
        .limit(1)
        .maybeSingle()
      if (prior) {
        return NextResponse.json({ error: 'Payment transaction already used on another order' }, { status: 400 })
      }

      // Verify on-chain that the seller's wallet sent the right amount of USDC to the fee recipient
      const rpc          = process.env.ALCHEMY_RPC_URL
      const usdcAddr     = process.env.NEXT_PUBLIC_USDC_ADDRESS
      const feeRecipient = process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS
      if (!rpc || !usdcAddr || !feeRecipient) {
        return NextResponse.json({ error: 'Server misconfigured — missing RPC / USDC / fee recipient address' }, { status: 500 })
      }

      const provider = new ethers.JsonRpcProvider(rpc)
      const receipt  = await provider.getTransactionReceipt(shortfall_tx_hash).catch(() => null)
      if (!receipt) {
        return NextResponse.json({ error: 'Payment transaction not found on chain. Wait a few seconds and retry.' }, { status: 400 })
      }
      if (receipt.status !== 1) {
        return NextResponse.json({ error: 'Payment transaction reverted on chain' }, { status: 400 })
      }

      // Parse USDC Transfer event: keccak256("Transfer(address,address,uint256)")
      const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      const txFrom = receipt.from?.toLowerCase()

      const transferLog = receipt.logs.find(log =>
        log.address.toLowerCase() === usdcAddr.toLowerCase() &&
        log.topics[0] === TRANSFER_TOPIC
      )
      if (!transferLog) {
        return NextResponse.json({ error: 'Transaction is not a USDC transfer' }, { status: 400 })
      }

      // topics[1] = from (padded), topics[2] = to (padded), data = amount
      const fromAddr = '0x' + transferLog.topics[1].slice(26).toLowerCase()
      const toAddr   = '0x' + transferLog.topics[2].slice(26).toLowerCase()
      const amount   = BigInt(transferLog.data)

      if (fromAddr !== txFrom) {
        return NextResponse.json({ error: 'Transfer from address does not match tx sender' }, { status: 400 })
      }
      if (toAddr !== feeRecipient.toLowerCase()) {
        return NextResponse.json({ error: 'Payment must be sent to the platform fee recipient' }, { status: 400 })
      }
      const requiredAmount = BigInt(Math.round(labelCostPreview * 1_000_000))   // USDC has 6 decimals
      if (amount < requiredAmount) {
        return NextResponse.json({
          error: `Payment amount insufficient — sent ${ethers.formatUnits(amount, 6)} USDC, need ${labelCostPreview.toFixed(2)} USDC`,
        }, { status: 400 })
      }
    }

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
      if (shortfall_tx_hash) dbUpdate.label_payment_tx_hash = shortfall_tx_hash
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
