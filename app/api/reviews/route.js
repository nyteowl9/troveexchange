import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/reviews
// Body: { order_id, reviewer_id, rating, comment }
// reviewer_role is derived server-side from the order (buyer or seller)
export async function POST(req) {
  try {
    const { order_id, reviewer_id, rating, comment } = await req.json()

    if (!order_id || !reviewer_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }

    // Load the order — must be released (settled)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, status')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status !== 'released') {
      return NextResponse.json({ error: 'Reviews only allowed after order is settled' }, { status: 403 })
    }

    // Determine reviewer_role and reviewed_id
    let reviewer_role, reviewed_id
    if (reviewer_id === order.buyer_id) {
      reviewer_role = 'buyer'
      reviewed_id   = order.seller_id
    } else if (reviewer_id === order.seller_id) {
      reviewer_role = 'seller'
      reviewed_id   = order.buyer_id
    } else {
      return NextResponse.json({ error: 'Reviewer is not a party to this order' }, { status: 403 })
    }

    // Insert review (unique constraint handles duplicate prevention)
    const { error: insertErr } = await supabase
      .from('reviews')
      .insert({ order_id, reviewer_id, reviewed_id, reviewer_role, rating: Number(rating), comment: comment?.trim() || null })

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'Review already submitted for this order' }, { status: 409 })
      }
      throw insertErr
    }

    // Recalculate scores for the reviewed user
    await supabase.rpc('update_review_scores', { p_user_id: reviewed_id })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reviews] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
