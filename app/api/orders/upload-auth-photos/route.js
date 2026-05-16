import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/orders/upload-auth-photos
// Accepts multipart/form-data: { order_id, photos[] }
// Validates seller owns the order, uploads to auth-photos via service role, creates auth_inspections row.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const formData = await request.formData()
    const orderId  = formData.get('order_id')
    const files    = formData.getAll('photos')

    if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })
    if (!files?.length || files.length < 3) return NextResponse.json({ error: 'At least 3 photos required' }, { status: 400 })

    // Verify seller owns this order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, seller_id, auth_tier, status')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Upload each file using service role (bypasses RLS)
    const paths = []
    for (const file of files) {
      const ext  = file.name?.split('.').pop() || 'jpg'
      const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: upErr } = await supabaseAdmin.storage
        .from('auth-photos')
        .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: false })

      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
      paths.push(path)
    }

    const isWaived = order.auth_tier === 'none'

    // Create auth_inspections record
    const { error: inspErr } = await supabaseAdmin.from('auth_inspections').insert({
      order_id:         orderId,
      authenticator_id: user.id,
      type:             'remote',
      photos:           paths,
      decision:         isWaived ? 'waived' : 'pending',
      notes:            isWaived
        ? 'Seller-submitted evidence photos — buyer waived authentication'
        : 'Seller-submitted auth photos',
    })

    if (inspErr) throw new Error(inspErr.message)

    return NextResponse.json({ ok: true, paths })

  } catch (err) {
    console.error('[upload-auth-photos]', err)
    return NextResponse.json({ error: 'Internal error'}, { status: 500 })
  }
}
