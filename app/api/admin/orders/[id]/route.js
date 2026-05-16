import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/orders/:id
// Returns full order detail + most recent auth inspection
// Auth: owner only
export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const [orderRes, inspectionRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select(`
          id, status, auth_tier, escrow_amount, platform_fee, creator_fee,
          auth_fee, shipping_cost, sales_tax, created_at, released_at,
          shipped_at, delivered_at, auto_release_at,
          label_a_url, label_b_url, tracking_a, tracking_b, declared_value,
          listing:listing_id (id, card_name, game, set, grade, grader,
                              cert_number, condition, listing_type, price, photos),
          buyer:buyer_id   (id, username, full_name, email),
          seller:seller_id (id, username, full_name, email)
        `)
        .eq('id', id)
        .single(),

      supabaseAdmin
        .from('auth_inspections')
        .select('id, decision, notes, checklist, photos, created_at, authenticator_id')
        .eq('order_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (orderRes.error) throw orderRes.error

    // Get authenticator name if we have one
    let authenticatorName = null
    if (inspectionRes.data?.authenticator_id) {
      const { data: auth } = await supabaseAdmin
        .from('users')
        .select('username, full_name')
        .eq('id', inspectionRes.data.authenticator_id)
        .single()
      authenticatorName = auth?.username || auth?.full_name || null
    }

    // Generate signed URLs for auth-photos (private bucket)
    let signedPhotos = []
    if (inspectionRes.data?.photos?.length) {
      signedPhotos = await Promise.all(
        inspectionRes.data.photos.map(async (path) => {
          const { data } = await supabaseAdmin.storage
            .from('auth-photos')
            .createSignedUrl(path, 3600)
          return data?.signedUrl || null
        })
      )
      signedPhotos = signedPhotos.filter(Boolean)
    }

    return NextResponse.json({
      order: orderRes.data,
      inspection: inspectionRes.data
        ? { ...inspectionRes.data, authenticator_name: authenticatorName, photos: signedPhotos }
        : null,
    })
  } catch (err) {
    console.error('[admin/orders/id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
