import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ethers } from 'ethers'
import { callMarkDelivered } from '@/lib/escrow'
import { createShippoLabel } from '@/lib/shippo'

// POST /api/webhooks/shippo
// Handles carrier scan and delivery events from Shippo for all 4 label types.
// Label A: seller → auth center (Tier 2) or seller → buyer (Tier 1)
// Label B: auth center → buyer (Tier 2)
// Label C: buyer → auth center (Tier 2 dispute return)
// Label D: auth center → seller (Tier 2 dispute return — triggers on-chain resolveDispute)
export async function POST(request) {
  try {
    const body = await request.json()
    const { event, data } = body

    if (!event || !data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const trackingNumber = data.tracking_number
    if (!trackingNumber) return NextResponse.json({ ok: true })

    // Find order by tracking number (A, B, C, or D)
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(
        `tracking_a.eq.${trackingNumber},tracking_b.eq.${trackingNumber},` +
        `tracking_c.eq.${trackingNumber},tracking_d.eq.${trackingNumber}`
      )
      .limit(1)

    const order = orders?.[0]
    if (!order) return NextResponse.json({ ok: true }) // Not our order

    const label = resolveLabel(order, trackingNumber)
    const status = data.tracking_status?.status

    // ── TRANSIT (first carrier scan) ──────────────────────────
    if (event === 'track_updated' && status === 'TRANSIT') {
      if (label === 'A' && order.status === 'awaiting_shipment') {
        // Normal CH-label flow: first scan advances status to in_transit
        await supabaseAdmin
          .from('orders')
          .update({ status: 'in_transit', shipped_at: new Date().toISOString(), carrier_scanned_at: new Date().toISOString() })
          .eq('id', order.id)
        try {
          const { emailBuyerSellerShipped } = await import('@/lib/emails')
          const { data: buyer } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.buyer_id).single()
          if (buyer?.email) await emailBuyerSellerShipped({ to: buyer.email, order })
        } catch (err) {
          console.error('[webhooks/shippo] emailBuyerSellerShipped failed:', err)
        }
      } else if (label === 'A' && order.status === 'in_transit' && !order.carrier_scanned_at) {
        // Self-ship order: already in_transit from seller self-reporting; stamp first real carrier scan.
        // This is the proof-of-shipment signal we use for Day-3 fraud detection.
        await supabaseAdmin
          .from('orders')
          .update({ carrier_scanned_at: new Date().toISOString() })
          .eq('id', order.id)
      }
      // Label C transit — buyer shipped the return, no status change needed
      // (awaiting_return is sufficient until delivered)
    }

    // ── DELIVERED ─────────────────────────────────────────────
    if (event === 'track_updated' && status === 'DELIVERED') {

      if (label === 'A' && order.auth_tier === 'physical') {
        // Tier 2 Label A delivered to auth center — trigger auth review
        await supabaseAdmin
          .from('orders')
          .update({ status: 'auth_review' })
          .eq('id', order.id)

      } else if (label === 'A' && (order.auth_tier === 'remote' || order.auth_tier === 'none')) {
        if (order.status === 'auth_failed') {
          // Auth fail — card is now with buyer; generate return label and await return
          await handleAuthFailDelivery(order)
        } else {
          // Normal flow — open 72hr inspection window
          const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'inspection_window',
              delivered_at: new Date().toISOString(),
              auto_release_at: autoReleaseAt,
            })
            .eq('id', order.id)
          await callMarkDelivered(order.onchain_order_id)
          try {
            const { emailBuyerDelivered } = await import('@/lib/emails')
            const { data: buyer } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.buyer_id).single()
            if (buyer?.email) await emailBuyerDelivered({ to: buyer.email, order: { ...order, auto_release_at: autoReleaseAt } })
          } catch (err) {
            console.error('[webhooks/shippo] emailBuyerDelivered failed:', err)
          }
        }

      } else if (label === 'B' && order.auth_tier === 'physical') {
        // Tier 2 Label B delivered to buyer — open 72hr inspection window
        const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'inspection_window',
            delivered_at: new Date().toISOString(),
            auto_release_at: autoReleaseAt,
          })
          .eq('id', order.id)
        await callMarkDelivered(order.onchain_order_id)
        try {
          const { emailBuyerDelivered } = await import('@/lib/emails')
          const { data: buyer } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.buyer_id).single()
          if (buyer?.email) await emailBuyerDelivered({ to: buyer.email, order: { ...order, auto_release_at: autoReleaseAt } })
        } catch (err) {
          console.error('[webhooks/shippo] emailBuyerDelivered failed:', err)
        }

      } else if (label === 'C') {
        if (order.auth_tier === 'remote' || order.auth_tier === 'none') {
          // Seller must always verify the return (dispute flow or auth fail) — they could get a rock.
          // Seller confirms correct card → confirm-return route handles refund.
          // Seller disputes wrong card → return_disputed_seller → admin override.
          const reviewDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
          await supabaseAdmin
            .from('orders')
            .update({ status: 'return_received_seller', return_review_deadline_at: reviewDeadline })
            .eq('id', order.id)
          try {
            const { emailSellerReturnReceivedForReview } = await import('@/lib/emails')
            const { data: seller } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.seller_id).single()
            if (seller?.email) await emailSellerReturnReceivedForReview({ to: seller.email, order: { ...order, return_review_deadline_at: reviewDeadline } })
          } catch (err) {
            console.error('[webhooks/shippo] emailSellerReturnReceivedForReview failed:', err)
          }
        } else {
          // Tier 2: Label C delivered to auth center — staff must inspect the return
          // Status → return_received; authenticator verifies, then generates Label D
          await supabaseAdmin
            .from('orders')
            .update({ status: 'return_received' })
            .eq('id', order.id)
        }

      } else if (label === 'D') {
        // Tier 2: Label D delivered.
        // buyer_wins path: order is return_verified, dispute pending → fires resolveDispute(true) now.
        // seller_wins path: order is already released, dispute already resolved → no-op (graceful early return).
        await handleBuyerWinsResolve(order)
      }
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[webhooks/shippo]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// ── Shared: auto on-chain resolve when return confirmed delivered ──
// Called for: Tier 1 Label C delivered to seller
//             Tier 2 Label D delivered to seller
async function handleBuyerWinsResolve(order) {
  // Confirm dispute decision in DB
  const { data: dispute } = await supabaseAdmin
    .from('disputes')
    .select('id, owner_decision, outcome')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!dispute || dispute.owner_decision !== 'buyer_wins') {
    console.error(`[webhooks/shippo] Label C/D delivered but dispute has no buyer_wins decision for order ${order.id}`)
    return
  }
  if (dispute.outcome && dispute.outcome !== 'pending') {
    // Already fully resolved (e.g. webhook fired twice)
    return
  }
  if (!order.onchain_order_id) {
    console.error(`[webhooks/shippo] Label D delivered but orders.onchain_order_id is null for order ${order.id}`)
    return
  }

  // Execute on-chain
  let txHash
  try {
    txHash = await callResolveDispute(order.onchain_order_id, true /* buyer wins */)
  } catch (err) {
    console.error('[webhooks/shippo] callResolveDispute failed:', err)
    return
  }

  // Update DB
  await supabaseAdmin
    .from('disputes')
    .update({
      outcome:         'buyer_wins',
      resolved_at:     new Date().toISOString(),
      onchain_tx_hash: txHash,
    })
    .eq('id', dispute.id)

  await supabaseAdmin
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', order.id)

  // Emails — import here to avoid circular dep
  try {
    const { emailDisputeResolved } = await import('@/lib/emails')
    const { data: buyer }  = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.buyer_id).single()
    const { data: seller } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.seller_id).single()
    if (buyer?.email)  await emailDisputeResolved(buyer.email,  buyer.full_name,  'buyer_wins', 'buyer')
    if (seller?.email) await emailDisputeResolved(seller.email, seller.full_name, 'buyer_wins', 'seller')
  } catch (err) {
    console.error('[webhooks/shippo] resolution emails failed:', err)
  }
}


