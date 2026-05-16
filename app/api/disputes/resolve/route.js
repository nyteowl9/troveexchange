import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createShippoLabel, AUTH_CENTER_ADDRESS } from '@/lib/shippo'
import { ethers } from 'ethers'

// POST /api/disputes/resolve
// Body: { dispute_id, decision: 'buyer_wins' | 'seller_wins' }
// Auth: owner or dispute_resolver only.
//
// buyer_wins:  generates Label C (buyer → seller T1 or buyer → auth center T2),
//              sets order → awaiting_return, applies strike immediately.
//              resolveDispute on-chain fires later via Shippo webhook on label delivery.
//
// seller_wins: calls resolveDispute on-chain immediately, sets order → released.
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

    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('id, outcome, order_id')
      .eq('id', dispute_id)
      .single()

    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    if (dispute.outcome && dispute.outcome !== 'pending') {
      return NextResponse.json({ error: 'Dispute already resolved' }, { status: 409 })
    }

    // Load order with full addresses needed for Label C generation
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        id, onchain_order_id, buyer_id, seller_id, status, auth_tier, declared_value,
        buyer:buyer_id (id, email, full_name, street1, street2, city, state, zip, country),
        seller:seller_id (id, email, full_name, street1, street2, city, state, zip, country)
      `)
      .eq('id', dispute.order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const now = new Date()

    // ── BUYER WINS (return_disputed_seller) — card already at seller, execute immediately ──
    // Seller disputed the return but staff/owner sided with buyer (correct card was returned).
    // No new shipping needed — resolve on-chain directly.
    if (decision === 'buyer_wins' && order.status === 'return_disputed_seller') {
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
          const tx = await escrow.resolveDispute(order.onchain_order_id, true, { gasLimit: 300000n })
          txHash = tx.hash
          tx.wait().then(receipt => {
            if (receipt.status === 0) console.error(`[disputes/resolve] return_disputed buyer_wins tx reverted: ${txHash}`)
          }).catch(err => console.error(`[disputes/resolve] return_disputed buyer_wins tx wait error: ${err.message}`))
        } catch (chainErr) {
          console.error('[disputes/resolve] return_disputed buyer_wins on-chain call failed:', chainErr.message)
        }
      }

      await supabaseAdmin.from('disputes').update({
        owner_decision:  'buyer_wins',
        outcome:         'buyer_wins',
        onchain_tx_hash: txHash,
        resolved_by:     user.id,
        resolved_at:     now.toISOString(),
        ...(override_reason ? { notes: override_reason } : {}),
      }).eq('id', dispute_id)

      await supabaseAdmin.from('orders').update({ status: 'refunded' }).eq('id', order.id)

      try {
        const { emailDisputeResolved } = await import('@/lib/emails')
        if (order.buyer?.email)  await emailDisputeResolved(order.buyer.email,  order.buyer.full_name,  'buyer_wins', 'buyer')
        if (order.seller?.email) await emailDisputeResolved(order.seller.email, order.seller.full_name, 'buyer_wins', 'seller')
      } catch (err) {
        console.error('[disputes/resolve] email failed:', err)
      }

      return NextResponse.json({ ok: true, txHash })
    }

    // ── BUYER WINS — generate Label C, defer on-chain until card returned ────
    if (decision === 'buyer_wins') {
      const isTier2 = order.auth_tier === 'physical'

      const buyerAddr = {
        name:    order.buyer.full_name,
        street1: order.buyer.street1,
        street2: order.buyer.street2 || '',
        city:    order.buyer.city,
        state:   order.buyer.state,
        zip:     order.buyer.zip,
        country: order.buyer.country || 'US',
        email:   order.buyer.email,
      }
      const sellerAddr = {
        name:    order.seller.full_name,
        street1: order.seller.street1,
        street2: order.seller.street2 || '',
        city:    order.seller.city,
        state:   order.seller.state,
        zip:     order.seller.zip,
        country: order.seller.country || 'US',
        email:   order.seller.email,
      }

      // Validate buyer address before calling Shippo
      const missingBuyer  = !buyerAddr.street1 || !buyerAddr.city || !buyerAddr.state || !buyerAddr.zip
      const missingSeller = !isTier2 && (!sellerAddr.street1 || !sellerAddr.city || !sellerAddr.state || !sellerAddr.zip)
      if (missingBuyer)  return NextResponse.json({ error: 'Buyer address is incomplete — ask them to update their account before generating a return label.' }, { status: 400 })
      if (missingSeller) return NextResponse.json({ error: 'Seller address is incomplete — ask them to update their account before generating a return label.' }, { status: 400 })

      // T2: buyer → auth center (prevent "return a rock" fraud at auth center)
      // T1: buyer → seller directly (low value, no auth center verification needed)
      const addressTo = isTier2 ? { ...AUTH_CENTER_ADDRESS } : sellerAddr
      const declaredValue = parseFloat(order.declared_value || 0)

      let labelCUrl, trackingC
      try {
        const result = await createShippoLabel(buyerAddr, addressTo, declaredValue)
        labelCUrl  = result.labelUrl
        trackingC  = result.trackingNumber
      } catch (err) {
        return NextResponse.json({ error: `Label C generation failed: ${err.message}` }, { status: 500 })
      }

      const returnDeadlineAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()

      // Update order — awaiting card return
      await supabaseAdmin.from('orders').update({
        status:             'awaiting_return',
        return_deadline_at: returnDeadlineAt,
        label_c_url:        labelCUrl,
        tracking_c:         trackingC,
      }).eq('id', order.id)

      // Record owner decision — outcome stays 'pending' until label delivery triggers on-chain
      await supabaseAdmin.from('disputes').update({
        owner_decision: 'buyer_wins',
        resolved_by:    user.id,
        ...(override_reason ? { notes: override_reason } : {}),
      }).eq('id', dispute_id)

      // Apply strike immediately — decision is final regardless of return
      await applyStrike(order)

      // Emails
      try {
        const { emailDisputeResolved } = await import('@/lib/emails')
        if (order.buyer?.email)  await emailDisputeResolved(order.buyer.email,  order.buyer.full_name,  'buyer_wins_return_required', 'buyer')
        if (order.seller?.email) await emailDisputeResolved(order.seller.email, order.seller.full_name, 'buyer_wins', 'seller')
      } catch (err) {
        console.error('[disputes/resolve] email failed:', err)
      }

      return NextResponse.json({ ok: true, label_c_url: labelCUrl, tracking_c: trackingC, return_deadline_at: returnDeadlineAt })
    }

    // ── SELLER WINS — resolve on-chain immediately ───────────────────────────
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
        const tx = await escrow.resolveDispute(order.onchain_order_id, false, { gasLimit: 300000n })
        txHash = tx.hash
        tx.wait().then(receipt => {
          if (receipt.status === 0) console.error(`[disputes/resolve] seller_wins tx reverted: ${txHash}`)
        }).catch(err => console.error(`[disputes/resolve] seller_wins tx wait error: ${err.message}`))
      } catch (chainErr) {
        console.error('[disputes/resolve] seller_wins on-chain call failed:', chainErr.message)
      }
    }

    await supabaseAdmin.from('disputes').update({
      owner_decision:  'seller_wins',
      outcome:         'seller_wins',
      onchain_tx_hash: txHash,
      resolved_by:     user.id,
      resolved_at:     now.toISOString(),
      ...(override_reason ? { notes: override_reason } : {}),
    }).eq('id', dispute_id)

    await supabaseAdmin.from('orders').update({ status: 'released' }).eq('id', order.id)

    // Track buyer dispute loss
    await incrementBuyerDisputeLoss(order.buyer_id)

    if (order.status === 'return_disputed_seller') {
      // Buyer committed fraud — apply buyer strike
      await applyBuyerStrike(order)
      // Seller was vindicated — reverse the strike applied when Label C was generated
      await reverseSellerStrike(order)
    }

    try {
      const { emailDisputeResolved } = await import('@/lib/emails')
      if (order.buyer?.email)  await emailDisputeResolved(order.buyer.email,  order.buyer.full_name,  'seller_wins', 'buyer')
      if (order.seller?.email) await emailDisputeResolved(order.seller.email, order.seller.full_name, 'seller_wins', 'seller')
    } catch (err) {
      console.error('[disputes/resolve] email failed:', err)
    }

    return NextResponse.json({ ok: true, txHash })
  } catch (err) {
    console.error('[disputes/resolve]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function applyBuyerStrike(order) {
  const { data: buyer } = await supabaseAdmin.from('users').select('buyer_strike_count').eq('id', order.buyer_id).single()
  const newCount = (buyer?.buyer_strike_count || 0) + 1
  const action = newCount === 1 ? '7-day suspension' : newCount === 2 ? '30-day suspension' : 'Permanent ban'
  const suspendedUntil = newCount === 1
    ? new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString()
    : newCount === 2
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null
  await supabaseAdmin.from('users').update({
    buyer_strike_count: newCount,
    banned:             newCount >= 3,
    suspended_until:    suspendedUntil,
  }).eq('id', order.buyer_id)
  await supabaseAdmin.from('strikes').insert({
    user_id:       order.buyer_id,
    order_id:      order.id,
    strike_number: newCount,
    strike_role:   'buyer',
    reason:        'Fraudulent return — wrong card submitted',
    action_taken:  action,
  })
}

async function applyStrike(order) {
  const { data: seller } = await supabaseAdmin.from('users').select('strike_count').eq('id', order.seller_id).single()
  const newCount = (seller?.strike_count || 0) + 1
  const action = newCount === 1 ? '7-day suspension' : newCount === 2 ? '30-day suspension + bond → 4%' : 'Permanent ban'
  const suspendedUntil = newCount === 1
    ? new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString()
    : newCount === 2
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null
  await supabaseAdmin.from('users').update({
    strike_count:    newCount,
    banned:          newCount >= 3,
    suspended_until: suspendedUntil,
  }).eq('id', order.seller_id)
  await supabaseAdmin.from('strikes').insert({
    user_id:       order.seller_id,
    order_id:      order.id,
    strike_number: newCount,
    strike_role:   'seller',
    reason:        'Lost dispute',
    action_taken:  action,
  })
  await supabaseAdmin.from('listings')
    .update({ status: 'suspended_pause' })
    .eq('seller_id', order.seller_id)
    .eq('status', 'active')
}

async function reverseSellerStrike(order) {
  // Find the seller strike applied for this order (from the initial buyer_wins decision)
  const { data: strike } = await supabaseAdmin
    .from('strikes')
    .select('id')
    .eq('order_id', order.id)
    .eq('user_id', order.seller_id)
    .eq('strike_role', 'seller')
    .maybeSingle()

  if (!strike) return // No strike to reverse (e.g. new seller got a warning instead)

  await supabaseAdmin.from('strikes').delete().eq('id', strike.id)

  // Recount remaining seller strikes to recalculate standing
  const { count: realCount } = await supabaseAdmin
    .from('strikes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', order.seller_id)
    .eq('strike_role', 'seller')
    .neq('action_taken', 'warning')

  const remaining = realCount || 0
  const suspendedUntil = remaining === 0 ? null
    : remaining === 1 ? new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabaseAdmin.from('users').update({
    strike_count:    remaining,
    banned:          remaining >= 3,
    suspended_until: suspendedUntil,
  }).eq('id', order.seller_id)

  // Restore suspended listings if seller is now clean
  if (remaining === 0) {
    await supabaseAdmin.from('listings')
      .update({ status: 'active' })
      .eq('seller_id', order.seller_id)
      .eq('status', 'suspended_pause')
  }
}

async function incrementBuyerDisputeLoss(buyerId) {
  const { data: buyer } = await supabaseAdmin
    .from('users')
    .select('dispute_losses')
    .eq('id', buyerId)
    .single()
  await supabaseAdmin.from('users').update({
    dispute_losses:      (buyer?.dispute_losses || 0) + 1,
    last_dispute_loss_at: new Date().toISOString(),
  }).eq('id', buyerId)
}
