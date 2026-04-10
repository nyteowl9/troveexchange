'use client'

import { useState, useEffect } from 'react'

export default function AuthenticatorPortal() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('queue')
  const [activeCard, setActiveCard] = useState(null)
  const [checklist, setChecklist] = useState({})
  const [decision, setDecision] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState({})

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

  const queue = [
    { id: 'AUTH-4821', order: '#4821', name: 'Charizard Holo', set: 'Pokémon · Base Set Shadowless · #4/102', grade: 'PSA 9', grader: 'PSA', cert: '12847291', seller: 'CardKing_88', buyer: 'RareVault_99', value: '$487', arrived: '2h ago', priority: 'normal', bg: 'linear-gradient(145deg,#1a3a5c,#0d2035)', icon: '⚡', raw: false },
    { id: 'AUTH-4819', order: '#4819', name: 'Mox Sapphire', set: 'MTG · Unlimited Edition · Rare', grade: 'BGS 9', grader: 'BGS', cert: '00291847', seller: 'PowerNine_Pro', buyer: 'MTGLegacy', value: '$6,800', arrived: '4h ago', priority: 'high', bg: 'linear-gradient(145deg,#1a1a3c,#0d0d24)', icon: '⬟', raw: false },
    { id: 'AUTH-4815', order: '#4815', name: 'Pikachu Illustrator', set: 'Pokémon · 1998 CoroCoro · Trophy', grade: 'Raw / Near Mint', grader: 'Raw', cert: null, seller: 'CardKing_88', buyer: 'SlabHunter_X', value: '$4,200', arrived: '6h ago', priority: 'normal', bg: 'linear-gradient(145deg,#2a1a3e,#1a0d2a)', icon: '★', raw: true },
    { id: 'AUTH-4810', order: '#4810', name: 'Ancestral Recall', set: 'MTG · Alpha Edition · Rare', grade: 'CGC 9.5', grader: 'CGC', cert: '10928374', seller: 'PowerNine_Pro', buyer: 'CardVault_NYC', value: '$9,200', arrived: '8h ago', priority: 'high', bg: 'linear-gradient(145deg,#1a2a3c,#0d1a24)', icon: '📜', raw: false },
    { id: 'AUTH-4808', order: '#4808', name: 'Mox Ruby', set: 'MTG · Unlimited Edition · Rare', grade: 'BGS 8.5', grader: 'BGS', cert: '29183746', seller: 'MTGLegacy', buyer: 'PowerNine_Fan', value: '$4,100', arrived: '10h ago', priority: 'normal', bg: 'linear-gradient(145deg,#2a1c0d,#1a0d05)', icon: '🔥', raw: false },
  ]

  // Dynamic cert verification URLs per grader
  const certUrls = {
    PSA: (cert) => `https://www.psacard.com/cert/${cert}`,
    BGS: (cert) => `https://www.beckett.com/grading/verify?cert=${cert}`,
    CGC: (cert) => `https://www.cgccomics.com/certlookup/${cert}`,
    SGC: (cert) => `https://www.sgccard.com/cert-lookup/?cert=${cert}`,
  }

  // Dynamic checklist based on card type
  const getChecklistItems = (card) => {
    if (!card) return []
    if (card.raw) {
      return [
        { id: 'match', label: 'Card matches all listing photos', sub: 'Compare front, back, and all four corners against listing photos exactly' },
        { id: 'condition', label: `Condition matches listing — "${card.grade}"`, sub: 'Verify overall condition is consistent with the listed grade description' },
        { id: 'nodamage', label: 'No undisclosed damage present', sub: 'Check for creases, scratches, staining, or markings not mentioned in listing' },
        { id: 'corners', label: 'Corner and edge wear matches listing', sub: 'Corner/edge wear must be consistent with the listed condition' },
        { id: 'surface', label: 'Surface and print quality acceptable', sub: 'No print lines, scratches, or surface issues beyond what was listed' },
        { id: 'authentic', label: 'Card appears authentic', sub: 'No obvious signs of miscut, counterfeit print, trimming, or alteration' },
        { id: 'photos', label: 'All auth photos uploaded', sub: 'All 6 photo slots completed — front, back, both sides, top and bottom edges' },
      ]
    }
    return [
      { id: 'match', label: 'Card matches all listing photos', sub: 'Compare front, back, and corners against listing photos — must be identical card' },
      { id: 'grade', label: `Grade label reads ${card.grade}`, sub: `Label must clearly show ${card.grader} grade — check against listing exactly` },
      { id: 'cert', label: `Cert #${card.cert} verified on ${card.grader} database`, sub: `Look up cert on ${card.grader} official website — confirm card name, grade, and year match` },
      { id: 'slab', label: 'Slab integrity intact', sub: 'No cracks, chips, tampering marks, or signs of re-sealing' },
      { id: 'holo', label: 'Holographic sticker present and intact', sub: `${card.grader} holographic sticker on reverse of slab is undamaged and present` },
      { id: 'corners', label: 'No shipping damage to slab', sub: 'Check all four corners and all edges of the slab for damage incurred in transit' },
      { id: 'centered', label: 'Card correctly seated inside slab', sub: 'Card has not shifted, tilted, or moved inside the slab during shipping' },
      { id: 'photos', label: 'All auth photos uploaded', sub: 'All 6 slots completed — front, back, full slab, grade label, corner L, corner R' },
    ]
  }

  const card = activeCard ? queue.find(q => q.id === activeCard) : null
  const checklistItems = getChecklistItems(card)
  const completed = Object.values(checklist).filter(Boolean).length
  const allChecked = card ? completed === checklistItems.length : false

  const toggleCheck = (id) => setChecklist(prev => ({ ...prev, [id]: !prev[id] }))

  const photos = card?.raw
    ? ['Front', 'Back', 'Side L', 'Side R', 'Top Edge', 'Bottom Edge']
    : ['Front', 'Back', 'Full Slab', 'Label', 'Corner L', 'Corner R']

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '8px 16px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* REJECT MODAL */}
      {showRejectModal && card && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(200,75,60,0.4)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Reject <em style={{ fontStyle: 'italic', color: 'var(--accent-red)' }}>Card</em></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>Rejecting triggers an automatic full refund to the buyer. The seller is notified with your reason. Cannot be undone.</div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Rejection Reason</div>
              <select style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                {card.raw ? (
                  <>
                    <option>Condition does not match listing description</option>
                    <option>Undisclosed damage — creases, scratches, or staining found</option>
                    <option>Wrong card received</option>
                    <option>Card appears altered or trimmed</option>
                    <option>Condition significantly worse than listed</option>
                  </>
                ) : (
                  <>
                    <option>Card does not match listing photos</option>
                    <option>Grade label does not match listing</option>
                    <option>Wrong card received</option>
                    <option>Slab is damaged or tampered</option>
                    <option>Cert number does not match {card.grader} database</option>
                    <option>Holographic sticker missing or damaged</option>
                    <option>Suspected counterfeit slab</option>
                  </>
                )}
              </select>
              <textarea style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} placeholder="Additional notes for the seller..." />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Confirm Rejection — Refund Buyer</button>
              <button onClick={() => setShowRejectModal(false)} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* LABEL MODAL */}
      {showLabelModal && card && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Print <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Label B</em></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>Label B ships the authenticated card from Chase Hollow to the buyer. Print, attach, and drop with FedEx.</div>
            <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2 }}>
              {[
                { label: 'FROM', val: 'Chase Hollow Auth Center · San Francisco CA 94105' },
                { label: 'TO', val: `${card.buyer} · [Address on file]` },
                { label: 'CONTENTS', val: `${card.name} ${card.grade} · 1 card` },
                { label: 'CARRIER', val: 'FedEx Priority · Signature required' },
                { label: 'ORDER', val: `${card.order} · ${card.id}` },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: '80px' }}>{r.label}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>🖨 Print Label B</button>
              <button onClick={() => setShowLabelModal(false)} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
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
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 500 }}>Auth Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>Authenticator: <span style={{ color: 'var(--teal)' }}>Sarah K.</span></div>
          <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
        </div>
      </nav>

            <style>{`
        @media (max-width: 768px) {
          .dash-aside { display: none !important; }
          .dash-main { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; padding: 16px 1rem 40px !important; }
        }
              @media (min-width: 769px) { .mobile-section-nav { display: none !important; } }
      `}</style>
