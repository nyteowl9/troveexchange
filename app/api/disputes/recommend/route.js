import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/disputes/recommend
// Body: { dispute_id, recommendation: 'buyer_wins' | 'seller_wins', notes }
// Auth: staff or owner only.
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

    const { error } = await supabaseAdmin
      .from('disputes')
      .update({ staff_recommendation: recommendation, notes: notes || null })
      .eq('id', dispute_id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[disputes/recommend]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
