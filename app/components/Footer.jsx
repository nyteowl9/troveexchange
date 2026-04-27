'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  // No footer on portal/staff pages or checkout
  const hideFooter = [
    '/authenticator',
    '/dispute-resolution',
    '/customer-support',
    '/admin',
    '/checkout',
    '/buyer-dashboard',
    '/seller-dashboard',
    '/creator-dashboard',
  ].includes(pathname)

  if (hideFooter) return null

  return (
    <footer style={{ background: 'var(--bg-2)', borderTop: '0.5px solid var(--border)', padding: '56px 2.5rem 32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '48px', marginBottom: '48px' }}>

          {/* Brand */}
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '22px', height: '22px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
              CHASE HOLLOW
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '16px' }}>
              The first blockchain-secured TCG marketplace. Every card authenticated. Every USDC protected by smart contract.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: '3.5% fee', color: 'var(--gold)', bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)' },
                { label: 'Base L2', color: 'var(--teal)', bg: 'var(--teal-bg)', border: 'var(--teal-border)' },
                { label: 'USDC', color: 'var(--accent-blue)', bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)' },
              ].map((badge, i) => (
                <span key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontWeight: 500 }}>{badge.label}</span>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Marketplace</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: '/marketplace', label: 'Browse All Cards' },
                { href: '/marketplace?game=pokemon', label: 'Pokémon TCG' },
                { href: '/marketplace?game=mtg', label: 'Magic: The Gathering' },
                { href: '/marketplace?game=onepiece', label: 'One Piece TCG' },
                { href: '/marketplace?type=graded', label: 'Graded Slabs' },
                { href: '/marketplace?type=sealed', label: 'Sealed Product' },
              ].map((link, i) => (
                <Link key={i} href={link.href} style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--teal)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Sell */}
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Sell</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: '/seller-dashboard', label: 'Start Selling' },
                { href: '/#fee-comparison', label: 'Fee Comparison' },
                { href: '/#how-it-works', label: 'How Authentication Works' },
                { href: '/#shipping', label: 'Shipping & Insurance' },
                { href: '/creators', label: 'Creator Program' },
                { href: '/#faq', label: 'Seller FAQ' },
              ].map((link, i) => (
                <Link key={i} href={link.href} style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--teal)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Support</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: '/#wallets', label: 'Get a Wallet' },
                { href: '/#usdc', label: 'Get USDC on Base' },
                { href: '/#faq', label: 'FAQ' },
                { href: '/#disputes', label: 'Dispute Process' },
                { href: '/tos', label: 'Terms of Service' },
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/support', label: 'Contact Support' },
              ].map((link, i, arr) => (
                <Link key={i} href={link.href} style={{ fontSize: '13px', color: i === arr.length - 1 ? 'var(--teal)' : 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--teal)'}
                  onMouseLeave={e => e.target.style.color = i === arr.length - 1 ? 'var(--teal)' : 'var(--text-secondary)'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* On-chain trust bar */}
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', label: 'Escrow on Base', sub: 'USDC locked in smart contract' },
            { icon: '✓', label: 'Every card authenticated', sub: 'Human verification before delivery' },
            { icon: '⚡', label: '72hr auto-release', sub: 'Funds released automatically' },
            { icon: '🔗', label: 'On-chain reputation', sub: 'Verifiable on Basescan' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '10px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
            © 2026 Chase Hollow · All transactions on Base (Ethereum L2) · Contract: <a href="https://basescan.org" target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none' }}>View on Basescan →</a>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/tos" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/privacy" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/support" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'none' }}>Support</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
