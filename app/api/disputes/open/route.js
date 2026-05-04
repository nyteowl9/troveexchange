import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// PUT /api/disputes/open
// Multipart: file + order_id — uploads buyer dispute evidence server-side (bypasses storage RLS)
export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    const orderId = formData.get('order_id')
    if (!file || !orderId) return NextResponse.json({ error: 'file and order_id required' }, { status: 400 })

    // Verify caller is the buyer
    const { data: order } = await supabaseAdmin
      .from('orders').select('buyer_id').eq('id', orderId).single()
    if (!order || order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `disputes/${orderId}/buyer/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await supabaseAdmin.storage
      .from('listing-photos')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (upErr) throw upErr

    const { data: { publicUrl } } = supabaseAdmin.storage.from('listing-photos').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[disputes/open PUT]', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}

// POST /api/disputes/open
// Body: { order_id, reason, description, onchain_tx_hash }
// Auth: buyer of this order only.
// Order must be in inspection_window status.
// Creates dispute record, updates order status → disputed, notifies seller.
export async function POST(request) {
  try {
    const { order_id, reason, description, onchain_tx_hash, buyer_evidence } = await request.json()
    if (!order_id || !reason) {
      return NextResponse.json({ error: 'order_id and reason are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load order — verify ownership and status
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, ship_method, buyer_id, seller_id,
        buyer:buyer_id (email, full_name),
        seller:seller_id (email, full_name),
        listing:listing_id (card_name)
      `)
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Self-shipped orders can be disputed while in_transit (no delivery webhook, buyer assumes risk on untracked)
    const isSelfShip = order.ship_method === 'self_ship' || order.ship_method === 'self_ship_untracked'
    const disputeAllowed = order.status === 'inspection_window' || (isSelfShip && order.status === 'in_transit')
    if (!disputeAllowed) {
      return NextResponse.json(
        { error: `Order is not in a disputable state (current status: ${order.status})` },
        { status: 400 }
      )
    }

    // Check for existing open dispute
    const { data: existing } = await supabaseAdmin
      .from('disputes')
      .select('id')
      .eq('order_id', order_id)
      .eq('outcome', 'pending')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A dispute is already open for this order' }, { status: 409 })
    }

    const fullReason = description ? `${reason}: ${description.trim()}` : reason

    // Seller has 48hrs from dispute open to submit counter-evidence
    const sellerDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    // Insert dispute record
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .insert({
        order_id,
        raised_by:                user.id,
        reason:                   fullReason,
        buyer_evidence:           Array.isArray(buyer_evidence) ? buyer_evidence : [],
        seller_evidence:          [],
        seller_evidence_deadline: sellerDeadline,
      })
      .select()
      .single()

    if (disputeError) {
      console.error('[disputes/open] insert error:', disputeError)
      return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
    }

    // Update order status → disputed
    await supabaseAdmin
      .from('orders')
      .update({ status: 'disputed' })
      .eq('id', order_id)

    // Send emails (non-blocking)
    try {
      const { emailBuyerDisputeUpdate, emailSellerDisputeUpdate } = await import('@/lib/emails')
      if (order.buyer?.email)  await emailBuyerDisputeUpdate({ to: order.buyer.email,   order, opened: true })
      if (order.seller?.email) await emailSellerDisputeUpdate({ to: order.seller.email, order, opened: true, sellerDeadline })
    } catch (err) {
      console.error('[disputes/open] email failed:', err)
    }

    return NextResponse.json({ ok: true, dispute_id: dispute.id })
  } catch (err) {
    console.error('[disputes/open]', err)
    return NextResponse.json({ error: err.message || 'Failed to open dispute' }, { status: 500 })
  }
}
