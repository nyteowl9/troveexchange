import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/admin/users/suspend
// Body: { user_id, days }
// Owner only.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { user_id, days } = await request.json()
    if (!user_id || !days) return NextResponse.json({ error: 'user_id and days required' }, { status: 400 })

    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin.from('users').update({ suspended_until: suspendedUntil }).eq('id', user_id)

    return NextResponse.json({ ok: true, suspended_until: suspendedUntil })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error'}, { status: 500 })
  }
}
