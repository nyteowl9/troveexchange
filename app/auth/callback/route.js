import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch {}
          })
        },
      },
    }
  )

  // PKCE flow (newer Supabase default)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // New OAuth users (Google) won't have a username yet — send to onboarding
      if (data?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('username')
          .eq('id', data.user.id)
          .single()
        if (!profile?.username) {
          return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] PKCE exchange error:', error.message)
  }

  // OTP / token flow (older emails)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] OTP verify error:', error.message)
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
}
