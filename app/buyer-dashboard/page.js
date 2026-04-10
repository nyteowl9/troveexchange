'use client'

import { useState, useEffect } from 'react'

export default function BuyerDashboard() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('overview')
  const [countdown, setCountdown] = useState({ h: 18, m: 42, s: 33 })

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        let { h, m, s } = prev
        s--
        if (s < 0) { s = 59; m-- }
        if (m < 0) { m = 59; h-- }
        if (h < 0) { h = 0; m = 0; s = 0 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  const pad = n => String(n).padStart(2, '0')

  const orders = [
    {
      id: '#4821', name: 'Charizard Holo PSA 9', game: 'Pokémon · Base Set Shadowless', price: '$560.71', status: 'auto-release', statusLabel: 'Auto-Release in 18h', urgent: true,
      tracking: '📦 Delivered Apr 5 · Auto-release Apr 8 12:00pm · No action needed unless disputing',
      steps: [true, true, true, true, true], activeStep: 4,
      bg: 'linear-gradient(145deg,#1a3a5c,#0d2035)', icon: '⚡'
    },
    {
      id: '#4821b', name: 'Mox Sapphire BGS 9', game: 'MTG · Unlimited Edition', price: '$7,412.00', status: 'auth', statusLabel: 'Authenticating',
      tracking: '🔍 At Chase Hollow HQ · Auth in progress · Estimated delivery Apr 9–10',
      steps: [true, true, true, false, false], activeStep: 3,
      bg: 'linear-gradient(145deg,#1a1a3c,#0d0d24)', icon: '⬟'
    },
    {
      id: '#4821c', name: 'Pikachu Illustrator PSA 7', game: 'Pokémon · 1998 CoroCoro', price: '$4,239.87', status: 'shipped', statusLabel: 'In Transit',
      tracking: '📬 FedEx tracking: 794652841092 · Est. arrival Apr 8',
      steps: [true, true, false, false, false], activeStep: 2,
      bg: 'linear-gradient(145deg,#2a1a3e,#1a0d2a)', icon: '★'
    },
  ]

  const watchlist = [
    { name: 'Charizard PSA 10', game: 'Base Set · 1st Edition', price: '$36,000', change: '▼ $400', up: false, bg: 'linear-gradient(145deg,#1a3a5c,#0d2035)', icon: '⚡', drop: false },
    { name: 'Pikachu Illustrator', game: 'PSA 8 · 1998 Promo', price: '$6,200', change: '▼ $300 drop', up: false, bg: 'linear-gradient(145deg,#2a1a3e,#1a0d2a)', icon: '★', drop: true },
    { name: 'Black Lotus BGS 9', game: 'MTG · Alpha · Power Nine', price: '$22,000', change: '▲ $800', up: true, bg: 'linear-gradient(145deg,#1c2a1c,#0d1a0d)', icon: '✦', drop: false },
    { name: 'Luffy SEC Alt Art', game: 'PSA 10 · OP-01', price: '$820', change: '▼ $70 drop', up: false, bg: 'linear-gradient(145deg,#2a1c1c,#1a0d0d)', icon: '☠', drop: true },
  ]

  const offers = [
    { name: 'Pikachu Illustrator PSA 7', game: '1998 CoroCoro Trophy', listing: '$4,200', offer: '$3,900', status: 'pending' },
    { name: 'Mox Emerald PSA 8', game: 'MTG · Unlimited', listing: '$3,200', offer: '$2,800', status: 'declined' },
    { name: 'Zoro SEC PSA 9.5', game: 'One Piece · OP-05', listing: '$420', offer: '$380', status: 'accepted' },
  ]

  const history = [
    { name: 'Ancestral Recall', set: 'BGS 9 · Alpha', price: '$9,200', date: 'Apr 2', rating: 5, bg: 'linear-gradient(135deg,#1c2a1c,#0d1a0d)' },
    { name: 'Charizard Holo', set: 'PSA 10 · 1st Ed', price: '$36,000', date: 'Mar 30', rating: 5, bg: 'linear-gradient(135deg,#1a3a5c,#0d2035)' },
    { name: 'Mickey Mantle RC', set: 'PSA 8 · 1952 Topps', price: '$2,100', date: 'Mar 14', rating: 4, bg: 'linear-gradient(135deg,#1a2a1a,#0d1a0d)' },
  ]

  const notifications = [
    { dot: 'red', title: 'Auto-release in 18 hours', body: 'Order #4810 (Luffy Alt Art PSA 10). Funds release automatically Apr 8. Dispute now if there\'s an issue.', time: '2 hours ago', action: 'Review Now', unread: true },
    { dot: 'green', title: 'Price drop on watchlist', body: 'Luffy SEC Alt Art PSA 10 dropped from $890 to $820. You\'re watching this card.', time: '5 hours ago', action: 'View', unread: true },
    { dot: 'teal', title: 'Authentication complete', body: 'Your Mox Sapphire BGS 9 passed authentication. Shipping to you within 24hrs.', time: 'Yesterday', unread: false },
    { dot: 'amber', title: 'Offer declined', body: 'Your $2,800 offer on Mox Emerald PSA 8 was declined by the seller.', time: 'Apr 4', action: 'View Offer', unread: false },
  ]

  const statusColors = {
    'auto-release': { bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)' },
    'auth': { bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)', color: 'var(--gold)' },
    'shipped': { bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)' },
    'complete': { bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', color: 'var(--accent-green)' },
  }

  const offerColors = {
    pending: { bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)', label: 'Pending' },
    accepted: { bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', color: 'var(--accent-green)', label: 'Accepted!' },
    declined: { bg: 'rgba(200,75,60,0.1)', border: 'rgba(200,75,60,0.3)', color: 'var(--accent-red)', label: 'Declined' },
  }

  const dotColors = {
    red: 'var(--accent-red)', green: 'var(--accent-green)',
    teal: 'var(--teal)', amber: 'var(--accent-amber)', blue: 'var(--accent-blue)'
  }

  const navItems = [
    { id: 'overview', icon: '◈', label: 'Dashboard' },
    { id: 'notifications', icon: '◉', label: 'Notifications', badge: '2', badgeColor: 'var(--accent-red)' },
    { id: 'active', icon: '⇄', label: 'Active Purchases', badge: '3', badgeColor: 'var(--accent-amber)' },
    { id: 'inspection', icon: '⏱', label: 'Auto-Release', badge: '1', badgeColor: 'var(--accent-red)' },
    { id: 'watchlist', icon: '♡', label: 'Watchlist', badge: '4', badgeColor: 'var(--accent-green)' },
    { id: 'offers', icon: '◆', label: 'My Offers', badge: '2', badgeColor: 'var(--accent-amber)' },
    { id: 'history', icon: '◎', label: 'Purchase History' },
    { id: 'disputes', icon: '⚠', label: 'Disputes' },
  ]

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  const OrderCard = ({ order }) => {
    const sc = statusColors[order.status] || statusColors.shipped
    return (
      <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${order.urgent ? 'rgba(232,168,56,0.4)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ width: '36px', height: '50px', borderRadius: '4px', background: order.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{order.icon}</div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '2px' }}>{order.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{order.game} · {order.id}</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500, flexShrink: 0 }}>{order.statusLabel}</span>
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', textAlign: 'right' }}>{order.price}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right' }}>Escrowed USDC</div>
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          {/* Progress */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              {['Funded', 'Shipped', 'Transit', 'Auth', 'Done'].map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: order.steps[i] ? (i === order.activeStep ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--bg-4)', border: `2px solid ${order.steps[i] ? (i === order.activeStep ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--border)'}`, flexShrink: 0 }} />
                  {i < 4 && <div style={{ flex: 1, height: '2px', background: order.steps[i] && order.steps[i + 1] ? 'var(--accent-green)' : 'var(--border)' }} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {['Funded', 'Shipped', 'Transit', 'Auth', 'Done'].map((label, i) => (
                <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: order.steps[i] ? (i === order.activeStep ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--text-muted)', flex: 1, textAlign: i === 0 ? 'left' : i === 4 ? 'right' : 'center' }}>{label}</div>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', lineHeight: 1.6 }}>{order.tracking}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {order.status === 'auto-release' && (
              <>
                <button onClick={() => setActiveSection('inspection')} style={btn({ background: 'var(--accent-green)', border: 'none', color: '#fff', fontWeight: 600 })}>Release Early</button>
                <button onClick={() => setActiveSection('disputes')} style={btn({ border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)' })}>Raise Dispute</button>
              </>
            )}
            <button style={btn()}>View Details</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <a href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '19px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '22px', height: '22px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleTheme} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1.5px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>RV</div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>RareVault_99</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', fontWeight: 500 }}>Trusted</span>
          </div>
          <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Cards</button>
        </div>
      </nav>

            <style>{`
        @media (max-width: 768px) {
          .dash-aside { display: none !important; }
          .dash-main { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; padding: 16px 1rem 40px !important; }
          .mobile-section-nav { display: block !important; }
        }
              @media (min-width: 769px) { .mobile-section-nav { display: none !important; } }
      `}</style>
<div style={{ display: 'flex', flexWrap: 'wrap', paddingTop: '64px', minHeight: '100vh' }}>

        {/* SIDEBAR */}
        <aside className="dash-aside" style={{ width: '220px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '64px', left: 0, height: 'calc(100vh - 64px)', overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 16px', marginBottom: '4px', fontWeight: 500 }}>Overview</div>
          {navItems.slice(0, 2).map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', transition: 'all 0.15s', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
              <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor, color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px 4px', fontWeight: 500 }}>Purchases</div>
          {navItems.slice(2, 5).map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
              <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor, color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px 4px', fontWeight: 500 }}>Activity</div>
          {navItems.slice(5).map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
              <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor, color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          {/* Rep card */}
          <div style={{ margin: '16px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '10px', padding: '14px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '4px', fontWeight: 500 }}>Buyer Reputation</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>4.92</div>
            <div style={{ color: 'var(--gold)', fontSize: '12px', letterSpacing: '1px', margin: '3px 0' }}>★★★★★</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>38 transactions · 0 disputes</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '220px', flex: 1, padding: '28px 24px 60px', minWidth: 0 }}>
          {/* MOBILE NAV DROPDOWN */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select
              value={activeSection}
              onChange={e => setActiveSection(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
            >
              <option key="overview" value="overview">Dashboard</option>
              <option key="orders" value="orders">My Orders</option>
              <option key="watchlist" value="watchlist">Watchlist</option>
              <option key="history" value="history">Purchase History</option>
            </select>
          </div>

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>RareVault_99</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Tuesday, April 7, 2025 · Trusted Buyer · 38 purchases</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={btn()}>Download History</button>
                  <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Marketplace</button>
                </div>
              </div>

              {/* Inspection Alert */}
              <div style={{ background: 'rgba(232,168,56,0.08)', border: '1.5px solid rgba(232,168,56,0.35)', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(232,168,56,0.15)', border: '1px solid rgba(232,168,56,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>⏱</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Delivery Confirmed — Funds Auto-Release in {pad(countdown.h)}h</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>Your Luffy Alt Art PSA 10 (Order #4810) was delivered Apr 5. <strong>${{ toFixed: () => '967.45' }.toFixed(2) || '967.45'} USDC releases automatically to the seller on Apr 8 at 12:00pm</strong> — no action needed. Raise a dispute before then if anything is wrong.</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
                    {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)} remaining
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveSection('inspection')} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Release Funds Early</button>
                    <button onClick={() => setActiveSection('disputes')} style={{ background: 'transparent', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Something is Wrong — Dispute</button>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Total Spent', val: '$48,200', sub: 'Lifetime · 38 purchases', color: 'var(--gold)' },
                  { label: 'Active Orders', val: '3', sub: '1 auto-releasing in 18h', color: 'var(--text-primary)' },
                  { label: 'Watchlist', val: '8', sub: '2 price drops this week', color: 'var(--teal)' },
                  { label: 'Buyer Rating', val: '4.92', sub: '38 reviews · 0 disputes', color: 'var(--teal)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Active Orders Preview */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
                <button onClick={() => setActiveSection('active')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>
              </div>
              {orders.map((order, i) => <OrderCard key={i} order={order} />)}
            </div>
          )}

          {/* ACTIVE PURCHASES */}
          {activeSection === 'active' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Purchases</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'DM Mono, monospace' }}>3 orders in progress · $12,172 in escrow</div>
                </div>
              </div>
              {orders.map((order, i) => <OrderCard key={i} order={order} />)}
            </div>
          )}

          {/* AUTO-RELEASE / INSPECTION */}
          {activeSection === 'inspection' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Auto-Release <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Window</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Funds release automatically — only act if something is wrong</div>

              <div style={{ background: 'rgba(232,168,56,0.08)', border: '1.5px solid rgba(232,168,56,0.35)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Order #4810 — Luffy Alt Art PSA 10</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>Your card was delivered April 5, 2025. <strong>$967.45 USDC releases automatically to the seller at Apr 8, 12:00pm</strong> — you don't need to do anything if everything is fine.</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
                  {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)} remaining · Expires Apr 8 at 12:00pm
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>What to Check</div>
                  {['Card matches listing photos exactly', 'Slab is intact — no cracks or tampering', 'Grade label matches what was listed (PSA 10)', 'No shipping damage to card or slab', 'Cert number matches listing (ref: 88291047)'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--teal)', flexShrink: 0 }}>✓</span>{item}
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Order Summary</div>
                  {[
                    { label: 'Card', val: 'Luffy Alt Art PSA 10' },
                    { label: 'Seller', val: 'CardKing_88 ⭐ Elite', teal: true },
                    { label: 'You paid', val: '$967.45 USDC', gold: true },
                    { label: 'Seller receives', val: '$875.00', green: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                      <span style={{ color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontFamily: row.gold ? 'Cormorant Garamond, serif' : 'inherit', fontSize: row.gold ? '17px' : '13px', fontWeight: 500 }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '14px 28px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>✓ Release Funds Early — Everything is Good</button>
                <button onClick={() => setActiveSection('disputes')} style={{ background: 'transparent', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '14px 28px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>⚠ Something is Wrong — Raise Dispute</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.6 }}>Releasing early sends $875.00 USDC to the seller immediately. Funds release automatically at Apr 8 12:00pm with no action needed.</div>
            </div>
          )}

          {/* WATCHLIST */}
          {activeSection === 'watchlist' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Watchlist</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'DM Mono, monospace' }}>8 cards watched · 2 price drops this week</div>
                </div>
                <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse More</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {watchlist.map((card, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: `1.5px solid ${card.drop ? 'rgba(76,175,124,0.4)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{ width: '65%', aspectRatio: '2.5/3.5', borderRadius: '5px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.7 }}>{card.icon}</div>
                      <div style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-4)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>×</div>
                      {card.drop && <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(76,175,124,0.9)', color: '#fff', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 8px', borderRadius: '20px', fontWeight: 600 }}>▼ Price Drop</div>}
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', lineHeight: 1.2, marginBottom: '2px', color: 'var(--text-primary)' }}>{card.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: '8px' }}>{card.game}</div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>{card.price}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: card.up ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: '2px' }}>{card.change}</div>
                      <button style={{ width: '100%', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, padding: '7px', borderRadius: '7px', cursor: 'pointer', marginTop: '8px' }}>Buy Now</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OFFERS */}
          {activeSection === 'offers' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Offers</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>2 pending · 1 accepted · 3 declined</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {offers.map((offer, i) => {
                  const oc = offerColors[offer.status]
                  return (
                    <div key={i} style={{ background: 'var(--bg-2)', border: `1.5px solid ${offer.status === 'accepted' ? 'rgba(76,175,124,0.3)' : 'var(--border)'}`, borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '2px' }}>{offer.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{offer.game}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>ASKING</div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>{offer.listing}</div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '16px' }}>→</div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>YOUR OFFER</div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>{offer.offer}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: oc.bg, border: `1px solid ${oc.border}`, color: oc.color, fontWeight: 500, flexShrink: 0 }}>{oc.label}</span>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        {offer.status === 'pending' && <><button style={btn()}>Withdraw</button><button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Increase</button></>}
                        {offer.status === 'declined' && <><button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Counter</button><button style={btn()}>Buy at Ask</button></>}
                        {offer.status === 'accepted' && <button style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '7px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Proceed to Buy</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* PURCHASE HISTORY */}
          {activeSection === 'history' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Purchase <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>38 completed · $48,200 total spent</div>
                </div>
                <button style={btn()}>Export CSV</button>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Card', 'Grade', 'Paid', 'Date', 'Rating'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((sale, i) => (
                      <tr key={i} style={{ borderBottom: i < history.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '26px', height: '36px', borderRadius: '3px', background: sale.bg, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{sale.name}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '1px' }}>{sale.set}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px' }}><span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 9px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{sale.set.split(' · ')[0]}</span></td>
                        <td style={{ padding: '13px 16px', fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', fontWeight: 600, color: 'var(--gold)' }}>{sale.price}</td>
                        <td style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{sale.date}</td>
                        <td style={{ padding: '13px 16px', color: 'var(--gold)', fontSize: '12px', letterSpacing: '1px' }}>{'★'.repeat(sale.rating)}{'☆'.repeat(5 - sale.rating)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Notifications</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>2 unread</div>
                </div>
                <button style={btn()}>Mark all read</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.map((notif, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px', borderLeft: notif.unread ? `3px solid var(--teal)` : '1.5px solid var(--border)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColors[notif.dot] || 'var(--text-muted)', flexShrink: 0, marginTop: '5px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{notif.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{notif.body}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{notif.time}</div>
                    </div>
                    {notif.action && <button style={btn({ fontSize: '11px', padding: '6px 12px', flexShrink: 0, background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>{notif.action}</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DISPUTES */}
          {activeSection === 'disputes' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Raise a <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Dispute</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Only open a dispute if there is a genuine issue with your order</div>
              <div style={{ background: 'rgba(200,75,60,0.05)', border: '1.5px solid rgba(200,75,60,0.25)', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚠</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Order #4810 — Luffy Alt Art PSA 10</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Delivered April 5, 2025 · Window expires Apr 8 12:00pm</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {['You submit your dispute with photos and description', 'A $25 dispute bond is deducted — returned if you win', 'Seller has 48hrs to respond with their evidence', 'Chase Hollow reviews both sides within 72hrs', 'Win: full refund + bond returned. Lose: funds release to seller, forfeit $25 bond'].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-red)', flexShrink: 0, fontWeight: 500 }}>{i + 1}</div>
                      {step}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.6, marginBottom: '20px' }}>⚠ Only raise a dispute if there is a genuine problem. False disputes result in losing your $25 bond and a negative mark on your buyer reputation.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Reason for dispute</div>
                    <select style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%', cursor: 'pointer' }}>
                      <option>Card does not match listing description</option>
                      <option>Slab is damaged or cracked</option>
                      <option>Wrong card received</option>
                      <option>Card not delivered</option>
                      <option>Grade label does not match listing</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Description</div>
                    <textarea style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%', resize: 'vertical', minHeight: '100px', lineHeight: 1.6 }} placeholder="Describe the issue in detail..." />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={{ background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '13px 24px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flex: 1 }}>Submit Dispute — $25 Bond Required</button>
                    <button onClick={() => setActiveSection('inspection')} style={btn({ padding: '13px 24px', borderRadius: '10px' })}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}