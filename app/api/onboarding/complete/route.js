import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/onboarding/complete
// Proxies the profile upsert through the admin client so new Google OAuth
// users (who don't have a row yet) aren't blocked by RLS on INSERT.
// The authenticated user can only write to their own row — enforced here.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { username, full_name, street1, street2, city, state, zip } = body

    if (!username || !full_name) {
      return NextResponse.json({ error: 'username and full_name are required' }, { status: 400 })
    }

    // Username format check
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3–20 characters: letters, numbers, underscores only' }, { status: 400 })
    }

    // Check username availability (case-insensitive)
    const { data: taken } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .neq('id', user.id) // allow user to keep their own username
      .maybeSingle()

    if (taken) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .upsert({
        id:       user.id,
        email:    user.email,
        username: username.toLowerCase().trim(),
        full_name: full_name.trim(),
        street1:  street1?.trim() || null,
        street2:  street2?.trim() || null,
        city:     city?.trim() || null,
        state:    state?.trim()?.toUpperCase() || null,
        zip:      zip?.trim() || null,
        country:  'US',
      }, { onConflict: 'id' })

    if (error) {
      console.error('[onboarding/complete]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[onboarding/complete]', err)
    return NextResponse.json({ error: err.message || 'Onboarding failed' }, { status: 500 })
  }
}
