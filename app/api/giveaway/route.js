import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/giveaway → { count: number }
export async function GET() {
  try {
    const { count } = await supabaseAdmin
      .from('early_access')
      .select('*', { count: 'exact', head: true })
    return Response.json({ count: count || 0 })
  } catch {
    return Response.json({ count: 0 })
  }
}
