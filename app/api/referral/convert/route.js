import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

// POST /api/referral/convert
// Called at order creation to record a referral conversion
// Body: { order_id, sale_amount }
// Reads the ch-ref cookie — no ref cookie = no-op (returns null, not an error)
export async function POST(request) {
  try {
    const { order_id, sale_amount } = await request.json()

    // Must be an authenticated buyer
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read attribution cookie
    const cookieStore = await cookies()
    const refCode = cookieStore.get('ch-ref')?.value
    if (!refCode) {
      return NextResponse.json({ attributed: false })
    }

    // Look up creator by ref_code (must be active/approved)
    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('id, user_id')
      .eq('ref_code', refCode)
      .eq('status', 'approved')
      .single()

    if (!creator) {
      return NextResponse.json({ attributed: false })
    }

    // Block self-referral
    if (creator.user_id === user.id) {
      return NextResponse.json({ attributed: false, reason: 'self_referral' })
    }

    // 0.5% commission on sale amount
    const commission = parseFloat((sale_amount * 0.005).toFixed(2))

    // Insert conversion record (ignore duplicate order — upsert on order_id)
    const { error } = await supabaseAdmin
      .from('referral_conversions')
      .upsert(
        {
          creator_id: creator.id,
          order_id,
          sale_amount,
          commission,
          paid: false,
        },
        { onConflict: 'order_id' }
      )

    if (error) {
      console.error('[referral/convert] DB error:', error)
      return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 })
    }

    return NextResponse.json({ attributed: true, creator_id: creator.id, commission })

  } catch (err) {
    console.error('[referral/convert]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
