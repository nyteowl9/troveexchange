import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function assertOwner(req) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'owner' ? user : null
}

// POST /api/admin/users/[id]/tier
// Body: { action: 'recalculate' | 'set', tier?: string }
export async function POST(req, { params }) {
  const user = await assertOwner(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const { action, tier } = await req.json()

  if (action === 'recalculate') {
    const { error } = await supabase.rpc('recalculate_user_tier', { p_user_id: id })
    if (error) return NextResponse.json({ error: 'Internal error'}, { status: 500 })
    const { data } = await supabase.from('users').select('seller_tier').eq('id', id).single()
    return NextResponse.json({ seller_tier: data?.seller_tier })
  }

  if (action === 'set') {
    const valid = ['new', 'trusted', 'pro', 'elite', 'legend']
    if (!valid.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    const { error } = await supabase.from('users').update({ seller_tier: tier }).eq('id', id)
    if (error) return NextResponse.json({ error: 'Internal error'}, { status: 500 })
    return NextResponse.json({ seller_tier: tier })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
