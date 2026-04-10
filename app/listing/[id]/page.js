'use client'

import { useState, useEffect } from 'react'

export default function Listing() {
  const [theme, setTheme] = useState('dark')
  const [activePhoto, setActivePhoto] = useState(0)
  const [activeTab, setActiveTab] = useState('7d')
  const [showBuyModal, setShowBuyModal] = useState(false)

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

  const photos = [
    { label: 'Front', icon: '⚡' },
    { label: 'Back', icon: '▭' },
    { label: 'Slab', icon: '◎' },
    { label: 'Label', icon: '⊡' },
    { label: 'Surface', icon: '🔍' },
  ]

  const priceHistory = {
    '7d': [420, 435, 450, 445, 460, 475, 487],
    '30d': [380, 395, 410, 405, 420, 430, 445, 450, 460, 475, 487],
    '90d': [310, 330, 350, 360, 375, 390, 400, 410, 420, 435, 450, 487],
    '1y': [220, 250, 280, 310, 330, 360, 380, 400, 420, 450, 470, 487],
  }

  const recentSales = [
    { date: 'Apr 2, 2025', grade: 'PSA 9', price: '$472', platform: 'Chase Hollow' },
    { date: 'Mar 28, 2025', grade: 'PSA 9', price: '$461', platform: 'Chase Hollow' },
    { date: 'Mar 15, 2025', grade: 'PSA 9', price: '$448', platform: 'Chase Hollow' },
    { date: 'Feb 22, 2025', grade: 'PSA 9', price: '$430', platform: 'Chase Hollow' },
    { date: 'Feb 10, 2025', grade: 'PSA 9', price: '$415', platform: 'Chase Hollow' },
  ]

  const reviews = [
    { user: 'RareVault_99', rating: 5, text: 'Perfect transaction. Card exactly as described. Ships same day. Best seller on the platform.', date: 'Apr 2025', card: 'Ancestral Recall BGS 9' },
    { user: 'MTGLegacy', rating: 5, text: 'Third purchase from CardKing. Always flawless. The authentication step gives real peace of mind on high value purchases.', date: 'Mar 2025', card: 'Black Lotus BGS 8.5' },
    { user: 'SlabHunter_X', rating: 5, text: 'Exactly as listed. Fast shipping. Authentication passed no problem. Will buy again.', date: 'Mar 2025', card: 'Pikachu Illustrator PSA 8' },
  ]

  const cardPrice = 487
  const authFee = 25
  const buyerProtection = parseFloat((cardPrice * 0.005).toFixed(2))
  const salesTax = parseFloat((cardPrice * 0.095).toFixed(2))
  const total = (cardPrice + authFee + buyerProtection + salesTax).toFixed(2)

  const currentPrices = priceHistory[activeTab]
  const maxPrice = Math.max(...currentPrices)
  const minPrice = Math.min(...currentPrices)

  const btn = (extra = {}) => ({
    background: 'transparent',
    border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)',
    padding: '8px 18px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* BUY MODAL */}
      {showBuyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', position: 'relative' }}>
            <button onClick={() => setShowBuyModal(false)} style={{ position: 'absolute', top: '14px', right: '14px', width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '15px' }}>✕</button>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px' }}>Confirm <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Purchase</em></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>Clicking confirm will lock <strong style={{ color: 'var(--gold)' }}>${total} USDC</strong> in escrow on Base. Your wallet will open for signature.</div>

            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2 }}>
              {[
                { label: 'Card', val: 'Charizard Holo PSA 9' },
                { label: 'Seller', val: 'CardKing_88 · Elite' },
                { label: 'Card price', val: `$$${cardPrice}` },
                { label: 'Auth + shipping', val: 'Calculated' },
                { label: 'Total (est.)', val: `$${total} USDC` },
                { label: 'Network', val: 'Base (Ethereum L2)' },
                { label: 'Gas est.', val: '~$0.04' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ color: i === 2 ? 'var(--gold)' : 'var(--text-primary)', fontWeight: i === 2 ? 600 : 400 }}>{r.val}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {['Card received matches listing exactly', 'Auto-refund if seller misses 48hr ship deadline', 'Human authentication before card ships to you', '72hr inspection window after delivery'].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✓</span>{item}
                </div>
              ))}
            </div>

            <a href="/checkout" style={{ display: 'block', width: '100%', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '16px', fontSize: '15px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', textDecoration: 'none', marginBottom: '8px' }}>
              🔒 Lock ${total} USDC in Escrow
            </a>
            <button onClick={() => setShowBuyModal(false)} style={btn({ width: '100%', padding: '12px', borderRadius: '10px' })}>Cancel</button>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <a href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </a>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {['Marketplace', 'Recent Sales', 'How It Works', 'Fee Comparison', 'Get Started'].map((link, i) => (
            <a key={i} href={i === 0 ? '/marketplace' : '/'} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{link}</a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleTheme} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '15px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
          <button style={btn()}>Sign In</button>
          <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>List a Card</button>
        </div>
      </nav>

      {/* BREADCRUMB */}
      <div style={{ paddingTop: '64px', background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', padding: '12px 2.5rem', paddingTop: '76px' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</a>
          <span>→</span>
          <a href="/marketplace" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Marketplace</a>
          <span>→</span>
          <a href="/marketplace" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Pokémon</a>
          <span>→</span>
          <span style={{ color: 'var(--text-primary)' }}>Charizard Holo PSA 9</span>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 2.5rem 60px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'flex-start' }}>

        {/* LEFT */}
        <div>

          {/* PHOTO GALLERY */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
            {/* Main photo */}
            <div style={{ aspectRatio: '4/3', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: '45%', aspectRatio: '2.5/3.5', borderRadius: '8px', background: 'linear-gradient(145deg,#1a3a5c,#0d2035)', border: '2px solid rgba(255,215,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{ fontSize: '48px', opacity: 0.7 }}>⚡</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '60%' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,215,0,0.5)', width: '100%' }} />
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,215,0,0.25)', width: '70%' }} />
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,215,0,0.12)', width: '50%' }} />
                </div>
              </div>
              <div style={{ position: 'absolute', top: '16px', left: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '4px 12px', borderRadius: '6px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontWeight: 500 }}>PSA</div>
              <div style={{ position: 'absolute', top: '16px', right: '16px', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>9</div>
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                <button style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>⊕ Zoom</button>
              </div>
            </div>
            {/* Thumbnails */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '0.5px solid var(--border)', overflowX: 'auto' }}>
              {photos.map((photo, i) => (
                <div key={i} onClick={() => setActivePhoto(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '8px', border: `1.5px solid ${activePhoto === i ? 'var(--teal)' : 'var(--border)'}`, background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', opacity: activePhoto === i ? 1 : 0.5, transition: 'all 0.15s' }}>{photo.icon}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: activePhoto === i ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 500 }}>{photo.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD DETAILS */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Charizard Holo <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>#4/102</em>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '18px' }}>Pokémon · Base Set 1999 Shadowless · English</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              {[
                { label: 'Grader', val: 'PSA', color: 'var(--accent-blue)' },
                { label: 'Grade', val: 'Mint 9', color: 'var(--accent-green)' },
                { label: 'Cert #', val: '12847291', mono: true },
                { label: 'Card #', val: '#4/102', mono: true },
                { label: 'Set', val: 'Shadowless', mono: false },
                { label: 'Language', val: 'English', mono: false },
              ].map((cell, i) => (
                <div key={i} style={{ background: 'var(--bg-3)', padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{cell.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: cell.color || 'var(--text-primary)', fontFamily: cell.mono ? 'DM Mono, monospace' : 'DM Sans, sans-serif', fontSize: cell.mono ? '12px' : '14px' }}>{cell.val}</div>
                </div>
              ))}
            </div>
            {/* Seller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-3)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 600, color: 'var(--teal)', flexShrink: 0 }}>CK</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>CardKing_88</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--gold)' }}>⭐ Elite · 847 sales · 4.98★ · 0 disputes</div>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)' }}>0 strikes</div>
            </div>
          </div>

          {/* PRICE HISTORY */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Price <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['7d', '30d', '90d', '1y', 'All'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '5px 12px', borderRadius: '6px', border: `1.5px solid ${activeTab === tab ? 'var(--teal-border)' : 'var(--border)'}`, background: activeTab === tab ? 'var(--teal-bg)' : 'transparent', color: activeTab === tab ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>{tab}</button>
                ))}
              </div>
            </div>

            {/* Simple SVG chart */}
            <div style={{ position: 'relative', height: '120px', marginBottom: '8px' }}>
              <svg width="100%" height="120" viewBox={`0 0 ${currentPrices.length * 80} 120`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d={`M 0 ${120 - ((currentPrices[0] - minPrice) / (maxPrice - minPrice)) * 100} ${currentPrices.map((p, i) => `L ${i * 80} ${120 - ((p - minPrice) / (maxPrice - minPrice)) * 100}`).join(' ')} L ${(currentPrices.length - 1) * 80} 120 L 0 120 Z`}
                  fill="url(#chartGrad)"
                />
                {/* Line */}
                <path
                  d={`M 0 ${120 - ((currentPrices[0] - minPrice) / (maxPrice - minPrice)) * 100} ${currentPrices.map((p, i) => `L ${i * 80} ${120 - ((p - minPrice) / (maxPrice - minPrice)) * 100}`).join(' ')}`}
                  fill="none" stroke="var(--gold)" strokeWidth="2"
                />
                {/* Dots */}
                {currentPrices.map((p, i) => (
                  <circle key={i} cx={i * 80} cy={120 - ((p - minPrice) / (maxPrice - minPrice)) * 100} r="4" fill="var(--gold)" />
                ))}
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>Low: ${minPrice}</span>
              <span style={{ color: 'var(--accent-green)' }}>▲ +{Math.round(((currentPrices[currentPrices.length - 1] - currentPrices[0]) / currentPrices[0]) * 100)}% this period</span>
              <span>High: ${maxPrice}</span>
            </div>

            {/* Recent Sales Table */}
            <div style={{ marginTop: '20px', borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Recent Sales — Same Card & Grade</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {['Date', 'Grade', 'Sale Price', 'Platform'].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 10px', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale, i) => (
                    <tr key={i} style={{ borderBottom: i < recentSales.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{sale.date}</td>
                      <td style={{ padding: '10px' }}><span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{sale.grade}</span></td>
                      <td style={{ padding: '10px', fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', fontWeight: 600, color: 'var(--gold)' }}>{sale.price}</td>
                      <td style={{ padding: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{sale.platform}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AUTHENTICATION GUARANTEE */}
          <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '14px', padding: '22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✓</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Chase Hollow Authentication</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>What we verify before this card ships to you</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {[
                'Card received matches all listing photos exactly',
                'Grade label shows PSA 9 — matches listing exactly',
                'Cert #12847291 verified on PSA\'s official database',
                'Slab intact — no cracks, tampering, or re-sealing',
                'If anything doesn\'t match — full refund, automatically',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--teal)', flexShrink: 0, marginTop: '1px' }}>✓</span>{item}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '0.5px solid var(--teal-border)', paddingTop: '12px' }}>
              The card's grade and authenticity are certified by <strong style={{ color: 'var(--text-secondary)' }}>PSA</strong> — Chase Hollow verifies you receive exactly what was listed. <a href="/#how-it-works" style={{ color: 'var(--teal)', textDecoration: 'none' }}>How authentication works →</a>
            </div>
          </div>

          {/* TRANSACTION FLOW */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, marginBottom: '20px', color: 'var(--text-primary)' }}>
              How This <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Transaction Works</em>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { num: '01', title: 'You Lock USDC in Escrow', desc: `$${total} USDC locked in smart contract on Base. Neither party can touch it. Seller is notified immediately.`, done: false },
                { num: '02', title: 'Seller Ships to Trove HQ', desc: 'Seller has 48hrs to get the card to a carrier. If they miss the deadline, your USDC auto-refunds. No dispute needed.', done: false },
                { num: '03', title: 'Expert Authentication', desc: 'Our authenticator verifies the card matches this listing — photos, grade label, cert number, slab integrity. Pass = ships to you.', done: false },
                { num: '04', title: 'Delivered · Auto-Release', desc: 'Card ships to your address via FedEx. 72hrs after delivery, USDC releases to seller automatically. You can release early anytime.', done: false },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: i < 3 ? '20px' : '0' }}>
                  {i < 3 && <div style={{ position: 'absolute', left: '14px', top: '30px', bottom: '0', width: '1px', background: 'var(--border)' }} />}
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--teal-border)', background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', flexShrink: 0, zIndex: 1 }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{step.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SELLER REVIEWS */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>
                Seller <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Reviews</em>
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: 'var(--gold)' }}>4.98 <span style={{ fontSize: '16px', color: 'var(--gold)' }}>★</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((review, i) => (
                <div key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>{review.user[0]}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{review.user}</div>
                    <div style={{ color: 'var(--gold)', fontSize: '12px', letterSpacing: '1px' }}>{'★'.repeat(review.rating)}</div>
                    <div style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{review.date}</div>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px' }}>{review.card}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{review.text}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Verified purchase · Transaction on-chain</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT — PURCHASE PANEL */}
        <div style={{ position: 'sticky', top: '84px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>

            {/* Card preview */}
            <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '52px', height: '72px', borderRadius: '6px', background: 'linear-gradient(145deg,#1a3a5c,#0d2035)', border: '2px solid rgba(255,215,0,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>⚡</div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', lineHeight: 1.2, marginBottom: '3px', color: 'var(--text-primary)' }}>Charizard Holo</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Pokémon · Base Set Shadowless<br />
                  PSA 9 · Cert #12847291<br />
                  #4/102 · 1999 Wizards
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--teal)', fontWeight: 600 }}>CK</div>
                  CardKing_88 · Elite · 4.98★
                </div>
              </div>
            </div>

            {/* Fee breakdown */}
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Fee Breakdown</div>
              {[
                { label: 'Card price', val: `$${cardPrice.toLocaleString()}` },
                { label: 'Auth fee', val: `$${authFee}` },
                { label: 'Shipping & insurance', val: 'Calculated at checkout' },
                { label: 'Buyer protection (0.5%)', val: `$${buyerProtection}` },
                { label: 'Sales tax (varies)', val: 'Calculated at checkout' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 600, color: 'var(--gold)' }}>${total}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>USDC · Base Network</div>
                </div>
              </div>
            </div>

            {/* Buy button */}
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              <button onClick={() => setShowBuyModal(true)} style={{ width: '100%', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '16px', fontSize: '15px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                🔒 Buy Now — ${total} USDC
              </button>
              <button style={btn({ width: '100%', padding: '11px', borderRadius: '10px', textAlign: 'center' })}>♡ Add to Watchlist</button>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', lineHeight: 1.6 }}>
                Auto-refund if seller misses 48hr deadline · 72hr inspection window after delivery · On-chain
              </div>
            </div>

            {/* Trust items */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🔒', text: 'Escrow protected — funds held by smart contract' },
                { icon: '✓', text: 'Human authenticated before delivery' },
                { icon: '↩', text: 'Auto-refund if seller doesn\'t ship in 48hrs' },
                { icon: '⏱', text: '72hr inspection window after delivery' },
                { icon: '⬡', text: 'Permanent on-chain record on Base' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '13px', flexShrink: 0 }}>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

    </main>
  )
}