import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// PUT /api/auth-inspection/submit
// Multipart: file + order_id — uploads one auth inspection photo server-side
export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!['authenticator', 'staff', 'owner'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const orderId = formData.get('order_id')
    if (!file || !orderId) return NextResponse.json({ error: 'Missing file or order_id' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `auth-inspection/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabaseAdmin.storage
      .from('listing-photos')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from('listing-photos').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[auth-inspection/upload]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/auth-inspection/submit
// Body: { order_id, decision: 'pass'|'fail', notes, checklist }
// Auth: authenticator | staff | owner
// On pass:  status → auth_passed, inserts auth_inspections row, sends emails
// On fail:  status → auth_failed, inserts auth_inspections row, sends emails
export async function POST(request) {
  try {
    const { order_id, decision, notes, checklist, photos } = await request.json()

    if (!order_id || !decision) {
      return NextResponse.json({ error: 'order_id and decision required' }, { status: 400 })
    }
    if (!['pass', 'fail'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be pass or fail' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (!['authenticator', 'staff', 'owner'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, auth_tier, escrow_amount, seller_id,
        buyer:buyer_id (email, full_name),
        seller:seller_id (email, full_name),
        listing:listing_id (card_name)
      `)
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const isTier1 = order.auth_tier === 'remote'
    const isTier2 = order.auth_tier === 'physical'

    if (isTier2 && order.status !== 'auth_review') {
      return NextResponse.json({ error: `Order is not in auth_review status (got: ${order.status})` }, { status: 400 })
    }
    if (isTier1 && order.status !== 'in_transit') {
      return NextResponse.json({ error: `Tier 1 order is not in_transit (got: ${order.status})` }, { status: 400 })
    }

    // For Tier 1: update the existing seller-submitted pending inspection record
    // For Tier 2: insert a new inspection record with staff photos
    if (isTier1) {
      await supabaseAdmin.from('auth_inspections')
        .update({ decision, notes: notes || '', checklist: checklist || {}, authenticator_id: user.id })
        .eq('order_id', order_id)
        .eq('decision', 'pending')
    } else {
      await supabaseAdmin.from('auth_inspections').insert({
        order_id,
        authenticator_id: user.id,
        type: order.auth_tier,
        checklist: checklist || {},
        photos: photos || [],
        decision,
        notes: notes || '',
      })
    }

    // Tier 1 pass: card is already in transit to buyer — no status change needed
    // Tier 1 fail: set auth_failed and wait — delivery webhook generates return label + refunds on return
    // Tier 2 pass: status → auth_passed
    // Tier 2 fail: refund buyer on-chain immediately (card is at auth center, never reached buyer)
    let newStatus
    if (isTier1) {
      newStatus = decision === 'pass' ? null : 'auth_failed'
    } else {
      newStatus = decision === 'pass' ? 'auth_passed' : 'refunded'
    }
    if (newStatus) {
      await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', order_id)
    }

    // Tier 2 fail — call refundBuyer on-chain immediately
    if (isTier2 && decision === 'fail' && order.onchain_order_id) {
      try {
        const { ethers } = await import('ethers')
        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL)
        const wallet   = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider)
        const escrow   = new ethers.Contract(
          process.env.NEXT_PUBLIC_ESCROW_ADDRESS,
          ['function refundBuyer(bytes32) external'],
          wallet
        )
        const tx = await escrow.refundBuyer(order.onchain_order_id)
        await tx.wait()
      } catch (chainErr) {
        console.error('[auth-inspection] Tier 2 refundBuyer failed:', chainErr.message)
      }
    }

    // Apply seller strike on any auth fail (Tier 1 or Tier 2)
    if (decision === 'fail') {
      const { data: seller } = await supabaseAdmin.from('users').select('strike_count').eq('id', order.seller_id).single()
      const newCount = (seller?.strike_count || 0) + 1
      const action = newCount === 1 ? '7-day suspension' : newCount === 2 ? '30-day suspension + bond → 4%' : 'Permanent ban'
      const suspendedUntil = newCount < 3
        ? new Date(Date.now() + (newCount === 1 ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString()
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
        reason:        'Authentication failed — inauthentic card submitted',
        action_taken:  action,
      })
      await supabaseAdmin.from('listings').update({ status: 'paused' })
        .eq('seller_id', order.seller_id).eq('status', 'active')
    }

    // Send emails (non-blocking)
    try {
      const { emailBuyerAuthResult, emailSellerAuthResult } = await import('@/lib/emails')
      const passed = decision === 'pass'
      if (order.buyer?.email)  await emailBuyerAuthResult({ to: order.buyer.email,  order, passed })
      if (order.seller?.email) await emailSellerAuthResult({ to: order.seller.email, order, passed })
    } catch (err) {
      console.error('[auth-inspection] email failed:', err)
    }

    return NextResponse.json({ ok: true, status: newStatus ?? order.status })
  } catch (err) {
    console.error('[auth-inspection/submit]', err)
    return NextResponse.json({ error: err.message || 'Inspection submit failed' }, { status: 500 })
  }
}
