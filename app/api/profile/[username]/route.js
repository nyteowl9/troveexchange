import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/profile/[username]
// Returns: profile + reviews + completed sales (public data only)
export async function GET(_req, { params }) {
  const { username } = await params

  // Load user — select * to avoid column-not-found errors as schema evolves
  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (userErr) {
    console.error('[profile/username] Supabase error:', userErr)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Load reviews received (as seller) — last 50
  const { data: sellerReviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, reviewer_role, created_at, reviewer_id')
    .eq('reviewed_id', user.id)
    .eq('reviewer_role', 'buyer')
    .eq('flagged', false)
    .order('created_at', { ascending: false })
    .limit(50)

  // Load reviews received (as buyer) — last 50
  const { data: buyerReviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, reviewer_role, created_at, reviewer_id')
    .eq('reviewed_id', user.id)
    .eq('reviewer_role', 'seller')
    .eq('flagged', false)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get reviewer usernames for display
  const allReviews     = [...(sellerReviews || []), ...(buyerReviews || [])]
  const reviewerIds    = [...new Set(allReviews.map(r => r.reviewer_id))]
  let reviewerMap      = {}
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from('users')
      .select('id, username')
      .in('id', reviewerIds)
    reviewers?.forEach(u => { reviewerMap[u.id] = u.username })
  }

  const enrichReviews = (list) =>
    list?.map(r => ({ ...r, reviewer_username: reviewerMap[r.reviewer_id] || 'anonymous' })) || []

  // Completed sales (public — card name, price, date only)
  const { data: salesHistory } = await supabase
    .from('orders')
    .select('id, escrow_amount, released_at, listing:listing_id(card_name, grade, grader)')
    .eq('seller_id', user.id)
    .eq('status', 'released')
    .order('released_at', { ascending: false })
    .limit(50)

  // Fallback: compute rep scores directly from reviews if stored value is null
  const computedSellerScore = (sellerReviews?.length || 0) > 0
    ? Math.round((sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length) * 100) / 100
    : null
  const computedBuyerScore = (buyerReviews?.length || 0) > 0
    ? Math.round((buyerReviews.reduce((s, r) => s + r.rating, 0) / buyerReviews.length) * 100) / 100
    : null

  const enrichedUser = {
    ...user,
    seller_rep_score:    user.seller_rep_score    ?? computedSellerScore,
    seller_review_count: user.seller_review_count || sellerReviews?.length || 0,
    buyer_rep_score:     user.buyer_rep_score     ?? computedBuyerScore,
    buyer_review_count:  user.buyer_review_count  || buyerReviews?.length  || 0,
  }

  return NextResponse.json({
    user: enrichedUser,
    sellerReviews: enrichReviews(sellerReviews),
    buyerReviews:  enrichReviews(buyerReviews),
    salesHistory:  salesHistory || [],
  })
}
