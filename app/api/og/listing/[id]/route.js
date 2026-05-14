import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request, { params }) {
  const { id } = await params

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('card_name, game, photos')
    .eq('id', id)
    .single()

  if (!listing) return new Response('Not found', { status: 404 })

  const cardName = listing.card_name || 'Listing'
  const game     = listing.game || ''
  const photoUrl = listing.photos?.[0] || null

  // Font size scales with card name length
  const nameFontSize = cardName.length > 35 ? 40 : cardName.length > 22 ? 50 : 62

  // Load fonts — fail gracefully, ImageResponse falls back to system serif/mono
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
          width: '1080px', height: '1080px',
          background: '#0A0A0B',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient centre glow */}
        <div style={{
          position: 'absolute',
          top: '190px', left: '190px',
          width: '700px', height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 45%, transparent 70%)',
        }} />

        {/* Top bar */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', color: '#C9A84C', lineHeight: 1 }}>◆</span>
            <span style={{ fontSize: '22px', color: '#C9A84C', letterSpacing: '0.14em', fontFamily: 'DMMono, monospace', fontWeight: 600 }}>
              CHASE HOLLOW
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#2E2E36', letterSpacing: '0.2em', fontFamily: 'DMMono, monospace' }}>
            AUTHENTICATED MARKETPLACE
          </span>
        </div>

        {/* Card image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', zIndex: 1 }}>
          {/* Card glow halo */}
          <div style={{
            position: 'absolute',
            width: '480px', height: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.04) 50%, transparent 70%)',
          }} />

          {/* Card frame */}
          {photoUrl ? (
            <img
              src={photoUrl}
              style={{
                width: '340px', height: '476px',
                objectFit: 'contain',
                borderRadius: '14px',
                border: '2px solid rgba(201,168,76,0.55)',
                boxShadow: '0 0 80px rgba(201,168,76,0.22), 0 48px 96px rgba(0,0,0,0.9)',
                background: '#111114',
                zIndex: 1,
              }}
            />
          ) : (
            <div style={{
              width: '340px', height: '476px',
              borderRadius: '14px',
              border: '2px solid rgba(201,168,76,0.22)',
              background: '#111114',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1,
            }}>
              <span style={{ fontSize: '72px', color: 'rgba(201,168,76,0.2)' }}>◆</span>
            </div>
          )}

          {/* Pedestal */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
            <div style={{ width: '400px', height: '2px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.85), transparent)' }} />
            <div style={{ width: '270px', height: '1px', marginTop: '7px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.35), transparent)' }} />
          </div>
        </div>

        {/* Card name + game */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '36px', textAlign: 'center', zIndex: 1 }}>
          <div style={{
            fontFamily: 'Cormorant, serif',
            fontStyle: 'italic',
            fontSize: `${nameFontSize}px`,
            color: '#F0EDE6',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            maxWidth: '960px',
          }}>
            {cardName}
          </div>
          {game ? (
            <div style={{
              fontFamily: 'DMMono, monospace',
              fontSize: '13px',
              color: '#C9A84C',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
            }}>
              {game}
            </div>
          ) : null}
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', width: '100%',
          justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid #1A1A22', paddingTop: '22px',
          zIndex: 1,
        }}>
          <span style={{ fontFamily: 'DMMono, monospace', fontSize: '11px', color: '#2E2E36', letterSpacing: '0.1em' }}>chasehollow.com</span>
          <span style={{ fontFamily: 'DMMono, monospace', fontSize: '11px', color: '#2E2E36', letterSpacing: '0.1em' }}>@chasehollowtcg</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    }
  )
}

async function fetchGoogleFont(family) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}&display=swap`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } }
  ).then(r => r.text())

  // Google Fonts lists subsets from broad → latin last; take the last woff2 (latin)
  const matches = [...css.matchAll(/src: url\((.+?)\) format\('woff2'\)/g)]
  const url = matches.at(-1)?.[1]
  if (!url) throw new Error(`woff2 url not found for ${family}`)
  return fetch(url).then(r => r.arrayBuffer())
}
