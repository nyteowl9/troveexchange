'use client'

import { useState, useEffect } from 'react'

export default function AdminPanel() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('overview')
  const [showActionModal, setShowActionModal] = useState(null)

  // Tier config state
  const [tierConfig, setTierConfig] = useState(null)
  const [tierConfigEdit, setTierConfigEdit] = useState(null)
  const [tierConfigSaving, setTierConfigSaving] = useState(false)
  const [tierConfigMsg, setTierConfigMsg] = useState(null)

  // Users state
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState([])
  const [userLoading, setUserLoading] = useState(false)
  const [userRoleEdits, setUserRoleEdits] = useState({})
  const [userRoleSaving, setUserRoleSaving] = useState({})
  const [userRoleMsg, setUserRoleMsg] = useState({})

  // Orders state
  const [adminOrders, setAdminOrders] = useState([])
  const [adminOrdersTotal, setAdminOrdersTotal] = useState(0)
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false)
  const [adminOrdersSearch, setAdminOrdersSearch] = useState('')
  const [adminOrdersStatus, setAdminOrdersStatus] = useState('all')

  // Order detail modal
  const [detailOrder, setDetailOrder] = useState(null)      // { order, inspection }
  const [detailLoading, setDetailLoading] = useState(false)

  // Live dispute + strike data
  const [pendingDisputes, setPendingDisputes] = useState([])
  const [adminStrikes, setAdminStrikes]       = useState([])
  const [strikeRemoving, setStrikeRemoving]   = useState({})
  const [recentOrders, setRecentOrders]       = useState([])
  const [overviewStats, setOverviewStats]     = useState(null)

  useEffect(() => {
    if (activeSection === 'settings' && !tierConfig) loadTierConfig()
    if (activeSection === 'users') searchUsers('')
    if (activeSection === 'orders') fetchAdminOrders()
    if (activeSection === 'strikes') loadStrikes()
  }, [activeSection])

  useEffect(() => {
    // Load on mount: pending decisions + overview data
    loadPendingDisputes()
    loadOverview()
  }, [])

  async function getSession() {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  async function loadPendingDisputes() {
    try {
      const session = await getSession()
      const res = await fetch('/api/disputes/list?status=open', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPendingDisputes(data.disputes || [])
      }
    } catch {}
  }

  async function loadStrikes() {
    if (adminStrikes.length > 0) return
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/users/search?q=&limit=1', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      // Use supabase directly for strikes — admin-level read
      const { data } = await supabase
        .from('strikes')
        .select('id, strike_number, reason, action_taken, created_at, user:user_id(username), order:order_id(id)')
        .order('created_at', { ascending: false })
        .limit(50)
      setAdminStrikes(data || [])
    } catch {}
  }

  async function removeStrike(strikeId, userId) {
    setStrikeRemoving(p => ({ ...p, [strikeId]: true }))
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/users/remove-strike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: userId, strike_id: strikeId }),
      })
      if (res.ok) {
        setAdminStrikes(p => p.filter(s => s.id !== strikeId))
      }
    } catch {}
    setStrikeRemoving(p => ({ ...p, [strikeId]: false }))
  }

  async function loadOverview() {
    try {
      const session = await getSession()
      const headers = { Authorization: `Bearer ${session?.access_token}` }
      const res = await fetch(`/api/admin/orders?limit=6&offset=0`, { headers })
      if (res.ok) {
        const data = await res.json()
        setRecentOrders((data.orders || []).slice(0, 6))
        setOverviewStats({ totalOrders: data.total || 0 })
      }
    } catch {}
  }

  async function fetchAdminOrders(q = adminOrdersSearch, status = adminOrdersStatus) {
    setAdminOrdersLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      if (q)      params.set('q', q)
      if (status && status !== 'all') params.set('status', status)
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAdminOrders(data.orders || [])
        setAdminOrdersTotal(data.total || 0)
      }
    } catch {}
    setAdminOrdersLoading(false)
  }

  async function fetchOrderDetail(orderId) {
    setDetailLoading(true)
    setDetailOrder(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDetailOrder(data)
      }
    } catch {}
    setDetailLoading(false)
  }

  async function searchUsers(q) {
    setUserLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}&limit=30`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUserResults(data)
        // Initialize role edits to current values
        const edits = {}
        data.forEach(u => { edits[u.id] = u.role || '' })
        setUserRoleEdits(prev => ({ ...edits, ...prev }))
      }
    } catch {}
    setUserLoading(false)
  }

  async function saveUserRole(userId) {
    setUserRoleSaving(prev => ({ ...prev, [userId]: true }))
    setUserRoleMsg(prev => ({ ...prev, [userId]: null }))
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const role = userRoleEdits[userId] || null
      const res = await fetch('/api/admin/users/search', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: userId, role: role === '' ? null : role }),
      })
      if (res.ok) {
        setUserRoleMsg(prev => ({ ...prev, [userId]: { type: 'ok', text: 'Saved' } }))
        setUserResults(prev => prev.map(u => u.id === userId ? { ...u, role: role === '' ? null : role } : u))
      } else {
        const data = await res.json()
        setUserRoleMsg(prev => ({ ...prev, [userId]: { type: 'err', text: data.error || 'Failed' } }))
      }
    } catch {
      setUserRoleMsg(prev => ({ ...prev, [userId]: { type: 'err', text: 'Failed' } }))
    }
    setUserRoleSaving(prev => ({ ...prev, [userId]: false }))
    setTimeout(() => setUserRoleMsg(prev => ({ ...prev, [userId]: null })), 3000)
  }

  async function loadTierConfig() {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/tier-config', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTierConfig(data)
        setTierConfigEdit({ ...data })
      }
    } catch {}
  }

  async function saveTierConfig() {
    setTierConfigSaving(true)
    setTierConfigMsg(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/tier-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(tierConfigEdit),
      })
      if (res.ok) {
        const data = await res.json()
        setTierConfig(data)
        setTierConfigEdit({ ...data })
        setTierConfigMsg({ type: 'ok', text: 'Saved.' })
      } else {
        setTierConfigMsg({ type: 'err', text: 'Save failed.' })
      }
    } catch {
      setTierConfigMsg({ type: 'err', text: 'Save failed.' })
    }
    setTierConfigSaving(false)
    setTimeout(() => setTierConfigMsg(null), 3000)
  }

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

  // Pending decisions = disputes awaiting owner execution (staff_recommendation set, not yet resolved)
  const pendingDecisions = pendingDisputes
    .filter(d => d.outcome === 'pending' && d.staff_recommendation)
    .map(d => ({
      id: d.id,
      type: 'dispute',
      description: `${d.orders?.listing?.card_name || 'Unknown card'} — ${d.reason}`,
      value: d.orders?.escrow_amount ? `$${parseFloat(d.orders.escrow_amount).toLocaleString()}` : '—',
      rec: d.staff_recommendation === 'buyer_wins' ? 'buyer' : 'seller',
      staffNote: d.notes || `Recommendation: ${d.staff_recommendation === 'buyer_wins' ? 'Refund buyer' : 'Release to seller'}`,
      urgency: 'normal',
      disputeId: d.id,
    }))

  const openDisputeCount = pendingDisputes.filter(d => d.outcome === 'pending').length
  const pendingOwnerCount = pendingDecisions.length
  const metrics = [
    { label: 'Total Orders', val: overviewStats ? overviewStats.totalOrders.toLocaleString() : '—', sub: 'All-time · On-chain', color: 'var(--gold)' },
    { label: 'Open Disputes', val: openDisputeCount.toString(), sub: pendingOwnerCount > 0 ? `${pendingOwnerCount} pending owner decision` : 'None pending decision', color: openDisputeCount > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' },
    { label: 'Pending Decisions', val: pendingOwnerCount.toString(), sub: 'Require owner action', color: pendingOwnerCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)' },
    { label: 'Platform Fee', val: '3.5%', sub: '3% Chase Hollow + 0.5% creator', color: 'var(--text-muted)' },
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
    legend: { bg: 'rgba(232,168,56,0.15)', border: 'rgba(232,168,56,0.4)', color: '#E8A838', label: '👑 Legend' },
    elite:   { bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.28)', color: 'var(--gold)',        label: '⭐ Elite' },
    pro:     { bg: 'rgba(13,110,110,0.1)',  border: 'rgba(13,110,110,0.3)', color: 'var(--teal)',         label: 'Pro' },
    trusted: { bg: 'rgba(60,125,200,0.1)',  border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)', label: 'Trusted' },
    new:     { bg: 'rgba(255,255,255,0.05)', border: 'var(--border)',        color: 'var(--text-muted)',  label: 'New' },
    // legacy capitalized keys (used in static mock data)
    Elite:   { bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.28)', color: 'var(--gold)',        label: '⭐ Elite' },
    Pro:     { bg: 'rgba(13,110,110,0.1)',  border: 'rgba(13,110,110,0.3)', color: 'var(--teal)',         label: 'Pro' },
    Trusted: { bg: 'rgba(60,125,200,0.1)',  border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)', label: 'Trusted' },
    New:     { bg: 'rgba(255,255,255,0.05)', border: 'var(--border)',        color: 'var(--text-muted)',  label: 'New' },
  }

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  const fmtUSD = n => n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* ── ORDER DETAIL MODAL ── */}
      {(detailLoading || detailOrder) && (
        <div onClick={() => setDetailOrder(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '720px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setDetailOrder(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>

            {detailLoading ? (
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>
            ) : detailOrder && (() => {
              const { order, inspection } = detailOrder
              const card = order.listing || {}
              const buyer = order.buyer || {}
              const seller = order.seller || {}
              const passed = inspection?.decision === 'pass'
              const statusColors = { awaiting_shipment: 'var(--accent-amber)', in_transit: 'var(--accent-blue)', auth_review: 'var(--gold)', auth_passed: 'var(--accent-green)', inspection_window: 'var(--accent-amber)', disputed: 'var(--accent-red)', released: 'var(--text-muted)', auth_failed: 'var(--accent-red)' }
              const sc = statusColors[order.status] || 'var(--text-muted)'
              return (
                <div>
                  {/* Header */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '4px' }}>{card.card_name || '—'}</div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{'#' + order.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${sc}`, color: sc, background: `${sc}18` }}>{order.status?.replace(/_/g, ' ')}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{order.auth_tier} auth</span>
                    </div>
                  </div>

                  {/* Two-col grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Buyer',        val: buyer.username || buyer.full_name || buyer.email || '—' },
                      { label: 'Seller',       val: seller.username || seller.full_name || seller.email || '—' },
                      { label: 'Escrow',       val: fmtUSD(order.escrow_amount) },
                      { label: 'Listing Price',val: fmtUSD(card.price) },
                      { label: 'Platform Fee', val: fmtUSD(order.platform_fee) },
                      { label: 'Auth Fee',     val: fmtUSD(order.auth_fee) },
                      { label: 'Shipping',     val: fmtUSD(order.shipping_cost) },
                      { label: 'Created',      val: fmtDate(order.created_at) },
                      { label: 'Shipped',      val: fmtDate(order.shipped_at) },
                      { label: 'Delivered',    val: fmtDate(order.delivered_at) },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tracking / Labels */}
                  {(order.label_a_url || order.label_b_url) && (
                    <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Shipping Labels</div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {order.label_a_url && <a href={order.label_a_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--teal)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--teal-border)', borderRadius: '6px', background: 'var(--teal-bg)' }}>Label A ↗{order.tracking_a ? ` · ${order.tracking_a}` : ''}</a>}
                        {order.label_b_url && <a href={order.label_b_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--teal)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--teal-border)', borderRadius: '6px', background: 'var(--teal-bg)' }}>Label B ↗{order.tracking_b ? ` · ${order.tracking_b}` : ''}</a>}
                      </div>
                    </div>
                  )}

                  {/* Auth Inspection */}
                  <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '20px' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '12px' }}>Authentication <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Record</em></div>
                    {!inspection ? (
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', padding: '16px', background: 'var(--bg-3)', borderRadius: '8px' }}>No inspection record found for this order.</div>
                    ) : (
                      <div>
                        {/* Decision + meta */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', padding: '4px 14px', borderRadius: '20px', fontWeight: 600, background: passed ? 'rgba(76,175,124,0.12)' : 'rgba(200,75,60,0.12)', border: `1px solid ${passed ? 'rgba(76,175,124,0.4)' : 'rgba(200,75,60,0.4)'}`, color: passed ? 'var(--accent-green)' : 'var(--accent-red)' }}>{passed ? '✓ Passed' : '✕ Rejected'}</span>
                          {inspection.authenticator_name && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>by {inspection.authenticator_name}</span>}
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(inspection.created_at)}</span>
                        </div>

                        {/* Notes */}
                        {inspection.notes && (
                          <div style={{ background: passed ? 'rgba(76,175,124,0.06)' : 'rgba(200,75,60,0.06)', border: `1px solid ${passed ? 'rgba(76,175,124,0.2)' : 'rgba(200,75,60,0.2)'}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Authenticator Notes</div>
                            {inspection.notes}
                          </div>
                        )}

                        {/* Checklist */}
                        {inspection.checklist && Object.keys(inspection.checklist).length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Checklist</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {Object.entries(inspection.checklist).map(([key, checked]) => (
                                <span key={key} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: checked ? 'rgba(76,175,124,0.1)' : 'rgba(200,75,60,0.1)', border: `1px solid ${checked ? 'rgba(76,175,124,0.3)' : 'rgba(200,75,60,0.3)'}`, color: checked ? 'var(--accent-green)' : 'var(--accent-red)' }}>{checked ? '✓' : '✕'} {key.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Auth Photos */}
                        {inspection.photos?.length > 0 && (
                          <div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Auth Photos ({inspection.photos.length})</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {inspection.photos.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt={`Auth photo ${i + 1}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}


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
              <button style={{ flex: 1, background: showActionModal.actionColor || 'var(--teal)', border: 'none', color: '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                onClick={async () => {
                  if (showActionModal.disputeId && showActionModal.decision) {
                    try {
                      const session = await getSession()
                      const res = await fetch('/api/disputes/resolve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                        body: JSON.stringify({ dispute_id: showActionModal.disputeId, decision: showActionModal.decision }),
                      })
                      if (res.ok) { await loadPendingDisputes() }
                    } catch {}
                  }
                  setShowActionModal(null)
                }}>
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
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
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
              <option key="overview" value="overview">Overview</option>
              <option key="decisions" value="decisions">Pending Decisions</option>
              <option key="orders" value="orders">All Orders</option>
              <option key="users" value="users">Users</option>
              <option key="strikes" value="strikes">Strikes</option>
              <option key="financials" value="financials">Financials</option>
              <option key="escrow" value="escrow">Escrow Monitor</option>
              <option key="settings" value="settings">Platform Settings</option>
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
                    {recentOrders.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No orders yet</td></tr>
                    )}
                    {recentOrders.map((order, i) => {
                      const statusColorMap = { awaiting_shipment: 'var(--accent-amber)', in_transit: 'var(--accent-blue)', auth_review: 'var(--gold)', auth_passed: 'var(--accent-green)', inspection_window: 'var(--accent-amber)', disputed: 'var(--accent-red)', released: 'var(--text-muted)', refunded: 'var(--accent-red)', cancelled: 'var(--text-muted)' }
                      const sc = statusColorMap[order.status] || 'var(--text-muted)'
                      const cardName = order.listing?.card_name || '—'
                      const buyerName = order.buyer?.username || order.buyer?.full_name || '—'
                      const sellerName = order.seller?.username || order.seller?.full_name || '—'
                      return (
                        <tr key={order.id || i} onClick={() => fetchOrderDetail(order.id)} style={{ borderBottom: i < recentOrders.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{'#' + (order.id || '').slice(0, 8).toUpperCase()}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', color: 'var(--text-primary)' }}>{cardName}</td>
                          <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--accent-blue)' }}>{buyerName}</td>
                          <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--gold)' }}>{sellerName}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', fontWeight: 600, color: 'var(--gold)' }}>{fmtUSD(order.escrow_amount)}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${sc}`, color: sc, background: `${sc}18`, fontWeight: 500 }}>{(order.status || '').replace(/_/g, ' ')}</span>
                          </td>
                        </tr>
                      )
                    })}
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
                        <button onClick={() => setShowActionModal({ title: 'Execute — Refund Buyer', description: `Full escrow refund will be sent to the buyer. Seller receives Strike 1. This is irreversible.`, note: d.staffNote, action: 'Confirm — Refund Buyer', actionColor: 'var(--accent-green)', color: 'rgba(76,175,124,0.4)', disputeId: d.disputeId, decision: 'buyer_wins' })} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Refund Buyer</button>
                        <button onClick={() => setShowActionModal({ title: 'Execute — Release to Seller', description: `Escrow will be released to the seller. This is irreversible.`, note: d.staffNote, action: 'Confirm — Release to Seller', actionColor: 'var(--gold)', color: 'rgba(201,168,76,0.4)', disputeId: d.disputeId, decision: 'seller_wins' })} style={{ background: 'transparent', border: '1.5px solid rgba(201,168,76,0.4)', color: 'var(--gold)', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Release to Seller</button>
                        <a href="/dispute-resolution" style={{ textDecoration: 'none' }}><button style={btn({ padding: '10px 16px' })}>View Full Case</button></a>
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
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>{adminOrdersLoading ? 'Loading…' : `${adminOrdersTotal} total orders`}</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search by card name, buyer, seller, or order ID…"
                  value={adminOrdersSearch}
                  onChange={e => setAdminOrdersSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchAdminOrders(adminOrdersSearch, adminOrdersStatus)}
                  style={{ flex: 1, minWidth: '200px', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '9px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button onClick={() => fetchAdminOrders(adminOrdersSearch, adminOrdersStatus)} style={btn({ fontSize: '10px', padding: '6px 14px', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', color: 'var(--teal)' })}>Search</button>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'All',              val: 'all' },
                  { label: 'Awaiting Ship',    val: 'awaiting_shipment' },
                  { label: 'In Transit',       val: 'in_transit' },
                  { label: 'Auth Review',      val: 'auth_review' },
                  { label: 'Auth Passed',      val: 'auth_passed' },
                  { label: 'Inspection',       val: 'inspection_window' },
                  { label: 'Disputed',         val: 'disputed' },
                  { label: 'Released',         val: 'released' },
                ].map(f => {
                  const active = adminOrdersStatus === f.val
                  return (
                    <button key={f.val} onClick={() => { setAdminOrdersStatus(f.val); fetchAdminOrders(adminOrdersSearch, f.val) }}
                      style={btn({ fontSize: '10px', padding: '5px 10px', background: active ? 'var(--teal-bg)' : 'transparent', border: active ? '1.5px solid var(--teal-border)' : '1.5px solid var(--border)', color: active ? 'var(--teal)' : 'var(--text-muted)' })}>
                      {f.label}
                    </button>
                  )
                })}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '580px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Order ID', 'Card', 'Buyer', 'Seller', 'Value', 'Tier', 'Status', 'Date'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminOrdersLoading ? (
                      <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                    ) : adminOrders.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No orders found</td></tr>
                    ) : adminOrders.map((order, i) => {
                      const statusColors = {
                        awaiting_shipment: 'var(--accent-amber)',
                        in_transit: 'var(--accent-blue)',
                        auth_review: 'var(--gold)',
                        auth_passed: 'var(--accent-green)',
                        inspection_window: 'var(--accent-amber)',
                        disputed: 'var(--accent-red)',
                        released: 'var(--text-muted)',
                        auth_failed: 'var(--accent-red)',
                      }
                      const sc = statusColors[order.status] || 'var(--text-muted)'
                      const buyer = order.buyer?.username || order.buyer?.full_name || order.buyer?.email || '—'
                      const seller = order.seller?.username || order.seller?.full_name || order.seller?.email || '—'
                      const val = order.escrow_amount ? '$' + Number(order.escrow_amount).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
                      const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
                      const shortId = '#' + order.id.slice(0, 6).toUpperCase()
                      return (
                        <tr key={order.id} onClick={() => fetchOrderDetail(order.id)} style={{ borderBottom: i < adminOrders.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background=''}>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{shortId}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', color: 'var(--text-primary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.listing?.card_name || '—'}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-blue)' }}>{buyer}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--gold)' }}>{seller}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', fontWeight: 600, color: 'var(--gold)' }}>{val}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{order.auth_tier || '—'}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${sc}`, color: sc, background: `${sc}18`, fontWeight: 500, whiteSpace: 'nowrap' }}>{order.status?.replace(/_/g, ' ')}</span>
                          </td>
                          <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{dateStr}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeSection === 'users' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>User <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Management</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>{userResults.length} users shown · Search by email, username, or name</div>

              {/* Role legend */}
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Role Reference:</span>
                {' '}<span style={{ color: 'var(--accent-red)' }}>owner</span> → /admin + all portals
                {' · '}<span style={{ color: 'var(--accent-amber)' }}>staff</span> → /authenticator + /dispute-resolution + /customer-support
                {' · '}<span style={{ color: 'var(--accent-blue)' }}>authenticator</span> → /authenticator only
                {' · '}(blank) → regular buyer/seller
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); searchUsers(e.target.value) }}
                  placeholder="Search by email, username, or name…"
                  style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '9px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button onClick={() => searchUsers(userSearch)} style={btn({ padding: '9px 16px', fontSize: '11px' })}>
                  {userLoading ? 'Loading…' : 'Search'}
                </button>
              </div>

              {userLoading && userResults.length === 0 ? (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', padding: '20px' }}>Loading users…</div>
              ) : (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                        {['User', 'Email', 'Seller Tier', 'Sales', 'Strikes', 'Status', 'Portal Role', ''].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {userResults.map((u, i) => {
                        const tc = tierColors[u.seller_tier] || tierColors.new
                        const isActive = !u.banned && (!u.suspended_until || new Date(u.suspended_until) < new Date())
                        const roleColor = { owner: 'var(--accent-red)', staff: 'var(--accent-amber)', authenticator: 'var(--accent-blue)' }
                        const currentRole = userRoleEdits[u.id] ?? (u.role || '')
                        const dirty = currentRole !== (u.role || '')
                        const msg = userRoleMsg[u.id]
                        return (
                          <tr key={u.id} style={{ borderBottom: i < userResults.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.username || '—'}</div>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{u.full_name || ''}</div>
                            </td>
                            <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontWeight: 500 }}>{u.seller_tier || 'new'}</span>
                            </td>
                            <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{u.total_sales || 0}</td>
                            <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: (u.strike_count || 0) > 0 ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 600 }}>{u.strike_count || 0}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: isActive ? 'rgba(76,175,124,0.1)' : 'rgba(200,75,60,0.1)', border: isActive ? '1px solid rgba(76,175,124,0.3)' : '1px solid rgba(200,75,60,0.3)', color: isActive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {u.banned ? 'banned' : u.suspended_until && new Date(u.suspended_until) > new Date() ? 'suspended' : 'active'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <select
                                value={currentRole}
                                onChange={e => setUserRoleEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                                style={{ background: 'var(--bg-3)', border: `1.5px solid ${dirty ? 'rgba(201,168,76,0.5)' : 'var(--border)'}`, borderRadius: '6px', padding: '4px 8px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: currentRole ? (roleColor[currentRole] || 'var(--text-primary)') : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}
                              >
                                <option value="">— user —</option>
                                <option value="authenticator">authenticator</option>
                                <option value="staff">staff</option>
                                <option value="dispute_resolver">dispute_resolver</option>
                                <option value="owner">owner</option>
                              </select>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {dirty && (
                                  <button
                                    onClick={() => saveUserRole(u.id)}
                                    disabled={userRoleSaving[u.id]}
                                    style={{ background: 'var(--teal)', border: 'none', color: '#0A0A0B', padding: '4px 10px', fontSize: '10px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', opacity: userRoleSaving[u.id] ? 0.6 : 1 }}
                                  >
                                    {userRoleSaving[u.id] ? '…' : 'Save'}
                                  </button>
                                )}
                                {msg && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: msg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{msg.text}</span>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {!userLoading && userResults.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: '20px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>No users found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STRIKES */}
          {activeSection === 'strikes' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Strike <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Log</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>{adminStrikes.length} strikes on record</div>

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
                      {['User', 'Strike #', 'Reason', 'Date', 'Action Taken', 'Appeal', ''].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminStrikes.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No strikes on record</td></tr>
                    )}
                    {adminStrikes.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < adminStrikes.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--gold)' }}>@{s.user?.username || '—'}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: s.strike_number >= 3 ? 'var(--accent-red)' : s.strike_number === 2 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>Strike {s.strike_number}</span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px' }}>{s.reason}</td>
                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: s.strike_number >= 3 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{s.action_taken}</td>
                        <td style={{ padding: '11px 14px' }}>
                          {s.appealed ? <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-amber)' }}>Appealed{s.appeal_outcome ? ` · ${s.appeal_outcome}` : ''}</span> : s.strike_number < 3 ? <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>Eligible</span> : <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>No appeal</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <button
                            onClick={() => { if (window.confirm(`Remove this strike from @${s.user?.username}? This will recalculate their suspension status.`)) removeStrike(s.id, s.user_id) }}
                            disabled={strikeRemoving[s.id]}
                            style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(200,75,60,0.4)', background: 'rgba(200,75,60,0.08)', color: 'var(--accent-red)', cursor: 'pointer', opacity: strikeRemoving[s.id] ? 0.5 : 1 }}>
                            {strikeRemoving[s.id] ? '…' : 'Remove'}
                          </button>
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
                    { label: 'Elite (500–2,499 sales)', val: '1%', editable: true },
                    { label: 'Legend (2,500+ sales)', val: '1%', editable: true },
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

              {/* LIVE TIER THRESHOLDS — reads/writes tier_config */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Seller Tier Thresholds</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>Stored in Supabase · No redeployment needed</span>
                </div>

                {!tierConfigEdit ? (
                  <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Loading…</div>
                ) : (
                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Sales thresholds */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {[
                        { key: 'trusted_min_sales', label: 'Trusted min sales' },
                        { key: 'pro_min_sales',     label: 'Pro min sales' },
                        { key: 'elite_min_sales',   label: 'Elite min sales' },
                        { key: 'legend_min_sales',  label: 'Legend min sales' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                          <input type="number" min="1" value={tierConfigEdit[key] ?? ''}
                            onChange={e => setTierConfigEdit(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                            style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Elite/Legend gates */}
                    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Max dispute rate (%)</div>
                        <input type="number" min="0" max="100" step="0.5"
                          value={tierConfigEdit.elite_max_dispute_rate != null ? (parseFloat(tierConfigEdit.elite_max_dispute_rate) * 100).toFixed(1) : ''}
                          onChange={e => setTierConfigEdit(p => ({ ...p, elite_max_dispute_rate: parseFloat(e.target.value) / 100 || 0 }))}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Min account age (days)</div>
                        <input type="number" min="0"
                          value={tierConfigEdit.elite_min_account_age_days ?? ''}
                          onChange={e => setTierConfigEdit(p => ({ ...p, elite_min_account_age_days: parseInt(e.target.value) || 0 }))}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>No dispute loss (days)</div>
                        <input type="number" min="0"
                          value={tierConfigEdit.elite_no_dispute_loss_days ?? ''}
                          onChange={e => setTierConfigEdit(p => ({ ...p, elite_no_dispute_loss_days: parseInt(e.target.value) || 0 }))}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {/* Trust Tier unlock */}
                    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trust Tier (photo-only auth) unlocks at</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['elite', 'legend'].map(t => (
                          <button key={t} onClick={() => setTierConfigEdit(p => ({ ...p, trust_tier_unlocks_at: t }))}
                            style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '7px 20px', borderRadius: '8px', border: `1.5px solid ${tierConfigEdit.trust_tier_unlocks_at === t ? 'var(--gold)' : 'var(--border)'}`, background: tierConfigEdit.trust_tier_unlocks_at === t ? 'rgba(201,168,76,0.1)' : 'transparent', color: tierConfigEdit.trust_tier_unlocks_at === t ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: tierConfigEdit.trust_tier_unlocks_at === t ? 600 : 400, textTransform: 'capitalize' }}>
                            {t === 'elite' ? '⭐ Elite' : '👑 Legend'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bond floor */}
                    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seller Bond Floor</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.6 }}>
                        Bond = floor + (price × bond%). Floor covers worst-case return shipping exposure (Labels B + C + D ≈ $35).
                      </div>
                      <div style={{ maxWidth: '200px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Min bond floor ($)</div>
                        <input type="number" min="0" value={tierConfigEdit?.min_bond_floor_usd ?? ''}
                          onChange={e => setTierConfigEdit(p => ({ ...p, min_bond_floor_usd: parseInt(e.target.value) || 0 }))}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
                        Example at $20 floor — $400 card, new seller (4%): $20 + $16 = $36 bond
                      </div>
                    </div>

                    {/* Auth tier thresholds */}
                    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Authentication Tier Thresholds</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                        {[
                          { key: 'remote_auth_max_value',   label: 'Tier 1 max value ($)',  note: 'Cards ≤ this → remote photo auth' },
                          { key: 'physical_auth_max_value', label: 'Tier 2 max value ($)',  note: 'Cards ≤ this → physical auth' },
                          { key: 'remote_auth_fee',         label: 'Tier 1 auth fee ($)',   note: 'Buyer pays (remote)' },
                          { key: 'physical_auth_fee',       label: 'Tier 2 auth fee ($)',   note: 'Buyer pays (physical)' },
                        ].map(({ key, label, note }) => (
                          <div key={key}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '4px', opacity: 0.7 }}>{note}</div>
                            <input type="number" min="0" value={tierConfigEdit?.[key] ?? ''}
                              onChange={e => setTierConfigEdit(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.6 }}>
                        ⚠ Auth fee changes here are for checkout logic only. Also update the contract via Safe multisig to keep them in sync.
                      </div>
                    </div>

                    {/* Strike auto-clear */}
                    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Strike Auto-Clear</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.6 }}>
                        After this many clean completed sales since their last strike, the oldest strike is automatically removed. Set to 0 to disable.
                      </div>
                      <div style={{ maxWidth: '200px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Clean sales required</div>
                        <input type="number" min="0" value={tierConfigEdit?.strike_auto_clear_sales ?? ''}
                          onChange={e => setTierConfigEdit(p => ({ ...p, strike_auto_clear_sales: parseInt(e.target.value) || 0 }))}
                          style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {/* Save button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '0.5px solid var(--border)', paddingTop: '14px' }}>
                      <button onClick={saveTierConfig} disabled={tierConfigSaving}
                        style={{ background: 'var(--teal)', border: 'none', color: '#fff', padding: '9px 24px', borderRadius: '8px', fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 600, cursor: tierConfigSaving ? 'not-allowed' : 'pointer', opacity: tierConfigSaving ? 0.6 : 1 }}>
                        {tierConfigSaving ? 'Saving…' : 'Save Tier Config'}
                      </button>
                      {tierConfigMsg && (
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: tierConfigMsg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {tierConfigMsg.text}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
