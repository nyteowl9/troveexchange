'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function CreatorDashboard() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('overview')
  const [copied, setCopied] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creator, setCreator] = useState(null)
  const [conversions, setConversions] = useState([])
  const [payouts, setPayouts] = useState([])
  const [notCreator, setNotCreator] = useState(false)
  const [deepUrl, setDeepUrl] = useState('')
  const [deepGenerated, setDeepGenerated] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); setNotCreator(true); return }

    const { data: creatorRecord } = await supabase
      .from('creators')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    if (!creatorRecord) { setLoading(false); setNotCreator(true); return }
    setCreator(creatorRecord)

    const { data: convRows } = await supabase
      .from('referral_conversions')
      .select(`
        id, sale_amount, commission, paid, converted_at,
        orders ( listings ( card_name, game ) )
      `)
      .eq('creator_id', creatorRecord.id)
      .order('converted_at', { ascending: false })
    setConversions(convRows || [])

    const { data: payoutRows } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('creator_id', creatorRecord.id)
      .order('paid_at', { ascending: false })
    setPayouts(payoutRows || [])

    setLoading(false)
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  const copyText = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateDeepLink = () => {
    if (!deepUrl || !creator) return
    try {
      const u = new URL(deepUrl)
      u.searchParams.set('ref', creator.ref_code)
      setDeepGenerated(u.toString())
    } catch {
      setDeepGenerated('Invalid URL — paste a full chasehollow.com link')
    }
  }

  const refLink = creator ? `https://chasehollow.com/?ref=${creator.ref_code}` : ''

  const pendingEarnings = conversions
    .filter(c => !c.paid)
    .reduce((sum, c) => sum + parseFloat(c.commission || 0), 0)
    .toFixed(2)

  const allTimeEarnings = payouts
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    .toFixed(2)

  const conversionRate = conversions.length > 0
    ? ((conversions.length / Math.max(1, conversions.length)) * 100).toFixed(1)
    : '0.0'

  const avgCommission = conversions.length > 0
    ? (conversions.reduce((sum, c) => sum + parseFloat(c.commission || 0), 0) / conversions.length).toFixed(2)
    : '0.00'

  const nextPayoutDate = () => {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 7)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const fmtDate = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const fmtMonth = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const initials = creator?.handle
    ? creator.handle.replace(/^@/, '').slice(0, 2).toUpperCase()
    : 'CR'

  const navItems = [
    { id: 'overview', icon: '◈', label: 'Dashboard' },
    { id: 'conversions', icon: '⇄', label: 'Conversions', badge: conversions.length || null },
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

  // ── NOT A CREATOR ─────────────────────────────────────────────────────────
  if (!loading && notCreator) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Creator <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Dashboard</em>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '28px' }}>
            You don't have an active creator account. Apply to join the program — you'll get instant access and your referral link right away.
          </p>
          <a href="/creators" style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '13px 28px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', fontFamily: 'DM Sans, sans-serif', textDecoration: 'none', display: 'inline-block' }}>
            Apply to the Creator Program →
          </a>
        </div>
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    )
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <a href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '19px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '22px', height: '22px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleTheme} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1.5px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>{initials}</div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{creator?.handle?.replace(/^@/, '')}</span>
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
              {item.badge ? <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: 'var(--accent-green)', color: '#fff', fontWeight: 600 }}>{item.badge}</span> : null}
            </button>
          ))}

          <div style={{ margin: '12px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '8px', fontWeight: 500 }}>All-Time Earnings</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>${allTimeEarnings}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>USDC · {payouts.length} payout{payouts.length !== 1 ? 's' : ''}</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '210px', flex: 1, padding: '28px 24px 60px', minWidth: 0 }}>

          {/* MOBILE NAV DROPDOWN */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select value={activeSection} onChange={e => setActiveSection(e.target.value)} style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
              <option value="overview">Dashboard</option>
              <option value="conversions">Conversions</option>
              <option value="payouts">Payouts</option>
              <option value="assets">Assets & Links</option>
              <option value="settings">Settings</option>
            </select>
          </div>

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{creator?.handle?.replace(/^@/, '')}</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Creator Partner · Active · Next payout {nextPayoutDate()}</div>
                </div>
              </div>

              {/* Referral link */}
              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '24px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 500 }}>Your Referral Link</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', wordBreak: 'break-all' }}>
                    {refLink}
                  </div>
                  <button onClick={() => copyText(refLink, 'main')} style={{ background: copied === 'main' ? 'var(--accent-green)' : 'var(--teal)', border: 'none', color: '#0A0A0B', padding: '10px 20px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
                    {copied === 'main' ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>30-day cookie · 0.5% of every sale · Works on any card purchase</div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Pending Earnings', val: `$${pendingEarnings}`, sub: `Pays out ${nextPayoutDate()}`, color: 'var(--gold)' },
                  { label: 'Total Conversions', val: conversions.length.toString(), sub: 'All time', color: 'var(--accent-green)' },
                  { label: 'Unpaid Conversions', val: conversions.filter(c => !c.paid).length.toString(), sub: 'This cycle', color: 'var(--text-primary)' },
                  { label: 'Avg Commission', val: `$${avgCommission}`, sub: 'Per conversion', color: 'var(--text-primary)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Recent conversions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Recent <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Conversions</em></div>
                <button onClick={() => setActiveSection('conversions')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>
              </div>

              {conversions.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No conversions yet — start sharing your link to earn</div>
                </div>
              ) : (
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
                      {conversions.slice(0, 5).map((conv, i) => (
                        <tr key={conv.id} style={{ borderBottom: i < Math.min(4, conversions.length - 1) ? '0.5px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(conv.converted_at)}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{conv.orders?.listings?.card_name || 'Card'}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600 }}>${parseFloat(conv.sale_amount || 0).toLocaleString()}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Playfair Display, serif', fontSize: '18px', color: 'var(--accent-green)', fontWeight: 600 }}>${parseFloat(conv.commission || 0).toFixed(2)}</td>
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
              )}
            </div>
          )}

          {/* CONVERSIONS */}
          {activeSection === 'conversions' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>All <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Conversions</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Every purchase attributed to your link · Buyer identity kept anonymous</div>

              {conversions.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>No conversions yet</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Share your referral link — anyone who clicks and buys within 30 days earns you 0.5%</div>
                </div>
              ) : (
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
                        <tr key={conv.id} style={{ borderBottom: i < conversions.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(conv.converted_at)}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{conv.orders?.listings?.card_name || 'Card'}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600 }}>${parseFloat(conv.sale_amount || 0).toLocaleString()}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Playfair Display, serif', fontSize: '18px', color: 'var(--accent-green)', fontWeight: 600 }}>${parseFloat(conv.commission || 0).toFixed(2)}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: conv.paid ? 'rgba(76,175,124,0.1)' : 'rgba(232,168,56,0.1)', border: conv.paid ? '1px solid rgba(76,175,124,0.3)' : '1px solid rgba(232,168,56,0.3)', color: conv.paid ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 500 }}>
                              {conv.paid ? '✓ Paid' : `Pending — ${nextPayoutDate()}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAYOUTS */}
          {activeSection === 'payouts' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Payout <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>All payouts in USDC · Base network · Publicly verifiable on Basescan</div>

              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontWeight: 500 }}>Next Payout — {nextPayoutDate()}</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', fontWeight: 300, color: 'var(--gold)' }}>${pendingEarnings} USDC</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {conversions.filter(c => !c.paid).length} conversion{conversions.filter(c => !c.paid).length !== 1 ? 's' : ''} this cycle · Paid to {creator?.wallet_address ? creator.wallet_address.slice(0, 6) + '...' + creator.wallet_address.slice(-4) : 'no wallet set'}
                  </div>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  <div style={{ marginBottom: '4px' }}>Min threshold: $50</div>
                  {parseFloat(pendingEarnings) >= 50
                    ? <div style={{ color: 'var(--accent-green)' }}>✓ Above threshold</div>
                    : <div style={{ color: 'var(--accent-amber)' }}>Below threshold — rolls over</div>
                  }
                </div>
              </div>

              {payouts.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No payouts yet — first payout processes when your pending balance reaches $50</div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                        {['Month', 'Amount', 'Paid', 'Status'].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: i < payouts.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '12px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{fmtMonth(p.paid_at)}</td>
                          <td style={{ padding: '12px 14px', fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)' }}>${parseFloat(p.amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: p.status === 'sent' ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                            {p.status === 'sent' ? `✓ ${fmtDate(p.paid_at)}` : 'Processing'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: p.status === 'sent' ? 'rgba(76,175,124,0.1)' : 'rgba(232,168,56,0.1)', border: p.status === 'sent' ? '1px solid rgba(76,175,124,0.3)' : '1px solid rgba(232,168,56,0.3)', color: p.status === 'sent' ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 500 }}>
                              {p.status === 'sent' ? '✓ Sent' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ASSETS */}
          {activeSection === 'assets' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Assets & <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Links</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>All your links in one place</div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 500 }}>Referral Links</div>
                {[
                  { label: 'Homepage', url: `https://chasehollow.com/?ref=${creator?.ref_code}` },
                  { label: 'Marketplace', url: `https://chasehollow.com/marketplace?ref=${creator?.ref_code}` },
                  { label: 'Pokémon listings', url: `https://chasehollow.com/marketplace?game=pokemon&ref=${creator?.ref_code}` },
                  { label: 'MTG listings', url: `https://chasehollow.com/marketplace?game=mtg&ref=${creator?.ref_code}` },
                ].map((link, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none', flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-secondary)', minWidth: '120px' }}>{link.label}</div>
                    <div style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{link.url}</div>
                    <button onClick={() => copyText(link.url, `asset-${i}`)} style={btn({ fontSize: '10px', padding: '4px 10px', flexShrink: 0, ...(copied === `asset-${i}` ? { background: 'var(--accent-green)', border: 'none', color: '#fff' } : {}) })}>
                      {copied === `asset-${i}` ? '✓' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 500 }}>Deep Link Generator</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>Link directly to a specific card listing — perfect for mentioning a card in your content.</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input type="text" placeholder="Paste a chasehollow.com listing URL..." value={deepUrl} onChange={e => setDeepUrl(e.target.value)} style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '9px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', outline: 'none' }} />
                  <button onClick={generateDeepLink} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600, flexShrink: 0 })}>Generate</button>
                </div>
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: deepGenerated ? 'var(--teal)' : 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {deepGenerated || 'Your tagged link will appear here...'}
                </div>
                {deepGenerated && !deepGenerated.startsWith('Invalid') && (
                  <button onClick={() => copyText(deepGenerated, 'deep')} style={{ ...btn({ marginTop: '8px', fontSize: '11px' }), ...(copied === 'deep' ? { background: 'var(--accent-green)', border: 'none', color: '#fff' } : {}) }}>
                    {copied === 'deep' ? '✓ Copied!' : 'Copy this link'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeSection === 'settings' && (
            <div style={{ maxWidth: '560px' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>Creator <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Settings</em></div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: 500 }}>Payout Wallet</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', wordBreak: 'break-all' }}>
                  {creator?.wallet_address || 'No wallet address on file'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>USDC payouts go to this address on Base. To update your payout wallet, contact support.</div>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: 500 }}>Your Ref Code</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', color: 'var(--teal)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px' }}>
                  {creator?.ref_code}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your ref code is permanent and tied to your account.</div>
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
