import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/checkout/config — public, returns fields needed at checkout
export async function GET() {
  const { data, error } = await supabase
    .from('tier_config')
    .select(
      'remote_auth_max_value, physical_auth_max_value, ' +
      'remote_auth_fee, physical_auth_fee, ' +
      'optional_auth_enabled, optional_auth_max_price, ' +
      'auth_default_threshold, auth_required_threshold'
    )
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
