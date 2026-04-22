import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/auth-inspection/completed?since=<iso>
// Returns today's completed inspections enriched with order/listing/buyer data.
// Uses supabaseAdmin to bypass RLS — auth role cannot read other users' orders directly.
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('users').select('role').eq('id', user.id).single()
    if (!['authenticator', 'staff', 'owner'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since') || (() => {
      const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
    })()

    const { data: inspections, error: inspErr } = await supabaseAdmin
      .from('auth_inspections')
      .select('id, decision, notes, created_at, authenticator_id, order_id')
      .gte('created_at', since)
      .in('decision', ['pass', 'fail'])
      .order('created_at', { ascending: false })

    if (inspErr) return NextResponse.json({ error: inspErr.message }, { status: 500 })
    if (!inspections?.length) return NextResponse.json({ inspections: [] })

    const orderIds = inspections.map(i => i.order_id)

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, status, label_b_url, tracking_b, listing_id, buyer_id')
      .in('id', orderIds)

    const listingIds = (orders || []).map(o => o.listing_id).filter(Boolean)
    const buyerIds   = (orders || []).map(o => o.buyer_id).filter(Boolean)

    const [{ data: listings }, { data: buyers }] = await Promise.all([
      listingIds.length
        ? supabaseAdmin.from('listings').select('id, card_name, grade, grader, price').in('id', listingIds)
        : { data: [] },
      buyerIds.length
        ? supabaseAdmin.from('users').select('id, username, full_name').in('id', buyerIds)
        : { data: [] },
    ])

    const ordersMap   = Object.fromEntries((orders   || []).map(o => [o.id, o]))
    const listingsMap = Object.fromEntries((listings || []).map(l => [l.id, l]))
    const buyersMap   = Object.fromEntries((buyers   || []).map(b => [b.id, b]))

    const enriched = inspections.map(insp => {
      const order   = ordersMap[insp.order_id]   || {}
      const listing = listingsMap[order.listing_id] || {}
      const buyer   = buyersMap[order.buyer_id]    || {}
      return { ...insp, order: { ...order, listing, buyer } }
    })

    return NextResponse.json({ inspections: enriched })
  } catch (err) {
    console.error('[auth-inspection/completed]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
