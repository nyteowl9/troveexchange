import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { resend, FROM } from '@/lib/resend'

// POST /api/referral/payout
// Owner only — runs the monthly payout batch (1st–7th of each month)
// Aggregates all unpaid commissions per creator that meet the $50 threshold,
// marks them paid, saves a payout record, and emails each creator.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const MINIMUM_PAYOUT = 50.00

    // Pull all unpaid conversions grouped by creator
    const { data: unpaid, error: fetchError } = await supabaseAdmin
      .from('referral_conversions')
      .select(`
        id,
        creator_id,
        commission,
        creators (
          id,
          handle,
          wallet_address,
          user_id,
          users:user_id ( email, full_name )
        )
      `)
      .eq('paid', false)

    if (fetchError) {
      console.error('[referral/payout] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch conversions' }, { status: 500 })
    }

    if (!unpaid || unpaid.length === 0) {
      return NextResponse.json({ message: 'No unpaid conversions', payouts: [] })
    }

    // Group by creator_id
    const byCreator = {}
    for (const row of unpaid) {
      if (!byCreator[row.creator_id]) {
        byCreator[row.creator_id] = {
          creator: row.creators,
          conversionIds: [],
          total: 0,
        }
      }
      byCreator[row.creator_id].conversionIds.push(row.id)
      byCreator[row.creator_id].total += parseFloat(row.commission)
    }

    const payouts = []
    const skipped = []

    for (const [creatorId, data] of Object.entries(byCreator)) {
      const total = parseFloat(data.total.toFixed(2))

      // Below threshold — skip this cycle
      if (total < MINIMUM_PAYOUT) {
        skipped.push({ creator_id: creatorId, pending: total })
        continue
      }

      const creator = data.creator
      const walletAddress = creator?.wallet_address
      const email = creator?.users?.email
      const handle = creator?.handle || 'Creator'
      const fullName = creator?.users?.full_name || handle

      // Mark conversions as paid
      const { error: updateError } = await supabaseAdmin
        .from('referral_conversions')
        .update({ paid: true })
        .in('id', data.conversionIds)

      if (updateError) {
        console.error(`[referral/payout] update error for creator ${creatorId}:`, updateError)
        continue
      }

      // Record in creator_payouts
      await supabaseAdmin
        .from('creator_payouts')
        .insert({
          creator_id: creatorId,
          amount: total,
          wallet_address: walletAddress,
          conversion_count: data.conversionIds.length,
          paid_at: new Date().toISOString(),
          status: 'pending', // owner executes the actual USDC transfer manually
        })

      // Email the creator
      if (email) {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: 'Your Chase Hollow creator payout is on the way',
          html: payoutEmail({ fullName, handle, total, walletAddress }),
        })
      }

      payouts.push({ creator_id: creatorId, handle, total, wallet_address: walletAddress })
    }

    return NextResponse.json({
      message: 'Payout batch complete',
      payouts_queued: payouts.length,
      skipped_below_threshold: skipped.length,
      payouts,
      skipped,
    })

  } catch (err) {
    console.error('[referral/payout]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function payoutEmail({ fullName, handle, total, walletAddress }) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #0A0A0B; font-family: 'DM Sans', Arial, sans-serif; }
  .wrap { max-width: 560px; margin: 40px auto; background: #111114; border: 1px solid #2A2A32; border-radius: 12px; overflow: hidden; }
  .header { background: #18181C; padding: 32px; text-align: center; border-bottom: 1px solid #2A2A32; }
  .header h1 { margin: 0; font-size: 22px; color: #C9A84C; font-family: 'Cormorant Garamond', Georgia, serif; letter-spacing: 0.05em; }
  .body { padding: 32px; }
  .body p { color: #B8B4AC; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .amount { background: #18181C; border: 1px solid #C9A84C33; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
  .amount .label { color: #6C6A66; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; }
  .amount .value { color: #C9A84C; font-size: 32px; font-weight: 700; margin-top: 4px; }
  .wallet { background: #0A0A0B; border: 1px solid #2A2A32; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-family: 'DM Mono', monospace; font-size: 13px; color: #B8B4AC; word-break: break-all; }
  .footer { padding: 24px 32px; border-top: 1px solid #2A2A32; text-align: center; }
  .footer p { color: #6C6A66; font-size: 12px; margin: 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Chase Hollow</h1>
  </div>
  <div class="body">
    <p>Hey ${fullName},</p>
    <p>Your creator payout for <strong style="color:#F0EDE6">@${handle}</strong> is on the way. We're sending the following amount in USDC to your wallet on Base:</p>
    <div class="amount">
      <div class="label">Payout Amount</div>
      <div class="value">$${total.toFixed(2)} USDC</div>
    </div>
    <p>Sending to:</p>
    <div class="wallet">${walletAddress || 'No wallet on file — please update your profile'}</div>
    <p>Transfers are processed within 1–3 business days. If you have any questions, reply to this email.</p>
  </div>
  <div class="footer">
    <p>Chase Hollow · chasehollow.com</p>
  </div>
</div>
</body>
</html>
`
}
