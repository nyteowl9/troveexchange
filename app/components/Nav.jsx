'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

export default function Nav() {
  const [theme, setTheme] = useState('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading, profileLoading, signOut } = useAuth()

  // If logged in but onboarding never completed (no username), redirect there.
  // Wait for both auth AND profile to finish loading to avoid false redirects.
  useEffect(() => {
    if (!loading && !profileLoading && user && !profile?.username &&
        !pathname.startsWith('/onboarding') &&
        !pathname.startsWith('/sign-')) {
      router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, profileLoading, user, profile, pathname, router])

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  const links = [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#fee-comparison', label: 'Fee Comparison' },
    { href: '/creators', label: 'Creators' },
    { href: '/#wallets', label: 'Get Started' },
  ]

  const isPortal = ['/authenticator', '/dispute-resolution', '/customer-support', '/admin'].includes(pathname)
  const isCheckout = pathname === '/checkout'

  const logoEl = (size = 20, hexSize = 24) => (
    <Link href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: `${size}px`, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
      <div style={{ width: `${hexSize}px`, height: `${hexSize}px`, background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', flexShrink: 0 }} />
      CHASE HOLLOW
    </Link>
  )

  if (isCheckout) {
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        {logoEl(18, 22)}
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
          Secure Checkout · Base
        </div>
        <button onClick={toggleTheme} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </nav>
    )
  }

  if (isPortal) {
    const portalLabels = {
      '/authenticator': { label: 'Auth Portal', color: 'rgba(60,125,200,0.3)', textColor: 'var(--accent-blue)', bg: 'rgba(60,125,200,0.1)' },
      '/dispute-resolution': { label: 'Dispute Resolution', color: 'rgba(232,168,56,0.3)', textColor: 'var(--accent-amber)', bg: 'rgba(232,168,56,0.1)' },
      '/customer-support': { label: 'Support Portal', color: 'rgba(60,125,200,0.3)', textColor: 'var(--accent-blue)', bg: 'rgba(60,125,200,0.1)' },
      '/admin': { label: 'Owner Admin', color: 'rgba(200,75,60,0.3)', textColor: 'var(--accent-red)', bg: 'rgba(200,75,60,0.1)' },
    }
    const portal = portalLabels[pathname]
    const portalLinks = profile?.role === 'owner'
      ? [
          { href: '/admin',              label: 'Admin' },
          { href: '/authenticator',      label: 'Auth' },
          { href: '/dispute-resolution', label: 'Disputes' },
          { href: '/buyer-dashboard',    label: 'Buyer' },
          { href: '/seller-dashboard',   label: 'Seller' },
        ]
      : profile?.role === 'staff'
        ? [
            { href: '/authenticator',      label: 'Auth' },
            { href: '/dispute-resolution', label: 'Disputes' },
            { href: '/customer-support',   label: 'Support' },
          ]
        : []

    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {logoEl(16, 18)}
          {portal && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: portal.bg, border: `1px solid ${portal.color}`, color: portal.textColor, fontWeight: 500 }}>{portal.label}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {portalLinks.map(({ href, label }) => (
            <Link key={href} href={href} style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: pathname === href ? 'var(--gold)' : 'var(--text-muted)', textDecoration: 'none', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${pathname === href ? 'rgba(201,168,76,0.35)' : 'transparent'}`, background: pathname === href ? 'rgba(201,168,76,0.08)' : 'transparent', whiteSpace: 'nowrap' }}>{label}</Link>
          ))}
          <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>
    )
  }

  return (
    <>
      <style>{`
        .nav-desktop { display: flex; gap: 2rem; align-items: center; }
        .nav-list-btn { display: inline-block; }
        .nav-hamburger { display: none; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-list-btn { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

        {logoEl()}

        {/* Desktop nav links */}
        <div className="nav-desktop">
          {links.map((link, i) => (
            link.href.includes('#')
              ? <a key={i} href={link.href} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{link.label}</a>
              : <Link key={i} href={link.href} style={{ fontSize: '12px', fontWeight: 500, color: pathname === link.href ? 'var(--teal)' : 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{link.label}</Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button onClick={toggleTheme} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {/* Auth buttons */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <Link href={profile?.role === 'owner' ? '/admin' : profile?.role === 'authenticator' ? '/authenticator' : profile?.role === 'staff' ? '/customer-support' : '/buyer-dashboard'} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.username ? `@${profile.username}` : user.email}
                </Link>
                {(!profile?.role || profile.role === 'buyer') && (
                  <Link href={pathname === '/buyer-dashboard' ? '/seller-dashboard' : pathname === '/seller-dashboard' ? '/buyer-dashboard' : '/seller-dashboard'} style={{ fontSize: '10px', color: 'var(--teal)', textDecoration: 'none', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                    {pathname === '/buyer-dashboard' ? 'Seller Dashboard →' : pathname === '/seller-dashboard' ? 'Buyer Dashboard →' : 'Seller Dashboard →'}
                  </Link>
                )}
                {profile?.role === 'owner' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {[
                      { href: '/buyer-dashboard',  label: 'Buyer' },
                      { href: '/seller-dashboard', label: 'Seller' },
                      { href: '/authenticator',    label: 'Auth' },
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} style={{ fontSize: '9px', color: pathname === href ? 'var(--gold)' : 'var(--text-muted)', textDecoration: 'none', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap', padding: '1px 5px', borderRadius: '4px', border: `1px solid ${pathname === href ? 'rgba(201,168,76,0.4)' : 'transparent'}` }}>{label}</Link>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={async () => { await signOut(); router.push('/') }} style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 14px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <Link href="/sign-in" style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 14px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, borderRadius: '8px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
              Sign In
            </Link>
          )}

          {/* List a Card — desktop only */}
          <Link href={user ? '/seller-dashboard?section=new-listing' : '/sign-in'} className="nav-list-btn" style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '7px 18px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', textDecoration: 'none' }}>
            List a Card
          </Link>

          {/* Hamburger — mobile only */}
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid var(--border)', background: menuOpen ? 'var(--bg-3)' : 'transparent', cursor: 'pointer', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px' }}>
            <span style={{ display: 'block', width: '16px', height: '1.5px', background: 'var(--text-secondary)', borderRadius: '2px', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ display: 'block', width: '16px', height: '1.5px', background: 'var(--text-secondary)', borderRadius: '2px', transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: '16px', height: '1.5px', background: 'var(--text-secondary)', borderRadius: '2px', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 199, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {links.map((link, i) => (
            link.href.includes('#')
              ? <a key={i} href={link.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '14px 1.5rem', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', borderBottom: i < links.length - 1 ? '0.5px solid var(--border)' : 'none' }}>{link.label}</a>
              : <Link key={i} href={link.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '14px 1.5rem', fontSize: '14px', fontWeight: 500, color: pathname === link.href ? 'var(--teal)' : 'var(--text-secondary)', textDecoration: 'none', borderBottom: i < links.length - 1 ? '0.5px solid var(--border)' : 'none' }}>{link.label}</Link>
          ))}
          <div style={{ padding: '14px 1.5rem' }}>
            <Link href={user ? '/seller-dashboard?section=new-listing' : '/sign-in'} onClick={() => setMenuOpen(false)} style={{ display: 'block', textAlign: 'center', background: 'var(--teal)', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', textDecoration: 'none' }}>
              List a Card →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
