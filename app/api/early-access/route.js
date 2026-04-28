import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/early-access
// Body: { email }
// Public — no auth required.
export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const normalized = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalized)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('early_access')
      .insert({ email: normalized })

    // Duplicate — treat as success (silent de-dupe)
    if (error?.code === '23505') {
      return NextResponse.json({ ok: true })
    }
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[early-access]', err)
    return NextResponse.json({ error: 'Something went wrong — try again.' }, { status: 500 })
  }
}
