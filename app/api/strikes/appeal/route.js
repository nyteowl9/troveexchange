import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/strikes/appeal
// Body: { strike_id, reason }
// Seller only. 7-day window. One appeal per strike.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { strike_id, reason } = await request.json()
    if (!strike_id || !reason?.trim()) {
      return NextResponse.json({ error: 'strike_id and reason are required' }, { status: 400 })
    }

    // Load the strike — verify ownership
    const { data: strike } = await supabaseAdmin
      .from('strikes')
      .select('id, user_id, strike_number, reason, action_taken, created_at, appealed, appeal_outcome')
      .eq('id', strike_id)
      .single()

    if (!strike) return NextResponse.json({ error: 'Strike not found' }, { status: 404 })
    if (strike.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (strike.strike_number >= 3) return NextResponse.json({ error: 'Strike 3 (permanent ban) cannot be appealed' }, { status: 400 })
    if (strike.appealed) return NextResponse.json({ error: 'You have already submitted an appeal for this strike' }, { status: 409 })

    // 7-day window
    const daysSince = (Date.now() - new Date(strike.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 7) return NextResponse.json({ error: 'Appeal window has closed (7 days from strike date)' }, { status: 400 })

    await supabaseAdmin.from('strikes').update({
      appealed:            true,
      appeal_reason:       reason.trim(),
      appeal_submitted_at: new Date().toISOString(),
    }).eq('id', strike_id)

    // Notify owner by email
    try {
      const { data: seller } = await supabaseAdmin.from('users').select('username, full_name, email').eq('id', user.id).single()
      const { emailStrikeAppealSubmitted } = await import('@/lib/emails')
      await emailStrikeAppealSubmitted({ strike, seller, reason: reason.trim() })
    } catch (err) {
      console.error('[strikes/appeal] email failed:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[strikes/appeal]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
