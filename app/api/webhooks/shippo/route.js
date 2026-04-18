import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ethers } from 'ethers'

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
        await supabaseAdmin
          .from('orders')
          .update({ status: 'in_transit', shipped_at: new Date().toISOString() })
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

      } else if (label === 'A' && order.auth_tier === 'remote') {
        // Tier 1 delivered to buyer — open 72hr inspection window
        const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'inspection_window',
            delivered_at: new Date().toISOString(),
            auto_release_at: autoReleaseAt,
          })
          .eq('id', order.id)
        // Tell the contract the card is delivered — starts 72hr window on-chain
        await callMarkDelivered(order.onchain_order_id)

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
        // Tell the contract the card is delivered — starts 72hr window on-chain
        await callMarkDelivered(order.onchain_order_id)

      } else if (label === 'C') {
        if (order.auth_tier === 'remote') {
          // Tier 1: Label C delivers to SELLER directly — auto-resolve buyer wins
          // No auth center inspection needed for low-value (<$300) returns
          await handleBuyerWinsResolve(order)
        } else {
          // Tier 2: Label C delivered to auth center — staff must inspect the return
          // Status → return_received; authenticator verifies, then generates Label D
          await supabaseAdmin
            .from('orders')
            .update({ status: 'return_received' })
            .eq('id', order.id)
        }

      } else if (label === 'D') {
        // Tier 2: Label D delivered to seller — auto-execute on-chain resolveDispute(buyer wins)
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
    console.error(`[webhooks/shippo] Label D delivered but dispute has no buyer_wins decision for order ${order.id}`)
    return
  }
  if (dispute.outcome) {
    // Already resolved (e.g. webhook fired twice)
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
      outcome: 'buyer_wins',
      resolved_at: new Date().toISOString(),
      onchain_tx_hash: txHash,
    })
    .eq('id', dispute.id)

  await supabaseAdmin
    .from('orders')
    .update({ status: 'released' })
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

// ── On-chain markDelivered call (operator) ─────────────────────
// Called when Shippo confirms delivery — starts 72hr window on-chain.
// Uses OPERATOR_PRIVATE_KEY (not owner) since markDelivered is operator-accessible.
// Silently skips if onchain_order_id is null (pre-Phase-3 orders).
async function callMarkDelivered(onchainOrderId) {
  if (!onchainOrderId) return
  const rpc          = process.env.ALCHEMY_RPC_URL
  const escrowAddr   = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
  const operatorKey  = process.env.OPERATOR_PRIVATE_KEY
  if (!rpc || !escrowAddr || !operatorKey) return

  try {
    const provider = new ethers.JsonRpcProvider(rpc)
    const wallet   = new ethers.Wallet(operatorKey, provider)
    const escrow   = new ethers.Contract(
      escrowAddr,
      ['function markDelivered(bytes32 orderId) external'],
      wallet
    )
    const tx = await escrow.markDelivered(onchainOrderId)
    await tx.wait()
  } catch (err) {
    // Log but don't throw — DB is already updated, on-chain can be retried manually
    console.error('[webhooks/shippo] callMarkDelivered failed:', err.message)
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

// ── Which label does this tracking number belong to? ──────────
function resolveLabel(order, trackingNumber) {
  if (order.tracking_a === trackingNumber) return 'A'
  if (order.tracking_b === trackingNumber) return 'B'
  if (order.tracking_c === trackingNumber) return 'C'
  if (order.tracking_d === trackingNumber) return 'D'
  return null
}
