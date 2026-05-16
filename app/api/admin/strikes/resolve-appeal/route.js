import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/admin/strikes/resolve-appeal
// Body: { strike_id, decision: 'approved' | 'denied' }
// Owner only.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 })

    const { strike_id, decision } = await request.json()
    if (!strike_id || !['approved', 'denied'].includes(decision)) {
      return NextResponse.json({ error: 'strike_id and decision (approved|denied) required' }, { status: 400 })
    }

    const { data: strike } = await supabaseAdmin
      .from('strikes')
      .select('id, user_id, strike_number, appealed, appeal_outcome')
      .eq('id', strike_id)
      .single()

    if (!strike) return NextResponse.json({ error: 'Strike not found' }, { status: 404 })
    if (!strike.appealed) return NextResponse.json({ error: 'No appeal on file for this strike' }, { status: 400 })
    if (strike.appeal_outcome) return NextResponse.json({ error: 'Appeal already resolved' }, { status: 409 })

    await supabaseAdmin.from('strikes').update({ appeal_outcome: decision }).eq('id', strike_id)

    if (decision === 'approved') {
      // Remove the strike and recalculate user standing
      await supabaseAdmin.from('strikes').delete().eq('id', strike_id)

      const { count } = await supabaseAdmin
        .from('strikes').select('id', { count: 'exact', head: true })
        .eq('user_id', strike.user_id).eq('strike_role', 'seller')
      const newCount = count || 0

      const banned = newCount >= 3
      const suspendedUntil = newCount === 0 ? null
        : newCount === 1 ? new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString()
        : newCount === 2 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null

      await supabaseAdmin.from('users').update({
        strike_count:    newCount,
        banned,
        suspended_until: suspendedUntil,
      }).eq('id', strike.user_id)

      // Restore suspended listings if fully cleared
      if (newCount === 0) {
        await supabaseAdmin.from('listings')
          .update({ status: 'active' })
          .eq('seller_id', strike.user_id)
          .eq('status', 'suspended_pause')
      }
    }

    // Email seller with outcome
    try {
      const { data: seller } = await supabaseAdmin.from('users').select('email, full_name').eq('id', strike.user_id).single()
      const { emailStrikeAppealResolved } = await import('@/lib/emails')
      if (seller?.email) await emailStrikeAppealResolved({ to: seller.email, fullName: seller.full_name, decision, strikeNumber: strike.strike_number })
    } catch (err) {
      console.error('[resolve-appeal] email failed:', err)
    }

    return NextResponse.json({ ok: true, decision })
  } catch (err) {
    console.error('[admin/strikes/resolve-appeal]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
