import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend, FROM } from '@/lib/resend'
import { emailSellerStrikeApplied, emailBuyerSelfShipDay7, emailBuyerSelfShipDay12, emailStaffSelfShipNoScan } from '@/lib/emails'

// GET /api/cron/strike-check
// Schedule: every hour (0 * * * *)
// 1. Sends 24-hour ship reminder for orders approaching deadline
// 2. Auto-applies strike for orders that missed the 48hr ship deadline
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { reminded: 0, struck: 0, self_ship_no_scan_alerted: 0, self_ship_warned: 0, errors: [] }

  const { data: tierConfig } = await supabaseAdmin
    .from('tier_config')
    .select('staff_alert_email')
    .eq('id', 1)
    .single()
  const staffAlertEmail = tierConfig?.staff_alert_email || null

  // ── 1. Send 24-hour reminders ─────────────────────────────────────────────
  // Orders where deadline is 20–28 hours away and reminder not yet sent
  const reminderWindow = new Date(now.getTime() + 20 * 60 * 60 * 1000)  // now + 20hrs
  const reminderCutoff = new Date(now.getTime() + 28 * 60 * 60 * 1000)  // now + 28hrs

  const { data: reminderOrders } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      seller:seller_id (email, full_name),
      listing:listing_id (card_name)
    `)
    .eq('status', 'awaiting_shipment')
    .eq('ship_reminder_sent', false)
    .gte('ship_deadline', reminderWindow.toISOString())
    .lte('ship_deadline', reminderCutoff.toISOString())

  for (const order of reminderOrders || []) {
    try {
      await supabaseAdmin
        .from('orders')
        .update({ ship_reminder_sent: true })
        .eq('id', order.id)

      await resend.emails.send({
        from: FROM,
        to: order.seller.email,
        subject: '⚠ 24hr shipping reminder — Chase Hollow',
        html: reminderEmailHtml(order),
      })

      results.reminded++
    } catch (err) {
      results.errors.push({ order_id: order.id, phase: 'reminder', error: err.message })
    }
  }

  // ── 2. Auto-apply strikes for missed deadlines ────────────────────────────
  // Orders where deadline has passed and strike hasn't been applied yet
  const { data: missedOrders } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      seller:seller_id (id, email, full_name, strike_count, suspended_until),
      listing:listing_id (card_name),
      buyer:buyer_id (email, full_name)
    `)
    .eq('status', 'awaiting_shipment')
    .is('strike_applied_at', null)
    .lt('ship_deadline', now.toISOString())

  for (const order of missedOrders || []) {
    try {
      // Count real seller strikes (excludes warnings and buyer strikes)
      const { count: realStrikeCount } = await supabaseAdmin
        .from('strikes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', order.seller_id)
        .eq('strike_role', 'seller')
        .neq('action_taken', 'warning')

      const { count: warningCount } = await supabaseAdmin
        .from('strikes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', order.seller_id)
        .eq('strike_role', 'seller')
        .eq('action_taken', 'warning')

      const realStrikes = realStrikeCount || 0
      const hasWarning  = (warningCount || 0) > 0

      let strikeNumber, actionTaken, reason, userUpdate

      if (realStrikes === 0 && !hasWarning) {
        // First offense ever — warning only, no suspension
        strikeNumber = 0
        actionTaken = 'warning'
        reason = 'No carrier scan by 48hr ship deadline (first offense — warning)'
        userUpdate = null
      } else if (realStrikes === 0) {
        // Had a warning before — this is Strike 1
        strikeNumber = 1
        actionTaken = '7_day_suspension'
        reason = 'No carrier scan by 48hr ship deadline (Strike 1)'
        userUpdate = {
          strike_count: (order.seller.strike_count || 0) + 1,
          suspended_until: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
      } else if (realStrikes === 1) {
        // Strike 2: 30-day suspension + bond bumps to 4%
        strikeNumber = 2
        actionTaken = '30_day_suspension'
        reason = 'No carrier scan by 48hr ship deadline (Strike 2)'
        userUpdate = {
          strike_count: (order.seller.strike_count || 0) + 1,
          suspended_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      } else {
        // Strike 3: permanent ban
        strikeNumber = 3
        actionTaken = 'permanent_ban'
        reason = 'No carrier scan by 48hr ship deadline (Strike 3 — permanent ban)'
        userUpdate = {
          strike_count: (order.seller.strike_count || 0) + 1,
          banned: true,
        }
      }

      // Insert strike record
      const { data: strikeRow, error: strikeErr } = await supabaseAdmin
        .from('strikes')
        .insert({
          user_id:     order.seller_id,
          order_id:    order.id,
          strike_number: strikeNumber,
          strike_role: 'seller',
          reason,
          action_taken: actionTaken,
        })
        .select()
        .single()
      if (strikeErr) throw new Error(`Strike insert failed: ${strikeErr.message}`)

      // Apply suspension/ban to user (if any)
      if (userUpdate) {
        await supabaseAdmin
          .from('users')
          .update(userUpdate)
          .eq('id', order.seller_id)
      }

      // Refund buyer: set order to refunded
      // Phase 3: this will trigger smart contract refund
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'refunded',
          strike_applied_at: now.toISOString(),
        })
        .eq('id', order.id)

      // Email seller
      if (actionTaken === 'warning') {
        await resend.emails.send({
          from: FROM,
          to: order.seller.email,
          subject: 'Shipping deadline missed — warning issued — Chase Hollow',
          html: warningEmailHtml(order),
        })
      } else {
        await emailSellerStrikeApplied({
          to: order.seller.email,
          strike: { strike_number: strikeNumber, reason, action_taken: actionTaken },
        })
      }

      // Email buyer about refund
      await resend.emails.send({
        from: FROM,
        to: order.buyer.email,
        subject: 'Order cancelled — seller did not ship — Chase Hollow',
        html: buyerRefundEmailHtml(order),
      })

      results.struck++
    } catch (err) {
      results.errors.push({ order_id: order.id, phase: 'strike', error: err.message })
    }
  }

  // ── 3. Self-ship no-carrier-scan alert (Day 3) ───────────────────────────
  // For tracked self-ship orders that have been in_transit 3+ days with no
  // Shippo TRANSIT webhook (carrier_scanned_at is null). Staff investigate —
  // could be a fake tracking number or unshipped package. One-shot per order.
  const day3Cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  const { data: noScanOrders } = await supabaseAdmin
    .from('orders')
    .select(`
      id, shipped_at, auto_release_at, tracking_a, self_ship_carrier
    `)
    .eq('status', 'in_transit')
    .eq('ship_method', 'self_ship')           // tracked-only — untracked has no number to verify
    .is('carrier_scanned_at', null)
    .is('self_ship_no_scan_warned_at', null)
    .lte('shipped_at', day3Cutoff.toISOString())

  for (const order of noScanOrders || []) {
    try {
      await supabaseAdmin
        .from('orders')
        .update({ self_ship_no_scan_warned_at: now.toISOString() })
        .eq('id', order.id)
      await emailStaffSelfShipNoScan({ order, staffEmail: staffAlertEmail })
      results.self_ship_no_scan_alerted++
    } catch (err) {
      results.errors.push({ order_id: order.id, phase: 'no_scan_alert', error: err.message })
    }
  }

  // ── 4. Self-ship delivery warnings ────────────────────────────────────────
  // Find in_transit self-ship orders past Day 7 (soft check) or Day 12 (urgent)
  // that haven't received confirmed delivery and haven't been warned yet.
  // These fire on separate columns so both emails can send independently.
  const day7Cutoff  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
  const day12Cutoff = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)

  const { data: selfShipOrders } = await supabaseAdmin
    .from('orders')
    .select(`
      id, shipped_at, auto_release_at, tracking_a, self_ship_carrier,
      self_ship_warned_7d_at, self_ship_warned_12d_at,
      buyer:buyer_id (email)
    `)
    .eq('status', 'in_transit')
    .in('ship_method', ['self_ship', 'self_ship_untracked'])
    .lte('shipped_at', day7Cutoff.toISOString())

  for (const order of selfShipOrders || []) {
    const shippedAt = new Date(order.shipped_at)

    // Day-12 urgent warning — runs first so it doesn't fire day-7 the same hour
    if (!order.self_ship_warned_12d_at && shippedAt <= day12Cutoff) {
      try {
        await supabaseAdmin
          .from('orders')
          .update({ self_ship_warned_12d_at: now.toISOString() })
          .eq('id', order.id)
        await emailBuyerSelfShipDay12({ to: order.buyer.email, order })
        results.self_ship_warned++
      } catch (err) {
        results.errors.push({ order_id: order.id, phase: 'self_ship_day12', error: err.message })
      }
      continue
    }

    // Day-7 soft check-in
    if (!order.self_ship_warned_7d_at) {
      try {
        await supabaseAdmin
          .from('orders')
          .update({ self_ship_warned_7d_at: now.toISOString() })
          .eq('id', order.id)
        await emailBuyerSelfShipDay7({ to: order.buyer.email, order })
        results.self_ship_warned++
      } catch (err) {
        results.errors.push({ order_id: order.id, phase: 'self_ship_day7', error: err.message })
      }
    }
  }

  return NextResponse.json(results)
}

