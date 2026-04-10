'use client'

import { useState, useEffect } from 'react'

export default function AdminPanel() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('overview')
  const [showActionModal, setShowActionModal] = useState(null)

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

  const metrics = [
    { label: 'Total Volume', val: '$2.84M', sub: 'All-time · On-chain', color: 'var(--gold)' },
    { label: 'Monthly Revenue', val: '$8,520', sub: '3% of $284k Apr volume', color: 'var(--accent-green)' },
    { label: 'Active Orders', val: '47', sub: '$312k in escrow right now', color: 'var(--text-primary)' },
    { label: 'Registered Users', val: '1,284', sub: '312 sellers · 972 buyers', color: 'var(--text-primary)' },
    { label: 'Open Disputes', val: '2', sub: '1 pending owner decision', color: 'var(--accent-amber)' },
    { label: 'Auth Queue', val: '5', sub: 'Avg 2.3hrs to clear', color: 'var(--text-primary)' },
    { label: 'Strike Rate', val: '0.8%', sub: '11 strikes this month', color: 'var(--accent-green)' },
    { label: 'Dispute Rate', val: '1.2%', sub: 'Industry avg: 3.5%', color: 'var(--accent-green)' },
  ]

  const recentOrders = [
    { id: '#4821', card: 'Charizard Holo PSA 9', buyer: 'RareVault_99', seller: 'CardKing_88', value: '$487', status: 'auto-release', statusColor: 'var(--accent-amber)' },
    { id: '#4819', card: 'Mox Sapphire BGS 9', buyer: 'MTGLegacy', seller: 'PowerNine_Pro', value: '$6,800', status: 'authenticating', statusColor: 'var(--gold)' },
    { id: '#4815', card: 'Pikachu Illus PSA 7', buyer: 'SlabHunter_X', seller: 'CardKing_88', value: '$4,200', status: 'in transit', statusColor: 'var(--accent-blue)' },
    { id: '#4810', card: 'Ancestral Recall BGS 9', buyer: 'CardVault_NYC', seller: 'PowerNine_Pro', value: '$9,200', status: 'dispute open', statusColor: 'var(--accent-red)' },
    { id: '#4808', card: 'Mox Ruby BGS 8.5', buyer: 'PowerNine_Fan', seller: 'MTGLegacy', value: '$4,100', status: 'shipped', statusColor: 'var(--accent-blue)' },
  ]

  const users = [
    { name: 'CardKing_88', type: 'seller', tier: 'Elite', sales: 847, rating: 4.98, strikes: 0, joined: 'Jan 2024', status: 'active' },
    { name: 'PowerNine_Pro', type: 'seller', tier: 'Pro', sales: 312, rating: 4.95, strikes: 0, joined: 'Mar 2024', status: 'active' },
    { name: 'RareVault_99', type: 'buyer', tier: 'Trusted', purchases: 38, rating: 4.92, disputes: 1, joined: 'Jan 2024', status: 'active' },
    { name: 'SlabHunter_X', type: 'buyer', tier: 'New', purchases: 3, rating: 5.0, disputes: 0, joined: 'Apr 2025', status: 'active' },
    { name: 'BadSeller_01', type: 'seller', tier: 'New', sales: 2, rating: 2.1, strikes: 2, joined: 'Apr 2025', status: 'suspended' },
  ]

  const strikes = [
    { user: 'BadSeller_01', type: 'seller', strike: 2, reason: 'Failed to ship within 48hrs — auto-refund triggered', date: 'Apr 6', action: '30-day suspension + elevated bond' },
    { user: 'QuickFlip_22', type: 'seller', strike: 1, reason: 'Failed to ship within 48hrs — auto-refund triggered', date: 'Apr 4', action: '7-day suspension' },
    { user: 'FakeSlab_99', type: 'seller', strike: 3, reason: 'Repeated failure to ship + misrepresentation', date: 'Apr 1', action: 'Permanent ban — account closed' },
  ]

  const pendingDecisions = [
    { id: 'DSP-4799', type: 'dispute', description: 'Wrong card received — Blastoise Holo PSA 10', value: '$3,800', rec: 'buyer', staffNote: 'Clear case — wrong card shipped. Auth photos confirm Venusaur received.', urgency: 'normal' },
    { id: 'STK-4802', type: 'strike_appeal', description: 'CardKing_88 appealing Strike 1 — claims shipping was on time', value: 'N/A', rec: 'deny', staffNote: 'EasyPost logs show no carrier scan until T+52hrs. Strike stands.', urgency: 'normal' },
  ]

  const navItems = [
    { id: 'overview', icon: '◈', label: 'Overview' },
    { id: 'decisions', icon: '⚖', label: 'Pending Decisions', badge: pendingDecisions.length, badgeColor: 'var(--accent-red)' },
    { id: 'orders', icon: '⇄', label: 'All Orders' },
    { id: 'users', icon: '👤', label: 'Users' },
    { id: 'strikes', icon: '⚠', label: 'Strikes' },
    { id: 'financials', icon: '$', label: 'Financials' },
    { id: 'escrow', icon: '🔒', label: 'Escrow Monitor' },
    { id: 'settings', icon: '⚙', label: 'Platform Settings' },
  ]

  const tierColors = {
    Elite: { bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)', color: 'var(--gold)' },
    Pro: { bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)' },
    Trusted: { bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)' },
    New: { bg: 'rgba(255,255,255,0.05)', border: 'var(--border)', color: 'var(--text-muted)' },
  }

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* ACTION MODAL */}
      {showActionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${showActionModal.color || 'var(--border)'}`, borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>{showActionModal.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>{showActionModal.description}</div>
            {showActionModal.note && (
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '9px', fontWeight: 500 }}>Staff Note</div>
                {showActionModal.note}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, background: showActionModal.actionColor || 'var(--teal)', border: 'none', color: '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }} onClick={() => setShowActionModal(null)}>
                {showActionModal.action}
              </button>
              <button onClick={() => setShowActionModal(null)} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </a>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)', fontWeight: 500 }}>Owner Admin</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
            All systems operational
          </div>
          <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
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
<div style={{ display: 'flex', flexWrap: 'wrap', paddingTop: '56px', minHeight: '100vh' }}>

        {/* SIDEBAR */}
        <aside className="dash-aside" style={{ width: '210px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '56px', left: 0, height: 'calc(100vh - 56px)', overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
              <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor || 'var(--teal)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          {/* Safe multisig status */}
          <div style={{ margin: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Safe Multisig</div>
            {[
              { label: 'W1 Operational', status: 'online', color: 'var(--accent-green)' },
              { label: 'W2 Co-signer A', status: 'online', color: 'var(--accent-green)' },
              { label: 'W3 Co-signer B', status: 'offline', color: 'var(--text-muted)' },
              { label: 'W4 Dead man', status: 'standby', color: 'var(--accent-amber)' },
            ].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{w.label}</span>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: w.color, display: 'inline-block' }} />
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '210px', flex: 1, padding: '24px 24px 60px', minWidth: 0 }}>

          {/* MOBILE NAV DROPDOWN — shown only when sidebar is hidden */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select
              value={activeSection}
              onChange={e => setActiveSection(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
            >
              {navItems.map(item => (
                <option key={item.id} value={item.id}>{item.icon} {item.label}</option>
              ))}
            </select>
          </div>

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Platform <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Overview</em></div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Thursday, April 7 2025 · All systems operational</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={btn()}>Export Report</button>
                  <button onClick={() => setActiveSection('decisions')} style={{ background: pendingDecisions.length > 0 ? 'var(--accent-red)' : 'var(--teal)', border: 'none', color: '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {pendingDecisions.length > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />}
                    {pendingDecisions.length} Decision{pendingDecisions.length !== 1 ? 's' : ''} Pending
                  </button>
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {metrics.map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Recent <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
                <button onClick={() => setActiveSection('orders')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Order', 'Card', 'Buyer', 'Seller', 'Value', 'Status'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, i) => (
                      <tr key={i} style={{ borderBottom: i < recentOrders.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{order.id}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', color: 'var(--text-primary)' }}>{order.card}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--accent-blue)' }}>{order.buyer}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--gold)' }}>{order.seller}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', fontWeight: 600, color: 'var(--gold)' }}>{order.value}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${order.statusColor}`, color: order.statusColor, background: `${order.statusColor}18`, fontWeight: 500 }}>{order.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Platform health */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>System Status</div>
                  {[
                    { label: 'Smart Contract (Base)', status: 'Operational', green: true },
                    { label: 'Supabase Database', status: 'Operational', green: true },
                    { label: 'Authentication Center', status: 'Operational', green: true },
                    { label: 'EasyPost Webhooks', status: 'Operational', green: true },
                    { label: 'Resend Email', status: 'Operational', green: true },
                    { label: 'Vercel Edge Network', status: 'Operational', green: true },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 5 ? '0.5px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Escrow Summary</div>
                  {[
                    { label: 'Total in escrow', val: '$312,400', gold: true },
                    { label: 'Active orders', val: '47' },
                    { label: 'Avg order value', val: '$6,647' },
                    { label: 'Largest order', val: '$36,000 · PSA 10 Charizard' },
                    { label: 'Auto-releasing today', val: '3 orders · $11,200', amber: true },
                    { label: 'Dispute holds', val: '$13,000 · 2 disputes' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 5 ? '0.5px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: item.gold ? 'var(--gold)' : item.amber ? 'var(--accent-amber)' : 'var(--text-primary)', fontWeight: 500 }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PENDING DECISIONS */}
          {activeSection === 'decisions' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Pending <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Decisions</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>These require your direct action. Staff has reviewed and submitted recommendations — only you can execute.</div>
              {pendingDecisions.map((d, i) => (
                <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(200,75,60,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--text-primary)' }}>{d.description}</div>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 8px', borderRadius: '10px', background: d.type === 'dispute' ? 'rgba(200,75,60,0.1)' : 'rgba(232,168,56,0.1)', border: d.type === 'dispute' ? '1px solid rgba(200,75,60,0.3)' : '1px solid rgba(232,168,56,0.3)', color: d.type === 'dispute' ? 'var(--accent-red)' : 'var(--accent-amber)', fontWeight: 500 }}>
                          {d.type === 'dispute' ? 'Dispute' : 'Strike Appeal'}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{d.id} · Value: {d.value}</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(60,125,200,0.08)', border: '1px solid rgba(60,125,200,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--accent-blue)' }}>Staff recommendation ({d.rec === 'buyer' ? 'Refund buyer' : d.rec === 'deny' ? 'Deny appeal' : 'Release to seller'}):</strong> {d.staffNote}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {d.type === 'dispute' && (
                      <>
                        <button onClick={() => setShowActionModal({ title: 'Execute — Refund Buyer', description: `Full escrow refund will be sent to the buyer. Seller receives Strike 1. This is irreversible.`, note: d.staffNote, action: 'Confirm — Refund Buyer', actionColor: 'var(--accent-green)', color: 'rgba(76,175,124,0.4)' })} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Refund Buyer</button>
                        <button onClick={() => setShowActionModal({ title: 'Execute — Release to Seller', description: `Escrow will be released to the seller. Buyer bond forfeited. This is irreversible.`, note: d.staffNote, action: 'Confirm — Release to Seller', actionColor: 'var(--gold)', color: 'rgba(201,168,76,0.4)' })} style={{ background: 'transparent', border: '1.5px solid rgba(201,168,76,0.4)', color: 'var(--gold)', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Release to Seller</button>
                      </>
                    )}
                    {d.type === 'strike_appeal' && (
                      <>
                        <button onClick={() => setShowActionModal({ title: 'Deny Appeal — Strike Stands', description: 'The strike will remain on the seller\'s account.', note: d.staffNote, action: 'Confirm — Deny Appeal', actionColor: 'var(--accent-red)', color: 'rgba(200,75,60,0.4)' })} style={{ background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Deny Appeal — Strike Stands</button>
                        <button onClick={() => setShowActionModal({ title: 'Approve Appeal — Remove Strike', description: 'The strike will be removed from the seller\'s account.', note: d.staffNote, action: 'Confirm — Remove Strike', actionColor: 'var(--accent-green)', color: 'rgba(76,175,124,0.4)' })} style={{ background: 'transparent', border: '1.5px solid rgba(76,175,124,0.4)', color: 'var(--accent-green)', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Approve Appeal — Remove Strike</button>
                      </>
                    )}
                    <button style={btn({ padding: '10px 16px' })}>View Full Case</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ORDERS */}
          {activeSection === 'orders' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>All <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>47 active · $312k in escrow · Full order history</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search orders, cards, users..." style={{ flex: 1, minWidth: '200px', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '9px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }} />
                {['All', 'Active', 'Authenticating', 'Dispute', 'Auto-Release', 'Complete'].map((f, i) => (
                  <button key={i} style={btn({ fontSize: '10px', padding: '6px 12px', background: i === 0 ? 'var(--teal-bg)' : 'transparent', border: i === 0 ? '1.5px solid var(--teal-border)' : '1.5px solid var(--border)', color: i === 0 ? 'var(--teal)' : 'var(--text-muted)' })}>{f}</button>
                ))}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Order', 'Card', 'Buyer', 'Seller', 'Value', 'Status', 'Actions'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, i) => (
                      <tr key={i} style={{ borderBottom: i < recentOrders.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{order.id}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', color: 'var(--text-primary)' }}>{order.card}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--accent-blue)' }}>{order.buyer}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--gold)' }}>{order.seller}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', fontWeight: 600, color: 'var(--gold)' }}>{order.value}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${order.statusColor}`, color: order.statusColor, background: `${order.statusColor}18`, fontWeight: 500 }}>{order.status}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={btn({ fontSize: '10px', padding: '4px 8px' })}>View</button>
                            <button style={btn({ fontSize: '10px', padding: '4px 8px', color: 'var(--accent-amber)', border: '1px solid rgba(232,168,56,0.3)' })}>Force</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeSection === 'users' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>User <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Management</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>1,284 registered · 312 sellers · 972 buyers</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search users..." style={{ flex: 1, minWidth: '200px', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '9px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }} />
                {['All', 'Sellers', 'Buyers', 'Suspended', 'Banned'].map((f, i) => (
                  <button key={i} style={btn({ fontSize: '10px', padding: '6px 12px', background: i === 0 ? 'var(--teal-bg)' : 'transparent', border: i === 0 ? '1.5px solid var(--teal-border)' : '1.5px solid var(--border)', color: i === 0 ? 'var(--teal)' : 'var(--text-muted)' })}>{f}</button>
                ))}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['User', 'Type', 'Tier', 'Activity', 'Rating', 'Strikes', 'Status', 'Actions'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => {
                      const tc = tierColors[user.tier]
                      return (
                        <tr key={i} style={{ borderBottom: i < users.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: user.type === 'buyer' ? 'rgba(60,125,200,0.1)' : 'rgba(201,168,76,0.1)', border: user.type === 'buyer' ? '1px solid rgba(60,125,200,0.3)' : '1px solid rgba(201,168,76,0.3)', color: user.type === 'buyer' ? 'var(--accent-blue)' : 'var(--gold)', fontWeight: 500 }}>{user.type}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontWeight: 500 }}>{user.tier}</span>
                          </td>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{user.type === 'seller' ? `${user.sales} sales` : `${user.purchases} purchases`}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--gold)' }}>{user.rating} ★</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: user.strikes > 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600 }}>{user.strikes}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: user.status === 'active' ? 'rgba(76,175,124,0.1)' : 'rgba(200,75,60,0.1)', border: user.status === 'active' ? '1px solid rgba(76,175,124,0.3)' : '1px solid rgba(200,75,60,0.3)', color: user.status === 'active' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>{user.status}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button style={btn({ fontSize: '10px', padding: '4px 8px' })}>View</button>
                              <button style={btn({ fontSize: '10px', padding: '4px 8px', color: 'var(--accent-red)', border: '1px solid rgba(200,75,60,0.3)' })}>
                                {user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STRIKES */}
          {activeSection === 'strikes' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Strike <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Log</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>11 strikes this month · 1 permanent ban · All auto-applied by smart contract</div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Strike System Reference</div>
                {[
                  { strike: 'Strike 1', action: '7-day suspension from selling', color: 'var(--accent-amber)' },
                  { strike: 'Strike 2', action: '30-day suspension + elevated bond (4% regardless of tier)', color: 'var(--accent-red)' },
                  { strike: 'Strike 3', action: 'Permanent ban — account closed, all listings removed', color: 'var(--accent-red)' },
                  { strike: 'New seller grace', action: 'First offense = warning, no suspension', color: 'var(--text-muted)' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', minWidth: '100px', color: item.color, fontWeight: 600 }}>{item.strike}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.action}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['User', 'Strike #', 'Reason', 'Date', 'Action Taken', 'Appeal'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {strikes.map((s, i) => (
                      <tr key={i} style={{ borderBottom: i < strikes.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--gold)' }}>{s.user}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: s.strike === 3 ? 'var(--accent-red)' : s.strike === 2 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>Strike {s.strike}</span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px' }}>{s.reason}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{s.date}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: s.strike === 3 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{s.action}</td>
                        <td style={{ padding: '11px 14px' }}>
                          {s.strike < 3 ? <button style={btn({ fontSize: '10px', padding: '4px 8px' })}>Review</button> : <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>No appeal</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FINANCIALS */}
          {activeSection === 'financials' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Platform <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Financials</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>All figures in USDC · On-chain · Base network</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'All-Time Volume', val: '$2.84M', sub: 'Gross card sales', color: 'var(--gold)' },
                  { label: 'All-Time Fees (3%)', val: '$85,200', sub: 'Platform revenue', color: 'var(--accent-green)' },
                  { label: 'April Volume', val: '$284,000', sub: '$8,520 platform fee', color: 'var(--text-primary)' },
                  { label: 'Treasury Balance', val: '$142,400', sub: 'Accumulated fees · Safe multisig', color: 'var(--gold)' },
                  { label: 'Bonds In-Flight', val: '$18,240', sub: 'Across all active orders', color: 'var(--accent-amber)' },
                  { label: 'Auth Revenue', val: '$4,200', sub: '168 auth fees · $25 each', color: 'var(--accent-green)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.25)', borderRadius: '10px', padding: '14px 18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ⚠ Treasury withdrawals require 3-of-4 multisig approval (W1 + W2 + W3). Any withdrawal over $50,000 requires 4-of-4. Use <a href="https://app.safe.global" target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Safe Dashboard →</a> to initiate.
              </div>
            </div>
          )}

          {/* ESCROW MONITOR */}
          {activeSection === 'escrow' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Escrow <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Monitor</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Live view of all USDC locked in smart contract · Base network</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Total Locked', val: '$312,400', color: 'var(--gold)' },
                  { label: 'Auto-Releasing Today', val: '$11,200', color: 'var(--accent-amber)' },
                  { label: 'Dispute Holds', val: '$13,000', color: 'var(--accent-red)' },
                  { label: 'Contract Address', val: '0x8f2a...d91c', color: 'var(--teal)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: i === 3 ? 'DM Mono, monospace' : 'Cormorant Garamond, serif', fontSize: i === 3 ? '13px' : '26px', fontWeight: 300, color: m.color }}>{m.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Emergency Controls — Owner Only</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                  These controls exist for emergencies only — smart contract exploits, critical bugs, or legal requirements. All actions require 4-of-4 multisig approval and are permanently recorded on-chain.
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Pause New Escrows', color: 'var(--accent-amber)' },
                    { label: 'Force Release — Single Order', color: 'var(--accent-amber)' },
                    { label: 'Emergency Pause All', color: 'var(--accent-red)' },
                  ].map((action, i) => (
                    <button key={i} style={{ background: 'transparent', border: `1.5px solid ${action.color}`, color: action.color, padding: '9px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: 0.7 }}>
                      🔒 {action.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '10px' }}>Emergency actions require 4-of-4 Safe multisig · Use Safe dashboard at app.safe.global</div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeSection === 'settings' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Platform <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Settings</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Core parameters · Changes logged on-chain where applicable</div>

              {[
                {
                  title: 'Fee Structure', items: [
                    { label: 'Platform fee', val: '3%', editable: false, note: 'Smart contract state variable · Change via 3-of-4 Safe multisig transaction · ~$0.04 gas · No redeployment needed' },
                    { label: 'Auth fee (buyer)', val: '$25 per card', editable: true },
                    { label: 'Shipping fee (split)', val: '$15 seller / $10 buyer', editable: true },
                    { label: 'Dispute bond', val: '0.5% of order value', editable: false, note: 'Smart contract state variable · Change via 3-of-4 Safe multisig transaction' },
                  ]
                },
                {
                  title: 'Timing Parameters', items: [
                    { label: 'Seller ship deadline', val: '48 hours', editable: false, note: 'Smart contract state variable · Change via 3-of-4 Safe multisig transaction' },
                    { label: 'Buyer inspection window', val: '72 hours after delivery', editable: false, note: 'Smart contract state variable · Change via 3-of-4 Safe multisig transaction' },
                    { label: 'Bond return window', val: '5–7 business days', editable: true },
                    { label: 'Dispute response deadline', val: '48 hours for seller', editable: true },
                  ]
                },
                {
                  title: 'Bond Tiers', items: [
                    { label: 'New seller (0–9 sales)', val: '4%', editable: true },
                    { label: 'Trusted (10–99 sales)', val: '3%', editable: true },
                    { label: 'Pro (100–499 sales)', val: '2%', editable: true },
                    { label: 'Elite (500+ sales)', val: '1%', editable: true },
                  ]
                },
              ].map((section, si) => (
                <div key={si} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.06em' }}>{section.title}</div>
                  {section.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: i < section.items.length - 1 ? '0.5px solid var(--border)' : 'none', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.label}</div>
                        {item.note && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.note}</div>}
                      </div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--gold)', fontWeight: 300, marginRight: '12px' }}>{item.val}</div>
                      {item.editable ? (
                        <button style={btn({ fontSize: '10px', padding: '5px 10px' })}>Edit</button>
                      ) : (
                        <a href="https://app.safe.global" target="_blank" rel="noreferrer" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', padding: '4px 8px', border: '1px solid var(--teal-border)', borderRadius: '6px', textDecoration: 'none', background: 'var(--teal-bg)' }}>Edit via Safe →</a>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}