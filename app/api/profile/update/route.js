import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/profile/update
// Updates username, full_name, and address for the authenticated user.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { username, full_name, street1, street2, city, state, zip } = body

    if (!username || !full_name) {
      return NextResponse.json({ error: 'Username and full name are required' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3–20 characters: letters, numbers, underscores only' }, { status: 400 })
    }

    // Check availability (allow user to keep their own username)
    const { data: taken } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .neq('id', user.id)
      .maybeSingle()

    if (taken) {
      return NextResponse.json({ error: 'That username is already taken' }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        username:  username.toLowerCase().trim(),
        full_name: full_name.trim(),
        street1:   street1?.trim() || null,
        street2:   street2?.trim() || null,
        city:      city?.trim()    || null,
        state:     state?.trim()?.toUpperCase() || null,
        zip:       zip?.trim()     || null,
      })
      .eq('id', user.id)

    if (error) {
      console.error('[profile/update]', error)
      return NextResponse.json({ error: 'Internal error'}, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[profile/update]', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
