import { NextResponse } from 'next/server'
import { shippo } from '@/lib/shippo'
import { createClient } from '@/lib/supabase-server'

// POST /api/address/validate
// Body: { street1, city, state, zip, country? }
// Returns: { valid: bool, messages: string[] }
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { street1, city, state, zip, country = 'US' } = await request.json()
  if (!street1 || !city || !state || !zip) {
    return NextResponse.json({ valid: false, messages: ['Address is incomplete'] })
  }

  try {
    const result = await shippo.addresses.create({
      name: 'Validation Check',
      street1,
      city,
      state,
      zip,
      country,
      validate: true,
    })

    const msgs = result.validationResults?.messages || []
    const isValid = result.validationResults?.isValid ?? true
    const humanMsgs = msgs.map(m => m.text || m.message || JSON.stringify(m))

    return NextResponse.json({ valid: isValid, messages: humanMsgs })
  } catch (err) {
    // Don't block checkout if Shippo is down — just skip validation
    console.error('[address/validate]', err)
    return NextResponse.json({ valid: true, messages: [] })
  }
}
