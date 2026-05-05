import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/platform/settings
// Public — returns the subset of tier_config fields that are safe for client consumption.
// Used by seller dashboard to know self-ship threshold without auth.
export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from('tier_config')
      .select('self_ship_max_value, self_ship_release_days, optional_auth_enabled, optional_auth_max_price, auth_default_threshold, auth_required_threshold')
      .eq('id', 1)
      .single()

    return Response.json({
      self_ship_max_value:      data?.self_ship_max_value      ?? 100,
      self_ship_release_days:   data?.self_ship_release_days   ?? 14,
      optional_auth_enabled:    data?.optional_auth_enabled    ?? false,
      optional_auth_max_price:  data?.optional_auth_max_price  ?? 500,
      auth_default_threshold:   data?.auth_default_threshold   ?? 1000,
      auth_required_threshold:  data?.auth_required_threshold  ?? 5000,
    })
  } catch {
    return Response.json({
      self_ship_max_value:      100,
      self_ship_release_days:   14,
      optional_auth_enabled:    false,
      optional_auth_max_price:  500,
      auth_default_threshold:   1000,
      auth_required_threshold:  5000,
    })
  }
}