<div style={{ display: 'flex', flexWrap: 'wrap', paddingTop: '56px', minHeight: '100vh' }}>

        {/* SIDEBAR */}
        <aside className="dash-aside" style={{ width: '200px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '56px', left: 0, height: 'calc(100vh - 56px)', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 'queue', icon: '⊡', label: 'Inspection Queue', badge: queue.length },
            { id: 'inspect', icon: '🔍', label: 'Current Card', disabled: !activeCard },
            { id: 'completed', icon: '✓', label: 'Completed Today', badge: 12 },
            { id: 'flagged', icon: '⚠', label: 'Flagged', badge: 1 },
          ].map(item => (
            <button key={item.id} onClick={() => !item.disabled && setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: item.disabled ? 'var(--text-muted)' : activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', opacity: item.disabled ? 0.4 : 1 }}>
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.id === 'flagged' ? 'var(--accent-red)' : 'var(--teal)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}
          <div style={{ margin: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Today's Stats</div>
            {[{ label: 'Inspected', val: '12' }, { label: 'Passed', val: '11', green: true }, { label: 'Rejected', val: '1', red: true }, { label: 'In Queue', val: String(queue.length) }].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>{s.label}</span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: s.green ? 'var(--accent-green)' : s.red ? 'var(--accent-red)' : 'var(--text-primary)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '200px', flex: 1, padding: '24px 24px 60px', minWidth: 0 }}>

          {/* QUEUE */}
          {activeSection === 'queue' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)' }}>Inspection <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Queue</em></div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{queue.length} cards awaiting · FIFO order · High value flagged</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {queue.map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: `1.5px solid ${item.priority === 'high' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flexWrap: 'wrap' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal-border)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = item.priority === 'high' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}
                  >
                    <div style={{ width: '36px', height: '50px', borderRadius: '4px', background: item.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: 'var(--text-primary)' }}>{item.name}</div>
                        {item.priority === 'high' && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>High Value</span>}
                        {item.raw && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Raw Card</span>}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.set} · {item.order}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{item.grade}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>{item.raw ? 'No cert' : `#${item.cert}`}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>{item.value}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.arrived}</div>
                    </div>
                    <button onClick={() => { setActiveCard(item.id); setActiveSection('inspect'); setChecklist({}); setDecision(null); setUploadedPhotos({}) }} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Inspect →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INSPECT */}
          {activeSection === 'inspect' && card && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveSection('queue')} style={btn({ fontSize: '11px', padding: '5px 12px' })}>← Queue</button>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)' }}>Inspecting: <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{card.name}</em></div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 500 }}>{card.id}</span>
                {card.raw && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Raw — no cert verification required</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px', alignItems: 'flex-start' }}>

                {/* LEFT */}
                <div>
                  {/* Photo comparison + upload */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontWeight: 500 }}>Photo Comparison — Listing vs Received</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ padding: '14px', borderRight: '0.5px solid var(--border)' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-blue)', marginBottom: '8px', fontWeight: 500 }}>LISTING PHOTO</div>
                        <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <div style={{ width: '60%', aspectRatio: '2.5/3.5', borderRadius: '5px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', opacity: 0.7 }}>{card.icon}</div>
                          <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(60,125,200,0.2)', border: '1px solid rgba(60,125,200,0.4)', color: 'var(--accent-blue)', fontWeight: 500 }}>Listing</div>
                        </div>
                      </div>
                      <div style={{ padding: '14px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)', marginBottom: '8px', fontWeight: 500 }}>RECEIVED CARD</div>
                        <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <div style={{ width: '60%', aspectRatio: '2.5/3.5', borderRadius: '5px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', opacity: 0.85 }}>{card.icon}</div>
                          <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(76,175,124,0.2)', border: '1px solid rgba(76,175,124,0.4)', color: 'var(--accent-green)', fontWeight: 500 }}>Received</div>
                        </div>
                      </div>
                    </div>
                    {/* Photo upload strip */}
                    <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--border)' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Upload Auth Photos</span>
                        <span style={{ color: Object.values(uploadedPhotos).filter(Boolean).length === photos.length ? 'var(--accent-green)' : 'var(--text-muted)' }}>{Object.values(uploadedPhotos).filter(Boolean).length}/{photos.length} uploaded</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {photos.map((photo, i) => (
                          <div key={i}>
                            <input type="file" id={`photo-${i}`} accept="image/*" onChange={() => setUploadedPhotos(prev => ({ ...prev, [i]: true }))} style={{ display: 'none' }} />
                            <label htmlFor={`photo-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '8px', border: `1.5px solid ${uploadedPhotos[i] ? 'var(--accent-green)' : 'var(--border)'}`, background: uploadedPhotos[i] ? 'rgba(76,175,124,0.1)' : 'var(--bg-4)', cursor: 'pointer', gap: '3px' }}>
                              <div style={{ fontSize: '16px' }}>{uploadedPhotos[i] ? '✓' : '📷'}</div>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', color: uploadedPhotos[i] ? 'var(--accent-green)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{photo}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>Click each slot to upload. Photos are stored in Supabase and attached permanently to this order record.</div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Auth Checklist — {card.raw ? 'Raw Card' : `${card.grader} Graded`}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: allChecked ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 500 }}>{completed}/{checklistItems.length}</div>
                    </div>
                    {checklistItems.map((item, i) => (
                      <div key={item.id} onClick={() => toggleCheck(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', cursor: 'pointer', borderBottom: i < checklistItems.length - 1 ? '0.5px solid var(--border)' : 'none', background: checklist[item.id] ? 'rgba(76,175,124,0.04)' : 'transparent' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${checklist[item.id] ? 'var(--accent-green)' : 'var(--border)'}`, background: checklist[item.id] ? 'var(--accent-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', color: '#fff', fontWeight: 700 }}>
                          {checklist[item.id] ? '✓' : ''}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: checklist[item.id] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>{item.sub}</div>
                        </div>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: checklist[item.id] ? 'var(--accent-green)' : 'var(--border)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT */}
                <div style={{ position: 'sticky', top: '80px' }}>
                  {/* Card info */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Card Details</div>
                    {[
                      { label: 'Card', val: card.name },
                      { label: 'Set', val: card.set },
                      { label: card.raw ? 'Condition' : 'Listed Grade', val: card.grade, gold: true },
                      !card.raw ? { label: 'Grader', val: card.grader } : null,
                      !card.raw ? { label: 'Cert #', val: card.cert, mono: true } : null,
                      { label: 'Seller', val: card.seller, teal: true },
                      { label: 'Buyer', val: card.buyer },
                      { label: 'Sale Value', val: card.value, gold: true },
                    ].filter(Boolean).map((row, i, arr) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{row.label}</span>
                        <span style={{ color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : 'var(--text-primary)', fontFamily: row.mono ? 'DM Mono, monospace' : 'inherit', fontWeight: 500 }}>{row.val}</span>
                      </div>
                    ))}

                    {/* Dynamic cert link or raw note */}
                    {!card.raw && certUrls[card.grader] ? (
                      <a href={certUrls[card.grader](card.cert)} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '7px', padding: '8px', marginTop: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
                        ↗ Verify #{card.cert} on {card.grader} Database
                      </a>
                    ) : card.raw ? (
                      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px', marginTop: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Raw card — no cert verification required
                      </div>
                    ) : null}
                  </div>

                  {/* Decision panel */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Decision Panel</div>
                    {!allChecked && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', lineHeight: 1.6 }}>
                        Complete all {checklistItems.length} checklist items. {checklistItems.length - completed} remaining.
                      </div>
                    )}
                    {!decision && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button disabled={!allChecked} onClick={() => setDecision('pass')} style={{ width: '100%', background: allChecked ? 'var(--accent-green)' : 'var(--bg-4)', border: 'none', color: allChecked ? '#fff' : 'var(--text-muted)', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: allChecked ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', opacity: allChecked ? 1 : 0.5 }}>
                          ✓ Pass — Print Label B &amp; Ship to Buyer
                        </button>
                        <button onClick={() => setShowRejectModal(true)} style={{ width: '100%', background: 'transparent', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          ✕ Reject — Refund Buyer
                        </button>
                        <button style={{ width: '100%', background: 'transparent', border: '1.5px solid rgba(232,168,56,0.4)', color: 'var(--accent-amber)', padding: '10px', fontSize: '12px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          ⚑ Flag for Senior Review
                        </button>
                      </div>
                    )}
                    {decision === 'pass' && (
                      <div>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(76,175,124,0.12)', border: '2px solid rgba(76,175,124,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}>✓</div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--accent-green)' }}>Authentication Passed</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Print Label B and ship to buyer.</div>
                        </div>
                        <button onClick={() => setShowLabelModal(true)} style={{ width: '100%', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px' }}>
                          🖨 Print Label B — Ship to Buyer
                        </button>
                        <button onClick={() => { setActiveSection('queue'); setActiveCard(null); setDecision(null); setChecklist({}); setUploadedPhotos({}) }} style={btn({ width: '100%', padding: '10px', borderRadius: '10px', textAlign: 'center' })}>← Next Card in Queue</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETED */}
          {activeSection === 'completed' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Completed <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Today</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>12 inspections · 11 passed · 1 rejected</div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Card', 'Grade', 'Value', 'Authenticator', 'Result', 'Time'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Black Lotus', grade: 'BGS 9.5', val: '$28,400', auth: 'Sarah K.', result: 'pass', time: '2h ago' },
                      { name: 'Charizard 1st Ed', grade: 'PSA 10', val: '$36,000', auth: 'Marcus T.', result: 'pass', time: '3h ago' },
                      { name: 'Mox Emerald', grade: 'Raw / NM', val: '$3,100', auth: 'Sarah K.', result: 'reject', time: '4h ago' },
                      { name: 'Pikachu Illustrator', grade: 'PSA 9', val: '$8,200', auth: 'Marcus T.', result: 'pass', time: '5h ago' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{row.name}</td>
                        <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)' }}>{row.grade}</span></td>
                        <td style={{ padding: '10px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600 }}>{row.val}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{row.auth}</td>
                        <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: row.result === 'pass' ? 'rgba(76,175,124,0.1)' : 'rgba(200,75,60,0.1)', border: `1px solid ${row.result === 'pass' ? 'rgba(76,175,124,0.3)' : 'rgba(200,75,60,0.3)'}`, color: row.result === 'pass' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>{row.result === 'pass' ? '✓ Passed' : '✕ Rejected'}</span></td>
                        <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FLAGGED */}
          {activeSection === 'flagged' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>
                <em style={{ fontStyle: 'italic', color: 'var(--accent-amber)' }}>Flagged</em> for Senior Review
              </div>
              <div style={{ background: 'rgba(232,168,56,0.06)', border: '1.5px solid rgba(232,168,56,0.3)', borderRadius: '12px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px' }}>⚑</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Mox Emerald BGS 8 — Order #4802</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>Flagged by Sarah K. · 4h ago · Awaiting senior review</div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>Grade label appears to be BGS 7.5, not BGS 8 as listed. Cert number verifies as BGS 8 on Beckett database. Possible label discrepancy or wrong card in slab. Senior review required before decision.</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '10px 18px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Override — Pass</button>
                  <button style={{ background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '10px 18px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Confirm — Reject</button>
                  <button style={btn({ padding: '10px 18px' })}>Request BGS Review</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}