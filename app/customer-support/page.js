'use client'

import { useState, useEffect, useCallback } from 'react'

const CATEGORY_LABELS = {
  order: 'Order Issue', payment: 'Payment / Escrow', shipping: 'Shipping / Tracking',
  auth: 'Authentication', dispute: 'Dispute', account: 'Account / Suspension',
  wallet: 'Wallet / USDC', other: 'Other', general: 'General',
}

const STATUS_COLORS = {
  open:      { bg: 'rgba(232,168,56,0.1)',  border: 'rgba(232,168,56,0.3)',  color: 'var(--accent-amber)', label: 'Open' },
  resolved:  { bg: 'rgba(76,175,124,0.1)',  border: 'rgba(76,175,124,0.3)',  color: 'var(--accent-green)', label: 'Resolved' },
  escalated: { bg: 'rgba(200,75,60,0.1)',   border: 'rgba(200,75,60,0.3)',   color: 'var(--accent-red)',   label: 'Escalated' },
  pending:   { bg: 'rgba(60,125,200,0.1)',  border: 'rgba(60,125,200,0.3)',  color: 'var(--accent-blue)',  label: 'Pending User' },
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function CustomerSupport() {
  const [theme, setTheme]           = useState('dark')
  const [activeSection, setActiveSection] = useState('queue')
  const [tickets, setTickets]       = useState([])
  const [activeTicket, setActiveTicket]   = useState(null) // full ticket object
  const [messages, setMessages]     = useState([])
  const [linkedUser, setLinkedUser] = useState(null)
  const [replyText, setReplyText]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [sending, setSending]       = useState(false)
  const [statusFilter, setStatusFilter] = useState('open')
  const [searchUser, setSearchUser] = useState('')
  const [userResult, setUserResult] = useState(null)
  const [searchOrder, setSearchOrder] = useState('')
  const [orderResult, setOrderResult] = useState(null)

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

  const loadTickets = useCallback(async (status = statusFilter) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customer-support/tickets?status=${status}&limit=50`)
      const data = await res.json()
      if (data.tickets) setTickets(data.tickets)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadTickets() }, [loadTickets])

  async function openTicket(id) {
    const res = await fetch(`/api/customer-support/tickets/${id}`)
    const data = await res.json()
    if (data.ticket) {
      setActiveTicket(data.ticket)
      setMessages(data.messages || [])
      setLinkedUser(data.linkedUser || null)
      setReplyText('')
      setActiveSection('detail')
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !activeTicket) return
    setSending(true)
    try {
      await fetch(`/api/customer-support/tickets/${activeTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      })
      setReplyText('')
      await openTicket(activeTicket.id)
      loadTickets()
    } finally {
      setSending(false)
    }
  }

  async function updateStatus(status) {
    if (!activeTicket) return
    await fetch(`/api/customer-support/tickets/${activeTicket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActiveTicket(t => ({ ...t, status }))
    loadTickets()
  }

  async function searchUserLookup() {
    if (!searchUser.trim()) return
    setUserResult(null)
    const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchUser.trim())}`)
    const data = await res.json()
    setUserResult(data.users?.[0] || 'not_found')
  }

  async function searchOrderLookup() {
    if (!searchOrder.trim()) return
    setOrderResult(null)
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(searchOrder.trim())}`)
    const data = await res.json()
    setOrderResult(data.order || 'not_found')
  }

  const openCount     = tickets.filter(t => t.status === 'open').length
  const escalatedCount = tickets.filter(t => t.status === 'escalated').length

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra,
  })

  const CANNED = [
    { label: 'Base Network Setup', text: 'To get USDC on Base, you have two options:\n\n1. Coinbase withdrawal: Go to Coinbase → Send/Receive → select USDC → choose "Base" as the network → send to your wallet address.\n\n2. Bridge from Ethereum: If you have USDC on Ethereum mainnet, use bridge.base.org to bridge it to Base.\n\nOnce in your wallet on Base, you\'ll be ready to shop on Chase Hollow!' },
    { label: 'MetaMask Base Network', text: 'To connect MetaMask to Base:\n\n1. Open MetaMask\n2. Click the network dropdown at the top\n3. Click "Add Network" → "Add a network manually"\n4. Enter: Network Name: Base, RPC URL: https://mainnet.base.org, Chain ID: 8453, Currency: ETH\n5. Save and switch to Base\n\nThen try connecting to Chase Hollow again.' },
    { label: 'Bond Return Timeline', text: 'Bonds are returned within 5–7 business days of transaction completion. If it\'s been longer than 7 business days, please reply with your order number and I\'ll look into it personally.' },
    { label: 'Dispute Process', text: 'Disputes are reviewed by our staff team within 72 hours. Once staff submits a recommendation, the platform owner makes the final decision. You\'ll receive a notification when the decision is made.\n\nAll decisions are final and enforced by the smart contract automatically.' },
    { label: 'Strike Appeal', text: 'Strikes can be appealed within 7 days of issuance. Please reply with:\n1. Your order number\n2. The reason you believe the strike was issued incorrectly\n3. Any evidence (shipping confirmation, photos, etc.)\n\nAppeals are reviewed by the platform owner and resolved within 48 hours.' },
  ]

  const navItems = [
    { id: 'queue',        icon: '⊡', label: 'Ticket Queue',     badge: openCount > 0 ? openCount : null },
    { id: 'detail',       icon: '◈', label: 'Active Ticket',    disabled: !activeTicket },
    { id: 'user-lookup',  icon: '👤', label: 'User Lookup' },
    { id: 'order-lookup', icon: '⇄', label: 'Order Lookup' },
    { id: 'canned',       icon: '◆', label: 'Canned Responses' },
    { id: 'escalation',   icon: '⚠', label: 'Escalation Guide' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </a>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 500 }}>Support Portal</div>
        </div>
        <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
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
          {navItems.map(item => (
            <button key={item.id} onClick={() => !item.disabled && setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: item.disabled ? 'var(--text-muted)' : activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', opacity: item.disabled ? 0.4 : 1 }}>
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: 'var(--accent-amber)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          <div style={{ margin: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Queue</div>
            {[
              { label: 'Open',      val: tickets.filter(t => t.status === 'open').length.toString() },
              { label: 'Pending',   val: tickets.filter(t => t.status === 'pending').length.toString() },
              { label: 'Escalated', val: escalatedCount.toString(), red: escalatedCount > 0 },
              { label: 'Resolved',  val: tickets.filter(t => t.status === 'resolved').length.toString(), green: true },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>{s.label}</span>
                <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: s.green ? 'var(--accent-green)' : s.red ? 'var(--accent-red)' : 'var(--text-primary)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '200px', flex: 1, padding: '24px 24px 60px', minWidth: 0 }}>

          {/* MOBILE NAV */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select value={activeSection} onChange={e => setActiveSection(e.target.value)} style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
              <option value="queue">Ticket Queue</option>
              <option value="detail">Active Ticket</option>
              <option value="user-lookup">User Lookup</option>
              <option value="order-lookup">Order Lookup</option>
              <option value="canned">Canned Responses</option>
              <option value="escalation">Escalation Guide</option>
            </select>
          </div>

          {/* QUEUE */}
          {activeSection === 'queue' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)' }}>Support <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Queue</em></div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{tickets.length} tickets · filter: {statusFilter}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['open','pending','escalated','resolved'].map(s => (
                    <button key={s} onClick={() => { setStatusFilter(s); loadTickets(s) }} style={btn({ background: statusFilter === s ? 'var(--teal-bg)' : 'transparent', border: statusFilter === s ? '1.5px solid var(--teal)' : '1.5px solid var(--border)', color: statusFilter === s ? 'var(--teal)' : 'var(--text-secondary)', textTransform: 'capitalize' })}>
                      {s}
                    </button>
                  ))}
                  <button onClick={() => loadTickets()} style={btn({ fontSize: '11px' })}>↻ Refresh</button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>No {statusFilter} tickets</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tickets.map((t, i) => {
                    const sc = STATUS_COLORS[t.status] || STATUS_COLORS.open
                    return (
                      <div key={i} onClick={() => openTicket(t.id)} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '14px', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal-border)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(60,125,200,0.15)', border: '1.5px solid rgba(60,125,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)', flexShrink: 0 }}>
                          {t.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{t.subject}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', marginBottom: '2px' }}>
                            {t.name} · {t.email} · {CATEGORY_LABELS[t.category] || t.category}
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{t.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500, display: 'block', marginBottom: '4px' }}>{sc.label}</span>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{timeAgo(t.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TICKET DETAIL */}
          {activeSection === 'detail' && activeTicket && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveSection('queue')} style={btn({ fontSize: '11px', padding: '5px 12px' })}>← Queue</button>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)', flex: 1, minWidth: '200px' }}>{activeTicket.subject}</div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: STATUS_COLORS[activeTicket.status]?.bg, border: `1px solid ${STATUS_COLORS[activeTicket.status]?.border}`, color: STATUS_COLORS[activeTicket.status]?.color, fontWeight: 500 }}>{STATUS_COLORS[activeTicket.status]?.label}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '20px', alignItems: 'flex-start' }}>

                {/* CONVERSATION */}
                <div>
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Ticket',   val: activeTicket.id.slice(0, 8).toUpperCase() },
                      { label: 'From',     val: activeTicket.name, color: 'var(--teal)' },
                      { label: 'Category', val: CATEGORY_LABELS[activeTicket.category] || activeTicket.category },
                      { label: 'Opened',   val: timeAgo(activeTicket.created_at) },
                    ].map((item, i) => (
                      <div key={i}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: item.color || 'var(--text-primary)' }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', marginBottom: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Conversation</div>
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {messages.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No messages yet</div>
                      )}
                      {messages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.from_staff ? 'flex-end' : 'flex-start' }}>
                          {!msg.from_staff && (
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(60,125,200,0.15)', border: '1.5px solid rgba(60,125,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)', flexShrink: 0 }}>
                              {activeTicket.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div style={{ maxWidth: '75%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', justifyContent: msg.from_staff ? 'flex-end' : 'flex-start' }}>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: msg.from_staff ? 'var(--teal)' : 'var(--accent-blue)', fontWeight: 500 }}>{msg.from_staff ? 'Support Team' : activeTicket.name}</span>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{timeAgo(msg.created_at)}</span>
                            </div>
                            <div style={{ background: msg.from_staff ? 'var(--teal-bg)' : 'var(--bg-3)', border: `1px solid ${msg.from_staff ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                              {msg.message}
                            </div>
                          </div>
                          {msg.from_staff && (
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--teal)', flexShrink: 0 }}>CH</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500 }}>Reply</div>
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '100px', lineHeight: 1.65, marginBottom: '10px', boxSizing: 'border-box' }} placeholder="Type your reply — will be emailed to the user..." />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={sendReply} disabled={sending || !replyText.trim()} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '9px 20px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: sending || !replyText.trim() ? 0.5 : 1 }}>{sending ? 'Sending...' : 'Send Reply'}</button>
                      <button onClick={async () => { await sendReply(); updateStatus('resolved') }} disabled={sending || !replyText.trim()} style={btn()}>Send & Resolve</button>
                      <button onClick={() => { setReplyText(''); setActiveSection('canned') }} style={btn()}>Canned Response</button>
                      <button onClick={() => updateStatus('escalated')} style={btn({ border: '1.5px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)' })}>Escalate</button>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL */}
                <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Submitter</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{activeTicket.name}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', marginBottom: '10px', wordBreak: 'break-all' }}>{activeTicket.email}</div>
                    {linkedUser && (
                      <>
                        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Linked Account</div>
                          {[
                            { label: 'Username',  val: `@${linkedUser.username || '—'}` },
                            { label: 'Role',      val: linkedUser.role },
                            { label: 'Sales',     val: linkedUser.total_sales?.toString() || '0' },
                            { label: 'Strikes',   val: linkedUser.strike_count?.toString() || '0', red: linkedUser.strike_count > 0 },
                            { label: 'Banned',    val: linkedUser.banned ? 'Yes' : 'No', red: linkedUser.banned },
                          ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '0.5px solid var(--border)' }}>
                              <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{item.label}</span>
                              <span style={{ color: item.red ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: 500 }}>{item.val}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {activeTicket.order_id && (
                      <div style={{ marginTop: '10px', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>Order: <span style={{ color: 'var(--teal)' }}>{activeTicket.order_id.slice(0, 8).toUpperCase()}</span></div>
                    )}
                  </div>

                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Ticket Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { label: 'Mark Resolved', status: 'resolved', color: 'var(--accent-green)', bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)' },
                        { label: 'Mark Open',     status: 'open',     color: 'var(--accent-amber)', bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)' },
                        { label: 'Escalate',      status: 'escalated',color: 'var(--accent-red)',   bg: 'rgba(200,75,60,0.1)',  border: 'rgba(200,75,60,0.3)' },
                      ].map((action, i) => (
                        <button key={i} onClick={() => updateStatus(action.status)} disabled={activeTicket.status === action.status} style={{ ...btn({ width: '100%', textAlign: 'left', fontSize: '11px', padding: '7px 12px', background: action.bg, border: `1px solid ${action.border}`, color: action.color, opacity: activeTicket.status === action.status ? 0.4 : 1, cursor: activeTicket.status === action.status ? 'not-allowed' : 'pointer' }) }}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USER LOOKUP */}
          {activeSection === 'user-lookup' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>User <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Lookup</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Search by username, email, or wallet address</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <input type="text" placeholder="Username, email, or 0x wallet address..." value={searchUser} onChange={e => setSearchUser(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUserLookup()} style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} />
                <button onClick={searchUserLookup} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '11px 24px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Search</button>
              </div>
              {userResult === 'not_found' && (
                <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>No user found.</div>
              )}
              {userResult && userResult !== 'not_found' && (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{userResult.full_name || userResult.username}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '16px' }}>{userResult.email} · @{userResult.username} · Role: {userResult.role}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Total Sales',   val: userResult.total_sales || 0,       color: 'var(--text-primary)' },
                      { label: 'Seller Strikes',val: userResult.strike_count || 0,       color: userResult.strike_count > 0 ? 'var(--accent-red)' : 'var(--accent-green)' },
                      { label: 'Buyer Strikes', val: userResult.buyer_strike_count || 0, color: userResult.buyer_strike_count > 0 ? 'var(--accent-red)' : 'var(--accent-green)' },
                      { label: 'Banned',        val: userResult.banned ? 'Yes' : 'No',   color: userResult.banned ? 'var(--accent-red)' : 'var(--accent-green)' },
                    ].map((stat, i) => (
                      <div key={i} style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontWeight: 500 }}>{stat.label}</div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 300, color: stat.color }}>{stat.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDER LOOKUP */}
          {activeSection === 'order-lookup' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Order <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Lookup</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Paste an order ID (UUID)</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <input type="text" placeholder="Order UUID..." value={searchOrder} onChange={e => setSearchOrder(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchOrderLookup()} style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} />
                <button onClick={searchOrderLookup} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '11px 24px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Search</button>
              </div>
              {orderResult === 'not_found' && (
                <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>Order not found.</div>
              )}
              {orderResult && orderResult !== 'not_found' && (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Order <em style={{ color: 'var(--gold)' }}>{orderResult.id?.slice(0, 8).toUpperCase()}</em>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '14px' }}>
                    {[
                      { label: 'Status',       val: orderResult.status },
                      { label: 'Escrow',        val: `$${orderResult.escrow_amount || 0} USDC` },
                      { label: 'Auth Tier',     val: orderResult.auth_tier || '—' },
                      { label: 'Tracking A',    val: orderResult.tracking_a || '—' },
                    ].map((item, i) => (
                      <div key={i} style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>{item.label}</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CANNED RESPONSES */}
          {activeSection === 'canned' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Canned <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Responses</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Click Insert to load into active ticket reply</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {CANNED.map((r, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => navigator.clipboard?.writeText(r.text)} style={btn({ fontSize: '10px', padding: '4px 10px' })}>Copy</button>
                        <button onClick={() => { setReplyText(r.text); if (activeTicket) setActiveSection('detail') }} style={btn({ fontSize: '10px', padding: '4px 10px', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Insert</button>
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap', background: 'var(--bg-3)' }}>{r.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ESCALATION GUIDE */}
          {activeSection === 'escalation' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Escalation <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Guide</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>When to escalate vs. resolve yourself</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { level: 'L1 — Resolve Yourself', color: 'var(--accent-green)', items: ['Wallet connection issues', 'How to get USDC on Base', 'Bond return questions (trigger manually if >7 days)', 'General how-to questions', 'Order status questions', 'Auth passed/failed notifications'] },
                  { level: 'L2 — Needs Admin Action', color: 'var(--accent-amber)', items: ['Strike appeals (submit to owner)', 'Account suspension requests', 'Bond manually stuck >14 days', 'Seller disputes shipping proof', 'User reports another user for fraud'] },
                  { level: 'L3 — Owner Only', color: 'var(--accent-red)', items: ['Execute dispute decisions', 'Permanent account bans', 'Any movement of treasury funds', 'Smart contract parameter changes', 'Press or legal inquiries', 'Any situation involving >$10,000 at risk'] },
                ].map((section, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: 600, color: section.color, letterSpacing: '0.08em' }}>{section.level}</div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {section.items.map((item, j) => (
                        <div key={j} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <span style={{ color: section.color, flexShrink: 0 }}>→</span>{item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
