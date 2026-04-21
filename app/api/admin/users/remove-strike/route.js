import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/admin/users/remove-strike
// Body: { user_id, strike_id }
// Owner only. Removes a specific strike record and recalculates the user's standing.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 })

    const { user_id, strike_id } = await request.json()
    if (!user_id || !strike_id) return NextResponse.json({ error: 'Missing user_id or strike_id' }, { status: 400 })

    // Delete the strike record
    const { error: delErr } = await supabaseAdmin.from('strikes').delete().eq('id', strike_id).eq('user_id', user_id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    // Recount remaining strikes
    const { count } = await supabaseAdmin.from('strikes').select('id', { count: 'exact', head: true }).eq('user_id', user_id)
    const newCount = count || 0

    // Recalculate suspension/ban based on new count
    const banned = newCount >= 3
    const suspendedUntil = newCount === 0 ? null
      : newCount === 1 ? new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString()
      : newCount === 2 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null

    await supabaseAdmin.from('users').update({
      strike_count: newCount,
      banned,
      suspended_until: suspendedUntil,
    }).eq('id', user_id)

    // If suspension cleared, restore any listings that were paused due to suspension
    if (newCount === 0) {
      await supabaseAdmin.from('listings')
        .update({ status: 'active' })
        .eq('seller_id', user_id)
        .eq('status', 'suspended_pause')
    }

    return NextResponse.json({ ok: true, new_strike_count: newCount })
  } catch (err) {
    console.error('[admin/users/remove-strike]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
