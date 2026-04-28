import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/admin/users/remove-strike
// Body: { user_id, strike_id }
// Owner only. Removes a specific strike record and recalculates the user's standing.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 })

    const { user_id, strike_id } = await request.json()
    if (!user_id || !strike_id) return NextResponse.json({ error: 'Missing user_id or strike_id' }, { status: 400 })

    // Fetch role before deleting so we know which counter to update
    const { data: strike } = await supabaseAdmin.from('strikes').select('strike_role').eq('id', strike_id).single()
    if (!strike) return NextResponse.json({ error: 'Strike not found' }, { status: 404 })

    const { error: delErr } = await supabaseAdmin.from('strikes').delete().eq('id', strike_id).eq('user_id', user_id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    // Recount each role independently
    const [{ count: sellerCount }, { count: buyerCount }] = await Promise.all([
      supabaseAdmin.from('strikes').select('id', { count: 'exact', head: true }).eq('user_id', user_id).eq('strike_role', 'seller'),
      supabaseAdmin.from('strikes').select('id', { count: 'exact', head: true }).eq('user_id', user_id).eq('strike_role', 'buyer'),
    ])
    const newSellerCount = sellerCount || 0
    const newBuyerCount  = buyerCount  || 0

    // Suspension is the later of what each role independently warrants
    function suspendUntil(count) {
      if (count === 0) return null
      if (count === 1) return new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString()
      if (count === 2) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      return null // banned
    }
    const sellerSuspend = suspendUntil(newSellerCount)
    const buyerSuspend  = suspendUntil(newBuyerCount)
    const suspended_until = sellerSuspend && buyerSuspend
      ? (sellerSuspend > buyerSuspend ? sellerSuspend : buyerSuspend)
      : sellerSuspend || buyerSuspend || null

    const banned = newSellerCount >= 3 || newBuyerCount >= 3

    await supabaseAdmin.from('users').update({
      strike_count:       newSellerCount,
      buyer_strike_count: newBuyerCount,
      banned,
      suspended_until,
    }).eq('id', user_id)

    // Restore listings if seller is no longer suspended
    if (newSellerCount === 0) {
      await supabaseAdmin.from('listings')
        .update({ status: 'active' })
        .eq('seller_id', user_id)
        .eq('status', 'suspended_pause')
    }

    return NextResponse.json({ ok: true, new_seller_strike_count: newSellerCount, new_buyer_strike_count: newBuyerCount })
  } catch (err) {
    console.error('[admin/users/remove-strike]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
