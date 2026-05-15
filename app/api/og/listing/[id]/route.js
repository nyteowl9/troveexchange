import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Frame position ────────────────────────────────────────────────────────────
const FRAME_LEFT = 545
const FRAME_TOP  = 100   // ↑ increase to move card down in the frame
const FRAME_W    = 415
const FRAME_H    = 540   // = frame bottom (~640) minus FRAME_TOP

// ── Text column ───────────────────────────────────────────────────────────────
const TEXT_X        = 45
const TITLE_START_Y = 465  // lower = higher on image; raise this to push text up

export async function GET(_request, { params }) {
  const { id } = await params

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('card_name, game, set, photos, price, listing_type, grade, grader')
    .eq('id', id)
    .single()

  if (!listing) return new Response('Not found', { status: 404 })

  const { card_name, game, photos, price, listing_type, grade, grader } = listing
  const cardSet  = listing.set || ''
  const isGraded = listing_type === 'graded' && grader

  const mainTitle = isGraded
    ? `${card_name} ${grader}${grade}`
    : card_name || 'Listing'

  const priceNum = price ? parseFloat(price) : null
  const priceStr = priceNum != null ? `$${priceNum.toLocaleString()}` : null

  // ── Background template ───────────────────────────────────────────────────
  const bgPath = path.join(process.cwd(), 'public/images/share-bg.png')
  if (!fs.existsSync(bgPath)) {
    return new Response('Background template missing — place share-bg.png in public/images/', { status: 500 })
  }
  const bgBuffer = fs.readFileSync(bgPath)

  // ── Card photo composite ──────────────────────────────────────────────────
  const composites = []
  const rawUrl = photos?.[0]
  if (rawUrl) {
    try {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const buf         = await res.arrayBuffer()
        const cardResized = await sharp(Buffer.from(buf))
          .resize(FRAME_W, FRAME_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
        composites.push({ input: cardResized, top: FRAME_TOP, left: FRAME_LEFT })
      }
    } catch {}
  }

  // ── Title sizing ──────────────────────────────────────────────────────────
  const titleFontSize = mainTitle.length > 30 ? 40 : mainTitle.length > 20 ? 46 : 52
  const titleMaxChars = Math.floor(420 / (titleFontSize * 0.58))
  const titleLines    = wrapText(mainTitle, titleMaxChars)
  const titleLineH    = Math.round(titleFontSize * 1.28)

  // ── SVG text overlay ──────────────────────────────────────────────────────
  let y = TITLE_START_Y
  const parts = []

  // Card title — white bold
  for (const line of titleLines) {
    parts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#FFFFFF">${esc(line)}</text>`
    )
    y += titleLineH
  }

  y += 26

  // Game name
  if (game) {
    parts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="22" fill="#B8B4AC">${esc(game)}</text>`
    )
    y += 32
  }

  // Set name — slightly larger than game
  if (cardSet) {
    parts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="26" font-weight="600" fill="#B8B4AC">${esc(cardSet)}</text>`
    )
    y += 36
  }

  y += 20

  // "LISTING PRICE" label
  parts.push(
    `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#C9A84C" letter-spacing="3">LISTING PRICE</text>`
  )
  y += 60

  // Price + USDC coin
  if (priceStr) {
    const priceFontSize = 66
    const usdcFontSize  = 38
    const coinR         = 28

    // Vertically center coin and USDC text on the cap-height midpoint of the price text
    const capMid  = Math.round(priceFontSize * 0.37)   // midpoint above baseline
    const coinCy  = y - capMid
    const usdcY   = coinCy + Math.round(usdcFontSize * 0.37)  // baseline so text centres on coinCy

    // Price text
    parts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="${priceFontSize}" font-weight="700" fill="#C9A84C">${esc(priceStr)}</text>`
    )

    // Position coin to the right of price text
    const priceW = priceStr.length * priceFontSize * 0.58
    const coinCx = Math.round(TEXT_X + priceW + 22)

    // Official-style USDC coin: blue circle + C-arc + vertical bar
    const cr  = (coinR * 0.58).toFixed(2)
    const sw  = (coinR * 0.17).toFixed(2)
    const sx  = (coinCx + coinR * 0.707).toFixed(2)
    const sy  = (coinCy - coinR * 0.707).toFixed(2)
    const ex  = sx
    const ey  = (coinCy + coinR * 0.707).toFixed(2)
    const vx  = coinCx.toFixed(2)
    const vy1 = (coinCy - coinR * 0.72).toFixed(2)
    const vy2 = (coinCy + coinR * 0.72).toFixed(2)

    parts.push(`<circle cx="${coinCx}" cy="${coinCy}" r="${coinR}" fill="#2775CA"/>`)
    // 270° arc (C opening to the right)
    parts.push(`<path d="M ${sx},${sy} A ${cr},${cr} 0 1,0 ${ex},${ey}" fill="none" stroke="white" stroke-width="${sw}" stroke-linecap="round"/>`)
    // Vertical bar
    parts.push(`<line x1="${vx}" y1="${vy1}" x2="${vx}" y2="${vy2}" stroke="white" stroke-width="${sw}" stroke-linecap="round"/>`)

    // "USDC" label next to coin, vertically centred
    const usdcX = coinCx + coinR + 12
    parts.push(
      `<text x="${usdcX}" y="${usdcY}" font-family="Arial,sans-serif" font-size="${usdcFontSize}" font-weight="700" fill="#FFFFFF">USDC</text>`
    )
  }

  const svgBuffer = Buffer.from(
    `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`
  )
  composites.push({ input: svgBuffer, top: 0, left: 0 })

  // ── Final composite ───────────────────────────────────────────────────────
  const result = await sharp(bgBuffer)
    .resize(1080, 1080, { fit: 'fill' })
    .composite(composites)
    .png()
    .toBuffer()

  return new Response(result, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

function wrapText(text, maxChars) {
  const words   = text.split(' ')
  const lines   = []
  let   current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
