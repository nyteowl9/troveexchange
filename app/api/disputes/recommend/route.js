import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/disputes/recommend
// Body: { dispute_id, recommendation: 'buyer_wins' | 'seller_wins', notes }
// Auth: staff or owner only.
// Writes recommendation + notes to `staff_notes` (separate from `notes` which
// is reserved for owner override_reason during resolve).
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (!['staff', 'owner'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { dispute_id, recommendation, notes } = await request.json()
    if (!dispute_id || !recommendation) {
      return NextResponse.json({ error: 'Missing dispute_id or recommendation' }, { status: 400 })
    }
    if (!['buyer_wins', 'seller_wins'].includes(recommendation)) {
      return NextResponse.json({ error: 'Invalid recommendation' }, { status: 400 })
    }

    // Verify dispute exists and is still open — staff cannot overwrite
    // an already-resolved dispute's audit trail.
    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('id, outcome')
      .eq('id', dispute_id)
      .single()

    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    if (dispute.outcome && dispute.outcome !== 'pending') {
      return NextResponse.json({ error: `Dispute already resolved (outcome: ${dispute.outcome})` }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('disputes')
      .update({ staff_recommendation: recommendation, staff_notes: notes || null })
      .eq('id', dispute_id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[disputes/recommend]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
