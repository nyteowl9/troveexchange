import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/auth/buyer-status
// Returns whether the current user is allowed to purchase.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('banned, suspended_until, buyer_strike_count')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ allowed: true })

    if (profile.banned) {
      return NextResponse.json({ allowed: false, reason: 'Your account has been permanently banned.' })
    }

    if (profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
      const until = new Date(profile.suspended_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      return NextResponse.json({ allowed: false, reason: `Your account is suspended until ${until}.` })
    }

    return NextResponse.json({ allowed: true, buyer_strike_count: profile.buyer_strike_count || 0 })
  } catch (err) {
    console.error('[auth/buyer-status]', err)
    return NextResponse.json({ allowed: true }) // fail open — don't block checkout on server error
  }
}
