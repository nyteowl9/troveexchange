import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

// GET /api/referral/creator-wallet
// Returns the on-chain wallet address for the creator attributed to the current session.
// Called by checkout just before fundOrder to get the creatorAddress param.
// Returns { wallet: "0x..." } or { wallet: null } — never an error that blocks checkout.
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ wallet: null })

    const cookieStore = await cookies()
    const refCode = cookieStore.get('ch-ref')?.value
    if (!refCode) return NextResponse.json({ wallet: null })

    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('user_id, wallet_address')
      .eq('ref_code', refCode.toLowerCase())
      .eq('status', 'approved')
      .single()

    if (!creator || !creator.wallet_address) return NextResponse.json({ wallet: null })

    // Block self-referral
    if (creator.user_id === user.id) return NextResponse.json({ wallet: null })

    return NextResponse.json({ wallet: creator.wallet_address })
  } catch {
    return NextResponse.json({ wallet: null })
  }
}
