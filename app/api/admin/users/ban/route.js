import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/admin/users/ban
// Body: { user_id }
// Owner only.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    await supabaseAdmin.from('users').update({ banned: true, suspended_until: null }).eq('id', user_id)
    await supabaseAdmin.from('listings').update({ status: 'suspended_pause' }).eq('seller_id', user_id).eq('status', 'active')

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error'}, { status: 500 })
  }
}
