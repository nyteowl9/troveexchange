import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Card frame position ───────────────────────────────────────────────────────
// Increase FRAME_TOP to move the card down; FRAME_H controls card size.
// The card will naturally overlap the pedestal — that's correct (it sits on it).
const FRAME_LEFT = 545
const FRAME_TOP  = 175   // ← increase to push card further down
const FRAME_W    = 415
const FRAME_H    = 590   // keep tall so card stays the same size

// ── Text layout ───────────────────────────────────────────────────────────────
const TEXT_X        = 45
const TITLE_START_Y = 465

// ── USDC icon size ────────────────────────────────────────────────────────────
const USDC_ICON_SIZE = 52   // px — coin diameter

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

  // ── Background ────────────────────────────────────────────────────────────
  const bgPath = path.join(process.cwd(), 'public/images/share-bg.png')
  if (!fs.existsSync(bgPath)) {
    return new Response('Background template missing — add share-bg.png to public/images/', { status: 500 })
  }
  const bgBuffer = fs.readFileSync(bgPath)

  // ── Card photo ────────────────────────────────────────────────────────────
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

  // ── USDC logo ─────────────────────────────────────────────────────────────
  let usdcLogoBuffer = null
  const usdcPath = path.join(process.cwd(), 'public/images/usdc.svg')
  if (fs.existsSync(usdcPath)) {
    try {
      const svgRaw = fs.readFileSync(usdcPath)
      usdcLogoBuffer = await sharp(svgRaw)
        .resize(USDC_ICON_SIZE, USDC_ICON_SIZE)
        .png()
        .toBuffer()
    } catch {}
  }

  // ── Title sizing — shrink font until title fits in 3 lines ───────────────
  let titleFontSize = mainTitle.length > 30 ? 40 : mainTitle.length > 20 ? 46 : 52
  let titleLines    = wrapText(mainTitle, Math.floor(420 / (titleFontSize * 0.58)))
  while (titleLines.length > 3 && titleFontSize > 24) {
    titleFontSize -= 2
    titleLines = wrapText(mainTitle, Math.floor(420 / (titleFontSize * 0.58)))
  }
  const titleLineH = Math.round(titleFontSize * 1.28)

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

  // Set name
  if (cardSet) {
    parts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="26" font-weight="600" fill="#B8B4AC">${esc(cardSet)}</text>`
    )
    y += 36
  }

  y += 20

  // LISTING PRICE label
  parts.push(
    `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#C9A84C" letter-spacing="3">LISTING PRICE</text>`
  )
  y += 60

  // Price text + USDC logo + USDC label
  if (priceStr) {
    const priceFontSize = 66
    const usdcFontSize  = 38

    // Price value
    parts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="${priceFontSize}" font-weight="700" fill="#C9A84C">${esc(priceStr)}</text>`
    )

    // Horizontal position: right of price text
    const priceTextW = priceStr.length * priceFontSize * 0.58
    const iconLeft   = Math.round(TEXT_X + priceTextW + 16)

    // Vertical position: icon centred on the cap-height of the price text
    const capMid  = Math.round(priceFontSize * 0.37)
    const iconTop = y - capMid - Math.round(USDC_ICON_SIZE / 2)

    if (usdcLogoBuffer) {
      // Composite the real USDC logo image (added by caller after SVG overlay)
      // Store position info for after the SVG parts loop
      composites.__usdcIcon = { input: usdcLogoBuffer, top: Math.max(0, iconTop), left: iconLeft }
    }

    // "USDC" text to the right of the icon
    const usdcX  = iconLeft + USDC_ICON_SIZE + 10
    const usdcCy = iconTop + Math.round(USDC_ICON_SIZE / 2)             // icon vertical centre
    const usdcY  = usdcCy + Math.round(usdcFontSize * 0.37)             // text baseline at that centre

    parts.push(
      `<text x="${usdcX}" y="${usdcY}" font-family="Arial,sans-serif" font-size="${usdcFontSize}" font-weight="700" fill="#FFFFFF">USDC</text>`
    )
  }

  const svgBuffer = Buffer.from(
    `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`
  )
  composites.push({ input: svgBuffer, top: 0, left: 0 })

  // Add USDC icon on top of text (needs to be after SVG so it isn't covered)
  if (composites.__usdcIcon) {
    const icon = composites.__usdcIcon
    delete composites.__usdcIcon
    composites.push(icon)
  }

  // ── Final output ──────────────────────────────────────────────────────────
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
