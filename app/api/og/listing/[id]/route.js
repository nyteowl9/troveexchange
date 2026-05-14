import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_request, { params }) {
  try {
    const { id } = await params

    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('card_name, game, photos')
      .eq('id', id)
      .single()

    if (!listing) return new Response('Not found', { status: 404 })

    const cardName = listing.card_name || 'Listing'
    const game     = listing.game || ''
    const rawUrl   = listing.photos?.[0] || null

    // Pre-fetch photo as base64 so Satori never makes outbound requests
    let photoSrc = null
    if (rawUrl) {
      try {
        const res = await fetch(rawUrl)
        if (res.ok) {
          const buf  = await res.arrayBuffer()
          const mime = res.headers.get('content-type') || 'image/jpeg'
          const b64  = Buffer.from(buf).toString('base64')
          photoSrc   = `data:${mime};base64,${b64}`
        }
      } catch (err) {
        console.error('[og/listing] photo prefetch failed:', err.message)
      }
    }

    const nameFontSize = cardName.length > 35 ? 40 : cardName.length > 22 ? 50 : 62

    // Load fonts — fail gracefully
    let cormorantFont, dmMonoFont
    try {
      ;[cormorantFont, dmMonoFont] = await Promise.all([
        fetchGoogleFont('Cormorant+Garamond:ital,wght@1,400'),
        fetchGoogleFont('DM+Mono:wght@400'),
      ])
    } catch {}

    const fonts = []
    if (cormorantFont) fonts.push({ name: 'Cormorant', data: cormorantFont, weight: 400, style: 'italic' })
    if (dmMonoFont)    fonts.push({ name: 'DMMono',    data: dmMonoFont,    weight: 400, style: 'normal' })

    return new ImageResponse(
      (
        <div
          style={{
            width: '1080px',
            height: '1080px',
            background: '#0A0A0B',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '60px',
          }}
        >
          {/* Top bar */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px', color: '#C9A84C' }}>◆</span>
              <span style={{ fontSize: '22px', color: '#C9A84C', letterSpacing: '0.14em', fontFamily: 'DMMono, monospace', fontWeight: 600 }}>
                CHASE HOLLOW
              </span>
            </div>
            <span style={{ fontSize: '10px', color: '#3A3A42', letterSpacing: '0.2em', fontFamily: 'DMMono, monospace' }}>
              AUTHENTICATED MARKETPLACE
            </span>
          </div>

          {/* Card image */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            {photoSrc ? (
              <img
                src={photoSrc}
                style={{
                  width: '340px',
                  height: '476px',
                  objectFit: 'contain',
                  borderRadius: '14px',
                  border: '2px solid rgba(201,168,76,0.55)',
                  background: '#111114',
                }}
              />
            ) : (
              <div
                style={{
                  width: '340px',
                  height: '476px',
                  borderRadius: '14px',
                  border: '2px solid rgba(201,168,76,0.22)',
                  background: '#111114',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '72px', color: '#C9A84C' }}>◆</span>
              </div>
            )}

            {/* Pedestal lines */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
              <div style={{ width: '400px', height: '2px', background: 'linear-gradient(to right, #0A0A0B, #C9A84C, #0A0A0B)' }} />
              <div style={{ width: '270px', height: '1px', marginTop: '7px', background: 'linear-gradient(to right, #0A0A0B, rgba(201,168,76,0.4), #0A0A0B)' }} />
            </div>
          </div>

          {/* Card name + game */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '36px', textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'Cormorant, serif',
                fontStyle: 'italic',
                fontSize: `${nameFontSize}px`,
                color: '#F0EDE6',
                lineHeight: 1.1,
                maxWidth: '960px',
              }}
            >
              {cardName}
            </div>
            {game ? (
              <div
                style={{
                  fontFamily: 'DMMono, monospace',
                  fontSize: '13px',
                  color: '#C9A84C',
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  marginTop: '16px',
                }}
              >
                {game}
              </div>
            ) : null}
          </div>

          {/* Bottom bar */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingTop: '22px', borderTop: '1px solid #1A1A22' }}>
            <span style={{ fontFamily: 'DMMono, monospace', fontSize: '11px', color: '#3A3A42', letterSpacing: '0.1em' }}>chasehollow.com</span>
            <span style={{ fontFamily: 'DMMono, monospace', fontSize: '11px', color: '#3A3A42', letterSpacing: '0.1em' }}>@chasehollowtcg</span>
          </div>
        </div>
      ),
      { width: 1080, height: 1080, fonts }
    )
  } catch (err) {
    console.error('[og/listing] route error:', err)
    // Return a plain error image so we can see it failed vs. a broken img tag
    return new Response(`OG error: ${err.message}`, { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }
}

async function fetchGoogleFont(family) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}&display=swap`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } }
  ).then(r => r.text())

  const matches = [...css.matchAll(/src: url\((.+?)\) format\('woff2'\)/g)]
  const url = matches.at(-1)?.[1]
  if (!url) throw new Error(`woff2 url not found for ${family}`)
  return fetch(url).then(r => r.arrayBuffer())
}
