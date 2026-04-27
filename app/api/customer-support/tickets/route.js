import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/customer-support/tickets?status=open&limit=50
// Staff/owner only.
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (!['staff', 'owner'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || null
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let query = supabaseAdmin
      .from('support_tickets')
      .select('id, name, email, category, subject, status, priority, created_at, updated_at, order_id, user_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    const { data: tickets, error } = await query
    if (error) throw error

    return NextResponse.json({ tickets })
  } catch (err) {
    console.error('[customer-support/tickets]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
