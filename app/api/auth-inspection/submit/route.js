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
        id, status, auth_tier, escrow_amount,
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
    // Tier 1 fail: buyer needs to know — set auth_failed so they can dispute on delivery
    // Tier 2 pass/fail: normal flow
    let newStatus
    if (isTier1) {
      newStatus = decision === 'pass' ? null : 'auth_failed'
    } else {
      newStatus = decision === 'pass' ? 'auth_passed' : 'auth_failed'
    }
    if (newStatus) {
      await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', order_id)
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
