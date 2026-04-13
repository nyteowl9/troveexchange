import { resend, FROM } from './resend'

const BASE_URL = 'https://chasehollow.com'

// ── Shared styles ────────────────────────────────────────────────────────────

function layout(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:'DM Sans',Arial,sans-serif;color:#F0EDE6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:20px;font-weight:600;letter-spacing:0.1em;color:#C9A84C;">
            ⬡ CHASE HOLLOW
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#111114;border:1px solid #2A2A32;border-radius:16px;padding:36px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;font-size:12px;color:#6C6A66;line-height:1.6;">
          Chase Hollow · Blockchain-secured TCG Marketplace<br/>
          <a href="${BASE_URL}" style="color:#C9A84C;text-decoration:none;">chasehollow.com</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(label, url) {
  return `<a href="${url}" style="display:inline-block;background:#C9A84C;color:#0A0A0B;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:24px;">${label}</a>`
}

function tag(label, color = '#C9A84C') {
  return `<span style="font-family:monospace;font-size:11px;padding:3px 10px;border-radius:20px;background:${color}22;border:1px solid ${color}55;color:${color};font-weight:600;">${label}</span>`
}

// ── Buyer emails ─────────────────────────────────────────────────────────────

export async function emailBuyerPurchaseConfirmed({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Your purchase is confirmed — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Purchase <em style="color:#C9A84C;">Confirmed</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">Your USDC is locked in escrow on Base. The seller has 48 hours to ship.</p>
      <table width="100%" style="border:1px solid #2A2A32;border-radius:10px;padding:16px;margin-bottom:8px;" cellpadding="8">
        <tr><td style="color:#6C6A66;font-size:13px;">Order</td><td style="color:#F0EDE6;font-size:13px;text-align:right;font-family:monospace;">#${order.id.slice(0, 8).toUpperCase()}</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Card</td><td style="color:#F0EDE6;font-size:13px;text-align:right;">${order.card_name}</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Total paid</td><td style="color:#C9A84C;font-size:14px;font-weight:700;text-align:right;">$${order.escrow_amount} USDC</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Auth tier</td><td style="text-align:right;">${tag(order.auth_tier === 'physical' ? 'Physical Auth · $25' : 'Remote Auth · $10')}</td></tr>
      </table>
      ${btn('View Order', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailBuyerSellerShipped({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Your card has shipped — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Your Card Has <em style="color:#C9A84C;">Shipped</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">The seller has dropped off your card. You'll receive another email when it's delivered.</p>
      <table width="100%" style="border:1px solid #2A2A32;border-radius:10px;padding:16px;" cellpadding="8">
        <tr><td style="color:#6C6A66;font-size:13px;">Tracking</td><td style="color:#F0EDE6;font-size:13px;text-align:right;font-family:monospace;">${order.tracking_a}</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Carrier</td><td style="color:#F0EDE6;font-size:13px;text-align:right;">Auto-selected (lowest rate)</td></tr>
      </table>
      ${btn('Track Shipment', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailBuyerAuthResult({ to, order, passed }) {
  const color = passed ? '#4CAF7C' : '#C84B3C'
  const result = passed ? 'Passed' : 'Failed'
  return resend.emails.send({
    from: FROM, to,
    subject: `Authentication ${result} — Chase Hollow`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Authentication <em style="color:${color};">${result}</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${passed
          ? 'Your card passed authentication and is on its way to you.'
          : 'Your card failed authentication. A full refund has been issued to your wallet.'}
      </p>
      ${btn(passed ? 'View Order' : 'View Refund Details', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailBuyerDelivered({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Your card was delivered — 72hr inspection window open',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Card <em style="color:#C9A84C;">Delivered</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">Your card has been delivered. You have <strong style="color:#F0EDE6;">72 hours</strong> to inspect it and raise a dispute if needed. Funds auto-release after the window closes.</p>
      <table width="100%" style="border:1px solid #2A2A32;border-radius:10px;padding:16px;" cellpadding="8">
        <tr><td style="color:#6C6A66;font-size:13px;">Auto-release</td><td style="color:#F0EDE6;font-size:13px;text-align:right;font-family:monospace;">${new Date(order.auto_release_at).toLocaleString()}</td></tr>
      </table>
      ${btn('Inspect & Confirm', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailBuyerFundsReleased({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Transaction complete — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Transaction <em style="color:#4CAF7C;">Complete</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">Funds have been released to the seller. Your transaction is complete.</p>
      ${btn('View Receipt', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailBuyerDisputeUpdate({ to, order, opened }) {
  return resend.emails.send({
    from: FROM, to,
    subject: opened ? 'Dispute opened — Chase Hollow' : 'Dispute resolved — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Dispute <em style="color:#E8A838;">${opened ? 'Opened' : 'Resolved'}</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${opened
          ? 'Your dispute has been submitted. Our team will review the evidence and respond within 72 hours.'
          : 'Your dispute has been resolved. Check your dashboard for the outcome.'}
      </p>
      ${btn('View Dispute', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

// ── Seller emails ─────────────────────────────────────────────────────────────

export async function emailSellerSaleShipNow({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: `You have a sale — ship within 48hrs`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">You Have a <em style="color:#C9A84C;">Sale</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">Funds are locked in escrow. You must ship within <strong style="color:#F0EDE6;">48 hours</strong> or the order will be auto-refunded and you'll receive a strike.</p>
      <table width="100%" style="border:1px solid #2A2A32;border-radius:10px;padding:16px;margin-bottom:8px;" cellpadding="8">
        <tr><td style="color:#6C6A66;font-size:13px;">Order</td><td style="color:#F0EDE6;font-size:13px;text-align:right;font-family:monospace;">#${order.id.slice(0, 8).toUpperCase()}</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Card</td><td style="color:#F0EDE6;font-size:13px;text-align:right;">${order.card_name}</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Ship deadline</td><td style="color:#C84B3C;font-size:13px;font-weight:700;text-align:right;">${new Date(order.ship_deadline).toLocaleString()}</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Your payout</td><td style="color:#4CAF7C;font-size:14px;font-weight:700;text-align:right;">$${(order.escrow_amount - order.platform_fee - order.creator_fee - order.shipping_cost).toFixed(2)} USDC</td></tr>
      </table>
      ${btn('Get Shipping Label', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

export async function emailSellerShipReminder({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: '⚠ 24hr shipping reminder — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;"><em style="color:#E8A838;">24 Hours</em> Left to Ship</h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">You still haven't shipped order <strong style="font-family:monospace;">#${order.id.slice(0, 8).toUpperCase()}</strong>. Missing the deadline will trigger an auto-refund and a strike on your account.</p>
      ${btn('Ship Now', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

export async function emailSellerAuthResult({ to, order, passed }) {
  const color = passed ? '#4CAF7C' : '#C84B3C'
  return resend.emails.send({
    from: FROM, to,
    subject: `Authentication ${passed ? 'passed' : 'failed'} — Chase Hollow`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Authentication <em style="color:${color};">${passed ? 'Passed' : 'Failed'}</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${passed
          ? 'Your card passed authentication and is being shipped to the buyer.'
          : 'Your card failed authentication. The buyer has been refunded. Please check your dashboard for details.'}
      </p>
      ${btn('View Details', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

export async function emailSellerFundsReleased({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Funds released to your wallet — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Funds <em style="color:#4CAF7C;">Released</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">Your USDC has been released to your wallet. Your bond will be returned within 5–7 business days.</p>
      <table width="100%" style="border:1px solid #2A2A32;border-radius:10px;padding:16px;" cellpadding="8">
        <tr><td style="color:#6C6A66;font-size:13px;">Payout</td><td style="color:#4CAF7C;font-size:14px;font-weight:700;text-align:right;">$${(order.escrow_amount - order.platform_fee - order.creator_fee - order.shipping_cost).toFixed(2)} USDC</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Bond return</td><td style="color:#F0EDE6;font-size:13px;text-align:right;">5–7 business days</td></tr>
      </table>
      ${btn('View Dashboard', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

export async function emailSellerStrikeApplied({ to, strike }) {
  return resend.emails.send({
    from: FROM, to,
    subject: `Strike ${strike.strike_number} applied to your account — Chase Hollow`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Strike <em style="color:#C84B3C;">${strike.strike_number} Applied</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;"><strong style="color:#F0EDE6;">Reason:</strong> ${strike.reason}</p>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;"><strong style="color:#F0EDE6;">Action taken:</strong> ${strike.action_taken}</p>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">You have 7 days to appeal this decision.</p>
      ${btn('Appeal Strike', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

export async function emailSellerDisputeUpdate({ to, order, opened }) {
  return resend.emails.send({
    from: FROM, to,
    subject: opened ? 'Dispute opened against your sale — Chase Hollow' : 'Dispute resolved — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Dispute <em style="color:#E8A838;">${opened ? 'Opened' : 'Resolved'}</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${opened
          ? 'A buyer has opened a dispute on one of your sales. Submit your evidence within 72 hours.'
          : 'The dispute on your sale has been resolved. Check your dashboard for the outcome.'}
      </p>
      ${btn('View Dispute', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

export async function emailSellerBondReturned({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Your bond has been returned — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Bond <em style="color:#4CAF7C;">Returned</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">Your seller bond of <strong style="color:#F0EDE6;">$${order.bond_amount} USDC</strong> has been returned to your wallet.</p>
      ${btn('View Dashboard', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}
