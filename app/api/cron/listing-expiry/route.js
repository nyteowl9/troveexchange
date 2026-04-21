import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend, FROM } from '@/lib/resend'

// GET /api/cron/listing-expiry
// Schedule: daily at 9am UTC (0 9 * * *)
//
// Listing lifecycle (all relative to created_at):
//   Day 75: Warning email — 15 days left
//   Day 85: Warning email — 5 days left
//   Day 90: Listing pauses (status → 'paused')
//   Day 97: Warning email — 3 days until removal
//   Day 100: Listing expires and is removed (status → 'expired')
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { warned_75: 0, warned_85: 0, paused: 0, warned_97: 0, expired: 0, suspension_restored: 0, errors: [] }

  // ── Restore listings when suspension period ends ───────────────────────────
  const { data: expiredSuspensions } = await supabaseAdmin
    .from('users')
    .select('id')
    .not('suspended_until', 'is', null)
    .lt('suspended_until', now.toISOString())
    .eq('banned', false)

  for (const u of expiredSuspensions || []) {
    try {
      await supabaseAdmin.from('users').update({ suspended_until: null }).eq('id', u.id)
      const { count } = await supabaseAdmin
        .from('listings').update({ status: 'active' })
        .eq('seller_id', u.id).eq('status', 'suspended_pause')
      results.suspension_restored += count || 0
    } catch (err) {
      results.errors.push({ user_id: u.id, phase: 'suspension_restore', error: err.message })
    }
  }

  // ── Day 75 warnings ───────────────────────────────────────────────────────
  const day75Cutoff = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000)
  const { data: warn75 } = await supabaseAdmin
    .from('listings')
    .select('id, card_name, expires_at, warning_75_sent, seller:seller_id (email, full_name)')
    .eq('status', 'active')
    .eq('warning_75_sent', false)
    .lte('created_at', day75Cutoff.toISOString())

  for (const listing of warn75 || []) {
    try {
      await supabaseAdmin.from('listings').update({ warning_75_sent: true }).eq('id', listing.id)
      await sendExpiryWarningEmail(listing.seller.email, listing, 15, 'Day 75')
      results.warned_75++
    } catch (err) {
      results.errors.push({ listing_id: listing.id, phase: 'warn_75', error: err.message })
    }
  }

  // ── Day 85 warnings ───────────────────────────────────────────────────────
  const day85Cutoff = new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000)
  const { data: warn85 } = await supabaseAdmin
    .from('listings')
    .select('id, card_name, expires_at, warning_85_sent, seller:seller_id (email, full_name)')
    .eq('status', 'active')
    .eq('warning_85_sent', false)
    .lte('created_at', day85Cutoff.toISOString())

  for (const listing of warn85 || []) {
    try {
      await supabaseAdmin.from('listings').update({ warning_85_sent: true }).eq('id', listing.id)
      await sendExpiryWarningEmail(listing.seller.email, listing, 5, 'Day 85')
      results.warned_85++
    } catch (err) {
      results.errors.push({ listing_id: listing.id, phase: 'warn_85', error: err.message })
    }
  }

  // ── Day 90 — pause expired listings ──────────────────────────────────────
  const { data: toPause } = await supabaseAdmin
    .from('listings')
    .select('id, card_name, seller:seller_id (email, full_name)')
    .eq('status', 'active')
    .lte('expires_at', now.toISOString())

  for (const listing of toPause || []) {
    try {
      await supabaseAdmin.from('listings').update({ status: 'paused' }).eq('id', listing.id)
      await sendPausedEmail(listing.seller.email, listing)
      results.paused++
    } catch (err) {
      results.errors.push({ listing_id: listing.id, phase: 'pause', error: err.message })
    }
  }

  // ── Day 97 warnings (7 days after pause = expires_at + 7 days) ───────────
  const { data: warn97 } = await supabaseAdmin
    .from('listings')
    .select('id, card_name, expires_at, warning_97_sent, seller:seller_id (email, full_name)')
    .eq('status', 'paused')
    .eq('warning_97_sent', false)
    .lte('expires_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())

  for (const listing of warn97 || []) {
    try {
      await supabaseAdmin.from('listings').update({ warning_97_sent: true }).eq('id', listing.id)
      await sendRemovalWarningEmail(listing.seller.email, listing)
      results.warned_97++
    } catch (err) {
      results.errors.push({ listing_id: listing.id, phase: 'warn_97', error: err.message })
    }
  }

  // ── Day 100 — permanently expire and remove ───────────────────────────────
  const { data: toExpire } = await supabaseAdmin
    .from('listings')
    .select('id, card_name, seller:seller_id (email, full_name)')
    .eq('status', 'paused')
    .lte('expires_at', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString())

  for (const listing of toExpire || []) {
    try {
      await supabaseAdmin.from('listings').update({ status: 'expired' }).eq('id', listing.id)
      await sendExpiredEmail(listing.seller.email, listing)
      results.expired++
    } catch (err) {
      results.errors.push({ listing_id: listing.id, phase: 'expire', error: err.message })
    }
  }

  return NextResponse.json(results)
}

