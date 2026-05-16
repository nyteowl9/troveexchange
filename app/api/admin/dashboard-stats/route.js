import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Statuses that mean the order is still in flight (USDC locked in escrow)
const ACTIVE_STATUSES = [
  'awaiting_shipment', 'in_transit', 'auth_review', 'auth_passed',
  'inspection_window', 'disputed', 'awaiting_return',
  'return_received_seller', 'return_received', 'auth_failed',
]

async function assertOwner(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'owner' ? user : null
}

// GET /api/admin/dashboard-stats
// Returns live aggregates for admin overview, escrow monitor, and financials.
export async function GET(req) {
  const owner = await assertOwner(req)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    // ── In-flight escrow (Escrow Summary card + Escrow Monitor metrics) ──
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('escrow_amount, status, auto_release_at, listing:listing_id (card_name)')
      .in('status', ACTIVE_STATUSES)

    const active = activeOrders || []
    const totalLocked   = active.reduce((s, o) => s + parseFloat(o.escrow_amount || 0), 0)
    const activeCount   = active.length
    const avgOrder      = activeCount > 0 ? totalLocked / activeCount : 0

    const largest       = active.reduce((max, o) =>
      parseFloat(o.escrow_amount || 0) > parseFloat(max?.escrow_amount || 0) ? o : max, null)

    const now           = new Date()
    const endOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const releasingToday = active.filter(o =>
      o.status === 'inspection_window' &&
      o.auto_release_at &&
      new Date(o.auto_release_at) < endOfToday
    )
    const releasingTodayAmount = releasingToday.reduce((s, o) => s + parseFloat(o.escrow_amount || 0), 0)

    const disputedOrders = active.filter(o => o.status === 'disputed')
    const disputeHoldsAmount = disputedOrders.reduce((s, o) => s + parseFloat(o.escrow_amount || 0), 0)

    // ── All-time financials (released orders only) ────────────────────────
    const { data: releasedOrders } = await supabase
      .from('orders')
      .select('escrow_amount, platform_fee, auth_fee, released_at')
      .eq('status', 'released')

    const released = releasedOrders || []
    const allTimeVolume = released.reduce((s, o) => s + parseFloat(o.escrow_amount || 0), 0)
    const allTimeFees   = released.reduce((s, o) => s + parseFloat(o.platform_fee || 0), 0)
    const allTimeAuthFees = released.reduce((s, o) => s + parseFloat(o.auth_fee || 0), 0)

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthReleased = released.filter(o => o.released_at && new Date(o.released_at) >= monthStart)
    const monthVolume   = monthReleased.reduce((s, o) => s + parseFloat(o.escrow_amount || 0), 0)
    const monthFees     = monthReleased.reduce((s, o) => s + parseFloat(o.platform_fee || 0), 0)

    // ── Bonds in-flight ───────────────────────────────────────────────────
    const { data: bondOrders } = await supabase
      .from('orders')
      .select('bond_amount')
      .in('status', ACTIVE_STATUSES)
      .is('bond_returned_at', null)

    const bondsInFlight = (bondOrders || []).reduce((s, o) => s + parseFloat(o.bond_amount || 0), 0)

    return NextResponse.json({
      escrow: {
        totalLocked,
        activeCount,
        avgOrder,
        largest: largest ? { amount: parseFloat(largest.escrow_amount || 0), cardName: largest.listing?.card_name || '—' } : null,
        releasingToday: { count: releasingToday.length, amount: releasingTodayAmount },
        disputeHolds:   { count: disputedOrders.length, amount: disputeHoldsAmount },
      },
      financials: {
        allTimeVolume,
        allTimeFees,
        allTimeAuthFees,
        authFeeCount:  released.filter(o => parseFloat(o.auth_fee || 0) > 0).length,
        monthVolume,
        monthFees,
        bondsInFlight,
      },
      contract: {
        address: process.env.NEXT_PUBLIC_ESCROW_ADDRESS || null,
      },
    })
  } catch (err) {
    console.error('[admin/dashboard-stats]', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
