import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

// POST /api/referral/convert
// Called at order creation to record a referral conversion.
// Body: { order_id }       — sale_amount is NEVER trusted from body; computed from the order.
// Reads the ch-ref cookie — no ref cookie = no-op (returns null, not an error).
export async function POST(request) {
  try {
    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    // Must be an authenticated buyer
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read attribution cookie
    const cookieStore = await cookies()
    const refCode = cookieStore.get('ch-ref')?.value
    if (!refCode) {
      return NextResponse.json({ attributed: false })
    }

    // Look up creator by ref_code (must be active/approved)
    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('id, user_id')
      .eq('ref_code', refCode)
      .eq('status', 'approved')
      .single()

    if (!creator) {
      return NextResponse.json({ attributed: false })
    }

    // Block self-referral
    if (creator.user_id === user.id) {
      return NextResponse.json({ attributed: false, reason: 'self_referral' })
    }

    // ── Compute commission from the order itself ─────────────────────────
    // Never trust sale_amount from the body — a malicious caller could spoof
    // a $50,000 conversion on a $10 order to inflate creator payout.
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, escrow_amount, listing:listing_id (price)')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only the order's buyer can trigger their own conversion
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Source of truth: listing price (what the seller sold for, excluding fees/shipping)
    // Falls back to escrow_amount if price isn't available
    const saleAmount = parseFloat(order.listing?.price ?? order.escrow_amount ?? 0)
    if (!saleAmount || saleAmount <= 0) {
      return NextResponse.json({ error: 'Invalid order sale amount' }, { status: 400 })
    }

    // 0.5% commission
    const commission = parseFloat((saleAmount * 0.005).toFixed(2))

    // Insert conversion record (ignore duplicate order — upsert on order_id)
    const { error } = await supabaseAdmin
      .from('referral_conversions')
      .upsert(
        {
          creator_id:   creator.id,
          order_id,
          sale_amount:  saleAmount,
          commission,
          paid:         false,
          converted_at: new Date().toISOString(),
        },
        { onConflict: 'order_id' }
      )

    if (error) {
      console.error('[referral/convert] DB error:', error)
      return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 })
    }

    return NextResponse.json({ attributed: true, creator_id: creator.id, commission })

  } catch (err) {
    console.error('[referral/convert]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
