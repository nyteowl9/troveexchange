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
      .single()

    if (!dispute) return NextResponse.json({ error: 'No dispute found for this order' }, { status: 404 })
    if (dispute.outcome && dispute.outcome !== 'pending') {
      return NextResponse.json({ error: 'Dispute already resolved' }, { status: 409 })
    }

    // Execute on-chain resolveDispute(buyer wins)
    let txHash = null
    if (order.onchain_order_id) {
      const rpc         = process.env.ALCHEMY_RPC_URL
      const escrowAddr  = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
      const resolverKey = process.env.DISPUTE_RESOLVER_PRIVATE_KEY
      if (!rpc || !escrowAddr || !resolverKey) {
        return NextResponse.json({ error: 'Missing on-chain env vars' }, { status: 500 })
      }
      try {
        const provider = new ethers.JsonRpcProvider(rpc)
        const wallet   = new ethers.Wallet(resolverKey, provider)
        const escrow   = new ethers.Contract(escrowAddr, ['function resolveDispute(bytes32,bool) external'], wallet)
        const tx = await escrow.resolveDispute(order.onchain_order_id, true /* buyer wins */, { gasLimit: 300000n })
        await tx.wait()
        txHash = tx.hash
      } catch (chainErr) {
        // Log but don't block DB update — contract may already be resolved
        console.error('[orders/confirm-return] on-chain call failed:', chainErr.message)
      }
    }

    const now = new Date().toISOString()

    await supabaseAdmin.from('disputes').update({
      outcome:         'buyer_wins',
      resolved_at:     now,
      onchain_tx_hash: txHash,
    }).eq('id', dispute.id)

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
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
