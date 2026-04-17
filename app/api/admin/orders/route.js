import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/orders?q=&status=&limit=50&offset=0
// Auth: owner only
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q      = searchParams.get('q') || ''
    const status = searchParams.get('status') || ''
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, status, auth_tier, escrow_amount, created_at, released_at,
        listing:listing_id (id, card_name, game, set, grade, grader, price),
        buyer:buyer_id (id, username, full_name, email),
        seller:seller_id (id, username, full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error

    // Client-side filter for search (card name, buyer username, seller username)
    let rows = data || []
    if (q) {
      const lower = q.toLowerCase()
      rows = rows.filter(o =>
        o.listing?.card_name?.toLowerCase().includes(lower) ||
        o.buyer?.username?.toLowerCase().includes(lower) ||
        o.buyer?.email?.toLowerCase().includes(lower) ||
        o.seller?.username?.toLowerCase().includes(lower) ||
        o.seller?.email?.toLowerCase().includes(lower) ||
        o.id?.toLowerCase().includes(lower)
      )
    }

    return NextResponse.json({ orders: rows, total: count })
  } catch (err) {
    console.error('[admin/orders]', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