// ── Email helpers ─────────────────────────────────────────────────────────────

async function sendExpiryWarningEmail(to, listing, daysLeft, dayLabel) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your listing expires in ${daysLeft} days — Chase Hollow`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0A0A0B;font-family:Arial,sans-serif;color:#F0EDE6;">
<div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2A2A32;border-radius:12px;padding:36px;">
  <p style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;margin:0 0 24px;">⬡ CHASE HOLLOW</p>
  <h2 style="margin:0 0 12px;font-size:22px;color:#E8A838;">Listing Expires in ${daysLeft} Days</h2>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">Your listing <strong style="color:#F0EDE6;">${listing.card_name}</strong> will expire in ${daysLeft} days. Renew it from your dashboard to keep it live.</p>
  <a href="https://chasehollow.com/seller-dashboard" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:20px;">Renew Listing</a>
</div></body></html>`,
  })
}

async function sendPausedEmail(to, listing) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Your listing has been paused — Chase Hollow',
    html: `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0A0A0B;font-family:Arial,sans-serif;color:#F0EDE6;">
<div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2A2A32;border-radius:12px;padding:36px;">
  <p style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;margin:0 0 24px;">⬡ CHASE HOLLOW</p>
  <h2 style="margin:0 0 12px;font-size:22px;color:#E8A838;">Listing Paused — 90 Day Limit Reached</h2>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">Your listing <strong style="color:#F0EDE6;">${listing.card_name}</strong> has been paused. Renew it within 10 days or it will be permanently removed.</p>
  <a href="https://chasehollow.com/seller-dashboard" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:20px;">Renew Listing</a>
</div></body></html>`,
  })
}

async function sendRemovalWarningEmail(to, listing) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Your listing will be removed in 3 days — Chase Hollow',
    html: `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0A0A0B;font-family:Arial,sans-serif;color:#F0EDE6;">
<div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2A2A32;border-radius:12px;padding:36px;">
  <p style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;margin:0 0 24px;">⬡ CHASE HOLLOW</p>
  <h2 style="margin:0 0 12px;font-size:22px;color:#C84B3C;">Listing Removed in 3 Days</h2>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">Your listing <strong style="color:#F0EDE6;">${listing.card_name}</strong> will be permanently removed in 3 days. Renew now to keep it on the marketplace.</p>
  <a href="https://chasehollow.com/seller-dashboard" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:20px;">Renew Now</a>
</div></body></html>`,
  })
}

async function sendExpiredEmail(to, listing) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Your listing has been removed — Chase Hollow',
    html: `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0A0A0B;font-family:Arial,sans-serif;color:#F0EDE6;">
<div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2A2A32;border-radius:12px;padding:36px;">
  <p style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;margin:0 0 24px;">⬡ CHASE HOLLOW</p>
  <h2 style="margin:0 0 12px;font-size:22px;color:#6C6A66;">Listing Removed</h2>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">Your listing <strong style="color:#F0EDE6;">${listing.card_name}</strong> has been removed from the marketplace after 100 days. You can create a new listing at any time.</p>
  <a href="https://chasehollow.com/seller-dashboard" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:20px;">Create New Listing</a>
</div></body></html>`,
  })
}
