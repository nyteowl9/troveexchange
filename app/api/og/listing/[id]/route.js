import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_request, { params }) {
  const { id } = await params

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('card_name, game, photos')
    .eq('id', id)
    .single()

  if (!listing) return new Response('Not found', { status: 404 })

  const cardName = listing.card_name || 'Listing'
  const game     = listing.game     || ''
  const rawUrl   = listing.photos?.[0] || null

  // Pre-fetch photo as base64 — 5s timeout so Satori never makes outbound requests
  let photoSrc = null
  if (rawUrl) {
    try {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const buf  = await res.arrayBuffer()
        const mime = res.headers.get('content-type') || 'image/jpeg'
        photoSrc   = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
      }
    } catch {}
  }

  const nameFontSize = cardName.length > 35 ? 38 : cardName.length > 22 ? 48 : 58

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
          paddingTop: '60px',
          paddingBottom: '60px',
          paddingLeft: '60px',
          paddingRight: '60px',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', color: '#C9A84C', marginRight: '10px' }}>◆</span>
            <span style={{ fontSize: '20px', color: '#C9A84C', letterSpacing: '0.14em', fontWeight: 700 }}>
              CHASE HOLLOW
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#2E2E36', letterSpacing: '0.18em' }}>
            AUTHENTICATED MARKETPLACE
          </span>
        </div>

        {/* Card image — centred, grows to fill space */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
          {photoSrc ? (
            <img
              src={photoSrc}
              width={340}
              height={476}
              style={{
                borderRadius: '12px',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'rgba(201,168,76,0.55)',
                background: '#111114',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: '340px',
                height: '476px',
                borderRadius: '12px',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'rgba(201,168,76,0.22)',
                background: '#111114',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '72px', color: '#C9A84C' }}>◆</span>
            </div>
          )}

          {/* Pedestal */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ width: '400px', height: '2px', background: 'linear-gradient(to right, #0A0A0B, #C9A84C, #0A0A0B)' }} />
            <div style={{ width: '270px', height: '1px', marginTop: '6px', background: 'linear-gradient(to right, #0A0A0B, rgba(201,168,76,0.35), #0A0A0B)' }} />
          </div>
        </div>

        {/* Card name + game */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: `${nameFontSize}px`,
              color: '#F0EDE6',
              lineHeight: 1.15,
              fontStyle: 'italic',
              textAlign: 'center',
              maxWidth: '960px',
            }}
          >
            {cardName}
          </div>
          {game ? (
            <div
              style={{
                fontSize: '13px',
                color: '#C9A84C',
                letterSpacing: '0.22em',
                marginTop: '16px',
                textTransform: 'uppercase',
              }}
            >
              {game}
            </div>
          ) : null}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '22px',
            borderTopWidth: '1px',
            borderTopStyle: 'solid',
            borderTopColor: '#1A1A22',
          }}
        >
          <span style={{ fontSize: '11px', color: '#3A3A42', letterSpacing: '0.1em' }}>chasehollow.com</span>
          <span style={{ fontSize: '11px', color: '#3A3A42', letterSpacing: '0.1em' }}>@chasehollowtcg</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  )
}