function reminderEmailHtml(order) {
  const deadline = new Date(order.ship_deadline).toLocaleString('en-US', { timeZone: 'America/New_York' })
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0A0A0B;font-family:Arial,sans-serif;color:#F0EDE6;">
<div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2A2A32;border-radius:12px;padding:36px;">
  <p style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;margin:0 0 24px;">⬡ CHASE HOLLOW</p>
  <h2 style="margin:0 0 12px;font-size:22px;color:#F0EDE6;">24 Hours Left to Ship</h2>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">Order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0, 8).toUpperCase()}</strong> must ship by <strong style="color:#C84B3C;">${deadline} ET</strong>. Missing the deadline will trigger an auto-refund and a strike.</p>
  <a href="https://chasehollow.com/seller-dashboard" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:20px;">Ship Now</a>
</div></body></html>`
}

function warningEmailHtml(order) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0A0A0B;font-family:Arial,sans-serif;color:#F0EDE6;">
<div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2A2A32;border-radius:12px;padding:36px;">
  <p style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;margin:0 0 24px;">⬡ CHASE HOLLOW</p>
  <h2 style="margin:0 0 12px;font-size:22px;color:#E8A838;">Shipping Deadline Missed — Warning</h2>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">You missed the 48-hour ship deadline on order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0, 8).toUpperCase()}</strong>. The buyer has been refunded.</p>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">This is your <strong style="color:#F0EDE6;">first offense — a warning only</strong>. A repeat offense will result in a 7-day suspension. You have 7 days to appeal.</p>
  <a href="https://chasehollow.com/seller-dashboard" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:20px;">View Dashboard</a>
</div></body></html>`
}

function buyerRefundEmailHtml(order) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0A0A0B;font-family:Arial,sans-serif;color:#F0EDE6;">
<div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2A2A32;border-radius:12px;padding:36px;">
  <p style="font-family:Georgia,serif;font-size:20px;color:#C9A84C;margin:0 0 24px;">⬡ CHASE HOLLOW</p>
  <h2 style="margin:0 0 12px;font-size:22px;color:#4CAF7C;">Order Cancelled — Full Refund Issued</h2>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">The seller did not ship order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0, 8).toUpperCase()}</strong> within the 48-hour window. Your USDC has been returned to your wallet.</p>
  <p style="color:#B8B4AC;font-size:14px;line-height:1.6;">A strike has been applied to the seller's account.</p>
  <a href="https://chasehollow.com/buyer-dashboard" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:20px;">View Dashboard</a>
</div></body></html>`
}
