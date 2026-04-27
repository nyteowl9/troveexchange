'use client'

import { useState, useEffect } from 'react'
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
  { id: 'children',       title: '11. Children\'s Privacy' },
  { id: 'changes',        title: '12. Changes to This Policy' },
  { id: 'contact',        title: '13. Contact' },
]

export default function PrivacyPolicy() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  const h2  = { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid var(--border)' }
  const p   = { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 14px' }
  const ul  = { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }
  const strong = { color: 'var(--text-primary)', fontWeight: 600 }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <Link href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </Link>
        <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </nav>

      <div style={{ display: 'flex', paddingTop: '56px', maxWidth: '1100px', margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* TOC — desktop sticky sidebar */}
        <aside style={{ display: 'none', width: '220px', flexShrink: 0, position: 'sticky', top: '76px', height: 'fit-content', marginRight: '48px', paddingTop: '40px' }} className="toc-sidebar">
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Contents</div>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none', padding: '3px 0', lineHeight: 1.5, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--teal)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >{s.title}</a>
          ))}
        </aside>

        <style>{`@media (min-width: 900px) { .toc-sidebar { display: block !important; } }`}</style>

        {/* BODY */}
        <div style={{ flex: 1, maxWidth: '720px' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px', fontWeight: 500 }}>Legal</div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '42px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 16px' }}>
              Privacy <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Policy</em>
            </h1>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Effective Date: <span style={{ color: 'var(--text-secondary)' }}>[DATE — TO BE CONFIRMED]</span></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Chase Hollow LLC · Idaho</div>
            </div>
          </div>

          <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '32px' }}>
            <p style={{ ...p, margin: 0, fontSize: '13px' }}>
              This Privacy Policy describes how Chase Hollow LLC collects, uses, and shares information when you use our platform. By using Chase Hollow, you agree to the practices described here.
            </p>
          </div>

          {/* 1. OVERVIEW */}
          <section id="overview">
            <h2 style={h2}>1. Overview</h2>
            <p style={p}>Chase Hollow LLC ("Chase Hollow," "we," "us," or "our") operates a blockchain-secured trading card marketplace at <strong style={strong}>chasehollow.com</strong>. We are committed to protecting your privacy. This Privacy Policy explains what information we collect, why we collect it, and how it is used in connection with our services.</p>
            <p style={p}>This policy applies to all users of the Chase Hollow platform, including buyers, sellers, authenticators, and visitors. It does not apply to third-party services we integrate with, each of which has its own privacy policy.</p>
          </section>

          {/* 2. INFORMATION WE COLLECT */}
          <section id="information">
            <h2 style={h2}>2. Information We Collect</h2>

            <p style={{ ...p, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Account Information</p>
            <p style={p}>When you create an account or complete onboarding, we collect:</p>
            <ul style={ul}>
              <li>Email address</li>
              <li>Username and display name</li>
              <li>Cryptocurrency wallet address (when connected)</li>
              <li>Shipping address (for sellers — used to generate shipping labels)</li>
            </ul>

            <p style={{ ...p, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Transaction Data</p>
            <p style={p}>When you buy or sell on Chase Hollow, we collect:</p>
            <ul style={ul}>
              <li>Order details: card purchased, price, authentication tier, shipping method</li>
              <li>Escrow transaction hashes (on-chain identifiers on the Base network)</li>
              <li>Shipping tracking numbers and carrier scan events</li>
              <li>Authentication inspection records, including photos uploaded during the authentication process</li>
              <li>Dispute records and associated evidence if a dispute is filed</li>
            </ul>

            <p style={{ ...p, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Listing Content</p>
            <p style={p}>When you create a listing, we collect the card details you provide (name, grade, condition, game, set, price) and any photos you upload.</p>

            <p style={{ ...p, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Communications</p>
            <p style={p}>We collect messages you send through our in-platform chat system and any support tickets you submit.</p>

            <p style={{ ...p, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Automatically Collected Information</p>
            <p style={p}>When you use the platform, we may automatically collect:</p>
            <ul style={ul}>
              <li>IP address and approximate geographic location</li>
              <li>Browser type and device information</li>
              <li>Pages visited and actions taken on the platform</li>
              <li>Referral source (including affiliate referral codes)</li>
            </ul>
          </section>

          {/* 3. HOW WE USE YOUR INFORMATION */}
          <section id="use">
            <h2 style={h2}>3. How We Use Your Information</h2>
            <p style={p}>We use the information we collect to:</p>
            <ul style={ul}>
              <li><strong style={strong}>Operate the platform</strong> — process transactions, generate shipping labels, authenticate cards, manage escrow releases, and enforce the strike and dispute systems</li>
              <li><strong style={strong}>Communicate with you</strong> — send transactional emails (purchase confirmation, shipping updates, authentication results, fund releases, dispute notifications, strike notices)</li>
              <li><strong style={strong}>Provide customer support</strong> — respond to your support tickets and resolve disputes</li>
              <li><strong style={strong}>Maintain safety and integrity</strong> — detect fraud, enforce our Terms of Service, and prevent prohibited conduct</li>
              <li><strong style={strong}>Improve the platform</strong> — analyze usage patterns to improve features and performance</li>
              <li><strong style={strong}>Creator affiliate attribution</strong> — track referral conversions and calculate commissions for approved creators</li>
              <li><strong style={strong}>Legal compliance</strong> — comply with applicable laws, respond to lawful requests, and protect our legal rights</li>
            </ul>
            <p style={p}>We do not sell your personal information to third parties.</p>
          </section>

          {/* 4. INFORMATION WE SHARE */}
          <section id="sharing">
            <h2 style={h2}>4. Information We Share</h2>
            <p style={p}>We share your information only in the following circumstances:</p>
            <ul style={ul}>
              <li><strong style={strong}>With transaction counterparties</strong> — when a sale is completed, the buyer's shipping address is shared with the seller solely for the purpose of generating a shipping label. Sellers do not receive raw address data — labels are generated by Chase Hollow.</li>
              <li><strong style={strong}>With service providers</strong> — we share data with third-party vendors who help us operate the platform (see Section 5). These providers are contractually required to protect your data and use it only for the services they provide to us.</li>
              <li><strong style={strong}>For legal reasons</strong> — we may disclose information if required by law, subpoena, court order, or to protect the rights, property, or safety of Chase Hollow, our users, or the public.</li>
              <li><strong style={strong}>With your consent</strong> — we may share information for other purposes with your explicit consent.</li>
            </ul>
            <p style={p}>Public profile information — your username, seller tier, total sales, and reputation scores — is visible to all users by design.</p>
          </section>

          {/* 5. THIRD-PARTY SERVICES */}
          <section id="third-party">
            <h2 style={h2}>5. Third-Party Services</h2>
            <p style={p}>Chase Hollow integrates with the following third-party services. Each operates under its own privacy policy.</p>
            <ul style={ul}>
              <li><strong style={strong}>Supabase</strong> — database, authentication, and file storage. User account data, listing data, order data, and uploaded photos are stored on Supabase infrastructure. <em>supabase.com/privacy</em></li>
              <li><strong style={strong}>Privy</strong> — embedded and external cryptocurrency wallet management. Wallet connection and signing events are handled by Privy. <em>privy.io/privacy-policy</em></li>
              <li><strong style={strong}>Google OAuth</strong> — optional sign-in via Google. If you choose to sign in with Google, Google shares your name and email address with us. <em>policies.google.com/privacy</em></li>
              <li><strong style={strong}>Shippo</strong> — shipping label generation and carrier rate calculation. Your shipping address is transmitted to Shippo to generate labels. <em>goshippo.com/privacy</em></li>
              <li><strong style={strong}>Resend</strong> — transactional email delivery. Your email address is used to send platform notifications. <em>resend.com/privacy</em></li>
              <li><strong style={strong}>Alchemy</strong> — blockchain RPC provider for the Base network. Transaction data submitted to the blockchain passes through Alchemy's infrastructure. <em>alchemy.com/policies/privacy</em></li>
              <li><strong style={strong}>Cloudflare</strong> — DDoS protection, WAF, and CDN. Network traffic to chasehollow.com passes through Cloudflare. <em>cloudflare.com/privacypolicy</em></li>
            </ul>
          </section>

          {/* 6. BLOCKCHAIN AND PUBLIC DATA */}
          <section id="blockchain">
            <h2 style={h2}>6. Blockchain and Public Data</h2>
            <p style={p}>Chase Hollow uses smart contracts deployed on the <strong style={strong}>Base network</strong> (an Ethereum Layer 2 blockchain) to manage escrow. When you participate in a transaction, certain data is permanently recorded on the blockchain:</p>
            <ul style={ul}>
              <li>Your wallet address</li>
              <li>Transaction amounts (in USDC)</li>
              <li>Escrow creation, release, refund, and dispute events</li>
              <li>On-chain order identifiers</li>
            </ul>
            <p style={p}><strong style={strong}>Blockchain data is public and permanent.</strong> Because blockchain transactions are immutable by design, we cannot delete, modify, or restrict access to any data that has been recorded on-chain. Anyone can view this data using a blockchain explorer such as Basescan.</p>
            <p style={p}>Your wallet address, while pseudonymous, may be linkable to your identity if combined with other information. Please consider this before connecting a wallet to your Chase Hollow account.</p>
          </section>

          {/* 7. COOKIES AND LOCAL STORAGE */}
          <section id="cookies">
            <h2 style={h2}>7. Cookies and Local Storage</h2>
            <p style={p}>Chase Hollow uses the following:</p>
            <ul style={ul}>
              <li><strong style={strong}>Authentication cookies</strong> — set by Supabase to maintain your login session. These are essential for the platform to function.</li>
              <li><strong style={strong}>Local storage</strong> — we store your theme preference (dark/light mode) and certain UI state in your browser's local storage. This data never leaves your device.</li>
              <li><strong style={strong}>Affiliate cookies</strong> — if you arrive via a creator referral link, a 30-day cookie is set to attribute any resulting purchase to that creator for commission purposes.</li>
            </ul>
            <p style={p}>We do not use advertising cookies or cross-site tracking cookies. We do not use Google Analytics or similar analytics platforms that share data with third parties for advertising purposes.</p>
          </section>

          {/* 8. DATA RETENTION */}
          <section id="retention">
            <h2 style={h2}>8. Data Retention</h2>
            <p style={p}>We retain your information for as long as your account is active or as needed to provide services. Specifically:</p>
            <ul style={ul}>
              <li><strong style={strong}>Account data</strong> — retained for the life of your account. If you request account deletion, we will delete your personal information within 30 days, subject to legal and operational retention requirements.</li>
              <li><strong style={strong}>Transaction records</strong> — retained for a minimum of 7 years for financial recordkeeping and dispute resolution purposes.</li>
              <li><strong style={strong}>Authentication photos</strong> — retained for 2 years after the associated transaction is completed, then deleted.</li>
              <li><strong style={strong}>Support tickets</strong> — retained for 3 years.</li>
              <li><strong style={strong}>Blockchain data</strong> — permanent and cannot be deleted (see Section 6).</li>
            </ul>
          </section>

          {/* 9. SECURITY */}
          <section id="security">
            <h2 style={h2}>9. Security</h2>
            <p style={p}>We take reasonable technical and organizational measures to protect your information, including:</p>
            <ul style={ul}>
              <li>TLS/HTTPS encryption for all data in transit</li>
              <li>Row-level security policies on our database</li>
              <li>Service role key restrictions — sensitive API operations use server-side keys never exposed to the browser</li>
              <li>Cloudflare WAF and DDoS protection</li>
              <li>Private authentication photo storage (not publicly accessible)</li>
            </ul>
            <p style={p}>No method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security. If you believe your account has been compromised, contact us immediately at <strong style={strong}>support@chasehollow.com</strong>.</p>
          </section>

          {/* 10. YOUR RIGHTS */}
          <section id="rights">
            <h2 style={h2}>10. Your Rights</h2>
            <p style={p}>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
            <ul style={ul}>
              <li><strong style={strong}>Access</strong> — request a copy of the personal information we hold about you</li>
              <li><strong style={strong}>Correction</strong> — update or correct inaccurate information in your account settings or by contacting us</li>
              <li><strong style={strong}>Deletion</strong> — request deletion of your account and personal data (subject to retention requirements and blockchain data limitations)</li>
              <li><strong style={strong}>Portability</strong> — request your data in a portable format</li>
              <li><strong style={strong}>Objection</strong> — object to certain uses of your data</li>
            </ul>
            <p style={p}>To exercise any of these rights, contact us at <strong style={strong}>support@chasehollow.com</strong>. We will respond within 30 days. Note that certain data cannot be deleted if it is necessary for ongoing legal obligations, active dispute resolution, or is recorded on the blockchain.</p>
            <p style={p}>You can update your username, full name, and shipping address at any time from your seller dashboard.</p>
          </section>

          {/* 11. CHILDREN'S PRIVACY */}
          <section id="children">
            <h2 style={h2}>11. Children's Privacy</h2>
            <p style={p}>Chase Hollow is intended for users who are <strong style={strong}>18 years of age or older</strong>. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected personal information from a minor, we will delete it promptly. If you believe a minor has provided us with personal information, please contact us at <strong style={strong}>support@chasehollow.com</strong>.</p>
          </section>

          {/* 12. CHANGES */}
          <section id="changes">
            <h2 style={h2}>12. Changes to This Policy</h2>
            <p style={p}>We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date at the top of this page and, where appropriate, notify you by email or platform notification. Your continued use of Chase Hollow after any update constitutes acceptance of the revised policy.</p>
            <p style={p}>We encourage you to review this policy periodically.</p>
          </section>

          {/* 13. CONTACT */}
          <section id="contact">
            <h2 style={h2}>13. Contact</h2>
            <p style={p}>If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '18px 22px', marginBottom: '14px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Company:</span> Chase Hollow LLC</div>
                <div><span style={{ color: 'var(--text-muted)' }}>State:</span> Idaho, United States</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <a href="mailto:support@chasehollow.com" style={{ color: 'var(--teal)', textDecoration: 'none' }}>support@chasehollow.com</a></div>
              </div>
            </div>
            <p style={p}>For the fastest response, use our <Link href="/support" style={{ color: 'var(--teal)', textDecoration: 'none' }}>contact form</Link>.</p>
          </section>

          {/* Bottom nav */}
          <div style={{ marginTop: '56px', paddingTop: '24px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <Link href="/tos" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}>← Terms of Service</Link>
            <Link href="/" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}>Back to Chase Hollow →</Link>
          </div>

        </div>
      </div>
    </div>
  )
}
