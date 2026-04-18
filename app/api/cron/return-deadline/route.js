import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ethers } from 'ethers'
import {
  emailBuyerReturnWarning,
  emailBuyerReturnExpired,
  emailSellerReturnReversed,
} from '@/lib/emails'

// GET /api/cron/return-deadline
// Schedule: daily (0 10 * * * — 10am UTC)
//
// Manages the 5-day return window for buyer-wins disputes:
//   Day 2 (3 days left): warning email to buyer
//   Day 4 (1 day left):  final warning email to buyer
//   Day 5 (deadline):    auto-reverse → seller wins, release funds on-chain
//
// Also handles wrong_card_received orders — same 5-day deadline from wrong_card_at.

export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { warned2: 0, warned4: 0, reversed: 0, errors: [] }

  // Fetch all orders awaiting return or wrong card — that have a deadline set
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      buyer:buyer_id (id, email, full_name),
      seller:seller_id (id, email, full_name),
      disputes (id, owner_decision, outcome)
    `)
    .in('status', ['awaiting_return', 'wrong_card_received'])
    .not('return_deadline_at', 'is', null)

  for (const order of orders || []) {
    try {
      const deadline    = new Date(order.return_deadline_at)
      const msLeft      = deadline - now
      const daysLeft    = msLeft / (1000 * 60 * 60 * 24)

      // ── Day 5: deadline passed — auto-reverse to seller wins ──
      if (now >= deadline) {
        await reverseToSellerWins(order, now)
        results.reversed++
        continue
      }

      // ── Day 4 warning (≤1 day left) ───────────────────────────
      if (daysLeft <= 1 && !order.return_warning_4_sent) {
        await supabaseAdmin
          .from('orders')
          .update({ return_warning_4_sent: true })
          .eq('id', order.id)
        await emailBuyerReturnWarning({ to: order.buyer.email, order, daysLeft: 1 })
        results.warned4++
        continue
      }

      // ── Day 2 warning (≤3 days left, >1 day left) ─────────────
      if (daysLeft <= 3 && !order.return_warning_2_sent) {
        await supabaseAdmin
          .from('orders')
          .update({ return_warning_2_sent: true })
          .eq('id', order.id)
        await emailBuyerReturnWarning({ to: order.buyer.email, order, daysLeft: 3 })
        results.warned2++
      }

    } catch (err) {
      results.errors.push({ order_id: order.id, error: err.message })
    }
  }

  return NextResponse.json(results)
}

async function reverseToSellerWins(order, now) {
  // Update dispute — flip to seller wins
  const dispute = order.disputes?.[0]

  if (dispute && !dispute.outcome) {
    await supabaseAdmin
      .from('disputes')
      .update({
        outcome: 'seller_wins',
        resolved_at: now.toISOString(),
        void_reason: dispute.void_reason || null,
      })
      .eq('id', dispute.id)
  }

  // Call on-chain resolveDispute(seller wins = false)
  let txHash = null
  if (order.onchain_order_id) {
    try {
      txHash = await callResolveDispute(order.onchain_order_id, false)
      if (dispute) {
        await supabaseAdmin
          .from('disputes')
          .update({ onchain_tx_hash: txHash })
          .eq('id', dispute.id)
      }
    } catch (err) {
      console.error(`[cron/return-deadline] on-chain call failed for order ${order.id}:`, err)
      // Don't throw — still update DB and email even if on-chain fails
    }
  }

  // Update order status
  await supabaseAdmin
    .from('orders')
    .update({ status: 'released' })
    .eq('id', order.id)

  // Emails
  await Promise.all([
    emailBuyerReturnExpired({ to: order.buyer.email, order }),
    emailSellerReturnReversed({ to: order.seller.email, order }),
  ])
}

async function callResolveDispute(onchainOrderId, buyerWins) {
  const rpc         = process.env.ALCHEMY_RPC_URL
  const escrowAddr  = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
  const resolverKey = process.env.DISPUTE_RESOLVER_PRIVATE_KEY

  if (!rpc || !escrowAddr || !resolverKey) {
    throw new Error('Missing ALCHEMY_RPC_URL, NEXT_PUBLIC_ESCROW_ADDRESS, or DISPUTE_RESOLVER_PRIVATE_KEY')
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
