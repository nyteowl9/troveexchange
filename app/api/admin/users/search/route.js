import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/users/search?q=<query>&limit=20
// Owner only. Searches users by email, username, or full_name.
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  let query = supabaseAdmin
    .from('users')
    .select('id, email, username, full_name, role, seller_tier, total_sales, strike_count, banned, suspended_until, joined_at')
    .order('joined_at', { ascending: false })
    .limit(limit)

  if (q.trim()) {
    query = query.or(`email.ilike.%${q}%,username.ilike.%${q}%,full_name.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Internal error'}, { status: 500 })

  return NextResponse.json(data || [])
}

// PATCH /api/admin/users/search  (reused endpoint for role updates)
// Body: { user_id, role }
// Owner only.
export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, role } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const validRoles = [null, 'owner', 'staff', 'authenticator']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.filter(Boolean).join(', ')} or null` }, { status: 400 })
  }

  await supabaseAdmin.from('users').update({ role }).eq('id', user_id)

  return NextResponse.json({ ok: true, user_id, role })
}
