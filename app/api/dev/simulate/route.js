import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { callMarkDelivered } from '@/lib/escrow'

// POST /api/dev/simulate
// DEV ONLY — simulates carrier scan / delivery events so you can test the
// full order flow without physically shipping anything.
//
// Enable by setting DEV_SIMULATE=true in .env.local (never set this in prod).
//
// Body: { order_id, step }
//
// Steps (Tier 2 — physical auth):
//   carrier_scan_a     awaiting_shipment  → in_transit
//   delivered_auth     in_transit         → auth_review
//   carrier_scan_b     (no-op, order stays auth_passed after Label B generated)
//   delivered_buyer    auth_passed        → inspection_window
//
// Steps (Tier 1 — remote auth):
//   carrier_scan_a     awaiting_shipment  → in_transit
//   delivered_buyer    in_transit         → inspection_window
//
// Non-carrier steps (done via real pages/APIs):
//   auth pass/fail  →  /authenticator page  →  POST /api/auth-inspection/submit
//   label B         →  /authenticator page  →  POST /api/shipping/label (label B)
//   buyer release   →  /buyer-dashboard     →  POST /api/orders/release
// Belt-and-suspenders: this route MUST be impossible to enable in production.
// Even if DEV_SIMULATE=true gets accidentally set in Vercel, the chain ID
// check ensures it only ever runs against the testnet contract.
const ALLOWED =
  process.env.DEV_SIMULATE === 'true' &&
  process.env.NEXT_PUBLIC_CHAIN_ID === '84532'   // Base Sepolia only

export async function POST(request) {
  if (!ALLOWED) {
    return NextResponse.json({ error: 'Simulation endpoint disabled' }, { status: 403 })
  }

  try {
    const { order_id, step } = await request.json()
    if (!order_id || !step) {
      return NextResponse.json({ error: 'order_id and step required' }, { status: 400 })
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, auth_tier, ship_method, tracking_a, tracking_b, onchain_order_id')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    switch (step) {

      case 'carrier_scan_a': {
        if (order.status !== 'awaiting_shipment') {
          return NextResponse.json({ error: `Expected awaiting_shipment, got: ${order.status}` }, { status: 400 })
        }
        await supabaseAdmin
          .from('orders')
          .update({ status: 'in_transit', shipped_at: new Date().toISOString() })
          .eq('id', order_id)
        return NextResponse.json({ ok: true, prev: 'awaiting_shipment', next: 'in_transit' })
      }

      case 'delivered_auth': {
        if (order.auth_tier !== 'physical') {
          return NextResponse.json({ error: 'delivered_auth only applies to Tier 2 (physical) orders' }, { status: 400 })
        }
        if (order.status !== 'in_transit') {
          return NextResponse.json({ error: `Expected in_transit, got: ${order.status}` }, { status: 400 })
        }
        await supabaseAdmin
          .from('orders')
          .update({ status: 'auth_review' })
          .eq('id', order_id)
        return NextResponse.json({ ok: true, prev: 'in_transit', next: 'auth_review' })
      }

      case 'carrier_scan_b': {
        // Label B carrier scan doesn't change status — order stays auth_passed
        return NextResponse.json({
          ok: true,
          prev: order.status,
          next: order.status,
          note: 'Label B first scan does not change status — order stays auth_passed until delivered',
        })
      }

      case 'delivered_buyer': {
        const expectedStatus = order.auth_tier === 'physical' ? 'auth_passed' : 'in_transit'
        if (order.status !== expectedStatus) {
          return NextResponse.json({ error: `Expected ${expectedStatus}, got: ${order.status}` }, { status: 400 })
        }
        const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'inspection_window',
            delivered_at: new Date().toISOString(),
            auto_release_at: autoReleaseAt,
          })
          .eq('id', order_id)
        // Advance on-chain state so buyer can call openDispute
        await callMarkDelivered(order.onchain_order_id)
        return NextResponse.json({
          ok: true,
          prev: order.status,
          next: 'inspection_window',
          auto_release_at: autoReleaseAt,
          note: '72hr inspection window started. Buyer can release early or dispute.',
        })
      }

      // ── Self-ship specific steps ───────────────────────────────────────────

      case 'self_ship_transit': {
        // Simulates the Shippo TRANSIT webhook firing for a self-ship in_transit order.
        // Stamps carrier_scanned_at — used to verify Day-3 no-scan detection works.
        if (!['self_ship', 'self_ship_untracked'].includes(order.ship_method)) {
          return NextResponse.json({ error: 'Order is not a self-ship order' }, { status: 400 })
        }
        if (order.status !== 'in_transit') {
          return NextResponse.json({ error: `Expected in_transit, got: ${order.status}` }, { status: 400 })
        }
        await supabaseAdmin
          .from('orders')
          .update({ carrier_scanned_at: new Date().toISOString() })
          .eq('id', order_id)
        return NextResponse.json({ ok: true, note: 'carrier_scanned_at stamped — Day-3 alert will not fire for this order' })
      }

      case 'self_ship_delivered': {
        // Simulates DELIVERED for a self-ship order → opens 72hr inspection window.
        if (!['self_ship', 'self_ship_untracked'].includes(order.ship_method)) {
          return NextResponse.json({ error: 'Order is not a self-ship order' }, { status: 400 })
        }
        if (order.status !== 'in_transit') {
          return NextResponse.json({ error: `Expected in_transit, got: ${order.status}` }, { status: 400 })
        }
        const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('orders')
          .update({
            status:          'inspection_window',
            delivered_at:    new Date().toISOString(),
            auto_release_at: autoReleaseAt,
            carrier_scanned_at: new Date().toISOString(),
          })
          .eq('id', order_id)
        await callMarkDelivered(order.onchain_order_id)
        return NextResponse.json({
          ok: true,
          prev: 'in_transit',
          next: 'inspection_window',
          auto_release_at: autoReleaseAt,
          note: '72hr inspection window started.',
        })
      }

      default:
        return NextResponse.json({
          error: `Unknown step: "${step}". Valid steps: carrier_scan_a, delivered_auth, carrier_scan_b, delivered_buyer, self_ship_transit, self_ship_delivered`,
        }, { status: 400 })
    }
  } catch (err) {
    console.error('[dev/simulate]', err)
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 })
  }
}
