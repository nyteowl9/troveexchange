'use client'

import { useState, useEffect } from 'react'

export default function SellerDashboard() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('overview')
  const [listingType, setListingType] = useState('graded')
  const [grader, setGrader] = useState('PSA')
  const [price, setPrice] = useState('')

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

  const calcFees = (p) => {
    const num = parseFloat(p) || 0
    const platform = (num * 0.035).toFixed(2)
    const shipSeller = 15
    const net = (num - parseFloat(platform) - shipSeller).toFixed(2)
    return { platform, shipSeller, net }
  }

  const fees = calcFees(price)

  const orders = [
    { id: '#4821', name: 'Charizard Holo PSA 9', game: 'Pokémon · Base Set', price: '$487', status: 'ship', statusLabel: '⚡ Ship Now', urgent: true, buyer: 'RareVault_99', deadline: 'Apr 8 12:00pm · 22hrs remaining', bg: 'linear-gradient(145deg,#1a3a5c,#0d2035)', icon: '⚡' },
    { id: '#4819', name: 'Mox Sapphire BGS 9', game: 'MTG · Unlimited', price: '$6,800', status: 'auth', statusLabel: 'Authenticating', urgent: false, buyer: 'MTGLegacy', deadline: 'At Chase Hollow HQ', bg: 'linear-gradient(145deg,#1a1a3c,#0d0d24)', icon: '⬟' },
    { id: '#4815', name: 'Pikachu Illustrator PSA 7', game: 'Pokémon · Promo', price: '$4,200', status: 'delivered', statusLabel: 'Auto-Releasing', urgent: false, buyer: 'SlabHunter_X', deadline: 'Auto-release Apr 8 12:00pm', bg: 'linear-gradient(145deg,#2a1a3e,#1a0d2a)', icon: '★' },
    { id: '#4808', name: 'Mox Ruby BGS 8.5', game: 'MTG · Unlimited', price: '$4,100', status: 'transit', statusLabel: 'In Transit', urgent: false, buyer: 'PowerNine_Fan', deadline: 'FedEx · Arriving Apr 8', bg: 'linear-gradient(145deg,#2a1c0d,#1a0d05)', icon: '🔥' },
  ]

  const listings = [
    { name: 'Black Lotus BGS 9.5', game: 'MTG · Alpha', price: '$28,400', views: 142, watchers: 38, bg: 'linear-gradient(145deg,#1c2a1c,#0d1a0d)', icon: '✦', status: 'live' },
    { name: 'Ancestral Recall BGS 9', game: 'MTG · Alpha', price: '$9,200', views: 87, watchers: 21, bg: 'linear-gradient(145deg,#1a2a3c,#0d1a24)', icon: '📜', status: 'live' },
    { name: 'Blastoise PSA 10', game: 'Pokémon · Base Set', price: '$3,800', views: 63, watchers: 14, bg: 'linear-gradient(145deg,#1a2a3a,#0d1a2a)', icon: '💧', status: 'live' },
    { name: 'Time Walk BGS 8.5', game: 'MTG · Unlimited', price: '$7,400', views: 45, watchers: 9, bg: 'linear-gradient(145deg,#1a1a2a,#0d0d1a)', icon: '⏳', status: 'draft' },
  ]

  const earnings = [
    { name: 'Charizard 1st Ed PSA 10', date: 'Apr 4', gross: '$36,000', fee: '$1,080', ship: '$15', net: '$34,905' },
    { name: 'Ancestral Recall BGS 9', date: 'Apr 2', gross: '$9,200', fee: '$276', ship: '$15', net: '$8,909' },
    { name: 'Blastoise PSA 10', date: 'Mar 30', gross: '$3,800', fee: '$114', ship: '$15', net: '$3,671' },
    { name: 'Time Walk BGS 8.5', date: 'Mar 27', gross: '$7,400', fee: '$222', ship: '$15', net: '$7,163' },
  ]

  const notifications = [
    { dot: 'red', title: 'Action required — ship within 22hrs', body: 'Order #4821 (Charizard PSA 9). Buyer has funded escrow. If no carrier scan by Apr 8 12:00pm, buyer is automatically refunded and you receive Strike 1.', time: '1 hour ago', action: 'Print Label', unread: true },
    { dot: 'green', title: 'Funds auto-released', body: 'Ancestral Recall BGS 9 (Order #4802). $8,909.00 USDC sent to your wallet. 72hr window expired with no dispute.', time: '3 hours ago', unread: false },
    { dot: 'amber', title: 'New offer received', body: 'RareVault_99 made an offer of $3,900 on your Pikachu Illustrator PSA 7 (listed at $4,200).', time: '5 hours ago', action: 'Review', unread: true },
    { dot: 'teal', title: 'Authentication passed', body: 'Mox Sapphire BGS 9 (Order #4819) passed authentication. Shipping to buyer within 24hrs.', time: 'Yesterday', unread: false },
  ]

  const statusColors = {
    ship: { bg: 'rgba(200,75,60,0.1)', border: 'rgba(200,75,60,0.3)', color: 'var(--accent-red)' },
    auth: { bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)', color: 'var(--gold)' },
    delivered: { bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', color: 'var(--accent-green)' },
    transit: { bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)' },
  }

  const navItems = [
    { id: 'overview', icon: '◈', label: 'Dashboard' },
    { id: 'notifications', icon: '◉', label: 'Notifications', badge: '2', badgeColor: 'var(--accent-red)' },
    { id: 'orders', icon: '⇄', label: 'Active Orders', badge: '4', badgeColor: 'var(--accent-amber)' },
    { id: 'listings', icon: '◆', label: 'My Listings', badge: '24', badgeColor: 'var(--accent-green)' },
    { id: 'new-listing', icon: '+', label: 'New Listing' },
    { id: 'earnings', icon: '$', label: 'Earnings' },
    { id: 'bond', icon: '🔒', label: 'Bond Wallet' },
    { id: 'profile', icon: '◑', label: 'Profile' },
  ]

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  const inputStyle = {
    width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px', color: 'var(--text-primary)', outline: 'none',
  }

  const Label = ({ text }) => (
    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>{text}</div>
  )

  const OrderRow = ({ order }) => {
    const sc = statusColors[order.status]
    return (
      <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${order.urgent ? 'rgba(200,75,60,0.4)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ width: '32px', height: '46px', borderRadius: '4px', background: order.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{order.icon}</div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '2px' }}>{order.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{order.game} · {order.id} · Buyer: {order.buyer}</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500, flexShrink: 0 }}>{order.statusLabel}</span>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>{order.price}</div>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: order.urgent ? 'var(--accent-amber)' : 'var(--text-secondary)', background: 'var(--bg-3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', lineHeight: 1.5 }}>
            {order.urgent ? `⚠ Ship within deadline · ${order.deadline} · Auto-refund + Strike 1 if missed` : order.deadline}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {order.status === 'ship' && (
              <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>🖨 Print Label A</button>
            )}
            <button style={btn()}>View Details</button>
            <button style={btn()}>Message Buyer</button>
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
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>CK</div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>CardKing_88</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontWeight: 500 }}>⭐ Elite</span>
          </div>
          <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ New Listing</button>
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
        <aside className="dash-aside" style={{ width: '220px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '64px', left: 0, height: 'calc(100vh - 64px)', overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {navItems.map((item, i) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', marginTop: i === 4 ? '8px' : 0 }}>
              <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor, color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}
          <div style={{ margin: '16px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '10px', padding: '14px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px', fontWeight: 500 }}>Seller Stats</div>
            {[
              { label: 'Sales', val: '847' },
              { label: 'Rating', val: '4.98 ★', gold: true },
              { label: 'Strikes', val: '0', green: true },
              { label: 'Bond tier', val: '1% per sale' },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{stat.label}</span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 300, color: stat.gold ? 'var(--gold)' : stat.green ? 'var(--accent-green)' : 'var(--text-primary)' }}>{stat.val}</span>
              </div>
            ))}
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
              <option key="notifications" value="notifications">Notifications</option>
              <option key="orders" value="orders">Active Orders</option>
              <option key="listings" value="listings">My Listings</option>
              <option key="new-listing" value="new-listing">New Listing</option>
              <option key="earnings" value="earnings">Earnings</option>
              <option key="bond" value="bond">Bond Wallet</option>
            </select>
          </div>

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>CardKing_88</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Elite Seller · 847 sales · 0 strikes · Ship within 48hrs of sale</div>
                </div>
                <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ New Listing</button>
              </div>
              <div style={{ background: 'rgba(200,75,60,0.06)', border: '1.5px solid rgba(200,75,60,0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>⚡ Action required — ship within 22hrs</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Order #4821 (Charizard PSA 9). If no carrier scan by Apr 8 12:00pm, buyer is automatically refunded and you receive Strike 1.</div>
                </div>
                <button onClick={() => setActiveSection('orders')} style={{ background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Print Label →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Active Orders', val: '4', sub: '1 needs shipping', color: 'var(--accent-red)' },
                  { label: 'Active Listings', val: '24', sub: '$284k total value', color: 'var(--text-primary)' },
                  { label: 'Monthly Revenue', val: '$48.2k', sub: '3% fee · Net after', color: 'var(--accent-green)' },
                  { label: 'Bond In-Flight', val: '$1,824', sub: 'Returns within 5–7 days', color: 'var(--gold)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
                <button onClick={() => setActiveSection('orders')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>
              </div>
              {orders.slice(0, 2).map((order, i) => <OrderRow key={i} order={order} />)}
            </div>
          )}

          {/* ORDERS */}
          {activeSection === 'orders' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>4 orders in progress · Ship within 48hrs of sale or buyer auto-refunded</div>
              {orders.map((order, i) => <OrderRow key={i} order={order} />)}
            </div>
          )}

          {/* LISTINGS */}
          {activeSection === 'listings' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listings</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>24 active · $284k total value · Listings go live immediately</div>
                </div>
                <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ New Listing</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {listings.map((listing, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: `1.5px solid ${listing.status === 'draft' ? 'rgba(232,168,56,0.3)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                    <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{ width: '65%', aspectRatio: '2.5/3.5', borderRadius: '5px', background: listing.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', opacity: 0.7 }}>{listing.icon}</div>
                      {listing.status === 'draft' && <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(232,168,56,0.15)', border: '1px solid rgba(232,168,56,0.3)', color: 'var(--accent-amber)', fontWeight: 500 }}>Draft</div>}
                      {listing.status === 'live' && <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 500 }}>Live</div>}
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>{listing.game}</div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', lineHeight: 1.2, marginBottom: '6px', color: 'var(--text-primary)' }}>{listing.name}</div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', marginBottom: '6px' }}>{listing.price}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '10px' }}>{listing.views} views · {listing.watchers} watching</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={btn({ fontSize: '10px', padding: '5px 10px', flex: 1, textAlign: 'center' })}>Edit</button>
                        <button style={btn({ fontSize: '10px', padding: '5px 10px', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)' })}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEW LISTING */}
          {activeSection === 'new-listing' && (
            <div style={{ maxWidth: '720px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>New <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listing</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', fontFamily: 'DM Mono, monospace' }}>Listings go live immediately — no wallet needed until a buyer purchases</div>

              {/* Listing type */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Listing Type</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['graded', 'raw', 'pack', 'box', 'case', 'lot'].map(type => (
                    <button key={type} onClick={() => setListingType(type)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${listingType === type ? 'var(--teal-border)' : 'var(--border)'}`, background: listingType === type ? 'var(--teal-bg)' : 'transparent', color: listingType === type ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize' }}>{type}</button>
                  ))}
                </div>
              </div>

              {/* Card details */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Card Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <Label text="GAME" />
                      <select style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>Pokémon TCG</option>
                        <option>Magic: The Gathering</option>
                        <option>One Piece TCG</option>
                        <option>Yu-Gi-Oh!</option>
                        <option>Sports Cards</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <Label text="LANGUAGE" />
                      <select style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>English</option>
                        <option>Japanese</option>
                        <option>Korean</option>
                        <option>Chinese</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label text="CARD NAME" />
                    <input type="text" placeholder="e.g. Charizard Holo" style={inputStyle} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <Label text="SET / EDITION" />
                      <input type="text" placeholder="e.g. Base Set Shadowless" style={inputStyle} />
                    </div>
                    <div>
                      <Label text="CARD NUMBER" />
                      <input type="text" placeholder="e.g. 4/102" style={inputStyle} />
                    </div>
                  </div>

                  {/* GRADED fields */}
                  {listingType === 'graded' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <Label text="GRADING COMPANY" />
                          <select value={grader} onChange={e => setGrader(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option>PSA</option>
                            <option>BGS / Beckett</option>
                            <option>CGC</option>
                            <option>SGC</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <Label text="GRADE" />
                          <input type="text" placeholder="e.g. 9 or 9.5" style={inputStyle} />
                        </div>
                      </div>
                      {grader !== 'Other' ? (
                        <div>
                          <Label text={`CERT NUMBER (${grader})`} />
                          <input type="text" placeholder="e.g. 12847291" style={inputStyle} />
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                            Buyers and our authenticators will verify this cert on the {grader} official database. Must be accurate.
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label text="GRADER NAME" />
                          <input type="text" placeholder="e.g. TAG, HGA, Arena Club..." style={inputStyle} />
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                            No cert verification will be shown. Our authenticators will verify slab integrity and grade label match only.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RAW fields */}
                  {listingType === 'raw' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <Label text="CONDITION" />
                          <select style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option>Near Mint (NM)</option>
                            <option>Lightly Played (LP)</option>
                            <option>Moderately Played (MP)</option>
                            <option>Heavily Played (HP)</option>
                            <option>Damaged (DMG)</option>
                          </select>
                        </div>
                        <div>
                          <Label text="YEAR PRINTED" />
                          <input type="text" placeholder="e.g. 1999" style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <Label text="CONDITION NOTES (Required)" />
                        <textarea placeholder="Describe any flaws, wear, creases, or notable details buyers should know. Be accurate — our authenticators will verify condition matches your description." style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                      </div>
                      <div style={{ background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        ⚠ Raw cards are authenticated for condition match. Our authenticators verify the received card matches your description and photos. Misrepresented condition results in rejection, full buyer refund, and a strike.
                      </div>
                    </div>
                  )}

                  {/* PACK / BOX / CASE fields */}
                  {(listingType === 'pack' || listingType === 'box' || listingType === 'case') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <Label text="QUANTITY" />
                        <input type="number" placeholder="e.g. 1" style={inputStyle} />
                      </div>
                      <div>
                        <Label text="SEAL CONDITION" />
                        <select style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option>Factory Sealed — Unopened</option>
                          <option>Resealed — Disclosed</option>
                          <option>Open / Loose</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* LOT fields */}
                  {listingType === 'lot' && (
                    <div>
                      <Label text="LOT DESCRIPTION" />
                      <textarea placeholder="Describe all cards included — names, sets, conditions, grades if any." style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                    </div>
                  )}

                </div>
              </div>

              {/* Photos */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Photos (Required · Min 3)</div>
                <div style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-3)', marginBottom: '10px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>📷</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>Upload Card Photos</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {listingType === 'graded' && 'Front, back, full slab, grade label · Min 3 required'}
                    {listingType === 'raw' && 'Front, back, all four corners · Min 4 required'}
                    {(listingType === 'pack' || listingType === 'box' || listingType === 'case') && 'All sides of sealed product · Min 3 required'}
                    {listingType === 'lot' && 'All cards spread out + individual shots · Min 4 required'}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Photos are used by our authenticators to verify the card received matches your listing exactly.
                </div>
              </div>

              {/* Price + fees */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Price & Fee Calculator</div>
                <Label text="LISTING PRICE (USDC)" />
                <input type="number" placeholder="Minimum $100" value={price} onChange={e => setPrice(e.target.value)} style={{ ...inputStyle, marginBottom: '14px', fontSize: '18px', fontFamily: 'Cormorant Garamond, serif' }} />
                {price && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px' }}>
                    {[
                      { label: 'Your listing price', val: `$${parseFloat(price).toLocaleString()}` },
                      { label: 'Platform fee (3.5%)', val: `-$${fees.platform}` },
                      { label: 'Shipping & insurance (Label A)', val: `-$${fees.shipSeller}` },
                      { label: 'You receive on settlement', val: `$${fees.net}`, green: true, total: true },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: row.total ? '8px 0 0' : '5px 0', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0' }}>
                        <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                        <span style={{ fontFamily: row.total ? 'Cormorant Garamond, serif' : 'DM Mono, monospace', fontSize: row.total ? '20px' : '12px', color: row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notices */}
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500 }}>Bond — Separate from fees</div>
                {[
                  { label: 'Bond posted at purchase', val: price ? `-$${(parseFloat(price) * 0.01).toFixed(2)} (1% Elite)` : '-1% of sale price', amber: true },
                  { label: 'Bond returned', val: 'Within 5–7 days', green: true },
                  { label: 'Net bond cost', val: '$0.00', green: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: row.green ? 'var(--accent-green)' : row.amber ? 'var(--accent-amber)' : 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>Bond is collateral — not a fee. It posts when a buyer purchases and returns in full on successful completion.</div>
              </div>
              <div style={{ background: 'rgba(200,75,60,0.05)', border: '1px solid rgba(200,75,60,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Ship within 48hrs of sale.</strong> Miss the deadline = auto-refund to buyer + Strike 1. Three strikes = permanent ban.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ flex: 1, background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Publish Listing — Go Live</button>
                <button style={btn({ padding: '14px 20px', borderRadius: '10px' })}>Save Draft</button>
              </div>
            </div>
          )}

          {/* EARNINGS */}
          {activeSection === 'earnings' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Earnings</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>847 completed sales · All USDC on Base</div>
                </div>
                <button style={btn()}>Export CSV</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Lifetime Revenue', val: '$1.24M', sub: 'Gross sales', color: 'var(--gold)' },
                  { label: 'Fees Paid (3%)', val: '$37,200', sub: 'Platform fee only', color: 'var(--accent-red)' },
                  { label: 'Net Received', val: '$1.19M', sub: 'After fees + shipping', color: 'var(--accent-green)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Card', 'Date', 'Gross', 'Fee (3%)', 'Shipping', 'Net Received'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((sale, i) => (
                      <tr key={i} style={{ borderBottom: i < earnings.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{sale.name}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{sale.date}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: 'var(--gold)', fontWeight: 600 }}>{sale.gross}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-red)' }}>-{sale.fee}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>-{sale.ship}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: 'var(--accent-green)', fontWeight: 600 }}>{sale.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BOND WALLET */}
          {activeSection === 'bond' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Bond <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Wallet</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Bonds post per transaction when a buyer purchases — not when you list. All bonds return within 5–7 days on completion.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Currently Locked', val: '$1,824', sub: 'Across 4 active orders · Returns within 5–7 days each', color: 'var(--accent-amber)' },
                  { label: 'Returned This Month', val: '$12,400', sub: '124 completed transactions', color: 'var(--accent-green)' },
                  { label: 'Bond Tier', val: '1%', sub: 'Elite seller · Lowest tier', color: 'var(--teal)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Bond Tier Structure</div>
                {[
                  { tier: 'New Seller', sales: '0–9 sales', bond: '4%', active: false },
                  { tier: 'Trusted', sales: '10–99 sales', bond: '3%', active: false },
                  { tier: 'Pro', sales: '100–499 sales', bond: '2%', active: false },
                  { tier: 'Elite', sales: '500+ sales', bond: '1%', active: true },
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: t.active ? 600 : 400, color: t.active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{t.tier} {t.active && '← You are here'}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{t.sales}</div>
                    </div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: t.active ? 'var(--teal)' : 'var(--text-muted)' }}>{t.bond}</div>
                  </div>
                ))}
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
                  <div key={i} style={{ background: 'var(--bg-2)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px', border: notif.unread ? '1.5px solid var(--teal-border)' : '1.5px solid var(--border)', borderLeft: notif.unread ? '3px solid var(--teal)' : '1.5px solid var(--border)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: notif.dot === 'red' ? 'var(--accent-red)' : notif.dot === 'green' ? 'var(--accent-green)' : notif.dot === 'amber' ? 'var(--accent-amber)' : 'var(--teal)', flexShrink: 0, marginTop: '5px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{notif.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{notif.body}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{notif.time}</div>
                    </div>
                    {notif.action && <button onClick={() => setActiveSection('orders')} style={btn({ fontSize: '11px', padding: '6px 12px', flexShrink: 0, background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>{notif.action}</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activeSection === 'profile' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Profile</em></div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>◑</div>
                <div>Profile settings — bio, specialties, shipping preferences, contact info.</div>
                <a href="/profile" style={{ color: 'var(--teal)', textDecoration: 'none', fontSize: '13px', marginTop: '12px', display: 'block' }}>View public profile →</a>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}