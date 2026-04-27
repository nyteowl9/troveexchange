import Link from 'next/link'

const SECTIONS = [
  { id: 'overview',       title: '1. Overview' },
  { id: 'information',    title: '2. Information We Collect' },
  { id: 'use',            title: '3. How We Use Your Information' },
  { id: 'sharing',        title: '4. Information We Share' },
  { id: 'third-party',    title: '5. Third-Party Services' },
  { id: 'blockchain',     title: '6. Blockchain and Public Data' },
  { id: 'cookies',        title: '7. Cookies and Local Storage' },
  { id: 'retention',      title: '8. Data Retention' },
  { id: 'security',       title: '9. Security' },
  { id: 'rights',         title: '10. Your Rights' },
  { id: 'children',       title: "11. Children's Privacy" },
  { id: 'changes',        title: '12. Changes to This Policy' },
  { id: 'contact',        title: '13. Contact' },
]

export const metadata = {
  title: 'Privacy Policy — Chase Hollow',
  description: 'Privacy Policy for Chase Hollow LLC, a blockchain-secured TCG marketplace.',
}

export default function PrivacyPolicy() {
  const h2     = 'font-family:Playfair Display,serif;font-size:20px;font-weight:400;color:#F0EDE6;margin:40px 0 12px;padding-bottom:8px;border-bottom:0.5px solid #2A2A32'
  const p      = 'font-size:14px;color:#B8B4AC;line-height:1.75;margin:0 0 14px'
  const ul     = 'font-size:14px;color:#B8B4AC;line-height:1.75;padding-left:20px;margin:0 0 14px'
  const strong = 'color:#F0EDE6;font-weight:600'
  const mono   = 'font-family:DM Mono,monospace'

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privacy Policy — Chase Hollow</title>
        <meta name="description" content="Privacy Policy for Chase Hollow LLC, a blockchain-secured TCG marketplace." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #0A0A0B; color: #B8B4AC; font-family: DM Sans, sans-serif; }
          a { color: #0D6E6E; text-decoration: none; }
          a:hover { text-decoration: underline; }
          @media (min-width: 900px) { .toc-sidebar { display: block !important; } }
          @media (max-width: 899px) { .layout { flex-direction: column !important; } }
        `}</style>
      </head>
      <body>

        {/* NAV */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid #2A2A32', padding: '0 2rem', display: 'flex', alignItems: 'center', height: '56px' }}>
          <a href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '20px', height: '20px', background: '#C9A84C', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </a>
        </nav>

        <div className="layout" style={{ display: 'flex', maxWidth: '1100px', margin: '0 auto', padding: '76px 24px 80px' }}>

          {/* TOC sidebar */}
          <aside className="toc-sidebar" style={{ display: 'none', width: '220px', flexShrink: 0, position: 'sticky', top: '76px', height: 'fit-content', marginRight: '48px', paddingTop: '16px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '12px', fontWeight: 500 }}>Contents</div>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#6C6A66', textDecoration: 'none', padding: '3px 0', lineHeight: 1.5 }}>{s.title}</a>
            ))}
          </aside>

          {/* Body */}
          <div style={{ flex: 1, maxWidth: '720px' }}>

            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '8px', fontWeight: 500 }}>Legal</div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '42px', fontWeight: 300, color: '#F0EDE6', lineHeight: 1.1, margin: '0 0 16px' }}>
                Privacy <em style={{ fontStyle: 'italic', color: '#C9A84C' }}>Policy</em>
              </h1>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#6C6A66' }}>Effective Date: <span style={{ color: '#B8B4AC' }}>[DATE — TO BE CONFIRMED]</span></div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#6C6A66' }}>Chase Hollow LLC · Idaho</div>
              </div>
            </div>

            <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '32px' }}>
              <p style={{ fontSize: '13px', color: '#B8B4AC', lineHeight: 1.75, margin: 0 }}>
                This Privacy Policy describes how Chase Hollow LLC collects, uses, and shares information when you use our platform. By using Chase Hollow, you agree to the practices described here.
              </p>
            </div>

            {/* 1 */}
            <section id="overview">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>1. Overview</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>Chase Hollow LLC ("Chase Hollow," "we," "us," or "our") operates a blockchain-secured trading card marketplace at <strong style={{ color: '#F0EDE6', fontWeight: 600 }}>chasehollow.com</strong>. We are committed to protecting your privacy. This Privacy Policy explains what information we collect, why we collect it, and how it is used in connection with our services.</p>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>This policy applies to all users of the Chase Hollow platform, including buyers, sellers, authenticators, and visitors. It does not apply to third-party services we integrate with, each of which has its own privacy policy.</p>
            </section>

            {/* 2 */}
            <section id="information">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>2. Information We Collect</h2>
              <p style={{ fontSize: '14px', color: '#F0EDE6', fontWeight: 600, margin: '0 0 6px' }}>Account Information</p>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>When you create an account or complete onboarding, we collect:</p>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li>Email address</li>
                <li>Username and display name</li>
                <li>Cryptocurrency wallet address (when connected)</li>
                <li>Shipping address (for sellers — used to generate shipping labels)</li>
              </ul>
              <p style={{ fontSize: '14px', color: '#F0EDE6', fontWeight: 600, margin: '0 0 6px' }}>Transaction Data</p>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>When you buy or sell on Chase Hollow, we collect:</p>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li>Order details: card purchased, price, authentication tier, shipping method</li>
                <li>Escrow transaction hashes (on-chain identifiers on the Base network)</li>
                <li>Shipping tracking numbers and carrier scan events</li>
                <li>Authentication inspection records, including photos uploaded during the authentication process</li>
                <li>Dispute records and associated evidence if a dispute is filed</li>
              </ul>
              <p style={{ fontSize: '14px', color: '#F0EDE6', fontWeight: 600, margin: '0 0 6px' }}>Listing Content</p>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>When you create a listing, we collect the card details you provide (name, grade, condition, game, set, price) and any photos you upload.</p>
              <p style={{ fontSize: '14px', color: '#F0EDE6', fontWeight: 600, margin: '0 0 6px' }}>Communications</p>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>We collect messages you send through our in-platform chat system and any support tickets you submit.</p>
              <p style={{ fontSize: '14px', color: '#F0EDE6', fontWeight: 600, margin: '0 0 6px' }}>Automatically Collected Information</p>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li>IP address and approximate geographic location</li>
                <li>Browser type and device information</li>
                <li>Pages visited and actions taken on the platform</li>
                <li>Referral source (including affiliate referral codes)</li>
              </ul>
            </section>

            {/* 3 */}
            <section id="use">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>3. How We Use Your Information</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>We use the information we collect to:</p>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Operate the platform</strong> — process transactions, generate shipping labels, authenticate cards, manage escrow releases, and enforce the strike and dispute systems</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Communicate with you</strong> — send transactional emails (purchase confirmation, shipping updates, authentication results, fund releases, dispute notifications, strike notices)</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Provide customer support</strong> — respond to your support tickets and resolve disputes</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Maintain safety and integrity</strong> — detect fraud, enforce our Terms of Service, and prevent prohibited conduct</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Improve the platform</strong> — analyze usage patterns to improve features and performance</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Creator affiliate attribution</strong> — track referral conversions and calculate commissions for approved creators</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Legal compliance</strong> — comply with applicable laws, respond to lawful requests, and protect our legal rights</li>
              </ul>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>We do not sell your personal information to third parties.</p>
            </section>

            {/* 4 */}
            <section id="sharing">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>4. Information We Share</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>We share your information only in the following circumstances:</p>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>With transaction counterparties</strong> — when a sale is completed, shipping labels are generated by Chase Hollow. Sellers do not receive raw buyer address data.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>With service providers</strong> — we share data with third-party vendors who help us operate the platform (see Section 5). These providers are contractually required to protect your data.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>For legal reasons</strong> — we may disclose information if required by law, subpoena, or court order, or to protect the rights, property, or safety of Chase Hollow, our users, or the public.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>With your consent</strong> — we may share information for other purposes with your explicit consent.</li>
              </ul>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>Public profile information — your username, seller tier, total sales, and reputation scores — is visible to all users by design.</p>
            </section>

            {/* 5 */}
            <section id="third-party">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>5. Third-Party Services</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>Chase Hollow integrates with the following third-party services, each operating under its own privacy policy:</p>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Supabase</strong> — database, authentication, and file storage (supabase.com/privacy)</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Privy</strong> — embedded and external cryptocurrency wallet management (privy.io/privacy-policy)</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Google OAuth</strong> — optional sign-in via Google; Google shares your name and email with us (policies.google.com/privacy)</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Shippo</strong> — shipping label generation and carrier rate calculation (goshippo.com/privacy)</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Resend</strong> — transactional email delivery (resend.com/privacy)</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Alchemy</strong> — blockchain RPC provider for the Base network (alchemy.com/policies/privacy)</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Cloudflare</strong> — DDoS protection, WAF, and CDN (cloudflare.com/privacypolicy)</li>
              </ul>
            </section>

            {/* 6 */}
            <section id="blockchain">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>6. Blockchain and Public Data</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>Chase Hollow uses smart contracts on the <strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Base network</strong> (Ethereum Layer 2) to manage escrow. When you participate in a transaction, the following data is permanently recorded on the blockchain:</p>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li>Your wallet address</li>
                <li>Transaction amounts (in USDC)</li>
                <li>Escrow creation, release, refund, and dispute events</li>
                <li>On-chain order identifiers</li>
              </ul>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Blockchain data is public and permanent.</strong> We cannot delete, modify, or restrict access to any data recorded on-chain. Anyone can view this data using a blockchain explorer such as Basescan. Your wallet address, while pseudonymous, may be linkable to your identity.</p>
            </section>

            {/* 7 */}
            <section id="cookies">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>7. Cookies and Local Storage</h2>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Authentication cookies</strong> — set by Supabase to maintain your login session. Essential for platform function.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Local storage</strong> — we store your theme preference (dark/light mode) locally in your browser. This data never leaves your device.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Affiliate cookies</strong> — if you arrive via a creator referral link, a 30-day cookie attributes any resulting purchase to that creator for commission purposes.</li>
              </ul>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>We do not use advertising cookies or cross-site tracking. We do not use Google Analytics or similar platforms that share data for advertising purposes.</p>
            </section>

            {/* 8 */}
            <section id="retention">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>8. Data Retention</h2>
              <ul style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Account data</strong> — retained for the life of your account. Deletion requests processed within 30 days, subject to legal retention requirements.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Transaction records</strong> — retained for a minimum of 7 years for financial recordkeeping and dispute resolution.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Authentication photos</strong> — retained for 2 years after the associated transaction is completed, then deleted.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Support tickets</strong> — retained for 3 years.</li>
                <li><strong style={{ color: '#F0EDE6', fontWeight: 600 }}>Blockchain data</strong> — permanent and cannot be deleted (see Section 6).</li>
              </ul>
            </section>

            {/* 9 */}
            <section id="security">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>9. Security</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>We take reasonable technical and organizational measures to protect your information, including TLS/HTTPS encryption, row-level security on our database, server-side key restrictions, Cloudflare WAF protection, and private storage for authentication photos. No method of transmission over the internet is 100% secure. If you believe your account has been compromised, contact us at <strong style={{ color: '#F0EDE6', fontWeight: 600 }}>support@chasehollow.com</strong>.</p>
            </section>

            {/* 10 */}
            <section id="rights">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>10. Your Rights</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal information, and to object to certain uses. To exercise these rights, contact us at <strong style={{ color: '#F0EDE6', fontWeight: 600 }}>support@chasehollow.com</strong>. We will respond within 30 days. You can update your username, full name, and shipping address at any time from your seller dashboard. Note that blockchain data cannot be deleted.</p>
            </section>

            {/* 11 */}
            <section id="children">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>11. Children's Privacy</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>Chase Hollow is intended for users who are <strong style={{ color: '#F0EDE6', fontWeight: 600 }}>18 years of age or older</strong>. We do not knowingly collect personal information from anyone under 18. If you believe a minor has provided us with personal information, contact us at <strong style={{ color: '#F0EDE6', fontWeight: 600 }}>support@chasehollow.com</strong>.</p>
            </section>

            {/* 12 */}
            <section id="changes">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>12. Changes to This Policy</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date and, where appropriate, notify you by email or platform notification. Your continued use of Chase Hollow after any update constitutes acceptance of the revised policy.</p>
            </section>

            {/* 13 */}
            <section id="contact">
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: '#F0EDE6', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A32' }}>13. Contact</h2>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>If you have questions or requests regarding this Privacy Policy or your personal data:</p>
              <div style={{ background: '#111114', border: '1.5px solid #2A2A32', borderRadius: '10px', padding: '18px 22px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#B8B4AC', lineHeight: 2 }}>
                  <div><span style={{ color: '#6C6A66' }}>Company:</span> Chase Hollow LLC</div>
                  <div><span style={{ color: '#6C6A66' }}>State:</span> Idaho, United States</div>
                  <div><span style={{ color: '#6C6A66' }}>Email:</span> <a href="mailto:support@chasehollow.com" style={{ color: '#0D6E6E' }}>support@chasehollow.com</a></div>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 14px' }}>For the fastest response, use our <a href="https://chasehollow.com/support" style={{ color: '#0D6E6E' }}>contact form</a>.</p>
            </section>

            {/* Bottom nav */}
            <div style={{ marginTop: '56px', paddingTop: '24px', borderTop: '0.5px solid #2A2A32', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <a href="/tos" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#0D6E6E' }}>← Terms of Service</a>
              <a href="/" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#6C6A66' }}>Back to Chase Hollow →</a>
            </div>

          </div>
        </div>
      </body>
    </html>
  )
}
