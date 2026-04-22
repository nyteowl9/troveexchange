import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ethers } from 'ethers'

// POST /api/admin/escrow-action
// Body: { order_id, action: 'release_to_seller' | 'refund_buyer' | 'resolve_seller_wins' }
// Auth: owner only — emergency manual escrow execution tool.
//
// Use when automated on-chain calls fail silently and DB/chain are out of sync:
//   release_to_seller  → releaseEscrow(orderId)         OPERATOR_PRIVATE_KEY
//   refund_buyer       → resolveDispute(orderId, true)  DISPUTE_RESOLVER_PRIVATE_KEY
//   resolve_seller_wins→ resolveDispute(orderId, false) DISPUTE_RESOLVER_PRIVATE_KEY
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 })
    }

    const { order_id, action } = await request.json()
    if (!order_id || !action) return NextResponse.json({ error: 'order_id and action required' }, { status: 400 })

    const validActions = ['release_to_seller', 'refund_buyer', 'resolve_seller_wins']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 })
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, onchain_order_id, buyer_id, seller_id')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!order.onchain_order_id) return NextResponse.json({ error: 'Order has no onchain_order_id — cannot execute on-chain action' }, { status: 400 })

    const rpc        = process.env.ALCHEMY_RPC_URL
    const escrowAddr = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
    if (!rpc || !escrowAddr) return NextResponse.json({ error: 'Missing ALCHEMY_RPC_URL or NEXT_PUBLIC_ESCROW_ADDRESS' }, { status: 500 })

    const provider = new ethers.JsonRpcProvider(rpc)
    let txHash = null
    let chainError = null

    if (action === 'release_to_seller') {
      const operatorKey = process.env.OPERATOR_PRIVATE_KEY
      if (!operatorKey) return NextResponse.json({ error: 'Missing OPERATOR_PRIVATE_KEY' }, { status: 500 })
      try {
        const wallet  = new ethers.Wallet(operatorKey, provider)
        const escrow  = new ethers.Contract(escrowAddr, ['function releaseEscrow(bytes32 orderId) external'], wallet)
        const tx = await escrow.releaseEscrow(order.onchain_order_id, { gasLimit: 300000n })
        await tx.wait()
        txHash = tx.hash
      } catch (err) {
        chainError = err.message
      }

      await supabaseAdmin.from('orders').update({
        status:      'released',
        released_at: new Date().toISOString(),
      }).eq('id', order_id)

    } else {
      const resolverKey = process.env.DISPUTE_RESOLVER_PRIVATE_KEY
      if (!resolverKey) return NextResponse.json({ error: 'Missing DISPUTE_RESOLVER_PRIVATE_KEY' }, { status: 500 })
      const buyerWins = action === 'refund_buyer'

      try {
        const wallet = new ethers.Wallet(resolverKey, provider)
        const escrow = new ethers.Contract(escrowAddr, ['function resolveDispute(bytes32,bool) external'], wallet)
        const tx = await escrow.resolveDispute(order.onchain_order_id, buyerWins, { gasLimit: 300000n })
        await tx.wait()
        txHash = tx.hash
      } catch (err) {
        chainError = err.message
      }

      const newOrderStatus = buyerWins ? 'refunded' : 'released'
      const disputeOutcome = buyerWins ? 'buyer_wins' : 'seller_wins'
      const now = new Date().toISOString()

      await supabaseAdmin.from('orders').update({ status: newOrderStatus }).eq('id', order_id)

      // Update dispute if one exists
      const { data: dispute } = await supabaseAdmin
        .from('disputes')
        .select('id')
        .eq('order_id', order_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (dispute) {
        await supabaseAdmin.from('disputes').update({
          outcome:         disputeOutcome,
          resolved_by:     user.id,
          resolved_at:     now,
          onchain_tx_hash: txHash,
        }).eq('id', dispute.id)
      }
    }

    // Log the manual action to console (no audit table yet)
    console.log(`[admin/escrow-action] owner=${user.id} order=${order_id} action=${action} txHash=${txHash} chainError=${chainError}`)

    return NextResponse.json({
      ok:          true,
      txHash,
      chainError:  chainError || null,
      dbUpdated:   true,
      warning:     chainError ? 'DB was updated but on-chain call failed — check chain state manually' : null,
    })

  } catch (err) {
    console.error('[admin/escrow-action]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
