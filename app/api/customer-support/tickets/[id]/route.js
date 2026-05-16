import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabaseAdmin.from('users').select('role, full_name').eq('id', user.id).single()
  if (!['staff', 'owner'].includes(profile?.role)) return null
  return { user, profile }
}

// GET /api/customer-support/tickets/[id]
// Returns ticket + messages + linked user info if available.
export async function GET(request, { params }) {
  const auth = await requireStaff()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: messages } = await supabaseAdmin
    .from('support_ticket_messages')
    .select('id, from_staff, staff_id, message, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  let linkedUser = null
  if (ticket.user_id) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role, strike_count, buyer_strike_count, banned, suspended_until, total_sales, joined_at')
      .eq('id', ticket.user_id)
      .single()
    linkedUser = data
  }

  return NextResponse.json({ ticket, messages: messages || [], linkedUser })
}

// PATCH /api/customer-support/tickets/[id]
// Body: { status, priority } — update ticket fields.
export async function PATCH(request, { params }) {
  const auth = await requireStaff()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, priority } = await request.json()
  const updates = { updated_at: new Date().toISOString() }
  if (status)   updates.status   = status
  if (priority) updates.priority = priority

  const { error } = await supabaseAdmin
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
  if (error) {
    console.error('[customer-support/PATCH]', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// POST /api/customer-support/tickets/[id]
// Body: { message } — staff reply.
export async function POST(request, { params }) {
  const auth = await requireStaff()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { message } = await request.json()
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  // Insert message
  const { error: msgErr } = await supabaseAdmin.from('support_ticket_messages').insert({
    ticket_id:  id,
    from_staff: true,
    staff_id:   auth.user.id,
    message:    message.trim(),
  })
  if (msgErr) {
    console.error('[customer-support/POST]', msgErr)
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 })
  }

  // Update ticket timestamp + set to pending (waiting on user)
  await supabaseAdmin.from('support_tickets')
    .update({ updated_at: new Date().toISOString(), status: 'pending' })
    .eq('id', id)

  // Email the user
  try {
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('email, name, subject')
      .eq('id', id)
      .single()

    if (ticket?.email) {
      const { resend } = await import('@/lib/resend')
      await resend.emails.send({
        from:    'Chase Hollow Support <support@chasehollow.com>',
        to:      ticket.email,
        subject: `Re: ${ticket.subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111114;color:#F0EDE6;padding:32px;border-radius:12px;">
            <h2 style="color:#C9A84C;font-size:18px;margin:0 0 16px;">⬡ Chase Hollow Support</h2>
            <p style="font-size:14px;line-height:1.65;color:#B8B4AC;">Hi ${ticket.name},</p>
            <div style="background:#0A0A0B;border:1px solid #2A2A32;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#F0EDE6;line-height:1.65;white-space:pre-wrap;">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <p style="font-size:12px;color:#6C6A66;margin-top:20px;">Chase Hollow Support Team · <a href="https://chasehollow.com" style="color:#C9A84C;">chasehollow.com</a></p>
          </div>
        `,
      })
    }
  } catch (emailErr) {
    console.error('[customer-support/reply] email failed:', emailErr)
  }

  return NextResponse.json({ ok: true })
}
