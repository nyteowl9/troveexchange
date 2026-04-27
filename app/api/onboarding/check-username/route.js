import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/onboarding/check-username?username=foo
// Returns { taken: bool }. Authenticated user's own username counts as available.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.toLowerCase().trim()

  if (!username || username.length < 3) {
    return NextResponse.json({ taken: false })
  }

  // Identify the current user so they can keep their own username
  let currentUserId = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    currentUserId = user?.id || null
  } catch {}

  let query = supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username)

  if (currentUserId) {
    query = query.neq('id', currentUserId)
  }

  const { data } = await query.maybeSingle()
  return NextResponse.json({ taken: !!data })
}
