import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow'
import { emailBuyerFundsReleased, emailSellerFundsReleased, emailReviewRequest } from '@/lib/emails'

// GET /api/cron/escrow-release
// Schedule: every 15 minutes (*/15 * * * *)
// Finds orders in inspection_window whose 72hr window has elapsed,
// calls releaseEscrow() on-chain, then updates DB and sends emails.
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { released: 0, skipped_no_onchain_id: 0, errors: [] }

  // Two categories of orders ready to release:
  // 1. inspection_window orders whose 72hr buyer window has elapsed
  // 2. in_transit self-ship orders (no delivery webhook) with elapsed auto_release_at timer
  const [windowRes, selfShipRes] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select(`*, buyer:buyer_id (email, full_name), seller:seller_id (email, full_name), listing:listing_id (card_name, price)`)
      .eq('status', 'inspection_window')
      .lte('auto_release_at', now.toISOString()),
    supabaseAdmin
      .from('orders')
      .select(`*, buyer:buyer_id (email, full_name), seller:seller_id (email, full_name), listing:listing_id (card_name, price)`)
      .eq('status', 'in_transit')
      .in('ship_method', ['self_ship', 'self_ship_untracked'])
      .lte('auto_release_at', now.toISOString()),
  ])
  const orders = [...(windowRes.data || []), ...(selfShipRes.data || [])]

  // Set up operator wallet — used to call releaseEscrow() on-chain
  let escrowContract = null
  if (process.env.OPERATOR_PRIVATE_KEY && ESCROW_ADDRESS) {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL)
    const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider)
    escrowContract = new ethers.Contract(ESCROW_ADDRESS, [
      'function releaseEscrow(bytes32 orderId) external',
    ], operatorWallet)
  }

  for (const order of orders || []) {
    try {
      // ── 1. On-chain release ────────────────────────────────
      // Skip if order was created before Phase 3 (no onchain_order_id stored)
      if (!order.onchain_order_id) {
        results.skipped_no_onchain_id++
        // Fall through — still update DB and send emails for legacy orders
      } else if (escrowContract) {
        // Call releaseEscrow() — contract distributes:
        //   sellerPayout → seller wallet
        //   platformFee + authFee + shippingFee + salesTax → Safe (feeRecipient)
        //   creatorFee → creator wallet (or Safe if no creator)
        //   sellerBond → returned to seller
        const tx = await escrowContract.releaseEscrow(order.onchain_order_id, { gasLimit: 300000n })
        const receipt = await tx.wait()

        // Store the release tx hash for the audit trail
        await supabaseAdmin
          .from('orders')
          .update({ release_tx_hash: receipt.hash })
          .eq('id', order.id)
      }

      // ── 2. Calculate payout figures for email/display ──────
      const listingPrice = parseFloat(order.listing?.price || 0)
      const platformFee  = parseFloat(order.platform_fee   || 0)
      const creatorFee   = parseFloat(order.creator_fee    || 0)
      const totalFee     = platformFee + creatorFee || listingPrice * 0.035
      const shippingCost = parseFloat(order.shipping_cost  || 0)
      const sellerPayout = Math.max(0, listingPrice - totalFee - shippingCost)

      // ── 3. Mark released in DB ─────────────────────────────
      await supabaseAdmin
        .from('orders')
        .update({
          status:      'released',
          released_at: now.toISOString(),
        })
        .eq('id', order.id)

      // ── 4. Emails ──────────────────────────────────────────
      await Promise.all([
        emailBuyerFundsReleased({ to: order.buyer.email, order }),
        emailSellerFundsReleased({
          to:          order.seller.email,
          order,
          listingPrice,
          platformFee: totalFee,
          shippingCost,
          sellerPayout,
        }),
      ])

      // Increment seller total_sales and recalculate tier
      await supabaseAdmin.rpc('increment_total_sales_and_recalculate', { p_user_id: order.seller_id })

      // Review requests — fire and forget
      emailReviewRequest({ to: order.buyer.email,  order, role: 'buyer'  }).catch(() => {})
      emailReviewRequest({ to: order.seller.email, order, role: 'seller' }).catch(() => {})

      results.released++
    } catch (err) {
      results.errors.push({ order_id: order.id, error: err.message })
    }
  }

  return NextResponse.json(results)
}
