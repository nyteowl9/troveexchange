'use client'

import { useState, useEffect } from 'react'

export default function Profile() {
  const [theme, setTheme] = useState('dark')
  const [activeTab, setActiveTab] = useState('listings')

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

  const listings = [
    { name: 'Black Lotus BGS 9.5', game: 'MTG · Alpha', price: '$28,400', views: 142, watchers: 38, bg: 'linear-gradient(145deg,#1c2a1c,#0d1a0d)', icon: '✦', status: 'live' },
    { name: 'Ancestral Recall BGS 9', game: 'MTG · Alpha', price: '$9,200', views: 87, watchers: 21, bg: 'linear-gradient(145deg,#1a2a3c,#0d1a24)', icon: '📜', status: 'live' },
    { name: 'Mox Sapphire BGS 9', game: 'MTG · Unlimited', price: '$6,800', views: 63, watchers: 19, bg: 'linear-gradient(145deg,#1a1a3c,#0d0d24)', icon: '⬟', status: 'live' },
    { name: 'Blastoise Holo PSA 10', game: 'Pokémon · Base Set', price: '$3,800', views: 45, watchers: 14, bg: 'linear-gradient(145deg,#1a2a3a,#0d1a2a)', icon: '💧', status: 'live' },
    { name: 'Time Walk BGS 8.5', game: 'MTG · Unlimited', price: '$7,400', views: 32, watchers: 9, bg: 'linear-gradient(145deg,#1a1a2a,#0d0d1a)', icon: '⏳', status: 'live' },
    { name: 'Mox Ruby BGS 8', game: 'MTG · Unlimited', price: '$3,900', views: 28, watchers: 7, bg: 'linear-gradient(145deg,#2a1c0d,#1a0d05)', icon: '🔥', status: 'live' },
  ]

  const feedback = [
    { user: 'RareVault_99', rating: 5, text: 'Perfect transaction. Card exactly as described. Ships same day. Best seller on the platform.', date: 'Apr 2025', card: 'Charizard Holo PSA 9', type: 'buyer', verified: true },
    { user: 'MTGLegacy', rating: 5, text: 'Third purchase from CardKing. Always flawless. The card was perfectly packed and auth went through without a hitch.', date: 'Mar 2025', card: 'Ancestral Recall BGS 9', type: 'buyer', verified: true },
    { user: 'SlabHunter_X', rating: 5, text: 'Card exactly as listed. Fast shipping. Will definitely buy again.', date: 'Mar 2025', card: 'Pikachu Illustrator PSA 8', type: 'buyer', verified: true },
    { user: 'CardVault_NYC', rating: 5, text: 'Shipped within hours of sale. Pristine packing. Auth passed no problem. One of the best sellers I\'ve dealt with.', date: 'Feb 2025', card: 'Black Lotus BGS 9', type: 'buyer', verified: true },
    { user: 'PowerNine_Fan', rating: 4, text: 'Great card, slight delay in shipping but communicated proactively. Would buy again.', date: 'Feb 2025', card: 'Mox Emerald BGS 8.5', type: 'buyer', verified: true },
    { user: 'NewCollector22', rating: 5, text: 'Amazing seller. Helped me understand the whole process as a first-time buyer. Card was perfect.', date: 'Jan 2025', card: 'Blastoise Holo PSA 10', type: 'buyer', verified: true },
  ]

  const history = [
    { name: 'Charizard 1st Ed PSA 10', set: 'Pokémon · Base Set 1st Ed', price: '$36,000', date: 'Apr 4', type: 'sold', bg: 'linear-gradient(135deg,#1a3a5c,#0d2035)' },
    { name: 'Ancestral Recall BGS 9', set: 'MTG · Alpha · Power Nine', price: '$9,200', date: 'Apr 2', type: 'sold', bg: 'linear-gradient(135deg,#1a2a3c,#0d1a24)' },
    { name: 'Blastoise Holo PSA 10', set: 'Pokémon · Base Set · #2/102', price: '$3,800', date: 'Mar 30', type: 'sold', bg: 'linear-gradient(135deg,#1a2a3a,#0d1a2a)' },
    { name: 'Time Walk BGS 8.5', set: 'MTG · Unlimited Edition', price: '$7,400', date: 'Mar 27', type: 'sold', bg: 'linear-gradient(135deg,#1a1a2a,#0d0d1a)' },
    { name: 'Mox Ruby BGS 8.5', set: 'MTG · Unlimited Edition', price: '$4,100', date: 'Mar 22', type: 'sold', bg: 'linear-gradient(135deg,#2a1c0d,#1a0d05)' },
  ]

  const specialties = ['MTG Power Nine', 'MTG Alpha/Beta', 'Pokémon Base Set', 'PSA Graded', 'BGS Graded', 'High Value $5k+']

  const ratingBars = [
    { stars: 5, count: 829, pct: 98 },
    { stars: 4, count: 14, pct: 1.7 },
    { stars: 3, count: 3, pct: 0.3 },
    { stars: 2, count: 1, pct: 0.1 },
    { stars: 1, count: 0, pct: 0 },
  ]

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '8px 18px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <a href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </a>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {['Marketplace', 'How It Works', 'Fee Comparison'].map((link, i) => (
            <a key={i} href="/" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{link}</a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleTheme} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '15px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
          <button style={btn()}>Sign In</button>
          <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>List a Card</button>
        </div>
      </nav>

            <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; padding: 16px 1rem 40px !important; }
          .profile-sidebar { position: relative !important; top: auto !important; }
          .rating-grid { grid-template-columns: 1fr !important; }
          .profile-header-row { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 16px !important; }
          .profile-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
        }
      `}</style>
<div style={{ paddingTop: '64px' }}>

        {/* PROFILE HEADER */}
        <div style={{ background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', padding: '36px 2.5rem 0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="profile-header-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', marginBottom: '28px', flexWrap: 'wrap' }}>

              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--teal-bg)', border: '3px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '38px', fontWeight: 600, color: 'var(--teal)' }}>
                  CK
                </div>
                <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-green)', border: '2px solid var(--bg-2)' }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '34px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>CardKing_88</h1>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 12px', borderRadius: '20px', background: 'rgba(201,168,76,0.15)', border: '1.5px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontWeight: 600 }}>⭐ Elite Seller</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                    0 Strikes
                  </span>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {[
                    { val: '847', label: 'Sales' },
                    { val: '4.98', label: 'Rating', gold: true },
                    { val: '$1.24M', label: 'Volume', gold: true },
                    { val: '24', label: 'Active Listings' },
                    { val: 'Member since Jan 2024', label: null },
                  ].map((stat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontFamily: stat.label ? 'Cormorant Garamond, serif' : 'DM Mono, monospace', fontSize: stat.label ? '20px' : '11px', fontWeight: stat.label ? 300 : 400, color: stat.gold ? 'var(--gold)' : stat.label ? 'var(--text-primary)' : 'var(--text-muted)' }}>{stat.val}</span>
                      {stat.label && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{stat.label}</span>}
                    </div>
                  ))}
                </div>

                {/* Wallet address */}
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <span style={{ width: '6px', height: '6px', background: 'var(--accent-blue)', borderRadius: '50%', display: 'inline-block' }} />
                  0x742d...f44e · Base Network ·
                  <a href="#" style={{ color: 'var(--teal)', textDecoration: 'none' }}>View on Basescan →</a>
                </div>

                {/* Specialties */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {specialties.map((s, i) => (
                    <span key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600, padding: '10px 22px' })}>Follow Seller</button>
                <button style={btn({ padding: '10px 22px' })}>Message</button>
                <button style={btn({ padding: '10px 22px', fontSize: '11px', color: 'var(--text-muted)' })}>Report</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs" style={{ display: 'flex', gap: '0', borderTop: '0.5px solid var(--border)' }}>
              {[
                { id: 'listings', label: 'Listings', count: 24 },
                { id: 'feedback', label: 'Feedback', count: 847 },
                { id: 'history', label: 'Sales History', count: null },
                { id: 'about', label: 'About', count: null },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '14px 22px', border: 'none', background: 'transparent', color: activeTab === tab.id ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, letterSpacing: '0.06em', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--teal)' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.15s' }}>
                  {tab.label}
                  {tab.count && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '1px 6px', borderRadius: '10px', background: activeTab === tab.id ? 'var(--teal-bg)' : 'var(--bg-4)', color: activeTab === tab.id ? 'var(--teal)' : 'var(--text-muted)' }}>{tab.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="profile-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 2.5rem 60px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'flex-start' }}>

          {/* MAIN CONTENT */}
          <div>

            {/* LISTINGS TAB */}
            {activeTab === 'listings' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listings</em></div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>24 cards · $284k total value</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '12px' }}>
                  {listings.map((card, i) => (
                    <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--teal-border)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: '65%', aspectRatio: '2.5/3.5', borderRadius: '5px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.75 }}>{card.icon}</div>
                        <div style={{ position: 'absolute', top: '8px', right: '8px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 500 }}>Live</div>
                      </div>
                      <div style={{ padding: '11px 12px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>{card.game}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', lineHeight: 1.2, marginBottom: '8px', color: 'var(--text-primary)' }}>{card.name}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)', marginBottom: '4px' }}>{card.price}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{card.views} views · {card.watchers} watching</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FEEDBACK TAB */}
            {activeTab === 'feedback' && (
              <div>
                {/* Rating summary */}
                <div className="rating-grid" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '72px', fontWeight: 300, lineHeight: 1, color: 'var(--gold)' }}>4.98</div>
                    <div style={{ color: 'var(--gold)', fontSize: '20px', letterSpacing: '3px', margin: '4px 0' }}>★★★★★</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>847 verified reviews</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ratingBars.map((bar, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', minWidth: '10px' }}>{bar.stars}</span>
                        <span style={{ color: 'var(--gold)', fontSize: '10px' }}>★</span>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--bg-4)', overflow: 'hidden' }}>
                          <div style={{ width: `${bar.pct}%`, height: '100%', background: 'var(--gold)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', minWidth: '30px', textAlign: 'right' }}>{bar.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {feedback.map((review, i) => (
                    <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(60,125,200,0.15)', border: '1.5px solid rgba(60,125,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)', flexShrink: 0 }}>{review.user[0]}</div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{review.user}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{review.card}</div>
                        </div>
                        <div style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '1px' }}>{'★'.repeat(review.rating)}</div>
                        <div style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{review.date}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{review.text}</div>
                      {review.verified && (
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                          Verified purchase · Transaction on-chain
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)' }}>Sales <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>All sales publicly verifiable on Base</div>
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                        {['Card', 'Sale Price', 'Date', 'On-Chain'].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 16px', fontWeight: 500 }}>{h}</th>
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
                              <div style={{ width: '28px', height: '38px', borderRadius: '3px', background: sale.bg, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{sale.name}</div>
                                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>{sale.set}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>{sale.price}</td>
                          <td style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{sale.date}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <a href="#" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', textDecoration: 'none' }}>Basescan →</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.6 }}>
                  All transactions are permanently recorded on Base (Ethereum L2). Sale prices shown are actual on-chain settlement amounts — not self-reported.
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '22px', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>About CardKing_88</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '16px' }}>
                    Serious collector and seller specializing in high-grade Magic: The Gathering Power Nine and Pokémon Base Set. Been in the hobby for 15 years — I know what I have and I stand behind every listing.
                    <br /><br />
                    Every card I sell is exactly as described. I photograph everything under proper lighting, ship same day or next day in maximum protection packaging, and communicate proactively if there's ever a delay.
                    <br /><br />
                    If you have questions about a listing, message me before purchasing.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {specialties.map((s, i) => (
                      <span key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 12px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Seller Policies</div>
                  {[
                    { title: 'Shipping', desc: 'Same day or next day. Bubble mailer + toploader for raw cards. Full bubble wrap + hard case for graded slabs. FedEx with signature required on all orders.' },
                    { title: 'Returns', desc: 'All sales are final. If there is an issue with a card not matching the listing, open a dispute within your 72hr inspection window. I will work with Chase Hollow to resolve fairly.' },
                    { title: 'Questions', desc: 'Message me before buying if you have any questions about a card\'s condition, provenance, or photos. I\'m happy to provide additional photos on request.' },
                    { title: 'Offers', desc: 'I accept reasonable offers on most listings. Message me or use the offer feature. I won\'t accept lowballs but I\'m always open to a fair deal.' },
                  ].map((policy, i, arr) => (
                    <div key={i} style={{ paddingBottom: i < arr.length - 1 ? '14px' : '0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none', marginBottom: i < arr.length - 1 ? '14px' : '0' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{policy.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{policy.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* SIDEBAR */}
          <div className="profile-sidebar" style={{ position: 'sticky', top: '84px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Rep score card */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>Seller Reputation</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '52px', fontWeight: 300, lineHeight: 1, color: 'var(--gold)' }}>4.98</span>
                <span style={{ color: 'var(--gold)', fontSize: '22px' }}>★</span>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '14px' }}>847 reviews · 0 disputes · 0 strikes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Ships same day', pct: 94 },
                  { label: 'As described', pct: 99 },
                  { label: 'Communication', pct: 97 },
                ].map((stat, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{stat.label}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{stat.pct}%</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '2px', background: 'var(--bg-4)' }}>
                      <div style={{ width: `${stat.pct}%`, height: '100%', background: 'var(--teal)', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats card */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Account Stats</div>
              {[
                { label: 'Total sales', val: '847', gold: false },
                { label: 'Total volume', val: '$1.24M', gold: true },
                { label: 'Avg sale price', val: '$1,466', gold: false },
                { label: 'Disputes won', val: '3 / 3', green: true },
                { label: 'Disputes lost', val: '0', green: true },
                { label: 'Strikes', val: '0', green: true },
                { label: 'Bond tier', val: '1% (Elite)', gold: false },
                { label: 'Member since', val: 'Jan 2024', gold: false },
              ].map((stat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 7 ? '0.5px solid var(--border)' : 'none', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{stat.label}</span>
                  <span style={{ color: stat.gold ? 'var(--gold)' : stat.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 500 }}>{stat.val}</span>
                </div>
              ))}
            </div>

            {/* On-chain verification */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>On-Chain Verification</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '10px' }}>All sales, feedback, and reputation data is verifiable on Base. No company can alter or delete this record.</div>
              <a href="https://basescan.org" target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '7px', padding: '8px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
                View on Basescan →
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}