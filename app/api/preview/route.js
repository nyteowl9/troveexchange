import { NextResponse } from 'next/server'

// GET /api/preview?secret=<PREVIEW_SECRET>
// Sets a 30-day bypass cookie so the owner can access the full site
// while the coming-soon redirect is active.
// Add ?clear=1 to remove the cookie.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const clear  = searchParams.get('clear') === '1'
  const bypassSecret = process.env.PREVIEW_SECRET

  // Hard-fail if not configured — never fall back to a hardcoded literal.
  if (!bypassSecret) {
    return NextResponse.json({ error: 'Preview not configured' }, { status: 500 })
  }
  if (secret !== bypassSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const response = NextResponse.redirect(new URL('/', request.url))

  if (clear) {
    response.cookies.delete('ch-bypass')
  } else {
    response.cookies.set('ch-bypass', bypassSecret, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }

  return response
}
