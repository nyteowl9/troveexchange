import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/profile/[username]
// Returns: profile + reviews + completed sales (public data only)
export async function GET(req, { params }) {
  const { username } = await params

  // Load user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select(`
      id, username, full_name, wallet_address, role,
      seller_tier, total_sales, strike_count,
      seller_rep_score, seller_review_count,
      buyer_rep_score,  buyer_review_count,
      joined_at
    `)
    .eq('username', username.toLowerCase())
    .single()

  if (userErr || !user) {
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
    .select('id, escrow_amount, status, released_at')
    .eq('seller_id', user.id)
    .eq('status', 'released')
    .order('released_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    user,
    sellerReviews: enrichReviews(sellerReviews),
    buyerReviews:  enrichReviews(buyerReviews),
    salesHistory:  salesHistory || [],
  })
}
