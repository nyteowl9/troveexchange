'use client'

import { useState, useEffect } from 'react'

export default function DisputeResolution() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('queue')
  const [activeDispute, setActiveDispute] = useState(null)
  const [activeTab, setActiveTab] = useState('timeline')
  const [recommendation, setRecommendation] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(null)

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

  const disputes = [
    {
      id: 'DSP-4821', order: '#4821', value: '$487', status: 'open', priority: 'normal',
      opened: '2h ago', deadline: '70hrs remaining',
      buyer: 'RareVault_99', seller: 'CardKing_88',
      card: 'Charizard Holo PSA 9', set: 'Pokémon · Base Set Shadowless',
      reason: 'Card does not match listing photos',
      summary: 'Buyer claims the received card has a visible crease on the bottom-left corner that was not visible in the listing photos. Buyer has provided photos of the received card. Seller disputes the claim.',
      bg: 'linear-gradient(145deg,#1a3a5c,#0d2035)', icon: '⚡',
      bondBuyer: '$2.44', bondSeller: '$14.61',
      timeline: [
        { time: 'Apr 7 · 2:14pm', event: 'Buyer opened dispute', detail: 'Reason: Card does not match listing photos', type: 'buyer' },
        { time: 'Apr 7 · 2:15pm', event: 'Dispute bond deducted', detail: '$2.44 USDC held from buyer wallet pending resolution', type: 'system' },
        { time: 'Apr 7 · 2:20pm', event: 'Seller notified', detail: 'Seller has 48hrs to respond with evidence', type: 'system' },
        { time: 'Apr 7 · 4:45pm', event: 'Seller responded', detail: 'Seller disputes claim — states card was as described and photographed', type: 'seller' },
        { time: 'Apr 7 · 5:00pm', event: 'Assigned to staff review', detail: 'Dispute assigned to Sarah K. for review', type: 'system' },
      ],
      buyerEvidence: [
        { label: 'Photo 1', desc: 'Received card — front view showing corner crease' },
        { label: 'Photo 2', desc: 'Close-up of bottom-left corner — crease visible' },
        { label: 'Photo 3', desc: 'Side-by-side comparison with listing photo' },
      ],
      sellerEvidence: [
        { label: 'Photo 1', desc: 'Original listing photo — bottom-left corner detail' },
        { label: 'Statement', desc: 'Seller states card was photographed under proper lighting and the crease was not present at time of shipping' },
      ],
      authPhotos: [
        { label: 'Auth Front', desc: 'Authentication photo — front (taken at Chase Hollow HQ)' },
        { label: 'Auth Back', desc: 'Authentication photo — back' },
        { label: 'Auth Corner', desc: 'Authentication photo — bottom-left corner at time of auth' },
      ]
    },
    {
      id: 'DSP-4810', order: '#4810', value: '$9,200', status: 'open', priority: 'high',
      opened: '8h ago', deadline: '64hrs remaining',
      buyer: 'CardVault_NYC', seller: 'PowerNine_Pro',
      card: 'Ancestral Recall BGS 9', set: 'MTG · Alpha Edition',
      reason: 'Grade label does not match listing',
      summary: 'Buyer claims the received card shows BGS 8.5 on the label, not BGS 9 as listed. Buyer has provided photos of the grade label. Seller states the card was listed correctly and disputes the claim.',
      bg: 'linear-gradient(145deg,#1a2a3c,#0d1a24)', icon: '📜',
      bondBuyer: '$46.00', bondSeller: '$276.00',
      timeline: [
        { time: 'Apr 7 · 8:12am', event: 'Buyer opened dispute', detail: 'Reason: Grade label does not match listing', type: 'buyer' },
        { time: 'Apr 7 · 8:13am', event: 'Dispute bond deducted', detail: '$46.00 USDC held from buyer wallet', type: 'system' },
        { time: 'Apr 7 · 10:30am', event: 'Seller responded', detail: 'Seller claims listing was accurate — has original purchase receipt', type: 'seller' },
        { time: 'Apr 7 · 11:00am', event: 'Escalated to senior review', detail: 'High value dispute — requires senior staff decision', type: 'system' },
      ],
      buyerEvidence: [
        { label: 'Photo 1', desc: 'Grade label close-up — shows BGS 8.5 not BGS 9' },
        { label: 'Photo 2', desc: 'Full slab front showing discrepancy' },
      ],
      sellerEvidence: [
        { label: 'Document', desc: 'Original BGS receipt showing grade of 9' },
        { label: 'Photo 1', desc: 'Seller original photo of grade label before shipping' },
      ],
      authPhotos: [
        { label: 'Auth Label', desc: 'Auth photo of grade label — taken at Chase Hollow HQ during inspection' },
      ]
    },
    {
      id: 'DSP-4799', order: '#4799', value: '$3,800', status: 'pending_owner', priority: 'normal',
      opened: '2d ago', deadline: 'Awaiting owner decision',
      buyer: 'SlabHunter_X', seller: 'RareVault_99',
      card: 'Blastoise Holo PSA 10', set: 'Pokémon · Base Set',
      reason: 'Wrong card received',
      summary: 'Buyer received a Venusaur Holo PSA 9 instead of the listed Blastoise Holo PSA 10. Clear case of wrong card shipped. Staff recommendation: Full refund to buyer, strike to seller.',
      bg: 'linear-gradient(145deg,#1a2a3a,#0d1a2a)', icon: '💧',
      bondBuyer: '$19.00', bondSeller: '$114.00',
      staffRec: 'buyer',
      staffNote: 'Clear case — wrong card shipped. Auth photos confirm Venusaur was received, not Blastoise. Recommend full refund to buyer, return bond to buyer, strike to seller.',
      timeline: [],
      buyerEvidence: [], sellerEvidence: [], authPhotos: []
    },
  ]

  const dispute = activeDispute ? disputes.find(d => d.id === activeDispute) : null

  const statusColors = {
    open: { bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)', label: 'Open' },
    pending_owner: { bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)', label: 'Pending Owner' },
    resolved_buyer: { bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', color: 'var(--accent-green)', label: 'Resolved — Buyer' },
    resolved_seller: { bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)', color: 'var(--gold)', label: 'Resolved — Seller' },
  }

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '8px 16px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  const EvidenceCard = ({ items, label, color }) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: '8px', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal-border)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--bg-4)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📎</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '11px', color, fontWeight: 500 }}>View →</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* CONFIRM MODAL */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${showConfirmModal === 'buyer' ? 'rgba(76,175,124,0.4)' : 'rgba(201,168,76,0.4)'}`, borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>
              {showConfirmModal === 'buyer' ? 'Refund Buyer' : 'Release to Seller'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {showConfirmModal === 'buyer'
                ? `Full escrow refund to ${dispute?.buyer}. Buyer bond returned. Seller receives Strike 1. This cannot be undone.`
                : `Escrow releases to ${dispute?.seller}. Seller bond returned. Buyer bond forfeited. This cannot be undone.`}
            </div>
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2 }}>
              {[
                { label: 'Dispute', val: dispute?.id },
                { label: 'Card', val: dispute?.card },
                { label: 'Value', val: dispute?.value },
                { label: 'Decision', val: showConfirmModal === 'buyer' ? 'Full refund to buyer' : 'Release to seller' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, background: showConfirmModal === 'buyer' ? 'var(--accent-green)' : 'var(--gold)', border: 'none', color: '#0A0A0B', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Confirm — Execute Decision
              </button>
              <button onClick={() => setShowConfirmModal(null)} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
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
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.3)', color: 'var(--accent-amber)', fontWeight: 500 }}>Dispute Resolution</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>Staff: <span style={{ color: 'var(--teal)' }}>Sarah K.</span></div>
          <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
        </div>
      </nav>

      <div style={{ display: 'flex', paddingTop: '56px', minHeight: '100vh' }}>

        {/* SIDEBAR */}
        <aside style={{ width: '200px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '56px', left: 0, height: 'calc(100vh - 56px)', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 'queue', icon: '⊡', label: 'Dispute Queue', badge: 2 },
            { id: 'detail', icon: '◈', label: 'Case Detail', disabled: !activeDispute },
            { id: 'pending', icon: '⏱', label: 'Pending Owner', badge: 1, badgeColor: 'var(--accent-blue)' },
            { id: 'resolved', icon: '✓', label: 'Resolved', badge: 12 },
          ].map(item => (
            <button key={item.id} onClick={() => !item.disabled && setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: item.disabled ? 'var(--text-muted)' : activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', opacity: item.disabled ? 0.4 : 1 }}>
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor || 'var(--accent-amber)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}

          <div style={{ margin: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>This Month</div>
            {[
              { label: 'Opened', val: '14' },
              { label: 'Buyer wins', val: '9', green: true },
              { label: 'Seller wins', val: '4', gold: true },
              { label: 'Pending', val: '1', amber: true },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>{s.label}</span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: s.green ? 'var(--accent-green)' : s.gold ? 'var(--gold)' : s.amber ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ marginLeft: '200px', flex: 1, padding: '24px 24px 60px', minWidth: 0 }}>

          {/* QUEUE */}
          {activeSection === 'queue' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)' }}>Dispute <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Queue</em></div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>2 open · 1 pending owner decision · Staff recommends, owner executes</div>
              </div>

              <div style={{ background: 'rgba(60,125,200,0.06)', border: '1px solid rgba(60,125,200,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ⊡ <strong style={{ color: 'var(--accent-blue)' }}>How disputes work:</strong> Staff reviews evidence from both sides and makes a recommendation. The owner (you) executes the final decision. Staff never moves money directly — only recommends. Owner approves and the smart contract executes.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {disputes.filter(d => d.status === 'open' || d.status === 'pending_owner').map((d, i) => {
                  const sc = statusColors[d.status]
                  return (
                    <div key={i} style={{ background: 'var(--bg-2)', border: `1.5px solid ${d.priority === 'high' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal-border)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = d.priority === 'high' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div style={{ width: '36px', height: '50px', borderRadius: '4px', background: d.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{d.icon}</div>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: 'var(--text-primary)' }}>{d.card}</div>
                            {d.priority === 'high' && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>High Value</span>}
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px' }}>{d.set} · {d.id} · {d.order}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}><strong style={{ color: 'var(--accent-red)' }}>Reason:</strong> {d.reason}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Buyer: <span style={{ color: 'var(--accent-blue)' }}>{d.buyer}</span> · Seller: <span style={{ color: 'var(--gold)' }}>{d.seller}</span></div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)', marginBottom: '4px' }}>{d.value}</div>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500 }}>{sc.label}</span>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>{d.deadline}</div>
                        </div>
                      </div>
                      {d.status === 'pending_owner' && d.staffRec && (
                        <div style={{ background: 'rgba(60,125,200,0.08)', border: '1px solid rgba(60,125,200,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--accent-blue)' }}>Staff recommendation:</strong> {d.staffNote}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => { setActiveDispute(d.id); setActiveSection('detail'); setActiveTab('timeline'); setRecommendation(null) }} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Review Case →</button>
                        {d.status === 'pending_owner' && (
                          <>
                            <button onClick={() => setShowConfirmModal('buyer')} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Refund Buyer</button>
                            <button onClick={() => setShowConfirmModal('seller')} style={{ background: 'transparent', border: '1.5px solid rgba(201,168,76,0.4)', color: 'var(--gold)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Release to Seller</button>
                          </>
                        )}
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
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
                  Case <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{dispute.id}</em>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: statusColors[dispute.status]?.bg, border: `1px solid ${statusColors[dispute.status]?.border}`, color: statusColors[dispute.status]?.color, fontWeight: 500 }}>{statusColors[dispute.status]?.label}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'flex-start' }}>

                {/* LEFT */}
                <div>
                  {/* Case summary */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <div style={{ width: '40px', height: '56px', borderRadius: '5px', background: dispute.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{dispute.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '2px' }}>{dispute.card}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{dispute.set} · Order {dispute.order} · Value {dispute.value}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      {[
                        { label: 'Buyer', val: dispute.buyer, color: 'var(--accent-blue)', bond: `Bond: ${dispute.bondBuyer}` },
                        { label: 'Seller', val: dispute.seller, color: 'var(--gold)', bond: `Bond: ${dispute.bondSeller}` },
                      ].map((p, i) => (
                        <div key={i} style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{p.label}</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: p.color }}>{p.val}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.bond} held in escrow</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-red)', marginBottom: '4px', fontWeight: 500 }}>BUYER CLAIM</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{dispute.reason}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{dispute.summary}</div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', borderBottom: '0.5px solid var(--border)', paddingBottom: '0' }}>
                    {['timeline', 'evidence', 'auth-photos', 'comms'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '8px 14px', border: 'none', background: 'transparent', color: activeTab === tab ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize', letterSpacing: '0.06em', borderBottom: `2px solid ${activeTab === tab ? 'var(--teal)' : 'transparent'}`, marginBottom: '-0.5px' }}>
                        {tab === 'auth-photos' ? 'Auth Photos' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Timeline */}
                  {activeTab === 'timeline' && (
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {dispute.timeline.map((event, i) => (
                          <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: i < dispute.timeline.length - 1 ? '16px' : '0', position: 'relative' }}>
                            {i < dispute.timeline.length - 1 && <div style={{ position: 'absolute', left: '10px', top: '22px', bottom: '0', width: '1px', background: 'var(--border)' }} />}
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
                    </div>
                  )}

                  {/* Evidence */}
                  {activeTab === 'evidence' && (
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                      <EvidenceCard items={dispute.buyerEvidence} label={`Buyer Evidence — ${dispute.buyer}`} color="var(--accent-blue)" />
                      <EvidenceCard items={dispute.sellerEvidence} label={`Seller Evidence — ${dispute.seller}`} color="var(--gold)" />
                    </div>
                  )}

                  {/* Auth Photos */}
                  {activeTab === 'auth-photos' && (
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '8px', padding: '10px 12px' }}>
                        These photos were taken by our authenticator at Chase Hollow HQ at time of inspection — before the card was shipped to the buyer. They are the most reliable evidence in the dispute.
                      </div>
                      <EvidenceCard items={dispute.authPhotos} label="Chase Hollow Auth Photos (Official)" color="var(--teal)" />
                    </div>
                  )}

                  {/* Comms */}
                  {activeTab === 'comms' && (
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Staff Communication</div>
                      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                        No staff communications yet on this case.
                      </div>
                      <textarea style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '80px', lineHeight: 1.6, marginBottom: '8px' }} placeholder="Add a note to the case file..." />
                      <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Add Note</button>
                    </div>
                  )}
                </div>

                {/* RIGHT — Recommendation Panel */}
                <div style={{ position: 'sticky', top: '80px' }}>
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Recommendation Panel</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px' }}>
                      Staff reviews evidence and recommends a decision. The platform owner executes the final call. Neither party can appeal after execution.
                    </div>

                    {!recommendation ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button onClick={() => setRecommendation('buyer')} style={{ width: '100%', background: 'rgba(76,175,124,0.1)', border: '1.5px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          ✓ Recommend — Refund Buyer
                        </button>
                        <button onClick={() => setRecommendation('seller')} style={{ width: '100%', background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)', color: 'var(--gold)', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          ✓ Recommend — Release to Seller
                        </button>
                        <button style={{ width: '100%', background: 'transparent', border: '1.5px solid rgba(232,168,56,0.4)', color: 'var(--accent-amber)', padding: '10px', fontSize: '12px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          ⚑ Escalate — Need More Info
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: recommendation === 'buyer' ? 'rgba(76,175,124,0.12)' : 'rgba(201,168,76,0.12)', border: `2px solid ${recommendation === 'buyer' ? 'rgba(76,175,124,0.4)' : 'rgba(201,168,76,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 10px' }}>✓</div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 300, color: recommendation === 'buyer' ? 'var(--accent-green)' : 'var(--gold)' }}>
                            Recommended: {recommendation === 'buyer' ? 'Refund Buyer' : 'Release to Seller'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting owner execution</div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 500 }}>Recommendation Notes</div>
                          <textarea style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} placeholder="Explain your recommendation for the owner..." />
                        </div>
                        <button style={{ width: '100%', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px' }}>
                          Submit to Owner for Decision
                        </button>
                        <button onClick={() => setRecommendation(null)} style={btn({ width: '100%', padding: '10px', borderRadius: '10px', textAlign: 'center', fontSize: '11px' })}>Change Recommendation</button>
                      </div>
                    )}
                  </div>

                  {/* What happens next */}
                  <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>If Buyer Wins</div>
                    {[`${dispute.value} USDC → Buyer wallet`, `${dispute.bondBuyer} buyer bond → Returned`, `${dispute.bondSeller} seller bond → Forfeited`, 'Seller receives Strike 1'].map((item, i) => (
                      <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', gap: '6px' }}>
                        <span style={{ color: 'var(--accent-green)' }}>→</span>{item}
                      </div>
                    ))}
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '10px 0 10px', fontWeight: 500 }}>If Seller Wins</div>
                    {[`${dispute.value} USDC → Seller wallet`, `${dispute.bondSeller} seller bond → Returned`, `${dispute.bondBuyer} buyer bond → Forfeited`, 'No strikes issued'].map((item, i) => (
                      <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', gap: '6px' }}>
                        <span style={{ color: 'var(--gold)' }}>→</span>{item}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* PENDING OWNER */}
          {activeSection === 'pending' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Pending <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Owner Decision</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Staff has reviewed these cases and submitted recommendations. Only you can execute the final decision.</div>
              {disputes.filter(d => d.status === 'pending_owner').map((d, i) => {
                const sc = statusColors[d.status]
                return (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(60,125,200,0.3)', borderRadius: '12px', padding: '18px 20px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <div style={{ width: '36px', height: '50px', borderRadius: '4px', background: d.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{d.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>{d.card} — {d.id}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{d.reason}</div>
                        <div style={{ background: 'rgba(60,125,200,0.08)', border: '1px solid rgba(60,125,200,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <strong style={{ color: 'var(--accent-blue)' }}>Staff recommendation:</strong> {d.staffNote}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>{d.value}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => setShowConfirmModal('buyer')} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Refund Buyer</button>
                      <button onClick={() => setShowConfirmModal('seller')} style={{ background: 'transparent', border: '1.5px solid rgba(201,168,76,0.4)', color: 'var(--gold)', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Execute — Release to Seller</button>
                      <button onClick={() => { setActiveDispute(d.id); setActiveSection('detail') }} style={btn({ padding: '10px 16px' })}>Review Full Case</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* RESOLVED */}
          {activeSection === 'resolved' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Resolved</em> Disputes</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>12 resolved this month · 9 buyer · 3 seller</div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Case', 'Card', 'Value', 'Outcome', 'Resolved'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'DSP-4790', card: 'Charizard PSA 10', val: '$36,000', outcome: 'buyer', date: 'Apr 4' },
                      { id: 'DSP-4782', card: 'Mox Pearl BGS 9', val: '$4,200', outcome: 'seller', date: 'Apr 2' },
                      { id: 'DSP-4771', card: 'Pikachu Illus PSA 8', val: '$6,100', outcome: 'buyer', date: 'Mar 30' },
                      { id: 'DSP-4760', card: 'Black Lotus BGS 8', val: '$18,000', outcome: 'buyer', date: 'Mar 28' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{row.id}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{row.card}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600 }}>{row.val}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: row.outcome === 'buyer' ? 'rgba(76,175,124,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${row.outcome === 'buyer' ? 'rgba(76,175,124,0.3)' : 'rgba(201,168,76,0.3)'}`, color: row.outcome === 'buyer' ? 'var(--accent-green)' : 'var(--gold)', fontWeight: 500 }}>
                            {row.outcome === 'buyer' ? '✓ Buyer Refunded' : '✓ Seller Paid'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}