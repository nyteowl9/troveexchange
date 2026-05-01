import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Routes and the minimum role required to access them
const PROTECTED_ROUTES = [
  { path: '/admin',              roles: ['owner'] },
  { path: '/authenticator',     roles: ['authenticator', 'staff', 'owner'] },
  { path: '/dispute-resolution',roles: ['staff', 'owner', 'dispute_resolver'] },
  { path: '/customer-support',  roles: ['staff', 'owner'] },
]

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Coming-soon redirect ──────────────────────────────────────
  // Remove this block (and the /api/preview route) when going public.
  if (process.env.NODE_ENV !== 'development') {
    const bypassSecret = process.env.PREVIEW_SECRET || 'ch-preview-2026'
    const hasBypass = request.cookies.get('ch-bypass')?.value === bypassSecret
    const isExempt  = hasBypass || pathname.startsWith('/coming-soon') || pathname.startsWith('/giveaway') || pathname.startsWith('/api/')
    if (!isExempt) {
      return NextResponse.redirect(new URL('/coming-soon', request.url))
    }
  }
  // ─────────────────────────────────────────────────────────────

  // Check if this path requires protection
  const protectedRoute = PROTECTED_ROUTES.find(route =>
    pathname.startsWith(route.path)
  )

  // Not a protected route — pass through (also handles ?ref= cookie)
  if (!protectedRoute) {
    return await refreshSession(request)
  }

  // Build a response we can attach cookies to
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get session
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — redirect to home
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Get user role from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('role, banned, suspended_until')
    .eq('id', user.id)
    .single()

  // No profile or banned — redirect to home
  if (!profile || profile.banned) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Suspended — redirect to home
  if (profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Wrong role — redirect to home
  if (!protectedRoute.roles.includes(profile.role)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

// Set 30-day referral attribution cookie if ?ref= is present (last click wins)
function applyRefCookie(response, request) {
  const ref = request.nextUrl.searchParams.get('ref')
  if (ref && /^[a-zA-Z0-9_-]{3,30}$/.test(ref)) {
    response.cookies.set('ch-ref', ref.toLowerCase(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }
  return response
}

// Refresh session on all non-protected routes
async function refreshSession(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return applyRefCookie(response, request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
