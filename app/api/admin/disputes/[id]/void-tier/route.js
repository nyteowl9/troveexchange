import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function assertOwner(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'owner' ? user : null
}

// POST /api/admin/disputes/[id]/void-tier
// Body: { void: true|false, reason?: string }
// Marks a dispute as not counting toward the seller's tier eligibility.
// The dispute record is NOT deleted — it remains visible for transparency.
export async function POST(req, { params }) {
  const owner = await assertOwner(req)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const { void: shouldVoid, reason } = await req.json()

  // Load dispute to find seller
  const { data: dispute } = await supabase
    .from('disputes')
    .select('id, order_id, outcome, voided_for_tier')
    .eq('id', id)
    .single()

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  // Update void flag
  const { error } = await supabase
    .from('disputes')
    .update({
      voided_for_tier: shouldVoid,
      void_reason: shouldVoid ? (reason?.trim() || 'Voided by admin') : null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalculate tier for the seller (if dispute was a loss)
  if (dispute.outcome === 'buyer_wins') {
    const { data: order } = await supabase
      .from('orders')
      .select('seller_id')
      .eq('id', dispute.order_id)
      .single()

    if (order?.seller_id) {
      await supabase.rpc('recalculate_user_tier', { p_user_id: order.seller_id })
    }
  }

  return NextResponse.json({ success: true, voided_for_tier: shouldVoid })
}
