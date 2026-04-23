'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

async function apiFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, ...(opts.headers || {}) },
  })
}

export default function DisputeResolution() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('queue')
  const [activeDispute, setActiveDispute] = useState(null)
  const [activeTab, setActiveTab] = useState('timeline')
  const [recommendation, setRecommendation] = useState(null)
  const [recNotes, setRecNotes] = useState('')
  const [recSubmitting, setRecSubmitting] = useState(false)
  const [recError, setRecError] = useState(null)
  const [recSuccess, setRecSuccess] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [execError, setExecError] = useState(null)
  const [overrideReason, setOverrideReason] = useState('')

  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [disputes, setDisputes] = useState([])
  const [resolvedDisputes, setResolvedDisputes] = useState([])
  const [monthStats, setMonthStats] = useState({ opened: 0, buyer_wins: 0, seller_wins: 0, pending: 0 })
  const [authInspections, setAuthInspections] = useState([])

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

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, full_name, role').eq('id', user.id).single()
    setCurrentUser(profile)
  }, [])

  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/disputes/list?status=open')
      const json = await res.json()
      if (res.ok) {
        setDisputes(json.disputes || [])
        setMonthStats(json.stats || { opened: 0, buyer_wins: 0, seller_wins: 0, pending: 0 })
        if (json.role && json.full_name !== undefined) {
          setCurrentUser(prev => prev ? { ...prev, role: json.role, full_name: json.full_name } : { role: json.role, full_name: json.full_name })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchResolved = useCallback(async () => {
    const res = await apiFetch('/api/disputes/list?status=resolved')
    const json = await res.json()
    if (res.ok) setResolvedDisputes(json.disputes || [])
  }, [])

  const fetchStats = useCallback(async () => {}, [])

  useEffect(() => {
    fetchCurrentUser()
    fetchDisputes()
    fetchResolved()
  }, [fetchCurrentUser, fetchDisputes, fetchResolved])

  const fetchAuthInspections = useCallback(async (orderId) => {
    if (!orderId) return
    const { data } = await supabase
      .from('auth_inspections')
      .select('id, photos, decision, notes, timestamp')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true })
    setAuthInspections(data || [])
  }, [])

  const openDetail = useCallback((d) => {
    setActiveDispute(d)
    setActiveSection('detail')
    setActiveTab('timeline')
    setRecommendation(d.staff_recommendation || null)
    setRecNotes(d.notes || '')
    setRecSuccess(false)
    setRecError(null)
    fetchAuthInspections(d.order_id)
  }, [fetchAuthInspections])

  const disputeStatus = (d) => {
    if (d.outcome === 'buyer_wins') return 'resolved_buyer'
    if (d.outcome === 'seller_wins') return 'resolved_seller'
    // Owner decided buyer wins but awaiting card return (outcome still 'pending')
    if (d.owner_decision === 'buyer_wins') return 'awaiting_return'
    if (d.owner_decision === 'seller_wins') return 'resolved_seller'
    if (d.outcome === 'pending' && d.staff_recommendation) return 'pending_owner'
    return 'open'
  }

  const fmtDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const fmtUSD = (n) => {
    if (!n) return '—'
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleSubmitRecommendation = async () => {
    if (!recommendation || !activeDispute) return
    setRecSubmitting(true)
    setRecError(null)
    try {
      const res = await apiFetch('/api/disputes/recommend', {
        method: 'POST',
        body: JSON.stringify({ dispute_id: activeDispute.id, recommendation, notes: recNotes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setRecSuccess(true)
      await fetchDisputes()
    } catch (err) {
      setRecError(err.message)
    } finally {
      setRecSubmitting(false)
    }
  }

  const handleExecute = async (decision) => {
    if (!showConfirmModal) return
    if (showConfirmModal.isOverride && !overrideReason.trim()) return
    setExecuting(true)
    setExecError(null)
    try {
      const res = await apiFetch('/api/disputes/resolve', {
        method: 'POST',
        body: JSON.stringify({
          dispute_id: showConfirmModal.disputeId,
          decision,
          override_reason: showConfirmModal.isOverride ? overrideReason.trim() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setShowConfirmModal(null)
      setOverrideReason('')
      setActiveDispute(null)
      setActiveSection('queue')
      await fetchDisputes()
      await fetchResolved()
    } catch (err) {
      setExecError(err.message)
      setExecuting(false)
    }
  }

  const statusColors = {
    open: { bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)', label: 'Open' },
    pending_owner: { bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)', label: 'Pending Owner' },
    resolved_buyer:  { bg: 'rgba(76,175,124,0.1)',  border: 'rgba(76,175,124,0.3)',  color: 'var(--accent-green)', label: 'Resolved — Buyer' },
    awaiting_return: { bg: 'rgba(232,168,56,0.1)',  border: 'rgba(232,168,56,0.3)',  color: 'var(--accent-amber)', label: 'Decided — Awaiting Return' },
    resolved_seller: { bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)', color: 'var(--gold)', label: 'Resolved — Seller' },
  }

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '8px 16px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  const openQueue = disputes.filter(d => !d.staff_recommendation)
  const pendingQueue = disputes.filter(d => d.staff_recommendation && d.outcome === 'pending' && !d.owner_decision)

  const EvidenceCard = ({ urls, label, color }) => {
    if (!urls || urls.length === 0) return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: '8px', fontWeight: 500 }}>{label}</div>
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No evidence submitted.</div>
      </div>
    )
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: '8px', fontWeight: 500 }}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', width: '80px', height: '80px', borderRadius: '8px', background: 'var(--bg-3)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, textDecoration: 'none' }}>
              <img src={url} alt={`Evidence ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;">📎</div>` }} />
            </a>
          ))}
        </div>
      </div>
    )
  }

  const dispute = activeDispute

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* CONFIRM MODAL */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${showConfirmModal.isOverride ? 'rgba(200,75,60,0.5)' : showConfirmModal.decision === 'buyer_wins' ? 'rgba(76,175,124,0.4)' : 'rgba(201,168,76,0.4)'}`, borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            {showConfirmModal.isOverride && (
              <div style={{ background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--accent-red)', lineHeight: 1.5 }}>
                ⚠ <strong>Override — going against staff recommendation.</strong> This will be logged and auditable.
              </div>
            )}
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>
              {showConfirmModal.decision === 'buyer_wins' ? 'Buyer Wins' : 'Release to Seller'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              {showConfirmModal.decision === 'buyer_wins'
                ? showConfirmModal.isReturnDispute
                  ? `Card is already at the seller. Refund executes on-chain immediately. Seller bond forfeited. This cannot be undone.`
                  : `A prepaid return label (Label C) will be generated. Buyer has 5 days to ship the card back. Strike 1 applied to seller now. Refund releases on confirmed delivery. This cannot be undone.`
                : `Escrow releases to seller. Seller bond returned. This cannot be undone.`}
            </div>
            {execError && (
              <div style={{ background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: 'var(--accent-red)' }}>
                {execError}
              </div>
            )}
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2 }}>
              {[
                { label: 'Dispute', val: showConfirmModal.disputeId?.slice(0, 8).toUpperCase() },
                { label: 'Staff rec', val: showConfirmModal.staffRec === 'buyer_wins' ? 'Refund buyer' : 'Release to seller' },
                { label: 'Your decision', val: showConfirmModal.decision === 'buyer_wins' ? 'Full refund to buyer' : 'Release to seller' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ color: r.label === 'Your decision' && showConfirmModal.isOverride ? 'var(--accent-red)' : 'var(--text-primary)' }}>{r.val}</span>
                </div>
              ))}
            </div>
            {showConfirmModal.isOverride && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-red)', marginBottom: '6px', fontWeight: 500 }}>Override Reason (required)</div>
                <textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Explain why you are overriding the staff recommendation…"
                  rows={3}
                  style={{ width: '100%', background: 'var(--bg-3)', border: `1.5px solid ${overrideReason.trim() ? 'rgba(200,75,60,0.4)' : 'rgba(200,75,60,0.2)'}`, borderRadius: '8px', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleExecute(showConfirmModal.decision)}
                disabled={executing || (showConfirmModal.isOverride && !overrideReason.trim())}
                style={{ flex: 1, background: showConfirmModal.isOverride ? 'var(--accent-red)' : showConfirmModal.decision === 'buyer_wins' ? 'var(--accent-green)' : 'var(--gold)', border: 'none', color: '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: (executing || (showConfirmModal.isOverride && !overrideReason.trim())) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: (executing || (showConfirmModal.isOverride && !overrideReason.trim())) ? 0.5 : 1 }}>
                {executing ? 'Executing…' : showConfirmModal.isOverride ? 'Override & Execute' : 'Confirm — Execute Decision'}
              </button>
              <button onClick={() => { setShowConfirmModal(null); setExecError(null); setOverrideReason('') }} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </a>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.3)', color: 'var(--accent-amber)', fontWeight: 500 }}>Dispute Resolution</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser && (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
              {currentUser.role === 'owner' ? 'Owner' : 'Staff'}: <span style={{ color: 'var(--teal)' }}>{currentUser.full_name || currentUser.email || 'You'}</span>
            </div>
          )}
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
        <aside className="dash-aside" style={{ width: '200px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '56px', left: 0, height: 'calc(100vh - 56px)', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 'queue', icon: '⊡', label: 'Dispute Queue', badge: openQueue.length || null },
            { id: 'detail', icon: '◈', label: 'Case Detail', disabled: !activeDispute },
            { id: 'pending', icon: '⏱', label: 'Pending Owner', badge: pendingQueue.length || null, badgeColor: 'var(--accent-blue)' },
            { id: 'resolved', icon: '✓', label: 'Resolved', badge: resolvedDisputes.length || null },
          ].map(item => (
            <button key={item.id} onClick={() => !item.disabled && setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: item.disabled ? 'var(--text-muted)' : activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', opacity: item.disabled ? 0.4 : 1 }}>
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              {item.label}
              {item.badge > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor || 'var(--accent-amber)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          <div style={{ margin: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>This Month</div>
            {[
              { label: 'Opened', val: monthStats.opened },
              { label: 'Buyer wins', val: monthStats.buyer_wins, green: true },
              { label: 'Seller wins', val: monthStats.seller_wins, gold: true },
              { label: 'Pending', val: monthStats.pending, amber: true },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>{s.label}</span>
                <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: s.green ? 'var(--accent-green)' : s.gold ? 'var(--gold)' : s.amber ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '200px', flex: 1, padding: '24px 24px 60px', minWidth: 0 }}>
          {/* MOBILE NAV */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select value={activeSection} onChange={e => setActiveSection(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
              <option value="queue">Dispute Queue</option>
              <option value="detail">Case Detail</option>
              <option value="pending">Pending Owner Decision</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* QUEUE */}
          {activeSection === 'queue' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)' }}>Dispute <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Queue</em></div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {openQueue.length} open · {pendingQueue.length} pending owner decision · Staff recommends, owner executes
                </div>
              </div>

              <div style={{ background: 'rgba(60,125,200,0.06)', border: '1px solid rgba(60,125,200,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ⊡ <strong style={{ color: 'var(--accent-blue)' }}>How disputes work:</strong> Staff reviews evidence from both sides and makes a recommendation. The owner executes the final decision. Staff never moves money directly — only recommends.
              </div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>Loading disputes…</div>
              )}

              {!loading && disputes.length === 0 && (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                  No open disputes
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {disputes.map((d, i) => {
                  const status = disputeStatus(d)
                  const sc = statusColors[status]
                  const escrowAmt = d.orders?.escrow_amount
                  const isHighValue = escrowAmt >= 1000
                  const buyer = d.orders?.buyer
                  const seller = d.orders?.seller
                  const card = d.orders?.listing?.card_name || 'Unknown card'
                  return (
                    <div key={d.id} style={{ background: 'var(--bg-2)', border: `1.5px solid ${isHighValue ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal-border)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = isHighValue ? 'rgba(201,168,76,0.3)' : 'var(--border)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', color: 'var(--text-primary)' }}>{card}</div>
                            {isHighValue && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>High Value</span>}
                            {d.orders?.status === 'return_disputed_seller' && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(232,168,56,0.12)', border: '1px solid rgba(232,168,56,0.35)', color: 'var(--accent-amber)', fontWeight: 500 }}>↩ Return Dispute</span>}
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            {d.orders?.listing?.set || ''} · #{d.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <strong style={{ color: 'var(--accent-red)' }}>Reason:</strong> {d.reason}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Buyer: <span style={{ color: 'var(--accent-blue)' }}>{buyer?.username || buyer?.full_name || buyer?.email || '—'}</span>
                            {' · '}
                            Seller: <span style={{ color: 'var(--gold)' }}>{seller?.username || seller?.full_name || seller?.email || '—'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)', marginBottom: '4px' }}>{fmtUSD(escrowAmt)}</div>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500 }}>{sc.label}</span>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>{fmtDate(d.created_at)}</div>
                        </div>
                      </div>
                      {status === 'pending_owner' && d.staff_recommendation && (
                        <div style={{ background: 'rgba(60,125,200,0.08)', border: '1px solid rgba(60,125,200,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--accent-blue)' }}>Staff recommendation:</strong>{' '}
                          {d.staff_recommendation === 'buyer_wins' ? 'Refund buyer' : 'Release to seller'}
                          {d.notes && ` — ${d.notes}`}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => openDetail(d)} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Review Case →</button>
                        {status === 'pending_owner' && ['owner','dispute_resolver'].includes(currentUser?.role) && (() => {
                          const rec = d.staff_recommendation
                          const primaryDecision = rec
                          const overrideDecision = rec === 'buyer_wins' ? 'seller_wins' : 'buyer_wins'
                          const primaryLabel = rec === 'buyer_wins' ? 'Execute — Buyer Wins' : 'Execute — Release to Seller'
                          const overrideLabel = rec === 'buyer_wins' ? 'Override — Release to Seller' : 'Override — Buyer Wins'
                          return (
                            <>
                              <button onClick={() => setShowConfirmModal({ decision: primaryDecision, disputeId: d.id, staffRec: rec, isOverride: false, isReturnDispute: d.orders?.status === 'return_disputed_seller' })} style={{ background: rec === 'buyer_wins' ? 'var(--accent-green)' : 'var(--gold)', border: 'none', color: '#0A0A0B', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{primaryLabel}</button>
                              <button onClick={() => { setOverrideReason(''); setShowConfirmModal({ decision: overrideDecision, disputeId: d.id, staffRec: rec, isOverride: true, isReturnDispute: d.orders?.status === 'return_disputed_seller' }) }} style={{ background: 'transparent', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)', padding: '8px 14px', fontSize: '11px', fontWeight: 500, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: 0.7 }}>Override ↗</button>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* DETAIL */}
          {activeSection === 'detail' && dispute && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveSection('queue')} style={btn({ fontSize: '11px', padding: '5px 12px' })}>← Queue</button>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
                  Case <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>#{dispute.id.slice(0, 8).toUpperCase()}</em>
                </div>
                {(() => { const sc = statusColors[disputeStatus(dispute)]; return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500 }}>{sc.label}</span> })()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px', alignItems: 'flex-start' }}>

                {/* LEFT */}
                <div>
                  {/* Case summary */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: 'var(--text-primary)' }}>
                        {dispute.orders?.listing?.card_name || 'Unknown Card'}
                      </div>
                      {dispute.orders?.listing_id && (
                        <a href={`/listing/${dispute.orders.listing_id}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 9px', borderRadius: '6px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          View Listing ↗
                        </a>
                      )}
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {dispute.orders?.listing?.set || ''} · Order #{dispute.order_id?.slice(0, 8).toUpperCase()} · {fmtUSD(dispute.orders?.escrow_amount)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      {[
                        { label: 'Buyer', val: dispute.orders?.buyer?.username || dispute.orders?.buyer?.full_name || '—', color: 'var(--accent-blue)' },
                        { label: 'Seller', val: dispute.orders?.seller?.username || dispute.orders?.seller?.full_name || '—', color: 'var(--gold)' },
                      ].map((p, i) => (
                        <div key={i} style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{p.label}</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: p.color }}>{p.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-red)', marginBottom: '4px', fontWeight: 500 }}>BUYER CLAIM</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{dispute.reason}</div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', borderBottom: '0.5px solid var(--border)', paddingBottom: '0' }}>
                    {['timeline', 'evidence', 'auth-photos'].map(tab => {
                      const isWaivedOrder = authInspections.length > 0 && authInspections.every(i => i.decision === 'waived')
                      const tabLabel = tab === 'auth-photos'
                        ? (isWaivedOrder ? 'Pre-Ship Photos' : 'Auth Photos')
                        : tab.charAt(0).toUpperCase() + tab.slice(1)
                      return (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '8px 14px', border: 'none', background: 'transparent', color: activeTab === tab ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize', letterSpacing: '0.06em', borderBottom: `2px solid ${activeTab === tab ? 'var(--teal)' : 'transparent'}`, marginBottom: '-0.5px' }}>
                          {tabLabel}
                        </button>
                      )
                    })}
                  </div>

                  {/* Timeline */}
                  {activeTab === 'timeline' && (
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                      {(() => {
                        const events = [
                          { time: fmtDate(dispute.created_at), event: 'Buyer opened dispute', detail: dispute.reason, type: 'buyer' },
                        ]
                        if (dispute.staff_recommendation) {
                          events.push({ time: '—', event: 'Staff submitted recommendation', detail: `${dispute.staff_recommendation === 'buyer_wins' ? 'Refund buyer' : 'Release to seller'}${dispute.notes ? ` — ${dispute.notes}` : ''}`, type: 'system' })
                        }
                        if (dispute.outcome && dispute.outcome !== 'pending') {
                          const resolverName = dispute.resolver?.username || dispute.resolver?.full_name || 'Staff'
                          events.push({ time: fmtDate(dispute.resolved_at), event: `Decision executed by @${resolverName}`, detail: dispute.outcome === 'buyer_wins' ? 'Buyer refunded — seller bond forfeited' : 'Escrow released to seller — bond returned', type: 'system' })
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {events.map((event, i) => (
                              <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: i < events.length - 1 ? '16px' : '0', position: 'relative' }}>
                                {i < events.length - 1 && <div style={{ position: 'absolute', left: '10px', top: '22px', bottom: '0', width: '1px', background: 'var(--border)' }} />}
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', background: event.type === 'buyer' ? 'rgba(60,125,200,0.2)' : event.type === 'seller' ? 'rgba(201,168,76,0.2)' : 'var(--bg-4)', border: `1.5px solid ${event.type === 'buyer' ? 'rgba(60,125,200,0.4)' : event.type === 'seller' ? 'rgba(201,168,76,0.4)' : 'var(--border)'}` }}>
                                  {event.type === 'buyer' ? '👤' : event.type === 'seller' ? '🏪' : '⚙'}
                                </div>
                                <div style={{ flex: 1, paddingTop: '2px' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{event.event}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '3px' }}>{event.detail}</div>
                                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{event.time}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Evidence */}
                  {activeTab === 'evidence' && (
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>

                      {/* Seller evidence deadline — only show if pending and deadline not passed */}
                      {dispute.seller_evidence_deadline && (!dispute.outcome || dispute.outcome === 'pending') && !dispute.staff_recommendation && (() => {
                        const deadline = new Date(dispute.seller_evidence_deadline)
                        const now = new Date()
                        const passed = now > deadline
                        const hoursLeft = Math.max(0, Math.round((deadline - now) / 3600000))
                        const sellerResponded = dispute.seller_evidence?.length > 0 || dispute.seller_notes
                        if (sellerResponded) return null
                        return (
                          <div style={{ background: passed ? 'rgba(200,75,60,0.06)' : 'rgba(232,168,56,0.06)', border: `1px solid ${passed ? 'rgba(200,75,60,0.25)' : 'rgba(232,168,56,0.25)'}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {passed
                              ? <><strong style={{ color: 'var(--accent-red)' }}>Seller deadline passed</strong> — The seller did not submit counter-evidence. You may proceed with your recommendation.</>
                              : <><strong style={{ color: 'var(--accent-amber)' }}>Awaiting seller response</strong> — The seller has until <strong style={{ color: 'var(--text-primary)' }}>{deadline.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong> ({hoursLeft}h remaining) to submit their counter-evidence. Consider waiting before recommending.</>}
                          </div>
                        )
                      })()}

                      {/* Return dispute banner — seller contested the returned card */}
                      {dispute.orders?.status === 'return_disputed_seller' && (
                        <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <strong style={{ color: 'var(--accent-red)' }}>Return Dispute</strong> — The seller received the return but claims it is the wrong card. Review the original dispute evidence above alongside the seller's return photos below. No further shipping is required — your decision executes on-chain immediately.
                        </div>
                      )}

                      <EvidenceCard urls={dispute.buyer_evidence} label={`Buyer Evidence — ${dispute.orders?.buyer?.username || dispute.orders?.buyer?.full_name || 'Buyer'}`} color="var(--accent-blue)" />
                      {dispute.seller_notes && (
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px', fontWeight: 500 }}>
                            Seller Rebuttal — {dispute.orders?.seller?.username || dispute.orders?.seller?.full_name || 'Seller'}
                          </div>
                          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {dispute.seller_notes}
                          </div>
                        </div>
                      )}
                      <EvidenceCard urls={dispute.seller_evidence} label={`Seller Photos — ${dispute.orders?.seller?.username || dispute.orders?.seller?.full_name || 'Seller'}`} color="var(--gold)" />

                      {/* Return dispute evidence — seller's photos of what was returned */}
                      {dispute.orders?.status === 'return_disputed_seller' && (
                        <>
                          {dispute.seller_return_notes && (
                            <div style={{ marginBottom: '14px', marginTop: '8px' }}>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-red)', marginBottom: '8px', fontWeight: 500 }}>
                                Seller Return Dispute — What They Claim Was Received
                              </div>
                              <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.2)', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {dispute.seller_return_notes}
                              </div>
                            </div>
                          )}
                          <EvidenceCard urls={dispute.seller_return_evidence} label="Seller Return Photos — What Was Received" color="var(--accent-red)" />
                        </>
                      )}
                    </div>
                  )}

                  {/* Auth Photos / Pre-Ship Photos */}
                  {activeTab === 'auth-photos' && (() => {
                    const isWaived = authInspections.length > 0 && authInspections.every(i => i.decision === 'waived')
                    return (
                      <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px', background: isWaived ? 'rgba(232,168,56,0.05)' : 'var(--teal-bg)', border: `1px solid ${isWaived ? 'rgba(232,168,56,0.2)' : 'var(--teal-border)'}`, borderRadius: '8px', padding: '10px 12px' }}>
                          {isWaived
                            ? 'The buyer waived authentication on this order. These photos were submitted by the seller before shipping as evidence of the card\'s condition at time of dispatch.'
                            : 'These photos were taken by our authenticator at Chase Hollow HQ at time of inspection — before the card was shipped to the buyer. They are the most reliable evidence in the dispute.'}
                        </div>
                        {authInspections.length === 0 ? (
                          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No authentication inspection on record for this order.</div>
                        ) : authInspections.map((insp, idx) => (
                          <div key={insp.id} style={{ marginBottom: '16px' }}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: isWaived ? 'var(--accent-amber)' : 'var(--teal)', marginBottom: '8px', fontWeight: 500 }}>
                              {isWaived ? 'Pre-Ship Seller Photos' : `Inspection ${idx + 1}`} · {isWaived ? 'AUTH WAIVED' : (insp.decision?.toUpperCase() || '—')} · {fmtDate(insp.timestamp)}
                            </div>
                            {insp.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{insp.notes}</div>}
                            <EvidenceCard urls={insp.photos} label={isWaived ? 'Seller Pre-Ship Photos' : 'Auth Photos (Official)'} color={isWaived ? 'var(--accent-amber)' : 'var(--teal)'} />
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* RIGHT — Recommendation Panel */}
                <div style={{ position: 'sticky', top: '80px' }}>
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Recommendation Panel</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px' }}>
                      Staff reviews evidence and recommends a decision. The platform owner executes the final call. Neither party can appeal after execution.
                    </div>

                    {recSuccess && (
                      <div style={{ background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: 'var(--accent-green)' }}>
                        Recommendation submitted to owner.
                      </div>
                    )}

                    {disputeStatus(dispute) === 'pending_owner' && ['owner','dispute_resolver'].includes(currentUser?.role) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Staff recommends: <strong style={{ color: dispute.staff_recommendation === 'buyer_wins' ? 'var(--accent-green)' : 'var(--gold)' }}>
                            {dispute.staff_recommendation === 'buyer_wins' ? 'Refund buyer' : 'Release to seller'}
                          </strong>
                        </div>
                        {dispute.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>{dispute.notes}</div>}
                        {(() => {
                          const rec = dispute.staff_recommendation
                          const overrideDecision = rec === 'buyer_wins' ? 'seller_wins' : 'buyer_wins'
                          const primaryLabel = rec === 'buyer_wins' ? 'Execute — Buyer Wins' : 'Execute — Release to Seller'
                          const overrideLabel = rec === 'buyer_wins' ? 'Override — Release to Seller' : 'Override — Buyer Wins'
                          const primaryBg = rec === 'buyer_wins' ? 'var(--accent-green)' : 'var(--gold)'
                          return (
                            <>
                              <button onClick={() => setShowConfirmModal({ decision: rec, disputeId: dispute.id, staffRec: rec, isOverride: false, isReturnDispute: dispute.orders?.status === 'return_disputed_seller' })}
                                style={{ width: '100%', background: primaryBg, border: 'none', color: '#0A0A0B', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                                {primaryLabel}
                              </button>
                              <button onClick={() => { setOverrideReason(''); setShowConfirmModal({ decision: overrideDecision, disputeId: dispute.id, staffRec: rec, isOverride: true, isReturnDispute: dispute.orders?.status === 'return_disputed_seller' }) }}
                                style={{ width: '100%', background: 'transparent', border: '1px solid rgba(200,75,60,0.25)', color: 'var(--accent-red)', padding: '9px', fontSize: '11px', fontWeight: 500, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: 0.65 }}>
                                {overrideLabel} — requires written reason
                              </button>
                            </>
                          )
                        })()}
                      </div>
                    ) : disputeStatus(dispute) === 'open' ? (
                      !recommendation ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button onClick={() => setRecommendation('buyer_wins')} style={{ width: '100%', background: 'rgba(76,175,124,0.1)', border: '1.5px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            ✓ Recommend — Buyer Wins
                          </button>
                          <button onClick={() => setRecommendation('seller_wins')} style={{ width: '100%', background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)', color: 'var(--gold)', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            ✓ Recommend — Release to Seller
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: recommendation === 'buyer_wins' ? 'rgba(76,175,124,0.12)' : 'rgba(201,168,76,0.12)', border: `2px solid ${recommendation === 'buyer_wins' ? 'rgba(76,175,124,0.4)' : 'rgba(201,168,76,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 10px' }}>✓</div>
                            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: recommendation === 'buyer_wins' ? 'var(--accent-green)' : 'var(--gold)' }}>
                              {recommendation === 'buyer_wins' ? 'Buyer Wins' : 'Release to Seller'}
                            </div>
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 500 }}>Recommendation Notes</div>
                            <textarea value={recNotes} onChange={e => setRecNotes(e.target.value)}
                              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '80px', lineHeight: 1.6, boxSizing: 'border-box' }}
                              placeholder="Explain your recommendation for the owner…" />
                          </div>
                          {recError && <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginBottom: '8px' }}>{recError}</div>}
                          <button onClick={handleSubmitRecommendation} disabled={recSubmitting}
                            style={{ width: '100%', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: recSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px', opacity: recSubmitting ? 0.7 : 1 }}>
                            {recSubmitting ? 'Submitting…' : 'Submit to Owner for Decision'}
                          </button>
                          <button onClick={() => setRecommendation(null)} style={btn({ width: '100%', padding: '10px', borderRadius: '10px', textAlign: 'center', fontSize: '11px' })}>Change Recommendation</button>
                        </div>
                      )
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {disputeStatus(dispute) === 'pending_owner' ? 'Awaiting owner execution' : 'Dispute resolved'}
                      </div>
                    )}
                  </div>

                  {/* What happens */}
                  <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    {(() => {
                      const o = dispute.orders || {}
                      const escrow      = parseFloat(o.escrow_amount  || 0)
                      const platFee     = parseFloat(o.platform_fee   || 0)
                      const shipCost    = parseFloat(o.shipping_cost  || 0)
                      const authFee     = parseFloat(o.auth_fee       || 0)
                      const sellerNet   = escrow - platFee - shipCost - authFee
                      const isReturnDispute = o.status === 'return_disputed_seller'
                      const buyerWinsItems = isReturnDispute ? [
                        `Refund executes on-chain immediately — no return shipping needed`,
                        `${fmtUSD(escrow)} USDC → Buyer wallet immediately`,
                        `Seller bond forfeited`,
                        `Strike already applied (from original buyer wins decision)`,
                      ] : [
                        `Label C generated → buyer ships card back (5-day window)`,
                        `${fmtUSD(escrow)} USDC → Buyer wallet on confirmed return (shipping non-refundable)`,
                        `Seller bond forfeited`,
                        `Strike 1 applied to seller immediately`,
                      ]
                      const sellerWinsItems = isReturnDispute ? [
                        `Escrow releases to seller immediately — card is already at seller`,
                        `${fmtUSD(sellerNet > 0 ? sellerNet : escrow)} USDC → Seller wallet${platFee || shipCost ? ` (after ${fmtUSD(platFee)} fee + ${fmtUSD(shipCost)} shipping)` : ''}`,
                        `Seller bond returned`,
                        `Buyer strike applied — fraudulent return`,
                      ] : [
                        `${fmtUSD(sellerNet > 0 ? sellerNet : escrow)} USDC → Seller wallet${platFee || shipCost ? ` (after ${fmtUSD(platFee)} fee + ${fmtUSD(shipCost)} shipping)` : ''}`,
                        `Seller bond returned`,
                        `No strikes issued`,
                      ]
                      return (
                        <>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>If Buyer Wins</div>
                          {buyerWinsItems.map((item, i) => (
                            <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', gap: '6px' }}>
                              <span style={{ color: 'var(--accent-green)' }}>→</span>{item}
                            </div>
                          ))}
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '10px 0 10px', fontWeight: 500 }}>If Seller Wins</div>
                          {sellerWinsItems.map((item, i) => (
                            <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', gap: '6px' }}>
                              <span style={{ color: 'var(--gold)' }}>→</span>{item}
                            </div>
                          ))}
                        </>
                      )
                    })()}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* PENDING OWNER */}
          {activeSection === 'pending' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Pending <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Owner Decision</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Staff has reviewed these cases and submitted recommendations. Only the owner can execute the final decision.</div>
              {pendingQueue.length === 0 && (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>No cases pending owner decision</div>
              )}
              {pendingQueue.map((d, i) => (
                <div key={d.id} style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(60,125,200,0.3)', borderRadius: '12px', padding: '18px 20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {d.orders?.listing?.card_name || 'Unknown Card'} — #{d.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{d.reason}</div>
                      <div style={{ background: 'rgba(60,125,200,0.08)', border: '1px solid rgba(60,125,200,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--accent-blue)' }}>Staff recommendation:</strong>{' '}
                        {d.staff_recommendation === 'buyer_wins' ? 'Refund buyer' : 'Release to seller'}
                        {d.notes && ` — ${d.notes}`}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>{fmtUSD(d.orders?.escrow_amount)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['owner','dispute_resolver'].includes(currentUser?.role) && (() => {
                      const rec = d.staff_recommendation
                      const overrideDecision = rec === 'buyer_wins' ? 'seller_wins' : 'buyer_wins'
                      return (
                        <>
                          <button onClick={() => setShowConfirmModal({ decision: rec, disputeId: d.id, staffRec: rec, isOverride: false, isReturnDispute: d.orders?.status === 'return_disputed_seller' })} style={{ background: rec === 'buyer_wins' ? 'var(--accent-green)' : 'var(--gold)', border: 'none', color: '#0A0A0B', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            {rec === 'buyer_wins' ? 'Execute — Buyer Wins' : 'Execute — Release to Seller'}
                          </button>
                          <button onClick={() => { setOverrideReason(''); setShowConfirmModal({ decision: overrideDecision, disputeId: d.id, staffRec: rec, isOverride: true, isReturnDispute: d.orders?.status === 'return_disputed_seller' }) }} style={{ background: 'transparent', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)', padding: '10px 16px', fontSize: '11px', fontWeight: 500, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: 0.65 }}>Override ↗</button>
                        </>
                      )
                    })()}
                    <button onClick={() => openDetail(d)} style={btn({ padding: '10px 16px' })}>Review Full Case</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RESOLVED */}
          {activeSection === 'resolved' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>
                <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Resolved</em> Disputes
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                {resolvedDisputes.length} resolved total · {monthStats.buyer_wins} buyer wins · {monthStats.seller_wins} seller wins this month
              </div>
              {resolvedDisputes.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>No resolved disputes yet</div>
              ) : (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                        {['Case', 'Card', 'Value', 'Outcome', 'Executed By', 'Date'].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedDisputes.map((row, i) => (
                        <tr key={row.id} style={{ borderBottom: i < resolvedDisputes.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>#{row.id.slice(0, 8).toUpperCase()}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{row.orders?.listing?.card_name || '—'}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600 }}>{fmtUSD(row.orders?.escrow_amount)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {(() => {
                              const s = disputeStatus(row)
                              const sc = statusColors[s] || statusColors.resolved_buyer
                              const label = s === 'awaiting_return' ? '⏳ Awaiting Return' : s === 'resolved_buyer' ? '✓ Buyer Refunded' : '✓ Seller Paid'
                              return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500 }}>{label}</span>
                            })()}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>@{row.resolver?.username || row.resolver?.full_name || '—'}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(row.resolved_at || row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
