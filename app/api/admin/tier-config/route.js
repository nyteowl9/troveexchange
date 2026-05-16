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

// GET /api/admin/tier-config
export async function GET(req) {
  const user = await assertOwner(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data } = await supabase.from('tier_config').select('*').eq('id', 1).single()
  return NextResponse.json(data)
}

// PATCH /api/admin/tier-config
// Body: any subset of tier_config columns
export async function PATCH(req) {
  const user = await assertOwner(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json()

  // Whitelist editable fields
  const allowed = [
    'trusted_min_sales', 'pro_min_sales', 'elite_min_sales', 'legend_min_sales',
    'elite_max_dispute_rate', 'elite_min_account_age_days',
    'elite_no_dispute_loss_days', 'trust_tier_unlocks_at',
    'remote_auth_max_value', 'physical_auth_max_value',
    'remote_auth_fee', 'physical_auth_fee',
    'min_bond_floor_usd',
    'optional_auth_enabled', 'optional_auth_max_price',
    'auth_default_threshold', 'auth_required_threshold',
    'shipping_handling_pct',
    'self_ship_max_value', 'self_ship_release_days',
    'staff_alert_email',
  ]
  const updates = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('tier_config')
    .update(updates)
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal error'}, { status: 500 })
  return NextResponse.json(data)
}
