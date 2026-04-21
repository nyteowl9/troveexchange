import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// PUT /api/disputes/seller-evidence
// Multipart: file + dispute_id + order_id
// Uploads a single file server-side (bypasses storage RLS) and returns the public URL.
export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    const orderId = formData.get('order_id')
    const disputeId = formData.get('dispute_id')

    if (!file || !orderId) return NextResponse.json({ error: 'file and order_id required' }, { status: 400 })

    // Verify the caller is the seller of this order
    const { data: order } = await supabaseAdmin
      .from('orders').select('seller_id').eq('id', orderId).single()
    if (!order || order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `disputes/${orderId}/seller/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: upErr } = await supabaseAdmin.storage
      .from('listing-photos')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (upErr) throw upErr

    const { data: { publicUrl } } = supabaseAdmin.storage.from('listing-photos').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[disputes/seller-evidence PUT]', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}

// POST /api/disputes/seller-evidence
// Body: { dispute_id, seller_evidence: string[] }
// Auth: seller of the disputed order only.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { dispute_id, seller_evidence, seller_notes } = await request.json()
    if (!dispute_id) return NextResponse.json({ error: 'dispute_id required' }, { status: 400 })

    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('id, outcome, order_id')
      .eq('id', dispute_id)
      .single()

    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    if (dispute.outcome !== 'pending') return NextResponse.json({ error: 'Dispute already resolved' }, { status: 409 })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('seller_id')
      .eq('id', dispute.order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('disputes')
      .update({
        seller_evidence: Array.isArray(seller_evidence) ? seller_evidence : [],
        seller_notes: seller_notes?.trim() || null,
      })
      .eq('id', dispute_id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[disputes/seller-evidence]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
