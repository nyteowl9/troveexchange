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

    // Pre-fetch photo as base64 — 5s timeout so a slow Supabase URL can't hang the route
    let photoSrc = null
    if (rawUrl) {
      try {
        const res = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) })
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
    const fonts = [] // system fonts only — no external fetch risk

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

