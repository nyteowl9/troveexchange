import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { emailBuyerWrongCardReceived, emailSellerWrongCardReceived } from '@/lib/emails'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function assertAuthStaff(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return ['authenticator', 'staff', 'owner'].includes(data?.role) ? user : null
}

/**
 * POST /api/admin/orders/[id]/wrong-card
 * Body: { notes: string }
 *
 * Called by authenticator when the return received doesn't match the original card.
 * - Sets wrong_card_flag = true, status = wrong_card_received
 * - Resets return_deadline_at to now + 5 days (buyer gets 5 more days to ship correct card)
 * - Emails buyer (action required) and seller (informational)
 */
export async function POST(req, { params }) {
  const user = await assertAuthStaff(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const { notes } = await req.json()

  const { data: order } = await supabase
    .from('orders')
    .select('*, buyer:buyer_id(email, full_name), seller:seller_id(email, full_name)')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.status !== 'return_received') {
    return NextResponse.json(
      { error: 'Order must be in return_received status to flag wrong card' },
      { status: 400 }
    )
  }

  // Reset deadline from now + 5 days (fresh window for buyer to ship correct card)
  const newDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'wrong_card_received',
      wrong_card_flag: true,
      wrong_card_at: now,
      wrong_card_notes: notes?.trim() || null,
      return_deadline_at: newDeadline,
      // Reset email flags so warnings fire again on the new deadline
      return_warning_2_sent: false,
      return_warning_4_sent: false,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Internal error'}, { status: 500 })

  // Notify both parties
  await Promise.all([
    emailBuyerWrongCardReceived({ to: order.buyer.email, order, notes }),
    emailSellerWrongCardReceived({ to: order.seller.email, order }),
  ])

  return NextResponse.json({ success: true, new_deadline: newDeadline })
}
