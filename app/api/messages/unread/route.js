import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/messages/unread
// Returns total unread message count for the authenticated user across all threads.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ count: 0 })

    // Unread in order threads (messages from the other party I haven't read)
    const { data: myOrders } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, seller_id')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

    let count = 0

    if (myOrders?.length) {
      const { count: orderUnread } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('order_id', myOrders.map(o => o.id))
        .neq('sender_id', user.id)
        .is('read_at', null)
      count += orderUnread || 0
    }

    // Unread in listing threads (messages where I'm the recipient)
    const { count: listingUnread } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .not('listing_id', 'is', null)
      .is('read_at', null)
    count += listingUnread || 0

    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
