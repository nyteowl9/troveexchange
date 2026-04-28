import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/orders/auth-photos-signed?order_id=<id>
// Returns auth_inspections rows with signed URLs for private auth-photos bucket.
// Auth: staff, dispute_resolver, or owner only.
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!['owner', 'staff', 'dispute_resolver', 'authenticator'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const { data: inspections, error } = await supabaseAdmin
      .from('auth_inspections')
      .select('id, photos, decision, notes, timestamp, authenticator_id')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true })

    if (error) throw error

    // Generate 1-hour signed URLs for each photo path
    const enriched = await Promise.all((inspections || []).map(async (insp) => {
      if (!insp.photos?.length) return { ...insp, photos: [] }
      const signedPhotos = await Promise.all(
        insp.photos.map(async (path) => {
          const { data } = await supabaseAdmin.storage
            .from('auth-photos')
            .createSignedUrl(path, 3600)
          return data?.signedUrl || null
        })
      )
      return { ...insp, photos: signedPhotos.filter(Boolean) }
    }))

    return NextResponse.json({ inspections: enriched })
  } catch (err) {
    console.error('[auth-photos-signed]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
