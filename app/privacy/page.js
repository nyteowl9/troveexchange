import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Chase Hollow',
  description: 'Privacy Policy for Chase Hollow LLC, a blockchain-secured TCG marketplace.',
}

const SECTIONS = [
  { id: 'overview',     title: '1. Overview' },
  { id: 'information',  title: '2. Information We Collect' },
  { id: 'use',          title: '3. How We Use Your Information' },
  { id: 'sharing',      title: '4. Information We Share' },
  { id: 'third-party',  title: '5. Third-Party Services' },
  { id: 'blockchain',   title: '6. Blockchain and Public Data' },
  { id: 'cookies',      title: '7. Cookies and Local Storage' },
  { id: 'retention',    title: '8. Data Retention' },
  { id: 'security',     title: '9. Security' },
  { id: 'rights',       title: '10. Your Rights' },
  { id: 'children',     title: "11. Children's Privacy" },
  { id: 'changes',      title: '12. Changes to This Policy' },
  { id: 'contact',      title: '13. Contact' },
]

export default function PrivacyPolicy() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: '64px' }}>
      <style>{`@media (min-width: 900px) { .privacy-toc { display: block !important; } }`}</style>

      <div style={{ display: 'flex', maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* TOC sidebar */}
        <aside className="privacy-toc" style={{ display: 'none', width: '220px', flexShrink: 0, position: 'sticky', top: '84px', height: 'fit-content', marginRight: '48px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Contents</div>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none', padding: '3px 0', lineHeight: 1.5 }}>{s.title}</a>
          ))}
        </aside>

        {/* Body */}
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
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
              This Privacy Policy describes how Chase Hollow LLC collects, uses, and shares information when you use our platform. By using Chase Hollow, you agree to the practices described here.
            </p>
          </div>

          <Section id="overview" title="1. Overview">
            <P>Chase Hollow LLC ("Chase Hollow," "we," "us," or "our") operates a blockchain-secured trading card marketplace at <B>chasehollow.com</B>. We are committed to protecting your privacy. This Privacy Policy explains what information we collect, why we collect it, and how it is used.</P>
            <P>This policy applies to all users of the Chase Hollow platform, including buyers, sellers, authenticators, and visitors.</P>
          </Section>

          <Section id="information" title="2. Information We Collect">
            <SubHead>Account Information</SubHead>
            <P>When you create an account or complete onboarding, we collect:</P>
            <UL items={['Email address', 'Username and display name', 'Cryptocurrency wallet address (when connected)', 'Shipping address (for sellers — used to generate shipping labels)']} />
            <SubHead>Transaction Data</SubHead>
            <P>When you buy or sell on Chase Hollow, we collect:</P>
            <UL items={['Order details: card purchased, price, authentication tier, shipping method', 'Escrow transaction hashes (on-chain identifiers on the Base network)', 'Shipping tracking numbers and carrier scan events', 'Authentication inspection records, including photos uploaded during the authentication process', 'Dispute records and associated evidence if a dispute is filed']} />
            <SubHead>Listing Content</SubHead>
            <P>Card details you provide (name, grade, condition, game, set, price) and any photos you upload when creating a listing.</P>
            <SubHead>Communications</SubHead>
            <P>Messages sent through our in-platform chat system and any support tickets you submit.</P>
            <SubHead>Automatically Collected Information</SubHead>
            <UL items={['IP address and approximate geographic location', 'Browser type and device information', 'Pages visited and actions taken on the platform', 'Referral source (including affiliate referral codes)']} />
          </Section>

          <Section id="use" title="3. How We Use Your Information">
            <P>We use the information we collect to:</P>
            <UL items={[
              'Operate the platform — process transactions, generate shipping labels, authenticate cards, manage escrow releases, and enforce the strike and dispute systems',
              'Communicate with you — send transactional emails (purchase confirmation, shipping updates, authentication results, fund releases, dispute notifications, strike notices)',
              'Provide customer support — respond to support tickets and resolve disputes',
              'Maintain safety and integrity — detect fraud, enforce our Terms of Service, and prevent prohibited conduct',
              'Improve the platform — analyze usage patterns to improve features and performance',
              'Creator affiliate attribution — track referral conversions and calculate commissions for approved creators',
              'Legal compliance — comply with applicable laws and protect our legal rights',
            ]} />
            <P>We do not sell your personal information to third parties.</P>
          </Section>

          <Section id="sharing" title="4. Information We Share">
            <P>We share your information only in the following circumstances:</P>
            <UL items={[
              'With transaction counterparties — shipping labels are generated by Chase Hollow. Sellers do not receive raw buyer address data.',
              'With service providers — third-party vendors who help us operate the platform (see Section 5), bound by data protection agreements.',
              'For legal reasons — if required by law, subpoena, or court order, or to protect the rights, property, or safety of Chase Hollow, our users, or the public.',
              'With your consent — for other purposes with your explicit consent.',
            ]} />
            <P>Public profile information — your username, seller tier, total sales, and reputation scores — is visible to all users by design.</P>
          </Section>

          <Section id="third-party" title="5. Third-Party Services">
            <P>Chase Hollow integrates with the following third-party services, each operating under its own privacy policy:</P>
            <UL items={[
              'Supabase — database, authentication, and file storage (supabase.com/privacy)',
              'Privy — cryptocurrency wallet management (privy.io/privacy-policy)',
              'Google OAuth — optional sign-in via Google; Google shares your name and email with us (policies.google.com/privacy)',
              'Shippo — shipping label generation and carrier rate calculation (goshippo.com/privacy)',
              'Resend — transactional email delivery (resend.com/privacy)',
              'Alchemy — blockchain RPC provider for the Base network (alchemy.com/policies/privacy)',
              'Cloudflare — DDoS protection, WAF, and CDN (cloudflare.com/privacypolicy)',
            ]} />
          </Section>

          <Section id="blockchain" title="6. Blockchain and Public Data">
            <P>Chase Hollow uses smart contracts on the <B>Base network</B> (Ethereum Layer 2) to manage escrow. When you participate in a transaction, the following data is permanently recorded on the blockchain:</P>
            <UL items={['Your wallet address', 'Transaction amounts (in USDC)', 'Escrow creation, release, refund, and dispute events', 'On-chain order identifiers']} />
            <P><B>Blockchain data is public and permanent.</B> We cannot delete, modify, or restrict access to any data recorded on-chain. Anyone can view this data using a blockchain explorer such as Basescan. Your wallet address, while pseudonymous, may be linkable to your identity.</P>
          </Section>

          <Section id="cookies" title="7. Cookies and Local Storage">
            <UL items={[
              'Authentication cookies — set by Supabase to maintain your login session. Essential for platform function.',
              'Local storage — your theme preference (dark/light mode) stored locally in your browser. Never leaves your device.',
              'Affiliate cookies — if you arrive via a creator referral link, a 30-day cookie attributes any resulting purchase to that creator.',
            ]} />
            <P>We do not use advertising cookies, cross-site tracking, or analytics platforms that share data for advertising purposes.</P>
          </Section>

          <Section id="retention" title="8. Data Retention">
            <UL items={[
              'Account data — retained for the life of your account. Deletion requests processed within 30 days, subject to legal retention requirements.',
              'Transaction records — retained for a minimum of 7 years for financial recordkeeping and dispute resolution.',
              'Authentication photos — retained for 2 years after the associated transaction is completed, then deleted.',
              'Support tickets — retained for 3 years.',
              'Blockchain data — permanent and cannot be deleted (see Section 6).',
            ]} />
          </Section>

          <Section id="security" title="9. Security">
            <P>We take reasonable technical and organizational measures to protect your information, including TLS/HTTPS encryption, row-level security on our database, server-side key restrictions, Cloudflare WAF protection, and private storage for authentication photos. No method of transmission over the internet is 100% secure. If you believe your account has been compromised, contact us at <B>support@chasehollow.com</B>.</P>
          </Section>

          <Section id="rights" title="10. Your Rights">
            <P>Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal information, and to object to certain uses. To exercise these rights, contact us at <B>support@chasehollow.com</B>. We will respond within 30 days. You can update your username, full name, and shipping address at any time from your seller dashboard. Note that blockchain data cannot be deleted.</P>
          </Section>

          <Section id="children" title="11. Children's Privacy">
            <P>Chase Hollow is intended for users who are <B>18 years of age or older</B>. We do not knowingly collect personal information from anyone under 18. If you believe a minor has provided us with personal information, contact us at <B>support@chasehollow.com</B>.</P>
          </Section>

          <Section id="changes" title="12. Changes to This Policy">
            <P>We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date and, where appropriate, notify you by email or platform notification. Continued use of Chase Hollow after any update constitutes acceptance of the revised policy.</P>
          </Section>

          <Section id="contact" title="13. Contact">
            <P>If you have questions or requests regarding this Privacy Policy or your personal data:</P>
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '18px 22px', marginBottom: '14px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Company:</span> Chase Hollow LLC</div>
                <div><span style={{ color: 'var(--text-muted)' }}>State:</span> Idaho, United States</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <a href="mailto:support@chasehollow.com" style={{ color: 'var(--teal)', textDecoration: 'none' }}>support@chasehollow.com</a></div>
              </div>
            </div>
            <P>For the fastest response, use our <Link href="/support" style={{ color: 'var(--teal)', textDecoration: 'none' }}>contact form</Link>.</P>
          </Section>

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

function Section({ id, title, children }) {
  return (
    <section id={id}>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid var(--border)' }}>{title}</h2>
      {children}
    </section>
  )
}

function SubHead({ children }) {
  return <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '16px 0 6px' }}>{children}</p>
}

function P({ children }) {
  return <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 14px' }}>{children}</p>
}

function B({ children }) {
  return <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>
}

function UL({ items }) {
  return (
    <ul style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}