// ── On-chain resolveDispute call (dispute resolver) ────────────
async function callResolveDispute(onchainOrderId, buyerWins) {
  const rpc         = process.env.ALCHEMY_RPC_URL
  const escrowAddr  = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
  const resolverKey = process.env.DISPUTE_RESOLVER_PRIVATE_KEY

  if (!rpc || !escrowAddr || !resolverKey) {
    throw new Error('Missing ALCHEMY_RPC_URL, NEXT_PUBLIC_ESCROW_ADDRESS, or DISPUTE_RESOLVER_PRIVATE_KEY env var')
  }

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet   = new ethers.Wallet(resolverKey, provider)
  const escrow   = new ethers.Contract(
    escrowAddr,
    ['function resolveDispute(bytes32,bool) external'],
    wallet
  )

  const tx = await escrow.resolveDispute(onchainOrderId, buyerWins)
  await tx.wait()
  return tx.hash
}

// ── Auth fail delivery: card reached buyer, generate return label ──────────────
async function handleAuthFailDelivery(order) {
  const [{ data: buyer }, { data: seller }] = await Promise.all([
    supabaseAdmin.from('users').select('full_name, street1, street2, city, state, zip, country, email').eq('id', order.buyer_id).single(),
    supabaseAdmin.from('users').select('full_name, street1, street2, city, state, zip, country').eq('id', order.seller_id).single(),
  ])

  const buyerAddr = {
    name:    buyer.full_name,
    street1: buyer.street1,
    street2: buyer.street2 || '',
    city:    buyer.city,
    state:   buyer.state,
    zip:     buyer.zip,
    country: buyer.country || 'US',
    email:   buyer.email,
    phone:   buyer.phone  || '2085550100',
  }
  const sellerAddr = {
    name:    seller.full_name,
    street1: seller.street1,
    street2: seller.street2 || '',
    city:    seller.city,
    state:   seller.state,
    zip:     seller.zip,
    country: seller.country || 'US',
    phone:   seller.phone  || '2085550100',
  }

  let labelCUrl, trackingC
  try {
    const result = await createShippoLabel(buyerAddr, sellerAddr, parseFloat(order.declared_value || 0))
    labelCUrl = result.labelUrl
    trackingC = result.trackingNumber
  } catch (err) {
    console.error('[webhooks/shippo] auth fail Label C generation failed:', err)
    await supabaseAdmin.from('orders').update({ delivered_at: new Date().toISOString() }).eq('id', order.id)
    return
  }

  const returnDeadlineAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

  await supabaseAdmin.from('orders').update({
    status:             'awaiting_return',
    delivered_at:       new Date().toISOString(),
    return_deadline_at: returnDeadlineAt,
    label_c_url:        labelCUrl,
    tracking_c:         trackingC,
  }).eq('id', order.id)

  try {
    const { emailBuyerAuthFailReturnLabel } = await import('@/lib/emails')
    if (buyer?.email) await emailBuyerAuthFailReturnLabel({ to: buyer.email, order: { ...order, label_c_url: labelCUrl, return_deadline_at: returnDeadlineAt } })
  } catch (err) {
    console.error('[webhooks/shippo] auth fail return label email failed:', err)
  }
}

// ── Which label does this tracking number belong to? ──────────
function resolveLabel(order, trackingNumber) {
  // Check return labels first — if Shippo sandbox reuses a tracking number,
  // order status distinguishes which leg is active.
  if (order.tracking_c === trackingNumber) return 'C'
  if (order.tracking_d === trackingNumber) return 'D'
  if (order.tracking_a === trackingNumber) return 'A'
  if (order.tracking_b === trackingNumber) return 'B'
  return null
}
