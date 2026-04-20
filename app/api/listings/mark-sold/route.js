import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

// POST /api/listings/mark-sold
// Called by checkout after fundOrder succeeds. Uses service role to bypass RLS
// since the buyer doesn't own the listing.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { listing_id, order_id } = await request.json()
    if (!listing_id) return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 })

    // Verify the order belongs to this buyer before marking sold
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id')
      .eq('id', order_id)
      .eq('buyer_id', user.id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    await supabaseAdmin
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[listings/mark-sold]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
