import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/orders/confirm-bond
// Called by seller after confirmOrder() tx is confirmed on-chain.
// Saves bond_tx_hash so the dashboard reflects the confirmed state.
export async function POST(request) {
  try {
    const { order_id, tx_hash } = await request.json()
    if (!order_id || !tx_hash) {
      return NextResponse.json({ error: 'order_id and tx_hash required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify caller is the seller of this order
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('seller_id, bond_tx_hash')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.bond_tx_hash) return NextResponse.json({ bond_tx_hash: order.bond_tx_hash }) // already set

    await supabaseAdmin
      .from('orders')
      .update({ bond_tx_hash: tx_hash })
      .eq('id', order_id)

    return NextResponse.json({ bond_tx_hash: tx_hash })
  } catch (err) {
    console.error('[confirm-bond]', err)
    return NextResponse.json({ error: 'Failed to save bond confirmation' }, { status: 500 })
  }
}
