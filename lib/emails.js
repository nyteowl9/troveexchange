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
        <tr><td style="color:#6C6A66;font-size:13px;">Your payout</td><td style="color:#4CAF7C;font-size:14px;font-weight:700;text-align:right;">$${parseFloat(order.seller_payout || 0).toFixed(2)} USDC</td></tr>
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

export async function emailSellerFundsReleased({ to, order, listingPrice, platformFee, shippingCost, sellerPayout }) {
  const price    = parseFloat(listingPrice || 0)
  const fee      = parseFloat(platformFee  || 0)
  const shipping = parseFloat(shippingCost || 0)
  const payout   = parseFloat(sellerPayout || 0)
  return resend.emails.send({
    from: FROM, to,
    subject: 'Funds released to your wallet — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Funds <em style="color:#4CAF7C;">Released</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">Your USDC has been released to your wallet.</p>
      <table width="100%" style="border:1px solid #2A2A32;border-radius:10px;padding:16px;margin-bottom:8px;" cellpadding="8">
        <tr><td style="color:#6C6A66;font-size:13px;">Sale price</td><td style="color:#F0EDE6;font-size:13px;text-align:right;">$${price.toFixed(2)} USDC</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Platform fee (3.5%)</td><td style="color:#C84B3C;font-size:13px;text-align:right;">− $${fee.toFixed(2)} USDC</td></tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Shipping</td><td style="color:#C84B3C;font-size:13px;text-align:right;">− $${shipping.toFixed(2)} USDC</td></tr>
        <tr style="border-top:1px solid #2A2A32;">
          <td style="color:#F0EDE6;font-size:14px;font-weight:700;padding-top:12px;">Net payout</td>
          <td style="color:#4CAF7C;font-size:16px;font-weight:700;text-align:right;padding-top:12px;">$${payout.toFixed(2)} USDC</td>
        </tr>
        <tr><td style="color:#6C6A66;font-size:13px;">Bond return</td><td style="color:#F0EDE6;font-size:13px;text-align:right;">Automatic — processing now</td></tr>
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

export async function emailSellerDisputeUpdate({ to, order, opened, sellerDeadline }) {
  const deadlineStr = sellerDeadline
    ? new Date(sellerDeadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : null
  return resend.emails.send({
    from: FROM, to,
    subject: opened ? 'Action required — dispute opened against your sale — Chase Hollow' : 'Dispute resolved — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Dispute <em style="color:#E8A838;">${opened ? 'Opened' : 'Resolved'}</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${opened
          ? `A buyer has opened a dispute on your sale of <strong style="color:#F0EDE6;">${order.listing?.card_name || 'your card'}</strong>. You have <strong style="color:#C84B3C;">48 hours</strong> to submit your counter-evidence${deadlineStr ? ` — deadline: <strong style="color:#F0EDE6;">${deadlineStr}</strong>` : ''}. After the deadline, Chase Hollow staff will review both sides and recommend a decision.`
          : 'The dispute on your sale has been resolved. Check your dashboard for the outcome.'}
      </p>
      ${opened ? `<p style="color:#B8B4AC;font-size:13px;line-height:1.6;margin:0 0 24px;background:#1A1A1F;border-left:3px solid #E8A838;padding:12px 16px;border-radius:0 8px 8px 0;">Go to your Seller Dashboard → find this order under <strong style="color:#F0EDE6;">Active Orders</strong> → upload your photos and written response before the deadline.</p>` : ''}
      ${btn(opened ? 'Submit My Evidence' : 'View Outcome', `${BASE_URL}/seller-dashboard`)}
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

// ── Dispute resolution emails ────────────────────────────────────────────────

export async function emailDisputeResolved(toEmail, fullName, outcome, role) {
  const messages = {
    buyer_wins: {
      buyer:  { subject: 'Dispute resolved — refund issued — Chase Hollow',   heading: 'Dispute Resolved', color: '#4CAF7C', body: 'Your dispute has been decided in your favor. Your USDC (minus shipping, which is non-refundable) has been returned to your wallet. Please allow a moment for the blockchain transaction to confirm.' },
      seller: { subject: 'Dispute resolved — funds not released — Chase Hollow', heading: 'Dispute Lost', color: '#C84B3C', body: 'The dispute on your sale was decided in the buyer\'s favor. Your bond has been forfeited to cover the return shipping process. Please ensure the returned card is in your possession once the return label is delivered.' },
    },
    seller_wins: {
      buyer:  { subject: 'Dispute resolved — funds released to seller — Chase Hollow', heading: 'Dispute Closed', color: '#E8A838', body: 'The dispute has been reviewed and the evidence did not support a buyer-wins outcome. Funds have been released to the seller. If you believe this was in error, please contact support.' },
      seller: { subject: 'Dispute resolved in your favor — Chase Hollow', heading: 'Dispute Won', color: '#4CAF7C', body: 'The dispute on your sale was decided in your favor. Funds have been released to your wallet and your bond has been returned.' },
    },
    buyer_wins_return_required: {
      buyer: { subject: 'Action required — ship card back within 5 days — Chase Hollow', heading: 'Return Required', color: '#E8A838', body: 'Your dispute has been decided in your favor. To receive your refund, you must ship the card back using the return label that has been generated for you. <strong style="color:#C84B3C;">You have 5 days to ship.</strong> If the card is not shipped within 5 days, the dispute will be reversed and funds released to the seller. Check your dashboard for the label.' },
    },
  }
  const m = messages[outcome]?.[role] || messages[outcome]?.buyer
  if (!m) return
  return resend.emails.send({
    from: FROM, to: toEmail,
    subject: m.subject,
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">${m.heading} <em style="color:${m.color};">— ${outcome === 'buyer_wins' && role === 'buyer' ? 'Refund Issued' : outcome === 'seller_wins' && role === 'seller' ? 'You Won' : 'See Details'}</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">${m.body}</p>
      ${btn('View Dashboard', `${BASE_URL}/${role === 'seller' ? 'seller' : 'buyer'}-dashboard`)}
    `)
  })
}

// ── Return deadline warning emails (sent by cron/return-deadline) ─────────────

export async function emailBuyerReturnWarning({ to, order, daysLeft }) {
  const isUrgent = daysLeft <= 1
  return resend.emails.send({
    from: FROM, to,
    subject: `${isUrgent ? '🚨 FINAL WARNING' : '⚠ Reminder'} — Ship return card within ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — Chase Hollow`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">${isUrgent ? 'Final' : 'Return'} <em style="color:#C84B3C;">Shipping Reminder</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Your dispute on order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0,8).toUpperCase()}</strong> was decided in your favor — but you must ship the card back to complete the refund.
      </p>
      <div style="background:#1a0d0d;border:1px solid rgba(200,75,60,0.4);border-radius:10px;padding:16px 20px;margin:0 0 20px;">
        <p style="color:#C84B3C;font-size:14px;font-weight:700;margin:0 0 4px;">⚠ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining to ship</p>
        <p style="color:#B8B4AC;font-size:13px;margin:0;">If the card is not shipped by the deadline, the dispute will be reversed and funds released to the seller.</p>
      </div>
      <p style="color:#B8B4AC;font-size:13px;line-height:1.6;margin:0 0 24px;">Your return label is in your buyer dashboard. Print it, attach it, and drop it with the carrier — that's all you need to do.</p>
      ${btn('Get My Return Label', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailBuyerReturnExpired({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Return deadline passed — dispute reversed — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Return <em style="color:#C84B3C;">Deadline Passed</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        The 5-day return window for order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0,8).toUpperCase()}</strong> has passed without a carrier scan. The dispute has been reversed and funds have been released to the seller.
      </p>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">If you believe this was an error or you did ship the card, please contact support immediately.</p>
      ${btn('Contact Support', `${BASE_URL}/customer-support`)}
    `)
  })
}

export async function emailSellerReturnReversed({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Dispute reversed — funds released to you — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Dispute <em style="color:#4CAF7C;">Reversed</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        The buyer did not ship the card back within the 5-day return window on order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0,8).toUpperCase()}</strong>. The dispute has been reversed and funds have been released to your wallet.
      </p>
      ${btn('View Dashboard', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

// ── Wrong card emails ─────────────────────────────────────────────────────────

export async function emailBuyerWrongCardReceived({ to, order, notes }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Wrong card received — action required — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Wrong Card <em style="color:#C84B3C;">Received</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Our authentication center received a return for order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0,8).toUpperCase()}</strong> — but the card received does not match the original listing.
      </p>
      ${notes ? `<div style="background:#18181C;border:1px solid #2A2A32;border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#B8B4AC;line-height:1.6;"><strong style="color:#F0EDE6;">Authenticator note:</strong> ${notes}</div>` : ''}
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 16px;">
        You must ship the correct card to our authentication center within <strong style="color:#C84B3C;">5 days</strong>. Use your own shipping label and send it to the address below. Once the correct card is received and verified, your refund will be processed.
      </p>
      <div style="background:#18181C;border:1px solid #2A2A32;border-radius:10px;padding:14px 18px;margin:0 0 24px;font-family:monospace;font-size:12px;line-height:2;color:#B8B4AC;">
        <div>Chase Hollow Authentication Center</div>
        <div>[ADDRESS — update in lib/shippo.js before launch]</div>
      </div>
      <p style="color:#B8B4AC;font-size:13px;line-height:1.6;margin:0 0 24px;">If the correct card is not received within 5 days, the dispute will be decided in favor of the seller and funds will not be refunded.</p>
      ${btn('View Dashboard', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailSellerWrongCardReceived({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Dispute update — wrong card return received — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Wrong Card <em style="color:#E8A838;">Returned</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Our authentication center received a return for order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0,8).toUpperCase()}</strong> — but the item returned does not match the card you sold. The buyer has been notified and given 5 days to ship the correct card. We will keep you updated on the outcome.
      </p>
      <p style="color:#B8B4AC;font-size:13px;line-height:1.6;margin:0 0 24px;">If the buyer does not ship the correct card within 5 days, the dispute will be decided in your favor and funds released to you.</p>
      ${btn('View Dashboard', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

// ── Tier 1 seller return review emails ──────────────────────────────────────

export async function emailSellerReturnReceivedForReview({ to, order }) {
  const deadline = order.return_review_deadline_at
    ? new Date(order.return_review_deadline_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '72 hours from now'
  return resend.emails.send({
    from: FROM, to,
    subject: 'Return received — confirm or dispute within 72 hours — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Return <em style="color:#E8A838;">Received</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 16px;">
        The buyer has shipped the card back on order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0,8).toUpperCase()}</strong> and it has been delivered to you.
      </p>
      <div style="background:#1a1200;border:1px solid rgba(232,168,56,0.4);border-radius:10px;padding:16px 20px;margin:0 0 20px;">
        <p style="color:#E8A838;font-size:14px;font-weight:700;margin:0 0 4px;">You have until ${deadline} to respond</p>
        <p style="color:#B8B4AC;font-size:13px;margin:0;">Confirm you received the correct card — or dispute it with photos if the wrong card was returned.</p>
      </div>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 8px;"><strong style="color:#4CAF7C;">If the correct card was returned:</strong> Confirm receipt in your seller dashboard. The buyer's refund will be processed immediately.</p>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;"><strong style="color:#C84B3C;">If the wrong card was returned:</strong> Dispute it with photos in your seller dashboard. Chase Hollow staff will review the evidence and make a final decision.</p>
      ${btn('Review Return', `${BASE_URL}/seller-dashboard`)}
    `)
  })
}

export async function emailBuyerReturnDisputedBySeller({ to, order }) {
  return resend.emails.send({
    from: FROM, to,
    subject: 'Seller has disputed your return — under review — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">Return <em style="color:#C84B3C;">Disputed</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 16px;">
        The seller has claimed that the card returned on order <strong style="font-family:monospace;color:#F0EDE6;">#${order.id.slice(0,8).toUpperCase()}</strong> does not match the original listing.
      </p>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Chase Hollow staff is reviewing the evidence. No further action is required from you at this time. You will be notified once a decision is made. If the staff determines you returned the correct card, your refund will be processed.
      </p>
      ${btn('View Dashboard', `${BASE_URL}/buyer-dashboard`)}
    `)
  })
}

export async function emailReviewRequest({ to, order, role }) {
  const isBuyer   = role === 'buyer'
  const dashboard = isBuyer ? 'buyer-dashboard' : 'seller-dashboard'
  const otherRole = isBuyer ? 'seller' : 'buyer'
  return resend.emails.send({
    from: FROM, to,
    subject: 'Leave a review for your transaction — Chase Hollow',
    html: layout(`
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#F0EDE6;">How was your <em style="color:#C9A84C;">Experience?</em></h2>
      <p style="color:#B8B4AC;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Your transaction has completed. Take a moment to leave feedback for your ${otherRole} — it helps build trust across the Chase Hollow community.
      </p>
      <table width="100%" style="border:1px solid #2A2A32;border-radius:10px;padding:16px;" cellpadding="8">
        <tr><td style="color:#6C6A66;font-size:13px;">Order</td><td style="color:#F0EDE6;font-size:13px;text-align:right;">#${order.id.slice(0, 8).toUpperCase()}</td></tr>
      </table>
      ${btn('Leave a Review', `${BASE_URL}/${dashboard}?review=${order.id}`)}
      <p style="color:#6C6A66;font-size:12px;margin:16px 0 0;">Reviews can only be left for completed transactions. Both parties receive the opportunity to review each other.</p>
    `)
  })
}
