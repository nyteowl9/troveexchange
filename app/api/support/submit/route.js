import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

const CATEGORY_LABELS = {
  order: 'Order Issue', payment: 'Payment / Escrow', shipping: 'Shipping / Tracking',
  auth: 'Authentication', dispute: 'Dispute', account: 'Account / Suspension',
  wallet: 'Wallet / USDC', other: 'Other',
}

// POST /api/support/submit
// Public endpoint — anyone can submit a support ticket.
// Creates a row in support_tickets + initial message, then emails support@chasehollow.com.
export async function POST(request) {
  try {
    const { name, email, orderId, category, subject, message } = await request.json()

    if (!name?.trim() || !email?.trim() || !category || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    // Resolve order_id — validate it exists if provided
    let resolvedOrderId = null
    if (orderId?.trim()) {
      const { data: order } = await supabaseAdmin
        .from('orders').select('id').eq('id', orderId.trim()).maybeSingle()
      if (order) resolvedOrderId = order.id
    }

    // Optionally link to a user account if the request is authenticated
    let userId = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch { /* unauthenticated — fine */ }

    // Create ticket
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id:   userId,
        name:      name.trim(),
        email:     email.trim().toLowerCase(),
        order_id:  resolvedOrderId,
        category,
        subject:   subject.trim(),
        status:    'open',
        priority:  'normal',
      })
      .select('id')
      .single()
    if (ticketErr) throw ticketErr

    // Insert opening message
    await supabaseAdmin.from('support_ticket_messages').insert({
      ticket_id:  ticket.id,
      from_staff: false,
      message:    message.trim(),
    })

    // Email notification to support inbox
    try {
      const { resend } = await import('@/lib/resend')
      await resend.emails.send({
        from:    'Chase Hollow <noreply@chasehollow.com>',
        to:      'support@chasehollow.com',
        subject: `[${CATEGORY_LABELS[category] || category}] ${subject.trim()} — ${ticket.id.slice(0, 8).toUpperCase()}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111114;color:#F0EDE6;padding:32px;border-radius:12px;">
            <h2 style="color:#C9A84C;font-size:18px;margin:0 0 20px;">New Support Ticket</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
              <tr><td style="color:#6C6A66;padding:6px 0;width:120px;">Ticket ID</td><td style="color:#F0EDE6;font-family:monospace;">${ticket.id}</td></tr>
              <tr><td style="color:#6C6A66;padding:6px 0;">From</td><td style="color:#F0EDE6;">${name.trim()} &lt;${email.trim()}&gt;</td></tr>
              <tr><td style="color:#6C6A66;padding:6px 0;">Category</td><td style="color:#F0EDE6;">${CATEGORY_LABELS[category] || category}</td></tr>
              ${resolvedOrderId ? `<tr><td style="color:#6C6A66;padding:6px 0;">Order ID</td><td style="color:#F0EDE6;font-family:monospace;">${resolvedOrderId}</td></tr>` : ''}
            </table>
            <div style="background:#0A0A0B;border:1px solid #2A2A32;border-radius:8px;padding:16px;font-size:14px;line-height:1.65;white-space:pre-wrap;">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <p style="margin-top:20px;font-size:12px;color:#6C6A66;">Reply to this email or open the <a href="https://chasehollow.com/customer-support" style="color:#C9A84C;">Support Portal</a> to respond.</p>
          </div>
        `,
        reply_to: email.trim(),
      })
    } catch (emailErr) {
      console.error('[support/submit] email failed:', emailErr)
    }

    // Auto-reply to user
    try {
      const { resend } = await import('@/lib/resend')
      await resend.emails.send({
        from:    'Chase Hollow Support <support@chasehollow.com>',
        to:      email.trim(),
        subject: `We received your message — ${subject.trim()}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111114;color:#F0EDE6;padding:32px;border-radius:12px;">
            <h2 style="color:#C9A84C;font-size:18px;margin:0 0 16px;">⬡ Chase Hollow Support</h2>
            <p style="font-size:14px;line-height:1.65;color:#B8B4AC;">Hi ${name.trim()},</p>
            <p style="font-size:14px;line-height:1.65;color:#B8B4AC;">Thanks for reaching out. We've received your message and will get back to you shortly.</p>
            <div style="background:#0A0A0B;border:1px solid #2A2A32;border-radius:8px;padding:14px 16px;margin:20px 0;">
              <div style="font-size:11px;color:#6C6A66;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Your Message</div>
              <div style="font-size:14px;color:#F0EDE6;font-weight:600;margin-bottom:4px;">${subject.trim()}</div>
              <div style="font-size:12px;color:#B8B4AC;font-family:monospace;">Ticket ID: ${ticket.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <p style="font-size:12px;color:#6C6A66;margin-top:20px;">Chase Hollow · <a href="https://chasehollow.com" style="color:#C9A84C;">chasehollow.com</a></p>
          </div>
        `,
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({ ok: true, ticketId: ticket.id })
  } catch (err) {
    console.error('[support/submit]', err)
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 })
  }
}
