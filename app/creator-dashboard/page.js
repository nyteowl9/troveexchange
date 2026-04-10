'use client'

import { useState, useEffect } from 'react'

export default function CreatorDashboard() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('overview')
  const [copied, setCopied] = useState(false)

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

  const refLink = 'https://chasehollow.com/?ref=CardGrader'

  const copyLink = () => {
    navigator.clipboard?.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const conversions = [
    { date: 'Apr 6', card: 'Charizard Holo PSA 9', buyer: 'Anon', saleVal: '$487', commission: '$2.44', paid: false },
    { date: 'Apr 4', card: 'Mox Sapphire BGS 9', buyer: 'Anon', saleVal: '$6,800', commission: '$34.00', paid: false },
    { date: 'Apr 2', card: 'Pikachu Illustrator PSA 7', buyer: 'Anon', saleVal: '$4,200', commission: '$21.00', paid: false },
    { date: 'Mar 30', card: 'Ancestral Recall BGS 9', buyer: 'Anon', saleVal: '$9,200', commission: '$46.00', paid: true },
    { date: 'Mar 28', card: 'Blastoise Holo PSA 10', buyer: 'Anon', saleVal: '$3,800', commission: '$19.00', paid: true },
  ]

  const payouts = [
    { month: 'March 2025', amount: '$87.40', tx: '0x8f2a...d91c', date: 'Apr 7' },
    { month: 'February 2025', amount: '$124.80', tx: '0x4a1b...f22e', date: 'Mar 7' },
    { month: 'January 2025', amount: '$56.20', tx: '0x9c3d...a84f', date: 'Feb 7' },
  ]

  const navItems = [
    { id: 'overview', icon: '◈', label: 'Dashboard' },
    { id: 'conversions', icon: '⇄', label: 'Conversions', badge: '5' },
    { id: 'payouts', icon: '$', label: 'Payouts' },
    { id: 'assets', icon: '◆', label: 'Assets & Links' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
  ]

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  const pendingEarnings = conversions.filter(c => !c.paid).reduce((sum, c) => sum + parseFloat(c.commission.replace('$', '')), 0).toFixed(2)

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
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>CG</div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>CardGrader</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', fontWeight: 500 }}>Creator</span>
          </div>
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
        <aside className="dash-aside" style={{ width: '210px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '64px', left: 0, height: 'calc(100vh - 64px)', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
              <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: 'var(--accent-green)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          <div style={{ margin: '12px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '8px', fontWeight: 500 }}>All-Time Earnings</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>$268.40</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>USDC · 3 payouts</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '210px', flex: 1, padding: '28px 24px 60px', minWidth: 0 }}>
          {/* MOBILE NAV DROPDOWN */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select
              value={activeSection}
              onChange={e => setActiveSection(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
            >
              <option key="overview" value="overview">Dashboard</option>
              <option key="conversions" value="conversions">Conversions</option>
              <option key="payouts" value="payouts">Payouts</option>
              <option key="assets" value="assets">Assets & Links</option>
              <option key="settings" value="settings">Settings</option>
            </select>
          </div>

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>CardGrader</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Creator Partner · Active · Next payout May 7</div>
                </div>
              </div>

              {/* Referral link */}
              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '24px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 500 }}>Your Referral Link</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', wordBreak: 'break-all' }}>
                    {refLink}
                  </div>
                  <button onClick={copyLink} style={{ background: copied ? 'var(--accent-green)' : 'var(--teal)', border: 'none', color: '#0A0A0B', padding: '10px 20px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
                    {copied ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>30-day cookie · 0.5% of every sale · Works on any card purchase</div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Pending Earnings', val: `$${pendingEarnings}`, sub: 'Pays out May 7', color: 'var(--gold)' },
                  { label: 'Clicks This Month', val: '1,240', sub: '↑ 18% vs last month', color: 'var(--text-primary)' },
                  { label: 'Conversions', val: '5', sub: '0.4% conversion rate', color: 'var(--accent-green)' },
                  { label: 'Avg Commission', val: '$11.48', sub: 'Per conversion', color: 'var(--text-primary)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Recent conversions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Recent <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Conversions</em></div>
                <button onClick={() => setActiveSection('conversions')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Date', 'Card Purchased', 'Sale Value', 'Your Commission', 'Status'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {conversions.slice(0, 4).map((conv, i) => (
                      <tr key={i} style={{ borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{conv.date}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{conv.card}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600 }}>{conv.saleVal}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--accent-green)', fontWeight: 600 }}>{conv.commission}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: conv.paid ? 'rgba(76,175,124,0.1)' : 'rgba(232,168,56,0.1)', border: conv.paid ? '1px solid rgba(76,175,124,0.3)' : '1px solid rgba(232,168,56,0.3)', color: conv.paid ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 500 }}>
                            {conv.paid ? '✓ Paid' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONVERSIONS */}
          {activeSection === 'conversions' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>All <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Conversions</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Every purchase attributed to your link · Buyer identity kept anonymous</div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Date', 'Card Purchased', 'Sale Value', 'Your 0.5%', 'Status'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {conversions.map((conv, i) => (
                      <tr key={i} style={{ borderBottom: i < conversions.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{conv.date}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{conv.card}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600 }}>{conv.saleVal}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--accent-green)', fontWeight: 600 }}>{conv.commission}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: conv.paid ? 'rgba(76,175,124,0.1)' : 'rgba(232,168,56,0.1)', border: conv.paid ? '1px solid rgba(76,175,124,0.3)' : '1px solid rgba(232,168,56,0.3)', color: conv.paid ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 500 }}>
                            {conv.paid ? '✓ Paid' : 'Pending — May 7'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYOUTS */}
          {activeSection === 'payouts' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Payout <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>All payouts in USDC · Base network · Publicly verifiable on Basescan</div>

              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontWeight: 500 }}>Next Payout — May 7, 2025</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, color: 'var(--gold)' }}>${pendingEarnings} USDC</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>5 conversions this month · Paid to 0x742d...f44e</div>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  <div style={{ marginBottom: '4px' }}>Min threshold: $50</div>
                  <div style={{ color: 'var(--accent-green)' }}>✓ Above threshold</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Month', 'Amount', 'Paid', 'Transaction'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p, i) => (
                      <tr key={i} style={{ borderBottom: i < payouts.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{p.month}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)' }}>{p.amount}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)' }}>✓ {p.date}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <a href="#" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', textDecoration: 'none' }}>{p.tx} · Basescan →</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ASSETS */}
          {activeSection === 'assets' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Assets & <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Links</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>All your links and assets in one place</div>

              {/* Main link */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 500 }}>Referral Links</div>
                {[
                  { label: 'Homepage', url: 'https://chasehollow.com/?ref=CardGrader' },
                  { label: 'Marketplace', url: 'https://chasehollow.com/marketplace?ref=CardGrader' },
                  { label: 'Pokémon listings', url: 'https://chasehollow.com/marketplace?game=pokemon&ref=CardGrader' },
                  { label: 'MTG listings', url: 'https://chasehollow.com/marketplace?game=mtg&ref=CardGrader' },
                ].map((link, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none', flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-secondary)', minWidth: '120px' }}>{link.label}</div>
                    <div style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{link.url}</div>
                    <button onClick={() => navigator.clipboard?.writeText(link.url)} style={btn({ fontSize: '10px', padding: '4px 10px', flexShrink: 0 })}>Copy</button>
                  </div>
                ))}
              </div>

              {/* Deep link generator */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 500 }}>Deep Link Generator</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>Link directly to a specific card listing — perfect for mentioning a specific card in your content.</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input type="text" placeholder="Paste a chasehollow.com listing URL..." style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '9px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', outline: 'none' }} />
                  <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600, flexShrink: 0 })}>Generate</button>
                </div>
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Your tagged link will appear here...
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeSection === 'settings' && (
            <div style={{ maxWidth: '560px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>Creator <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Settings</em></div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: 500 }}>Payout Wallet</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', wordBreak: 'break-all' }}>
                  0x742d35Cc6634C0532925a3b8D4C9b3D4f8a23f44e
                </div>
                <button style={btn({ fontSize: '11px' })}>Update Wallet Address</button>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>Your USDC payouts go to this address on Base. Make sure it's correct before next payout date.</div>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: 500 }}>Notifications</div>
                {['Email me on every conversion', 'Email me monthly payout summary', 'Email me when payout is sent'].map((item, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" defaultChecked={i > 0} style={{ accentColor: 'var(--teal)', width: '15px', height: '15px' }} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}