import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { emailDisputeResolved } from '@/lib/emails'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function assertOwner(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'owner' ? user : null
}

/**
 * POST /api/admin/disputes/[id]/decide
 * Body: { decision: 'buyer_wins' | 'seller_wins' }
 *
 * buyer_wins:
 *   - Sets dispute.owner_decision = 'buyer_wins'
 *   - Sets order status = 'awaiting_return'
 *   - Does NOT execute on-chain yet — waits for Label D delivery
 *   - Label C is generated separately via /api/shipping/label (label: 'C')
 *
 * seller_wins:
 *   - Sets dispute.owner_decision = 'seller_wins', outcome = 'seller_wins'
 *   - Immediately calls on-chain resolveDispute(orderId, false)
 *   - Sets order status = 'released', dispute.resolved_at = now
 *   - Sends resolution emails to both parties
 */
export async function POST(req, { params }) {
  const owner = await assertOwner(req)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const { decision } = await req.json()

  if (!['buyer_wins', 'seller_wins'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be buyer_wins or seller_wins' }, { status: 400 })
  }

  // Load dispute + order
  const { data: dispute } = await supabase
    .from('disputes')
    .select('*, orders(id, buyer_id, seller_id, onchain_order_id, status)')
    .eq('id', id)
    .single()

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  if (dispute.owner_decision) {
    return NextResponse.json({ error: 'Dispute already decided' }, { status: 409 })
  }

  const order = dispute.orders
  if (!order || order.status !== 'disputed') {
    return NextResponse.json({ error: 'Order is not in disputed status' }, { status: 400 })
  }

  // ── Seller wins — execute on-chain immediately ─────────────
  if (decision === 'seller_wins') {
    const txHash = await callResolveDispute(order.onchain_order_id, false)

    await supabase
      .from('disputes')
      .update({
        owner_decision: 'seller_wins',
        outcome: 'seller_wins',
        resolved_at: new Date().toISOString(),
        onchain_tx_hash: txHash,
      })
      .eq('id', id)

    await supabase
      .from('orders')
      .update({ status: 'released' })
      .eq('id', order.id)

    // Emails
    await sendResolutionEmails(order, 'seller_wins')

    return NextResponse.json({ success: true, decision: 'seller_wins', tx_hash: txHash })
  }

  // ── Buyer wins — defer on-chain, await return shipping ──────
  const returnDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('disputes')
    .update({ owner_decision: 'buyer_wins' })
    .eq('id', id)

  await supabase
    .from('orders')
    .update({
      status: 'awaiting_return',
      return_deadline_at: returnDeadline,
    })
    .eq('id', order.id)

  // Notify buyer they need to ship the card back (Label C)
  await sendBuyerReturnNotification(order)

  return NextResponse.json({
    success: true,
    decision: 'buyer_wins',
    next_step: 'Generate Label C via POST /api/shipping/label { order_id, label: "C" } and send tracking to buyer',
  })
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Calls resolveDispute(bytes32 orderId, bool buyerWins) on the escrow contract.
 * Requires env vars:
 *   ESCROW_CONTRACT_ADDRESS — deployed ChaseHollowEscrow address
 *   OWNER_PRIVATE_KEY       — owner wallet private key (server-side only)
 *   ALCHEMY_RPC_URL         — Base RPC endpoint
 */
async function callResolveDispute(onchainOrderId, buyerWins) {
  const rpc      = process.env.ALCHEMY_RPC_URL
  const escrowAddr = process.env.ESCROW_CONTRACT_ADDRESS
  const ownerKey = process.env.OWNER_PRIVATE_KEY

  if (!rpc || !escrowAddr || !ownerKey) {
    throw new Error('Missing ALCHEMY_RPC_URL, ESCROW_CONTRACT_ADDRESS, or OWNER_PRIVATE_KEY env var')
  }
  if (!onchainOrderId) {
    throw new Error('Order is missing onchain_order_id — must be stored at checkout')
  }

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet   = new ethers.Wallet(ownerKey, provider)
  const escrow   = new ethers.Contract(
    escrowAddr,
    ['function resolveDispute(bytes32,bool) external'],
    wallet
  )

  const tx = await escrow.resolveDispute(onchainOrderId, buyerWins)
  await tx.wait()
  return tx.hash
}

async function sendResolutionEmails(order, outcome) {
  try {
    const { data: buyer }  = await supabase.from('users').select('email, full_name').eq('id', order.buyer_id).single()
    const { data: seller } = await supabase.from('users').select('email, full_name').eq('id', order.seller_id).single()
    if (buyer?.email)  await emailDisputeResolved(buyer.email,  buyer.full_name,  outcome, 'buyer')
    if (seller?.email) await emailDisputeResolved(seller.email, seller.full_name, outcome, 'seller')
  } catch (err) {
    console.error('[decide] email error:', err)
  }
}

async function sendBuyerReturnNotification(order) {
  try {
    const { data: buyer } = await supabase.from('users').select('email, full_name').eq('id', order.buyer_id).single()
    if (buyer?.email) await emailDisputeResolved(buyer.email, buyer.full_name, 'buyer_wins_return_required', 'buyer')
  } catch (err) {
    console.error('[decide] buyer return email error:', err)
  }
}
