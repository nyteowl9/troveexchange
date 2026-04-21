import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/disputes/list?status=open|resolved
// Auth: staff or owner only.
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role, full_name').eq('id', user.id).single()
    if (!['staff', 'owner', 'dispute_resolver'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'

    // outcome is an enum: 'pending' | 'buyer_wins' | 'seller_wins'
    // 'pending' = unresolved, buyer_wins/seller_wins = resolved
    const select = `
      id, order_id, reason, buyer_evidence, seller_evidence, seller_notes, auth_photos,
      staff_recommendation, owner_decision, outcome, notes, onchain_tx_hash, created_at,
      resolved_by, resolved_at
    `

    let query = supabaseAdmin.from('disputes').select(select).order('created_at', { ascending: false })

    if (status === 'resolved') {
      query = query.neq('outcome', 'pending').limit(50)
    } else {
      query = query.eq('outcome', 'pending')
    }

    const { data: disputes, error } = await query
    if (error) throw error

    // Fetch orders + listing + buyer + seller for each dispute separately
    // (avoids multi-FK ambiguity on users table in a single join)
    const orderIds = (disputes || []).map(d => d.order_id).filter(Boolean)
    let ordersMap = {}
    if (orderIds.length > 0) {
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, escrow_amount, platform_fee, shipping_cost, auth_fee, onchain_order_id, status, listing_id, buyer_id, seller_id')
        .in('id', orderIds)

      const listingIds = [...new Set((orders || []).map(o => o.listing_id).filter(Boolean))]
      const userIds = [...new Set((orders || []).flatMap(o => [o.buyer_id, o.seller_id]).filter(Boolean))]

      const [{ data: listings }, { data: users }] = await Promise.all([
        listingIds.length > 0
          ? supabaseAdmin.from('listings').select('id, card_name, set, price, auth_tier').in('id', listingIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0
          ? supabaseAdmin.from('users').select('id, username, full_name, email').in('id', userIds)
          : Promise.resolve({ data: [] }),
      ])

      const listingMap = Object.fromEntries((listings || []).map(l => [l.id, l]))
      const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

      ordersMap = Object.fromEntries((orders || []).map(o => [o.id, {
        ...o,
        listing: listingMap[o.listing_id] || null,
        buyer: userMap[o.buyer_id] || null,
        seller: userMap[o.seller_id] || null,
      }]))
    }

    // Fetch resolver usernames
    const resolverIds = [...new Set((disputes || []).map(d => d.resolved_by).filter(Boolean))]
    let resolverMap = {}
    if (resolverIds.length > 0) {
      const { data: resolvers } = await supabaseAdmin.from('users').select('id, username, full_name').in('id', resolverIds)
      resolverMap = Object.fromEntries((resolvers || []).map(u => [u.id, u]))
    }

    const enriched = (disputes || []).map(d => ({
      ...d,
      orders: ordersMap[d.order_id] || null,
      resolver: resolverMap[d.resolved_by] || null,
    }))

    // Monthly stats
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { data: statsData } = await supabaseAdmin
      .from('disputes')
      .select('outcome, staff_recommendation, created_at')
      .gte('created_at', startOfMonth.toISOString())

    const stats = {
      opened: statsData?.length || 0,
      buyer_wins: statsData?.filter(d => d.outcome === 'buyer_wins').length || 0,
      seller_wins: statsData?.filter(d => d.outcome === 'seller_wins').length || 0,
      pending: statsData?.filter(d => d.outcome === 'pending' && d.staff_recommendation).length || 0,
    }

    return NextResponse.json({ disputes: enriched, stats, role: profile.role, full_name: profile.full_name })
  } catch (err) {
    console.error('[disputes/list]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
