'use client'

import { useState, useEffect } from 'react'

export default function CustomerSupport() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('queue')
  const [activeTicket, setActiveTicket] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [searchUser, setSearchUser] = useState('')
  const [searchOrder, setSearchOrder] = useState('')

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

  const tickets = [
    {
      id: 'TKT-1042', user: 'RareVault_99', type: 'buyer', status: 'open', priority: 'high',
      subject: 'Cannot connect MetaMask to Base network',
      preview: 'I keep getting an error when trying to connect my wallet. It says wrong network...',
      opened: '30m ago', lastUpdate: '30m ago', unread: true,
      messages: [
        { from: 'user', name: 'RareVault_99', time: '2:14pm', text: 'I keep getting an error when trying to connect my MetaMask wallet. It says "Wrong Network" and won\'t let me proceed to checkout. I\'ve tried refreshing but nothing works. I really want to buy this Charizard PSA 9 before it sells.' },
      ]
    },
    {
      id: 'TKT-1041', user: 'CardKing_88', type: 'seller', status: 'open', priority: 'normal',
      subject: 'Bond not returned after 7 days',
      preview: 'My sale completed 9 days ago and my bond still hasn\'t been returned to my wallet...',
      opened: '2h ago', lastUpdate: '1h ago', unread: true,
      messages: [
        { from: 'user', name: 'CardKing_88', time: '12:14pm', text: 'My sale of the Ancestral Recall BGS 9 completed 9 days ago and my bond still hasn\'t been returned. It should come back within 5-7 days but nothing yet. Order #4802.' },
        { from: 'staff', name: 'Support Team', time: '1:20pm', text: 'Hi CardKing! Thanks for reaching out. I\'ve looked into order #4802 and can see the bond release was delayed due to a system queue backup. I\'ve manually triggered the release and you should see the funds within 24 hours. Apologies for the inconvenience!' },
        { from: 'user', name: 'CardKing_88', time: '1:45pm', text: 'Thanks! Still not seeing it though.' },
      ]
    },
    {
      id: 'TKT-1040', user: 'NewCollector22', type: 'buyer', status: 'open', priority: 'normal',
      subject: 'How do I get USDC on Base?',
      preview: 'I\'m new to crypto and I want to buy a card. How do I get USDC on Base network?',
      opened: '3h ago', lastUpdate: '3h ago', unread: false,
      messages: [
        { from: 'user', name: 'NewCollector22', time: '11:02am', text: 'Hi! I\'m new to crypto. I want to buy a One Piece card but it says I need USDC on Base. I have some regular USDC on Coinbase. How do I get it to Base?' },
      ]
    },
    {
      id: 'TKT-1039', user: 'SlabHunter_X', type: 'buyer', status: 'resolved', priority: 'normal',
      subject: 'Dispute outcome question',
      preview: 'Can you explain why my dispute was rejected? The card clearly had damage...',
      opened: '1d ago', lastUpdate: '4h ago', unread: false,
      messages: []
    },
    {
      id: 'TKT-1038', user: 'MTGLegacy', type: 'seller', status: 'escalated', priority: 'high',
      subject: 'Account suspension — incorrect strike applied',
      preview: 'I received a strike for not shipping but I have proof the label was printed...',
      opened: '2d ago', lastUpdate: '6h ago', unread: false,
      messages: []
    },
  ]

  const cannedResponses = [
    { label: 'Base Network Setup', text: 'To get USDC on Base, you have two options:\n\n1. Coinbase withdrawal: Go to Coinbase → Send/Receive → select USDC → choose "Base" as the network → send to your wallet address.\n\n2. Bridge from Ethereum: If you have USDC on Ethereum mainnet, use bridge.base.org to bridge it to Base.\n\nOnce in your wallet on Base, you\'ll be ready to shop on Chase Hollow!' },
    { label: 'MetaMask Base Network', text: 'To connect MetaMask to Base:\n\n1. Open MetaMask\n2. Click the network dropdown at the top\n3. Click "Add Network" → "Add a network manually"\n4. Enter: Network Name: Base, RPC URL: https://mainnet.base.org, Chain ID: 8453, Currency: ETH\n5. Save and switch to Base\n\nThen try connecting to Chase Hollow again.' },
    { label: 'Bond Return Timeline', text: 'Bonds are returned within 5–7 business days of transaction completion. If it\'s been longer than 7 business days, please reply with your order number and I\'ll look into it personally and manually trigger the release if needed.' },
    { label: 'Dispute Process', text: 'Disputes are reviewed by our staff team within 72 hours. Once staff submits a recommendation, the platform owner makes the final decision. You\'ll receive a notification when the decision is made.\n\nAll decisions are final and enforced by the smart contract automatically.' },
    { label: 'Strike Appeal', text: 'Strikes can be appealed within 7 days of issuance. Please reply with:\n1. Your order number\n2. The reason you believe the strike was issued incorrectly\n3. Any evidence (shipping confirmation, photos, etc.)\n\nAppeals are reviewed by the platform owner and resolved within 48 hours.' },
    { label: 'Auto-Refund Confirmation', text: 'Your auto-refund has been triggered. The full USDC amount will return to your wallet within 1-3 hours depending on Base network congestion. You can verify the transaction on Basescan at basescan.org.' },
  ]

  const ticket = activeTicket ? tickets.find(t => t.id === activeTicket) : null

  const statusColors = {
    open: { bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)', label: 'Open' },
    resolved: { bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', color: 'var(--accent-green)', label: 'Resolved' },
    escalated: { bg: 'rgba(200,75,60,0.1)', border: 'rgba(200,75,60,0.3)', color: 'var(--accent-red)', label: 'Escalated' },
    pending: { bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)', label: 'Pending User' },
  }

  const priorityColors = {
    high: { color: 'var(--accent-red)', label: 'High' },
    normal: { color: 'var(--text-muted)', label: 'Normal' },
  }

  const navItems = [
    { id: 'queue', icon: '⊡', label: 'Ticket Queue', badge: 3 },
    { id: 'detail', icon: '◈', label: 'Active Ticket', disabled: !activeTicket },
    { id: 'user-lookup', icon: '👤', label: 'User Lookup' },
    { id: 'order-lookup', icon: '⇄', label: 'Order Lookup' },
    { id: 'canned', icon: '◆', label: 'Canned Responses' },
    { id: 'escalation', icon: '⚠', label: 'Escalation Guide' },
  ]

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            CHASE HOLLOW
          </a>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 500 }}>Support Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>Agent: <span style={{ color: 'var(--teal)' }}>Marcus T.</span></div>
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
          {navItems.map(item => (
            <button key={item.id} onClick={() => !item.disabled && setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: item.disabled ? 'var(--text-muted)' : activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', opacity: item.disabled ? 0.4 : 1 }}>
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: 'var(--accent-amber)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          <div style={{ margin: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Today</div>
            {[
              { label: 'Open', val: '3' },
              { label: 'Resolved', val: '8', green: true },
              { label: 'Escalated', val: '1', red: true },
              { label: 'Avg response', val: '12m' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>{s.label}</span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: s.green ? 'var(--accent-green)' : s.red ? 'var(--accent-red)' : 'var(--text-primary)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '200px', flex: 1, padding: '24px 24px 60px', minWidth: 0 }}>
          {/* MOBILE NAV DROPDOWN */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select
              value={activeSection}
              onChange={e => setActiveSection(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
            >
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
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)' }}>Support <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Queue</em></div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>3 open · 1 escalated · 8 resolved today</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" placeholder="Search tickets..." style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none', width: '200px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tickets.map((t, i) => {
                  const sc = statusColors[t.status]
                  const pc = priorityColors[t.priority]
                  return (
                    <div key={i} onClick={() => { setActiveTicket(t.id); setActiveSection('detail'); setReplyText('') }} style={{ background: 'var(--bg-2)', border: `1.5px solid ${t.unread ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '12px', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '14px', transition: 'all 0.15s', borderLeft: t.unread ? '3px solid var(--teal)' : '1.5px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal-border)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = t.unread ? 'var(--teal-border)' : 'var(--border)'}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.type === 'buyer' ? 'rgba(60,125,200,0.15)' : 'rgba(201,168,76,0.15)', border: `1.5px solid ${t.type === 'buyer' ? 'rgba(60,125,200,0.3)' : 'rgba(201,168,76,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', fontWeight: 600, color: t.type === 'buyer' ? 'var(--accent-blue)' : 'var(--gold)', flexShrink: 0 }}>
                        {t.user[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: t.unread ? 600 : 500, color: 'var(--text-primary)' }}>{t.subject}</div>
                          {t.priority === 'high' && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', color: pc.color, fontWeight: 500 }}>High</span>}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', marginBottom: '4px' }}>{t.user} · {t.type === 'buyer' ? 'Buyer' : 'Seller'} · {t.id}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.preview}</div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500, display: 'block', marginBottom: '4px' }}>{sc.label}</span>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{t.opened}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TICKET DETAIL */}
          {activeSection === 'detail' && ticket && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveSection('queue')} style={btn({ fontSize: '11px', padding: '5px 12px' })}>← Queue</button>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)', flex: 1, minWidth: '200px' }}>{ticket.subject}</div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: statusColors[ticket.status]?.bg, border: `1px solid ${statusColors[ticket.status]?.border}`, color: statusColors[ticket.status]?.color, fontWeight: 500 }}>{statusColors[ticket.status]?.label}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '20px', alignItems: 'flex-start' }}>

                {/* CONVERSATION */}
                <div>
                  {/* Ticket info bar */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Ticket', val: ticket.id },
                      { label: 'User', val: ticket.user, color: 'var(--teal)' },
                      { label: 'Type', val: ticket.type === 'buyer' ? 'Buyer' : 'Seller', color: ticket.type === 'buyer' ? 'var(--accent-blue)' : 'var(--gold)' },
                      { label: 'Opened', val: ticket.opened },
                    ].map((item, i) => (
                      <div key={i}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: item.color || 'var(--text-primary)' }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Messages */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', marginBottom: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Conversation</div>
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {ticket.messages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.from === 'staff' ? 'flex-end' : 'flex-start' }}>
                          {msg.from === 'user' && (
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(60,125,200,0.15)', border: '1.5px solid rgba(60,125,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)', flexShrink: 0 }}>{msg.name[0]}</div>
                          )}
                          <div style={{ maxWidth: '75%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', justifyContent: msg.from === 'staff' ? 'flex-end' : 'flex-start' }}>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: msg.from === 'staff' ? 'var(--teal)' : 'var(--accent-blue)', fontWeight: 500 }}>{msg.name}</span>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{msg.time}</span>
                            </div>
                            <div style={{ background: msg.from === 'staff' ? 'var(--teal-bg)' : 'var(--bg-3)', border: `1px solid ${msg.from === 'staff' ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                              {msg.text}
                            </div>
                          </div>
                          {msg.from === 'staff' && (
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '12px', fontWeight: 600, color: 'var(--teal)', flexShrink: 0 }}>MT</div>
                          )}
                        </div>
                      ))}
                      {ticket.messages.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No messages yet</div>
                      )}
                    </div>
                  </div>

                  {/* Reply box */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500 }}>Reply</div>
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '100px', lineHeight: 1.65, marginBottom: '10px' }} placeholder="Type your reply..." />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '9px 20px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Send Reply</button>
                      <button style={btn()}>Send & Resolve</button>
                      <button onClick={() => setActiveSection('canned')} style={btn()}>Insert Canned Response</button>
                      <button style={btn({ border: '1.5px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)' })}>Escalate</button>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL */}
                <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {/* User info */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>User Info</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: ticket.type === 'buyer' ? 'rgba(60,125,200,0.15)' : 'rgba(201,168,76,0.15)', border: `1.5px solid ${ticket.type === 'buyer' ? 'rgba(60,125,200,0.3)' : 'rgba(201,168,76,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 600, color: ticket.type === 'buyer' ? 'var(--accent-blue)' : 'var(--gold)' }}>
                        {ticket.user[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.user}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)' }}>{ticket.type === 'buyer' ? 'Buyer Account' : 'Seller Account'}</div>
                      </div>
                    </div>
                    {[
                      { label: 'Member since', val: 'Jan 2024' },
                      { label: 'Total purchases', val: '38' },
                      { label: 'Rep score', val: '4.92 ★', gold: true },
                      { label: 'Open disputes', val: '1' },
                      { label: 'Strikes', val: '0', green: true },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: i < 4 ? '0.5px solid var(--border)' : 'none' }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{item.label}</span>
                        <span style={{ color: item.gold ? 'var(--gold)' : item.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 500 }}>{item.val}</span>
                      </div>
                    ))}
                    <button onClick={() => setActiveSection('user-lookup')} style={btn({ width: '100%', textAlign: 'center', marginTop: '10px', fontSize: '11px' })}>Full User Profile →</button>
                  </div>

                  {/* Quick actions */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { label: 'View Order Details', color: 'var(--text-secondary)' },
                        { label: 'Trigger Bond Return', color: 'var(--accent-green)' },
                        { label: 'Issue Refund', color: 'var(--accent-amber)' },
                        { label: 'Warn User', color: 'var(--accent-amber)' },
                        { label: 'Apply Strike', color: 'var(--accent-red)' },
                        { label: 'Suspend Account', color: 'var(--accent-red)' },
                      ].map((action, i) => (
                        <button key={i} style={{ ...btn({ width: '100%', textAlign: 'left', fontSize: '11px', padding: '7px 12px', color: action.color, border: `1px solid ${action.color === 'var(--text-secondary)' ? 'var(--border)' : action.color.replace(')', ',0.3)')}` }) }}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ticket actions */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Ticket Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button style={btn({ width: '100%', textAlign: 'left', fontSize: '11px', padding: '7px 12px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)' })}>Mark as Resolved</button>
                      <button style={btn({ width: '100%', textAlign: 'left', fontSize: '11px', padding: '7px 12px' })}>Reassign Ticket</button>
                      <button style={btn({ width: '100%', textAlign: 'left', fontSize: '11px', padding: '7px 12px', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)' })}>Escalate to Owner</button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* USER LOOKUP */}
          {activeSection === 'user-lookup' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>User <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Lookup</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Search by username, email, or wallet address</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <input type="text" placeholder="Username, email, or 0x wallet address..." value={searchUser} onChange={e => setSearchUser(e.target.value)} style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} />
                <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '11px 24px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Search</button>
              </div>
              {/* Mock result */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(60,125,200,0.15)', border: '2px solid rgba(60,125,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: 'var(--accent-blue)', flexShrink: 0 }}>R</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>RareVault_99</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>pdwatermelon@gmail.com · 0x742d...f44e · Buyer · Joined Jan 2024</div>
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 500 }}>Trusted Buyer</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: 'Total Purchases', val: '38', color: 'var(--text-primary)' },
                    { label: 'Rep Score', val: '4.92', color: 'var(--gold)' },
                    { label: 'Open Disputes', val: '1', color: 'var(--accent-amber)' },
                    { label: 'Strikes', val: '0', color: 'var(--accent-green)' },
                  ].map((stat, i) => (
                    <div key={i} style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontWeight: 500 }}>{stat.label}</div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', fontWeight: 300, color: stat.color }}>{stat.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['View Full History', 'Open Tickets (1)', 'Send Message', 'Issue Warning', 'Suspend Account'].map((action, i) => (
                    <button key={i} style={btn({ fontSize: '11px', padding: '6px 12px', color: i >= 3 ? 'var(--accent-red)' : 'var(--text-secondary)', border: i >= 3 ? '1px solid rgba(200,75,60,0.3)' : '1.5px solid var(--border)' })}>{action}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ORDER LOOKUP */}
          {activeSection === 'order-lookup' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Order <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Lookup</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Search by order number, transaction hash, or card name</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <input type="text" placeholder="Order #, tx hash 0x..., or card name..." value={searchOrder} onChange={e => setSearchOrder(e.target.value)} style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} />
                <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '11px 24px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Search</button>
              </div>
              {/* Mock result */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '2px' }}>Order <em style={{ color: 'var(--gold)' }}>#4821</em> — Charizard Holo PSA 9</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>Pokémon · Base Set Shadowless · AUTH-4821</div>
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.3)', color: 'var(--accent-amber)', fontWeight: 500 }}>Auto-Release Pending</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: 'Buyer', val: 'RareVault_99', color: 'var(--accent-blue)' },
                    { label: 'Seller', val: 'CardKing_88', color: 'var(--gold)' },
                    { label: 'Escrow Amount', val: '$560.71 USDC', color: 'var(--gold)' },
                    { label: 'Auto-Release', val: 'Apr 8 12:00pm', color: 'var(--accent-amber)' },
                    { label: 'Auth Status', val: '✓ Passed — Apr 6', color: 'var(--accent-green)' },
                    { label: 'Delivery', val: '✓ FedEx Confirmed Apr 5', color: 'var(--accent-green)' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px', fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: item.color }}>{item.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px', wordBreak: 'break-all', lineHeight: 1.5 }}>
                  Tx: 0x8f2a91C4b3D2e5F1a0B7c6D3e8F2a91C4b3D2e5F1a0B7c6D3 · <a href="#" style={{ color: 'var(--teal)', textDecoration: 'none' }}>View on Basescan →</a>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['View Full Timeline', 'Auth Photos', 'Force Release', 'Pause Release', 'Open Dispute'].map((action, i) => (
                    <button key={i} style={btn({ fontSize: '11px', padding: '6px 12px', color: i >= 2 ? 'var(--accent-amber)' : 'var(--text-secondary)', border: i >= 2 ? '1px solid rgba(232,168,56,0.3)' : '1.5px solid var(--border)' })}>{action}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CANNED RESPONSES */}
          {activeSection === 'canned' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Canned <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Responses</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Click to copy to clipboard or insert into active ticket</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cannedResponses.map((r, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => navigator.clipboard?.writeText(r.text)} style={btn({ fontSize: '10px', padding: '4px 10px' })}>Copy</button>
                        <button onClick={() => { setReplyText(r.text); setActiveSection('detail') }} style={btn({ fontSize: '10px', padding: '4px 10px', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Insert</button>
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
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Escalation <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Guide</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>When to escalate vs. resolve yourself</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    level: 'L1 — Resolve Yourself', color: 'var(--accent-green)',
                    items: ['Wallet connection issues', 'How to get USDC on Base', 'Bond return questions (trigger manually if >7 days)', 'General how-to questions', 'Order status questions', 'Auth passed/failed notifications']
                  },
                  {
                    level: 'L2 — Needs Admin Action', color: 'var(--accent-amber)',
                    items: ['Strike appeals (submit to owner)', 'Account suspension requests', 'Bond manually stuck >14 days', 'Seller disputes shipping proof', 'User reports another user for fraud']
                  },
                  {
                    level: 'L3 — Owner Only', color: 'var(--accent-red)',
                    items: ['Execute dispute decisions', 'Permanent account bans', 'Any movement of treasury funds', 'Smart contract parameter changes', 'Press or legal inquiries', 'Any situation involving >$10,000 at risk']
                  },
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