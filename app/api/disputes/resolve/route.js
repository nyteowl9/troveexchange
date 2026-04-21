import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ethers } from 'ethers'

// POST /api/disputes/resolve
// Body: { dispute_id, decision: 'buyer_wins' | 'seller_wins' }
// Auth: owner only. Executes on-chain resolveDispute via DISPUTE_RESOLVER_PRIVATE_KEY.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (!['owner', 'dispute_resolver'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden — owner or dispute_resolver only' }, { status: 403 })
    }

    const { dispute_id, decision, override_reason } = await request.json()
    if (!dispute_id || !decision) {
      return NextResponse.json({ error: 'Missing dispute_id or decision' }, { status: 400 })
    }
    if (!['buyer_wins', 'seller_wins'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    // Load dispute + order
    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('id, outcome, order_id')
      .eq('id', dispute_id)
      .single()

    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    if (dispute.outcome !== 'pending') return NextResponse.json({ error: 'Dispute already resolved' }, { status: 409 })

    // Load order + buyer/seller separately to avoid multi-FK join ambiguity
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, onchain_order_id, buyer_id, seller_id, status')
      .eq('id', dispute.order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const userIds = [order.buyer_id, order.seller_id].filter(Boolean)
    const { data: users } = await supabaseAdmin.from('users').select('id, email, full_name').in('id', userIds)
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))
    order.buyer = userMap[order.buyer_id] || null
    order.seller = userMap[order.seller_id] || null

    let txHash = null

    // Execute on-chain if order has an onchain_order_id
    if (order.onchain_order_id) {
      const rpc         = process.env.ALCHEMY_RPC_URL
      const escrowAddr  = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
      const resolverKey = process.env.DISPUTE_RESOLVER_PRIVATE_KEY

      if (!rpc || !escrowAddr || !resolverKey) {
        return NextResponse.json({ error: 'Missing on-chain env vars' }, { status: 500 })
      }

      const provider = new ethers.JsonRpcProvider(rpc)
      const wallet   = new ethers.Wallet(resolverKey, provider)
      const escrow   = new ethers.Contract(
        escrowAddr,
        ['function resolveDispute(bytes32,bool) external'],
        wallet
      )

      const buyerWins = decision === 'buyer_wins'
      const tx = await escrow.resolveDispute(order.onchain_order_id, buyerWins, { gasLimit: 300000n })
      txHash = tx.hash
      // Fire-and-forget — don't block on confirmation (~12s on Base).
      // If it reverts the dispute record will have the tx hash for manual review.
      tx.wait().then(receipt => {
        if (receipt.status === 0) console.error(`[disputes/resolve] tx reverted: ${txHash}`)
      }).catch(err => console.error(`[disputes/resolve] tx wait error: ${err.message}`))
    }

    // Update dispute record
    await supabaseAdmin.from('disputes').update({
      owner_decision: decision,
      outcome: decision,
      onchain_tx_hash: txHash,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      ...(override_reason ? { notes: override_reason } : {}),
    }).eq('id', dispute_id)

    // Update order status
    const newStatus = decision === 'buyer_wins' ? 'refunded' : 'released'
    await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', order.id)

    // Apply strike to seller if buyer wins
    if (decision === 'buyer_wins' && order.seller_id) {
      const { data: seller } = await supabaseAdmin.from('users').select('strike_count').eq('id', order.seller_id).single()
      const newCount = (seller?.strike_count || 0) + 1
      const action = newCount === 1 ? '7-day suspension' : newCount === 2 ? '30-day suspension + bond → 4%' : 'Permanent ban'
      const suspendedUntil = newCount === 1
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : newCount === 2
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null
      await supabaseAdmin.from('users').update({
        strike_count: newCount,
        banned: newCount >= 3,
        suspended_until: suspendedUntil,
      }).eq('id', order.seller_id)
      await supabaseAdmin.from('strikes').insert({
        user_id: order.seller_id,
        order_id: order.id,
        strike_number: newCount,
        reason: 'Lost dispute',
        action_taken: action,
      })
    }

    // Send resolution emails
    try {
      const { emailDisputeResolved } = await import('@/lib/emails')
      if (order.buyer?.email)  await emailDisputeResolved(order.buyer.email,  order.buyer.full_name,  decision, 'buyer')
      if (order.seller?.email) await emailDisputeResolved(order.seller.email, order.seller.full_name, decision, 'seller')
    } catch (err) {
      console.error('[disputes/resolve] email failed:', err)
    }

    return NextResponse.json({ ok: true, txHash })
  } catch (err) {
    console.error('[disputes/resolve]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
