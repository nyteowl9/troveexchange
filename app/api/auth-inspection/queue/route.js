import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/auth-inspection/queue
// Returns orders needing authenticator attention — bypasses RLS via supabaseAdmin.
// Includes: Tier 2 auth_review, Tier 2 auth_passed (no label B yet),
//           Tier 2 return_received, Tier 1 in_transit (seller photos pending)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (!['authenticator', 'staff', 'owner'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, escrow_amount, auth_tier, shipped_at, label_b_url,
        tracking_c, label_c_url, return_deadline_at,
        listing:listing_id (card_name, game, set, grade, grader, cert_number, photos, price),
        seller:seller_id (username, full_name),
        buyer:buyer_id  (username, full_name)
      `)
      .in('status', ['auth_review', 'auth_passed', 'return_received', 'in_transit'])
      .order('shipped_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data || []).filter(o =>
      o.status === 'auth_review' ||
      (o.status === 'auth_passed' && !o.label_b_url) ||
      o.status === 'return_received' ||
      (o.status === 'in_transit' && o.auth_tier === 'remote')
    )

    // Seller-submitted photos for Tier 1 in_transit orders
    const remoteIds = rows.filter(o => o.auth_tier === 'remote').map(o => o.id)
    let sellerPhotoMap = {}
    if (remoteIds.length) {
      const { data: inspData } = await supabaseAdmin
        .from('auth_inspections')
        .select('order_id, photos')
        .in('order_id', remoteIds)
        .eq('type', 'remote')
        .eq('decision', 'pending')
      ;(inspData || []).forEach(i => { sellerPhotoMap[i.order_id] = i.photos || [] })
    }

    // Original auth inspection + buyer dispute evidence for return_received orders
    const returnIds = rows.filter(o => o.status === 'return_received').map(o => o.id)
    let authInspMap = {}
    let returnDisputeMap = {}
    if (returnIds.length) {
      const [{ data: passInspData }, { data: dispData }] = await Promise.all([
        supabaseAdmin.from('auth_inspections')
          .select('order_id, photos, checklist, notes, type')
          .in('order_id', returnIds)
          .eq('decision', 'pass')
          .order('timestamp', { ascending: false }),
        supabaseAdmin.from('disputes')
          .select('order_id, reason, buyer_evidence, notes')
          .in('order_id', returnIds)
          .order('created_at', { ascending: false }),
      ])
      ;(passInspData || []).forEach(i => { if (!authInspMap[i.order_id]) authInspMap[i.order_id] = i })
      ;(dispData || []).forEach(d => { if (!returnDisputeMap[d.order_id]) returnDisputeMap[d.order_id] = d })
    }

    return NextResponse.json({
      orders: rows.map(o => ({
        ...o,
        sellerAuthPhotos: sellerPhotoMap[o.id] || [],
        authInspection:   authInspMap[o.id]    || null,
        dispute:          returnDisputeMap[o.id] || null,
      }))
    })
  } catch (err) {
    console.error('[auth-inspection/queue]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
