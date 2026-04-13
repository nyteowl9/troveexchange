import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/webhooks/shippo
// Handles carrier scan and delivery events from Shippo
export async function POST(request) {
  try {
    const body = await request.json()
    const { event, data } = body

    if (!event || !data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const trackingNumber = data.tracking_number
    if (!trackingNumber) return NextResponse.json({ ok: true })

    // Find order by tracking number (A or B)
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(`tracking_a.eq.${trackingNumber},tracking_b.eq.${trackingNumber}`)
      .limit(1)

    const order = orders?.[0]
    if (!order) return NextResponse.json({ ok: true }) // Not our order

    const isTrackingA = order.tracking_a === trackingNumber

    // Transit event — first carrier scan
    if (event === 'track_updated' && data.tracking_status?.status === 'TRANSIT') {
      if (isTrackingA && order.status === 'awaiting_shipment') {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'in_transit',
            shipped_at: new Date().toISOString(),
          })
          .eq('id', order.id)
      }
    }

    // Delivered event
    if (event === 'track_updated' && data.tracking_status?.status === 'DELIVERED') {
      if (isTrackingA && order.auth_tier === 'physical') {
        // Tier 2 Label A delivered to auth center — trigger auth review
        await supabaseAdmin
          .from('orders')
          .update({ status: 'auth_review' })
          .eq('id', order.id)

      } else if (isTrackingA && order.auth_tier === 'remote') {
        // Tier 1 delivered to buyer — open 72hr inspection window
        const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'inspection_window',
            delivered_at: new Date().toISOString(),
            auto_release_at: autoReleaseAt,
          })
          .eq('id', order.id)

      } else if (!isTrackingA && order.auth_tier === 'physical') {
        // Tier 2 Label B delivered to buyer — open 72hr inspection window
        const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'inspection_window',
            delivered_at: new Date().toISOString(),
            auto_release_at: autoReleaseAt,
          })
          .eq('id', order.id)
      }
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[webhooks/shippo]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
