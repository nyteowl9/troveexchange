import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { emailBuyerFundsReleased, emailSellerFundsReleased } from '@/lib/emails'

// GET /api/cron/escrow-release
// Schedule: every 15 minutes (*/15 * * * *)
// Finds orders in inspection_window whose 72hr window has elapsed and auto-releases funds.
// Phase 3: will also call smart contract to release USDC.
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { released: 0, errors: [] }

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      buyer:buyer_id (email, full_name),
      seller:seller_id (email, full_name)
    `)
    .eq('status', 'inspection_window')
    .lte('auto_release_at', now.toISOString())

  for (const order of orders || []) {
    try {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'released',
          released_at: now.toISOString(),
        })
        .eq('id', order.id)

      // Email both parties
      await Promise.all([
        emailBuyerFundsReleased({ to: order.buyer.email, order }),
        emailSellerFundsReleased({ to: order.seller.email, order }),
      ])

      // Phase 3: trigger smart contract escrow release here
      // await releaseEscrow(order.escrow_tx_hash, order.seller.wallet_address, order.escrow_amount - fees)

      results.released++
    } catch (err) {
      results.errors.push({ order_id: order.id, error: err.message })
    }
  }

  return NextResponse.json(results)
}
