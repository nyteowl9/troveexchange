import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { emailSellerBondReturned } from '@/lib/emails'

// GET /api/cron/bond-return
// Schedule: daily at 10am UTC (0 10 * * *)
// Finds released orders where 7 days have elapsed since release and bond hasn't been returned.
// Marks bond_returned_at and emails the seller.
// Phase 3: will also trigger the smart contract to release the bond on-chain.
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const results = { returned: 0, errors: [] }

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      seller:seller_id (email, full_name)
    `)
    .eq('status', 'released')
    .is('bond_returned_at', null)
    .lte('released_at', sevenDaysAgo.toISOString())

  for (const order of orders || []) {
    try {
      await supabaseAdmin
        .from('orders')
        .update({ bond_returned_at: now.toISOString() })
        .eq('id', order.id)

      await emailSellerBondReturned({ to: order.seller.email, order })

      // Phase 3: trigger smart contract bond release here
      // await releaseBond(order.seller.wallet_address, order.bond_amount)

      results.returned++
    } catch (err) {
      results.errors.push({ order_id: order.id, error: err.message })
    }
  }

  return NextResponse.json(results)
}
