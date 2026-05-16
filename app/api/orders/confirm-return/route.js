import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ethers } from 'ethers'

// POST /api/orders/confirm-return
// Body: { order_id }
// Auth: seller of the order only.
// Called when seller confirms the correct card was returned (Tier 1 return review window).
// Triggers immediate on-chain resolveDispute(buyer wins), sets order → refunded.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, auth_tier, onchain_order_id, buyer_id, seller_id')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden — seller only' }, { status: 403 })
    if (order.status !== 'return_received_seller') {
      return NextResponse.json({ error: `Order must be in return_received_seller status (got: ${order.status})` }, { status: 400 })
    }

    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('id, outcome')
      .eq('order_id', order_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (dispute?.outcome && dispute.outcome !== 'pending') {
      return NextResponse.json({ error: 'Dispute already resolved' }, { status: 409 })
    }

    // Auth fail orders have no dispute — call refundBuyer (order is Active on-chain).
    // Normal dispute returns have a buyer_wins dispute — call resolveDispute.
    const isAuthFail = !dispute
    let txHash = null
    let chainError = null

    if (!order.onchain_order_id) {
      return NextResponse.json({ error: 'Order has no onchain_order_id — cannot refund' }, { status: 400 })
    }

    try {
      const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL)
      if (isAuthFail) {
        const wallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider)
        const escrow = new ethers.Contract(process.env.NEXT_PUBLIC_ESCROW_ADDRESS, ['function refundBuyer(bytes32) external'], wallet)
        const tx = await escrow.refundBuyer(order.onchain_order_id, { gasLimit: 300000n })
        const receipt = await tx.wait()
        if (!receipt || receipt.status === 0) chainError = `refundBuyer reverted (tx: ${tx.hash})`
        else txHash = tx.hash
      } else {
        const wallet = new ethers.Wallet(process.env.DISPUTE_RESOLVER_PRIVATE_KEY, provider)
        const escrow = new ethers.Contract(process.env.NEXT_PUBLIC_ESCROW_ADDRESS, ['function resolveDispute(bytes32,bool) external'], wallet)
        const tx = await escrow.resolveDispute(order.onchain_order_id, true /* buyer wins */, { gasLimit: 300000n })
        const receipt = await tx.wait()
        if (!receipt || receipt.status === 0) chainError = `resolveDispute reverted (tx: ${tx.hash})`
        else txHash = tx.hash
      }
    } catch (err) {
      chainError = err.message
    }

    if (chainError) {
      console.error('[orders/confirm-return] on-chain call failed — NOT updating DB. order:', order_id, 'err:', chainError)
      return NextResponse.json({
        error: 'On-chain refund failed — order remains in return_received_seller status. Please try again or contact support.',
        chainError,
      }, { status: 502 })
    }

    const now = new Date().toISOString()

    if (dispute) {
      await supabaseAdmin.from('disputes').update({
        outcome:         'buyer_wins',
        resolved_at:     now,
        onchain_tx_hash: txHash,
      }).eq('id', dispute.id)
    }

    await supabaseAdmin.from('orders').update({ status: 'refunded' }).eq('id', order_id)

    try {
      const { emailDisputeResolved } = await import('@/lib/emails')
      const { data: buyer }  = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.buyer_id).single()
      const { data: seller } = await supabaseAdmin.from('users').select('email, full_name').eq('id', order.seller_id).single()
      if (buyer?.email)  await emailDisputeResolved(buyer.email,  buyer.full_name,  'buyer_wins', 'buyer')
      if (seller?.email) await emailDisputeResolved(seller.email, seller.full_name, 'buyer_wins', 'seller')
    } catch (err) {
      console.error('[orders/confirm-return] email failed:', err)
    }

    return NextResponse.json({ ok: true, txHash })
  } catch (err) {
    console.error('[orders/confirm-return]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
