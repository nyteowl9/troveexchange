'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const [theme, setTheme] = useState('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

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

  const links = [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#fee-comparison', label: 'Fee Comparison' },
    { href: '/creators', label: 'Creators' },
    { href: '/#wallets', label: 'Get Started' },
  ]

  // Staff/portal pages get minimal nav
  const isPortal = ['/authenticator', '/dispute-resolution', '/customer-support', '/admin'].includes(pathname)
  const isCheckout = pathname === '/checkout'

  if (isCheckout) {
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <Link href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </Link>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '4px 14px', borderRadius: '20px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
          Secure Checkout · Base Blockchain
        </div>
        <button onClick={toggleTheme} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '15px', color: 'var(--text-secondary)' }}>
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
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </Link>
          {portal && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: portal.bg, border: `1px solid ${portal.color}`, color: portal.textColor, fontWeight: 500 }}>{portal.label}</div>}
        </div>
        <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </nav>
    )
  }

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

      {/* Logo */}
      <Link href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
        CHASE HOLLOW
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {links.map((link, i) => (
          <Link key={i} href={link.href} style={{ fontSize: '12px', fontWeight: 500, color: pathname === link.href ? 'var(--teal)' : 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s' }}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button onClick={toggleTheme} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '15px', color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <Link href="/sign-in" style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 18px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}>
          Sign In
        </Link>
        <Link href="/seller-dashboard" style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 20px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}>
          List a Card
        </Link>
      </div>

    </nav>
  )
}
