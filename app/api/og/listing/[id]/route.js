import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Frame position constants ─────────────────────────────────────────────────
// Adjust these to move/resize where the card photo lands in the gold frame.
const FRAME_LEFT = 545   // px from left edge of 1080px canvas
const FRAME_TOP  = 48    // px from top edge
const FRAME_W    = 415   // width of the card photo area
const FRAME_H    = 592   // height of the card photo area

// ── Text layout constants ────────────────────────────────────────────────────
const TEXT_X        = 45   // left margin for all text
const TITLE_START_Y = 515  // where the card name starts (below "NEW LISTING")

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

  // Build the main card title line
  const mainTitle = isGraded
    ? `${card_name} ${grader}${grade}`
    : card_name || 'Listing'

  const priceNum = price ? parseFloat(price) : null
  const priceStr = priceNum != null ? `$${priceNum.toLocaleString()}` : null

  // ── Load background template ─────────────────────────────────────────────
  const bgPath = path.join(process.cwd(), 'public/images/share-bg.png')
  if (!fs.existsSync(bgPath)) {
    return new Response('Background template missing — place share-bg.png in public/images/', { status: 500 })
  }
  const bgBuffer = fs.readFileSync(bgPath)

  // ── Fetch + resize card photo ─────────────────────────────────────────────
  const composites = []
  const rawUrl = photos?.[0]
  if (rawUrl) {
    try {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const buf        = await res.arrayBuffer()
        const cardResized = await sharp(Buffer.from(buf))
          .resize(FRAME_W, FRAME_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
        composites.push({ input: cardResized, top: FRAME_TOP, left: FRAME_LEFT })
      }
    } catch {}
  }

  // ── Build SVG text overlay ────────────────────────────────────────────────
  const titleFontSize  = mainTitle.length > 30 ? 36 : mainTitle.length > 20 ? 42 : 48
  const titleMaxChars  = Math.floor(420 / (titleFontSize * 0.58))
  const titleLines     = wrapText(mainTitle, titleMaxChars)
  const titleLineH     = Math.round(titleFontSize * 1.28)

  let y = TITLE_START_Y
  const textParts = []

  // Card name (white bold)
  for (const line of titleLines) {
    textParts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#FFFFFF">${esc(line)}</text>`
    )
    y += titleLineH
  }

  y += 28 // gap after title

  // Game name
  if (game) {
    textParts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial, sans-serif" font-size="22" fill="#B8B4AC">${esc(game)}</text>`
    )
    y += 32
  }

  // Set name
  if (cardSet) {
    textParts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial, sans-serif" font-size="22" fill="#B8B4AC">${esc(cardSet)}</text>`
    )
    y += 32
  }

  y += 24 // gap before price section

  // "LISTING PRICE" label
  textParts.push(
    `<text x="${TEXT_X}" y="${y}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#C9A84C" letter-spacing="3">LISTING PRICE</text>`
  )
  y += 58

  // Price value + USDC coin
  if (priceStr) {
    const priceFontSize = 66
    textParts.push(
      `<text x="${TEXT_X}" y="${y}" font-family="Arial, sans-serif" font-size="${priceFontSize}" font-weight="700" fill="#C9A84C">${esc(priceStr)}</text>`
    )

    // Estimate width of price text to position USDC icon
    const priceTextW = priceStr.length * priceFontSize * 0.58
    const coinCx     = TEXT_X + priceTextW + 32
    const coinCy     = y - 20
    const coinR      = 22

    // USDC coin (blue circle with $ sign)
    textParts.push(`<circle cx="${coinCx}" cy="${coinCy}" r="${coinR}" fill="#2775CA"/>`)
    textParts.push(
      `<text x="${coinCx}" y="${coinCy + 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#FFFFFF">$</text>`
    )
    // "USDC" label
    textParts.push(
      `<text x="${coinCx + coinR + 10}" y="${y}" font-family="Arial, sans-serif" font-size="30" font-weight="600" fill="#FFFFFF">USDC</text>`
    )
  }

  const svgBuffer = Buffer.from(
    `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">${textParts.join('')}</svg>`
  )
  composites.push({ input: svgBuffer, top: 0, left: 0 })

  // ── Composite and return ──────────────────────────────────────────────────
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
  const words = text.split(' ')
  const lines = []
  let current = ''
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
