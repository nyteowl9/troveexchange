'use client'

import { useState, useEffect, useCallback } from 'react'

// Maps a real order row (with joined listing/seller/buyer) to the queue item shape
function orderToQueueItem(order) {
  const listing = order.listing || {}
  const isRaw = !listing.grader || listing.grader.toLowerCase() === 'raw'
  const val = Number(order.escrow_amount || listing.price || 0)
  const timeAgo = order.shipped_at
    ? (() => {
        const diff = Date.now() - new Date(order.shipped_at).getTime()
        const h = Math.floor(diff / 3600000)
        if (h < 1) return '<1h ago'
        if (h < 24) return `${h}h ago`
        return `${Math.floor(h / 24)}d ago`
      })()
    : 'Unknown'
  return {
    id:       order.id,
    orderId:  order.id,
    order:    '#' + order.id.slice(0, 6).toUpperCase(),
    name:     listing.card_name || 'Unknown Card',
    set:      [listing.game, listing.set].filter(Boolean).join(' · '),
    grade:    listing.grade || 'Raw',
    grader:   listing.grader || '',
    cert:     listing.cert_number || null,
    seller:   order.seller?.username || order.seller?.full_name || 'Seller',
    buyer:    order.buyer?.username  || order.buyer?.full_name  || 'Buyer',
    value:    '$' + val.toLocaleString('en-US', { maximumFractionDigits: 0 }),
    arrived:  timeAgo,
    priority: val >= 1000 ? 'high' : 'normal',
    bg:       'linear-gradient(145deg,#1a3a5c,#0d2035)',
    icon:     '🃏',
    raw:      isRaw,
    auth_tier: order.auth_tier,
    photos:   listing.photos || [],
    sellerAuthPhotos: order.sellerAuthPhotos || [],
    status:   order.status,
    tracking_c:         order.tracking_c || null,
    label_c_url:        order.label_c_url || null,
    return_deadline_at: order.return_deadline_at || null,
    authInspection:     order.authInspection || null,
    dispute:            order.dispute || null,
  }
}

export default function AuthenticatorPortal() {
  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('queue')
  const [activeCard, setActiveCard] = useState(null)
  const [checklist, setChecklist] = useState({})
  const [decision, setDecision] = useState(null)
  const [decidedCard, setDecidedCard] = useState(null) // snapshot of card at decision time
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelType, setLabelType] = useState('B')
  const [showWrongCardModal, setShowWrongCardModal] = useState(false)
  const [wrongCardNotes, setWrongCardNotes] = useState('')
  const [wrongCardSubmitting, setWrongCardSubmitting] = useState(false)
  const [wrongCardError, setWrongCardError] = useState(null)
  const [labelDSubmitting, setLabelDSubmitting] = useState(false)
  const [labelDError, setLabelDError] = useState(null)
  const [activeReturn, setActiveReturn] = useState(null)
  const [uploadedPhotos, setUploadedPhotos] = useState({})
  const [queue, setQueue] = useState([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [completed, setCompleted] = useState([])
  const [completedLoading, setCompletedLoading] = useState(true)
  const [listingPhotoIndex, setListingPhotoIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [rejectReason, setRejectReason] = useState('Card does not match listing photos')
  const [rejectNotes, setRejectNotes] = useState('')
  const [labelUrl, setLabelUrl] = useState(null)
  const [receivedPhotoIdx, setReceivedPhotoIdx] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const res = await fetch('/api/auth-inspection/queue')
      const json = await res.json()
      if (!res.ok) { console.error('[fetchQueue]', json.error); setQueue([]); return }
      setQueue((json.orders || []).map(o => orderToQueueItem(o)))
    } catch (err) {
      console.error('[fetchQueue]', err)
      setQueue([])
    } finally {
      setQueueLoading(false)
    }
  }, [])

  const fetchCompleted = useCallback(async () => {
    setCompletedLoading(true)
    try {
      const res = await fetch('/api/auth-inspection/completed')
      const json = await res.json()
      if (!res.ok) { console.error('[fetchCompleted]', json.error); setCompleted([]); return }
      setCompleted(json.inspections || [])
    } catch (err) {
      console.error('[fetchCompleted] unexpected:', err)
      setCompleted([])
    }
    setCompletedLoading(false)
  }, [])

  useEffect(() => { fetchQueue(); fetchCompleted() }, [fetchQueue, fetchCompleted])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  // ── Action handlers ──────────────────────────────────────────
  const handlePass = async () => {
    if (!card || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/auth-inspection/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: card.id, decision: 'pass', checklist, photos: Object.values(uploadedPhotos).filter(u => u?.startsWith('http')) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')
      setDecidedCard({ ...card }) // snapshot before queue refresh removes it
      setDecision('pass')
      fetchQueue()
      fetchCompleted()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!card || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const notes = [rejectReason, rejectNotes].filter(Boolean).join(': ')
      const res = await fetch('/api/auth-inspection/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: card.id, decision: 'fail', checklist, notes, photos: Object.values(uploadedPhotos).filter(u => u?.startsWith('http')) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')
      setDecidedCard({ ...card })
      setShowRejectModal(false)
      setRejectNotes('')
      setDecision('fail')
      fetchQueue()
      fetchCompleted()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintLabelB = async () => {
    if (!card || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/shipping/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: card.id, label: 'B' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Label generation failed')
      setLabelUrl(data.label_url || data.labelUrl)
      setLabelType('B')
      setShowLabelModal(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

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
      { id: 'cert', label: `Cert ${card.cert ? '#' + card.cert : '(no cert listed)'} verified on ${card.grader || 'grader'} database`, sub: `Look up cert on ${card.grader || 'grader'} official website — confirm card name, grade, and year match` },
      { id: 'slab', label: 'Slab integrity intact', sub: 'No cracks, chips, tampering marks, or signs of re-sealing' },
      { id: 'holo', label: 'Holographic sticker present and intact', sub: `${card.grader} holographic sticker on reverse of slab is undamaged and present` },
      { id: 'corners', label: 'No shipping damage to slab', sub: 'Check all four corners and all edges of the slab for damage incurred in transit' },
      { id: 'centered', label: 'Card correctly seated inside slab', sub: 'Card has not shifted, tilted, or moved inside the slab during shipping' },
      { id: 'photos', label: 'All auth photos uploaded', sub: 'All 6 slots completed — front, back, full slab, grade label, corner L, corner R' },
    ]
  }

  const card = activeCard ? queue.find(q => q.id === activeCard) : null
  const checklistItems = getChecklistItems(card)
  const checkedCount = Object.values(checklist).filter(Boolean).length
  const allChecked = card ? checkedCount === checklistItems.length : false

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
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Reject <em style={{ fontStyle: 'italic', color: 'var(--accent-red)' }}>Card</em></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>Rejecting triggers an automatic full refund to the buyer. The seller is notified with your reason. Cannot be undone.</div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Rejection Reason</div>
              <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                <option>Card does not match listing photos</option>
                <option>Grade label does not match listed grade</option>
                <option>Cert number verification failed</option>
                <option>Slab integrity compromised</option>
                <option>Holographic sticker missing or damaged</option>
                <option>Shipping damage occurred</option>
                <option>Other (see notes)</option>
              </select>
              <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} placeholder="Additional notes for the seller..." />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleReject} disabled={submitting} style={{ flex: 1, background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: submitting ? 0.6 : 1 }}>{submitting ? 'Submitting…' : 'Confirm Rejection — Refund Buyer'}</button>
              <button onClick={() => setShowRejectModal(false)} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* LABEL MODAL */}
      {showLabelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Print <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Shipping Label {labelType}</em></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
              {labelType === 'D'
                ? 'Label D ships the verified return card to the seller. Print, attach, and drop with FedEx. On-chain refund executes automatically on delivery.'
                : 'Label B ships the authenticated card to the buyer. Print, attach, and drop with FedEx.'}
            </div>
            {(() => {
              const labelCard = labelType === 'D'
                ? queue.find(q => q.id === activeReturn)
                : card
              if (!labelCard) return null
              return (
                <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2 }}>
                  {[
                    { label: 'FROM', val: 'Chase Hollow Auth Center · San Francisco CA 94105' },
                    { label: 'TO',   val: labelType === 'D' ? `${labelCard.seller} · [Address on file]` : `${labelCard.buyer} · [Address on file]` },
                    { label: 'CONTENTS', val: `${labelCard.name} ${labelCard.grade} · 1 card` },
                    { label: 'CARRIER',  val: 'FedEx Priority · Signature required' },
                    { label: 'ORDER',    val: `${labelCard.order} · ${labelCard.id}` },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: '80px' }}>{r.label}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
            <div style={{ display: 'flex', gap: '10px' }}>
              {labelUrl
                ? <a href={labelUrl} target="_blank" rel="noreferrer" style={{ flex: 1, background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖨 Open PDF Label</a>
                : <button disabled style={{ flex: 1, background: 'var(--bg-4)', border: 'none', color: 'var(--text-muted)', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'not-allowed', fontFamily: 'DM Sans, sans-serif' }}>Loading…</button>
              }
              <button onClick={() => { setShowLabelModal(false); setLabelType('B') }} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Close</button>
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
          .mobile-section-nav { display: block !important; }
        }
              @media (min-width: 769px) { .mobile-section-nav { display: none !important; } }
      `}</style>
<div style={{ display: 'flex', flexWrap: 'wrap', paddingTop: '56px', minHeight: '100vh' }}>

        {/* SIDEBAR */}
        <aside className="dash-aside" style={{ width: '200px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '56px', left: 0, height: 'calc(100vh - 56px)', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 'queue',     icon: '⊡', label: 'Inspection Queue', badge: queue.filter(q => q.status === 'auth_review').length || undefined },
            { id: 'inspect',   icon: '🔍', label: 'Current Card',     disabled: !activeCard },
            { id: 'returns',   icon: '↩', label: 'Dispute Returns',   badge: queue.filter(q => q.status === 'return_received').length || undefined },
            { id: 'completed', icon: '✓', label: 'Completed Today',   badge: completed.length || undefined },
            { id: 'flagged',   icon: '⚠', label: 'Flagged',           badge: 1 },
          ].map(item => (
            <button key={item.id} onClick={() => !item.disabled && setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: item.disabled ? 'var(--text-muted)' : activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', opacity: item.disabled ? 0.4 : 1 }}>
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.id === 'flagged' ? 'var(--accent-red)' : 'var(--teal)', color: '#fff', fontWeight: 600 }}>{item.badge}</span>}
            </button>
          ))}
          <div style={{ margin: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Today's Stats</div>
            {[{ label: 'Inspected', val: String(completed.length) }, { label: 'Passed', val: String(completed.filter(c => c.decision === 'pass').length), green: true }, { label: 'Rejected', val: String(completed.filter(c => c.decision === 'fail').length), red: true }, { label: 'In Queue', val: String(queue.filter(q => q.status === 'auth_review').length) }].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>{s.label}</span>
                <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: s.green ? 'var(--accent-green)' : s.red ? 'var(--accent-red)' : 'var(--text-primary)' }}>{s.val}</span>
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
              <option value="queue">Inspection Queue</option>
              <option value="inspect">Current Card</option>
              <option value="returns">Dispute Returns</option>
              <option value="completed">Completed Today</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {/* QUEUE */}
          {activeSection === 'queue' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)' }}>Inspection <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Queue</em></div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{queueLoading ? 'Loading…' : (() => { const r = queue.filter(i => i.auth_tier === 'remote' && i.status === 'in_transit').length; const p = queue.filter(i => i.status === 'auth_review').length; return [r ? `${r} remote` : '', p ? `${p} physical` : ''].filter(Boolean).join(' · ') || 'No cards in queue' })()}</div>
              </div>

              {/* Remote Photo Review Queue — live data */}
              {(() => {
                const remoteItems = queue.filter(i => i.auth_tier === 'remote' && i.status === 'in_transit')
                return (
                  <div style={{ background: 'rgba(60,125,200,0.06)', border: '1.5px solid rgba(60,125,200,0.3)', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: remoteItems.length ? '12px' : '0', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Remote Photo Review Queue</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cards under $300 · Seller shipped direct to buyer · Review photos in transit</div>
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 600 }}>{remoteItems.length} Pending</span>
                    </div>
                    {remoteItems.length === 0 ? (
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '10px' }}>No remote photo reviews pending</div>
                    ) : remoteItems.map((item, i) => (
                      <div key={item.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < remoteItems.length - 1 ? '8px' : '0', flexWrap: 'wrap' }}>
                        <div style={{ width: '32px', height: '44px', borderRadius: '4px', background: item.bg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                          {item.photos[0] ? <img src={item.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{item.name}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.order} · {item.seller} · In transit · {item.arrived}</div>
                        </div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>{item.value}</div>
                        <button
                          onClick={() => { setActiveCard(item.id); setActiveSection('inspect'); setChecklist({}); setDecision(null); setUploadedPhotos({}); setListingPhotoIndex(0); setReceivedPhotoIdx(null) }}
                          style={{ background: 'var(--accent-blue)', border: 'none', color: '#fff', padding: '7px 14px', fontSize: '11px', fontWeight: 600, borderRadius: '7px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
                        >Review Photos →</button>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Passed — Awaiting Label B */}
              {queue.filter(i => i.status === 'auth_passed').length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ background: 'rgba(76,175,124,0.06)', border: '1.5px solid rgba(76,175,124,0.3)', borderRadius: '12px', padding: '14px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                      ✓ Auth Passed — Label B Not Yet Printed
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {queue.filter(i => i.status === 'auth_passed').map((item, i) => (
                        <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ width: '32px', height: '44px', borderRadius: '4px', background: item.bg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                            {item.photos[0] ? <img src={item.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: '120px' }}>
                            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.name}</div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.order} · {item.value} · Buyer: {item.buyer}</div>
                          </div>
                          <button
                            onClick={() => { setActiveCard(item.id); setActiveSection('inspect'); setDecision('pass'); setChecklist({}); setUploadedPhotos({}); setListingPhotoIndex(0); setReceivedPhotoIdx(null); setLabelUrl(null); setSubmitError(null) }}
                            style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
                          >
                            🖨 Print Label B →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Physical Inspection Queue */}
              {(() => {
                const pending = queue.filter(i => i.status === 'auth_review')
                return (
                  <>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Physical Inspection Queue — {pending.length} Cards at Auth Center</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {pending.map((item, i) => (
                        <div key={i} style={{ background: 'var(--bg-2)', border: `1.5px solid ${item.priority === 'high' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flexWrap: 'wrap' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal-border)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = item.priority === 'high' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}
                        >
                          <div style={{ width: '36px', height: '50px', borderRadius: '4px', background: item.bg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            {item.photos[0] ? <img src={item.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: '140px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', color: 'var(--text-primary)' }}>{item.name}</div>
                              {item.priority === 'high' && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>High Value</span>}
                              {item.raw && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Raw Card</span>}
                            </div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.set} · {item.order}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{item.grade}</div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>{item.cert ? `#${item.cert}` : 'No cert'}</div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: '60px' }}>
                            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>{item.value}</div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{item.arrived}</div>
                          </div>
                          <button onClick={() => { setActiveCard(item.id); setActiveSection('inspect'); setChecklist({}); setDecision(null); setUploadedPhotos({}); setListingPhotoIndex(0); setReceivedPhotoIdx(null) }} style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Inspect →</button>
                        </div>
                      ))}
                      {pending.length === 0 && (
                        <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
                          No cards pending inspection
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* INSPECT */}
          {activeSection === 'inspect' && card && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveSection('queue')} style={btn({ fontSize: '11px', padding: '5px 12px' })}>← Queue</button>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)' }}>Inspecting: <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{card.name}</em></div>
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
                      {/* LISTING PHOTOS — real images from seller's listing */}
                      <div style={{ padding: '14px', borderRight: '0.5px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-blue)', fontWeight: 500 }}>LISTING PHOTO</div>
                          {card.photos?.length > 1 && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <button onClick={() => setListingPhotoIndex(i => Math.max(0, i - 1))} disabled={listingPhotoIndex === 0} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', lineHeight: 1, padding: 0 }}>‹</button>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{listingPhotoIndex + 1}/{card.photos.length}</span>
                              <button onClick={() => setListingPhotoIndex(i => Math.min(card.photos.length - 1, i + 1))} disabled={listingPhotoIndex === card.photos.length - 1} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', lineHeight: 1, padding: 0 }}>›</button>
                            </div>
                          )}
                        </div>
                        <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {card.photos?.[listingPhotoIndex]
                            ? <img src={card.photos[listingPhotoIndex]} alt="Listing photo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            : <div style={{ fontSize: '28px', opacity: 0.4 }}>🃏</div>
                          }
                          <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(60,125,200,0.2)', border: '1px solid rgba(60,125,200,0.4)', color: 'var(--accent-blue)', fontWeight: 500 }}>Listing</div>
                        </div>
                      </div>
                      {/* RIGHT PANEL — seller auth photos (remote) or staff-uploaded photos (physical) */}
                      <div style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)', fontWeight: 500 }}>{card.auth_tier === 'remote' ? 'SELLER AUTH PHOTOS' : 'RECEIVED CARD'}</div>
                          {card.auth_tier !== 'remote' && receivedPhotoIdx !== null && uploadedPhotos[receivedPhotoIdx] && (
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{photos[receivedPhotoIdx]}</div>
                          )}
                          {card.auth_tier === 'remote' && card.sellerAuthPhotos?.length > 1 && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <button onClick={() => setReceivedPhotoIdx(i => Math.max(0, (i||0) - 1))} disabled={(receivedPhotoIdx||0) === 0} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', lineHeight: 1, padding: 0 }}>‹</button>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{(receivedPhotoIdx||0)+1}/{card.sellerAuthPhotos.length}</span>
                              <button onClick={() => setReceivedPhotoIdx(i => Math.min(card.sellerAuthPhotos.length - 1, (i||0) + 1))} disabled={(receivedPhotoIdx||0) === card.sellerAuthPhotos.length - 1} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', lineHeight: 1, padding: 0 }}>›</button>
                            </div>
                          )}
                        </div>
                        <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {card.auth_tier === 'remote'
                            ? (card.sellerAuthPhotos?.[(receivedPhotoIdx||0)]
                                ? <img src={card.sellerAuthPhotos[receivedPhotoIdx||0]} alt="Seller auth photo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                : <div style={{ textAlign: 'center' }}><div style={{ fontSize: '28px', opacity: 0.3, marginBottom: '8px' }}>📷</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>Seller photos pending</div></div>)
                            : (receivedPhotoIdx !== null && uploadedPhotos[receivedPhotoIdx]
                                ? <img src={uploadedPhotos[receivedPhotoIdx]} alt="Auth photo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                : <div style={{ textAlign: 'center' }}><div style={{ fontSize: '28px', opacity: 0.3, marginBottom: '8px' }}>📷</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>Upload auth photos below</div></div>)
                          }
                          <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(76,175,124,0.2)', border: '1px solid rgba(76,175,124,0.4)', color: 'var(--accent-green)', fontWeight: 500 }}>{card.auth_tier === 'remote' ? ['Front','Back','Package'][(receivedPhotoIdx||0)] || 'Auth Photo' : 'Received'}</div>
                          {/* Slot nav — click strip thumbnails to switch */}
                          {Object.keys(uploadedPhotos).filter(k => uploadedPhotos[k]).length > 1 && (
                            <div style={{ position: 'absolute', bottom: '6px', right: '6px', display: 'flex', gap: '3px' }}>
                              {photos.map((_, si) => uploadedPhotos[si] ? (
                                <button key={si} onClick={e => { e.preventDefault(); setReceivedPhotoIdx(si) }} style={{ width: '8px', height: '8px', borderRadius: '50%', border: 'none', background: receivedPhotoIdx === si ? 'var(--accent-green)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }} />
                              ) : null)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Photo upload strip — physical auth only (remote auth uses seller-uploaded photos) */}
                    {card.auth_tier !== 'remote' && <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--border)' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Upload Auth Photos</span>
                        <span style={{ color: Object.values(uploadedPhotos).filter(Boolean).length === photos.length ? 'var(--accent-green)' : 'var(--text-muted)' }}>{Object.values(uploadedPhotos).filter(Boolean).length}/{photos.length} uploaded</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {photos.map((photo, i) => (
                          <div key={i}>
                            <input type="file" id={`photo-${i}`} accept="image/*" onChange={async (e) => {
                              const f = e.target.files[0]
                              if (!f) return
                              const preview = URL.createObjectURL(f)
                              setUploadedPhotos(prev => ({ ...prev, [i]: preview }))
                              setReceivedPhotoIdx(i)
                              try {
                                const fd = new FormData()
                                fd.append('file', f)
                                fd.append('order_id', card.id)
                                const res = await fetch('/api/auth-inspection/submit', { method: 'PUT', body: fd })
                                const data = await res.json()
                                if (res.ok && data.url) setUploadedPhotos(prev => ({ ...prev, [i]: data.url }))
                              } catch {}
                            }} style={{ display: 'none' }} />
                            <label htmlFor={`photo-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '8px', border: `1.5px solid ${uploadedPhotos[i] ? 'var(--accent-green)' : 'var(--border)'}`, background: uploadedPhotos[i] ? 'rgba(76,175,124,0.1)' : 'var(--bg-4)', cursor: 'pointer', gap: '3px', overflow: 'hidden', position: 'relative' }}>
                              {uploadedPhotos[i]
                                ? <img src={uploadedPhotos[i]} alt={photo} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ fontSize: '16px' }}>📷</div>
                              }
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', color: uploadedPhotos[i] ? '#fff' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2, position: 'relative', zIndex: 1, background: uploadedPhotos[i] ? 'rgba(0,0,0,0.55)' : 'transparent', padding: uploadedPhotos[i] ? '1px 3px' : '0', borderRadius: '2px' }}>{photo}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>Click each slot to upload. Photos are stored in Supabase and attached permanently to this order record.</div>
                    </div>}
                  </div>

                  {/* Checklist */}
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Auth Checklist — {card.raw ? 'Raw Card' : `${card.grader} Graded`}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: allChecked ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 500 }}>{checkedCount}/{checklistItems.length}</div>
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
                      { label: 'Card', val: card.name || '—' },
                      { label: 'Set', val: card.set || '—' },
                      { label: card.raw ? 'Condition' : 'Listed Grade', val: card.grade || '—', gold: true },
                      !card.raw ? { label: 'Grader', val: card.grader || '—' } : null,
                      !card.raw ? { label: 'Cert #', val: card.cert ? `#${card.cert}` : '—', mono: true } : null,
                      { label: 'Seller', val: card.seller || '—', teal: true },
                      { label: 'Buyer', val: card.buyer || '—' },
                      { label: 'Sale Value', val: card.value || '—', gold: true },
                    ].filter(Boolean).map((row, i, arr) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{row.label}</span>
                        <span style={{ color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : 'var(--text-primary)', fontFamily: row.mono ? 'DM Mono, monospace' : 'inherit', fontWeight: 500 }}>{row.val}</span>
                      </div>
                    ))}

                    {/* Dynamic cert link or raw note */}
                    {!card.raw && certUrls[card.grader] && card.cert ? (
                      <a href={certUrls[card.grader](card.cert)} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '7px', padding: '8px', marginTop: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
                        ↗ Verify #{card.cert} on {card.grader} Database
                      </a>
                    ) : !card.raw && certUrls[card.grader] && !card.cert ? (
                      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px', marginTop: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No cert number in listing — verify manually
                      </div>
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
                        Complete all {checklistItems.length} checklist items. {checklistItems.length - checkedCount} remaining.
                      </div>
                    )}
                    {submitError && (
                      <div style={{ background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '12px', color: 'var(--accent-red)', lineHeight: 1.5 }}>
                        {submitError}
                      </div>
                    )}
                    {!decision && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button disabled={!allChecked || submitting} onClick={handlePass} style={{ width: '100%', background: allChecked ? 'var(--accent-green)' : 'var(--bg-4)', border: 'none', color: allChecked ? '#fff' : 'var(--text-muted)', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: allChecked && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', opacity: allChecked && !submitting ? 1 : 0.5 }}>
                          {submitting ? 'Submitting…' : '✓ Pass — Ship to Buyer'}
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
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 300, color: 'var(--accent-green)' }}>Authentication Passed</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{(decidedCard || card)?.auth_tier === 'remote' ? 'Card ships directly to buyer — no Label B needed.' : 'Print label and ship to buyer.'}</div>
                        </div>
                        {(decidedCard || card)?.auth_tier !== 'remote' && (
                          <>
                            <button onClick={handlePrintLabelB} disabled={submitting} style={{ width: '100%', background: submitting ? 'var(--bg-4)' : 'var(--teal)', border: 'none', color: submitting ? 'var(--text-muted)' : theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px' }}>
                              {submitting ? 'Generating Label…' : '🖨 Generate Label B — Ship to Buyer'}
                            </button>
                            {submitError && <div style={{ fontSize: '11px', color: 'var(--accent-red)', marginBottom: '8px' }}>{submitError}</div>}
                          </>
                        )}
                        <button onClick={() => { setActiveSection('queue'); setActiveCard(null); setDecision(null); setDecidedCard(null); setChecklist({}); setUploadedPhotos({}); setSubmitError(null); setLabelUrl(null); setReceivedPhotoIdx(null); fetchQueue() }} style={btn({ width: '100%', padding: '10px', borderRadius: '10px', textAlign: 'center' })}>← Next Card in Queue</button>
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
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Completed <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Today</em></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                {completedLoading ? 'Loading…' : `${completed.length} inspection${completed.length !== 1 ? 's' : ''} · ${completed.filter(c => c.decision === 'pass').length} passed · ${completed.filter(c => c.decision === 'fail').length} rejected`}
              </div>
              {completedLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>Loading…</div>
              ) : completed.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>No inspections completed today</div>
              ) : (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                        {['Card', 'Grade', 'Value', 'Buyer', 'Auth By', 'Result', 'Label'].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {completed.map((row, i) => {
                        const listing = row.order?.listing || {}
                        const timeAgo = (() => {
                          const diff = Date.now() - new Date(row.created_at).getTime()
                          const m = Math.floor(diff / 60000)
                          if (m < 1) return 'just now'
                          if (m < 60) return `${m}m ago`
                          return `${Math.floor(m / 60)}h ago`
                        })()
                        const authName = row.authenticator_id ? ('#' + row.authenticator_id.slice(0, 6).toUpperCase()) : '—'
                        const buyerName = row.order?.buyer?.username || row.order?.buyer?.full_name || '—'
                        const grade = [listing.grader, listing.grade].filter(Boolean).join(' ') || 'Raw'
                        const val = listing.price ? '$' + Number(listing.price).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
                        const passed = row.decision === 'pass'
                        return (
                          <tr key={i} style={{ borderBottom: i < completed.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '10px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listing.card_name || '—'}</td>
                            <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>{grade}</span></td>
                            <td style={{ padding: '10px 14px', fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>{val}</td>
                            <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-secondary)' }}>{buyerName}</td>
                            <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{authName} · <span style={{ color: 'var(--text-muted)' }}>{timeAgo}</span></td>
                            <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: passed ? 'rgba(76,175,124,0.1)' : 'rgba(200,75,60,0.1)', border: `1px solid ${passed ? 'rgba(76,175,124,0.3)' : 'rgba(200,75,60,0.3)'}`, color: passed ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>{passed ? '✓ Passed' : '✕ Rejected'}</span></td>
                            <td style={{ padding: '10px 14px' }}>
                              {passed && row.order?.label_b_url
                                ? <a href={row.order.label_b_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', textDecoration: 'none', padding: '2px 8px', borderRadius: '5px', border: '1px solid var(--teal-border)', background: 'var(--teal-bg)', whiteSpace: 'nowrap' }}>🖨 Reprint</a>
                                : passed
                                  ? <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>No label</span>
                                  : <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>—</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* FLAGGED */}
          {activeSection === 'flagged' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>
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

          {/* DISPUTE RETURNS */}
          {activeSection === 'returns' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Dispute <em style={{ fontStyle: 'italic', color: 'var(--accent-amber)' }}>Returns</em>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>
                Cards returned by buyers after a buyer-wins dispute. Inspect the return, then generate Label D to send back to seller — or flag a wrong card.
              </div>

              {(() => {
                const returnOrders = queue.filter(q => q.status === 'return_received')
                const returnCard = activeReturn ? returnOrders.find(r => r.id === activeReturn) : null
                const returnChecklistItems = [
                  { id: 'identity',  label: 'This is the correct card from this order', sub: 'Same cert number, same slab, same card — not a substitute or placeholder' },
                  { id: 'condition', label: 'Card condition unchanged since original auth', sub: 'No new damage, tampering, or switching of cards inside slab' },
                  { id: 'slab',      label: 'Slab integrity intact', sub: 'No cracks, chips, or signs of tampering since original inspection' },
                  { id: 'complete',  label: 'Return package complete', sub: 'All items present — nothing missing from original shipment' },
                ]
                const returnAllChecked = returnChecklistItems.every(i => checklist[i.id])

                if (activeReturn === null) {
                  return (
                    <div>
                      {returnOrders.length === 0 && (
                        <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
                          No dispute returns awaiting inspection
                        </div>
                      )}
                      {returnOrders.map(ret => {
                        const daysLeft = ret.return_deadline_at
                          ? Math.ceil((new Date(ret.return_deadline_at) - Date.now()) / (1000 * 60 * 60 * 24))
                          : null
                        return (
                          <div key={ret.id} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                            onClick={() => { setActiveReturn(ret.id); setChecklist({}) }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{ret.name} — {ret.grade}</div>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{ret.set} · {ret.order}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Buyer: {ret.buyer} · Seller: {ret.seller} · {ret.value}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.3)', color: 'var(--accent-amber)', marginBottom: '4px' }}>Return Received</div>
                              {daysLeft !== null && (
                                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: daysLeft <= 1 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                                  {daysLeft > 0 ? `${daysLeft}d deadline` : 'Deadline passed'}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                return (
                  <div>
                    <button onClick={() => { setActiveReturn(null); setChecklist({}) }} style={{ ...btn({ fontSize: '11px', padding: '6px 14px', marginBottom: '16px' }) }}>← Back to Returns</button>
                    {returnCard && (
                      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Card</span><div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{returnCard.name}</div></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Grade</span><div style={{ color: 'var(--gold)', marginTop: '2px' }}>{returnCard.grade}</div></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Buyer</span><div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{returnCard.buyer}</div></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Seller</span><div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{returnCard.seller}</div></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Value</span><div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{returnCard.value}</div></div>
                      </div>
                    )}
                    {/* Original listing photos */}
                    {returnCard?.photos?.length > 0 && (
                      <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '12px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Original Listing Photos</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {returnCard.photos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`Listing photo ${i+1}`} style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Original auth inspection */}
                    {returnCard?.authInspection && (
                      <div style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(76,175,124,0.3)', borderRadius: '12px', padding: '18px', marginBottom: '12px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-green)', marginBottom: '10px', fontWeight: 500 }}>Original Auth Inspection — Passed</div>
                        {returnCard.authInspection.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', fontStyle: 'italic' }}>{returnCard.authInspection.notes}</div>
                        )}
                        {returnCard.authInspection.photos?.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {returnCard.authInspection.photos.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`Auth photo ${i+1}`} style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(76,175,124,0.3)' }} />
                              </a>
                            ))}
                          </div>
                        )}
                        {!returnCard.authInspection.photos?.length && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No inspection photos on file.</div>
                        )}
                      </div>
                    )}

                    {/* Buyer dispute evidence */}
                    {returnCard?.dispute && (
                      <div style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(200,75,60,0.3)', borderRadius: '12px', padding: '18px', marginBottom: '12px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-red)', marginBottom: '10px', fontWeight: 500 }}>Buyer Dispute Evidence</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>REASON: </span>{returnCard.dispute.reason}
                        </div>
                        {returnCard.dispute.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', fontStyle: 'italic' }}>{returnCard.dispute.notes}</div>
                        )}
                        {returnCard.dispute.buyer_evidence?.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {returnCard.dispute.buyer_evidence.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`Buyer evidence ${i+1}`} style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(200,75,60,0.3)' }} />
                              </a>
                            ))}
                          </div>
                        )}
                        {!returnCard.dispute.buyer_evidence?.length && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No buyer photos submitted.</div>
                        )}
                      </div>
                    )}

                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '22px', marginBottom: '16px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Return Inspection Checklist</div>
                      {returnChecklistItems.map(item => (
                        <div key={item.id} onClick={() => setChecklist(p => ({ ...p, [item.id]: !p[item.id] }))}
                          style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer', alignItems: 'flex-start' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${checklist[item.id] ? 'var(--accent-green)' : 'var(--border)'}`, background: checklist[item.id] ? 'var(--accent-green)' : 'transparent', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {checklist[item.id] && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Outcome determination */}
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '12px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Dispute Determination</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
                        Based on physical inspection, does the returned card match the original listing?
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ background: 'rgba(200,75,60,0.06)', border: '1.5px solid rgba(200,75,60,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-red)', fontWeight: 600, marginBottom: '2px' }}>Dispute Valid — Card Does Not Match Listing</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>Buyer was right. Label D → seller. Refund fires on delivery.</div>
                          <button
                            disabled={!returnAllChecked || labelDSubmitting}
                            style={{ width: '100%', background: returnAllChecked ? 'rgba(200,75,60,0.15)' : 'var(--bg-3)', border: `1.5px solid ${returnAllChecked ? 'rgba(200,75,60,0.5)' : 'var(--border)'}`, color: returnAllChecked ? 'var(--accent-red)' : 'var(--text-muted)', padding: '11px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: returnAllChecked && !labelDSubmitting ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif' }}
                            onClick={async () => {
                              if (!activeReturn || !returnAllChecked || labelDSubmitting) return
                              setLabelDSubmitting(true)
                              setLabelDError(null)
                              try {
                                const res = await fetch('/api/shipping/label', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ order_id: activeReturn, label: 'D', outcome: 'buyer_wins' }),
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error || 'Label generation failed')
                                setLabelUrl(data.label_url || data.labelUrl)
                                setLabelType('D')
                                setShowLabelModal(true)
                                fetchQueue()
                              } catch (err) {
                                setLabelDError(err.message)
                              } finally {
                                setLabelDSubmitting(false)
                              }
                            }}>
                            {labelDSubmitting ? 'Generating…' : '✗ Dispute Valid — Generate Label D → Seller'}
                          </button>
                        </div>

                        <div style={{ background: 'rgba(76,175,124,0.06)', border: '1.5px solid rgba(76,175,124,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)', fontWeight: 600, marginBottom: '2px' }}>Dispute Invalid — Card Matches Listing</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>Buyer was wrong. Label D → buyer. Seller paid immediately.</div>
                          <button
                            disabled={!returnAllChecked || labelDSubmitting}
                            style={{ width: '100%', background: returnAllChecked ? 'rgba(76,175,124,0.15)' : 'var(--bg-3)', border: `1.5px solid ${returnAllChecked ? 'rgba(76,175,124,0.5)' : 'var(--border)'}`, color: returnAllChecked ? 'var(--accent-green)' : 'var(--text-muted)', padding: '11px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: returnAllChecked && !labelDSubmitting ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif' }}
                            onClick={async () => {
                              if (!activeReturn || !returnAllChecked || labelDSubmitting) return
                              setLabelDSubmitting(true)
                              setLabelDError(null)
                              try {
                                const res = await fetch('/api/shipping/label', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ order_id: activeReturn, label: 'D', outcome: 'seller_wins' }),
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error || 'Label generation failed')
                                setLabelUrl(data.label_url || data.labelUrl)
                                setLabelType('D')
                                setShowLabelModal(true)
                                fetchQueue()
                              } catch (err) {
                                setLabelDError(err.message)
                              } finally {
                                setLabelDSubmitting(false)
                              }
                            }}>
                            {labelDSubmitting ? 'Generating…' : '✓ Dispute Invalid — Generate Label D → Buyer'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {labelDError && <div style={{ color: 'var(--accent-red)', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginBottom: '10px' }}>{labelDError}</div>}

                    <button
                      style={{ width: '100%', background: 'rgba(200,75,60,0.1)', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '13px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                      onClick={() => { setShowWrongCardModal(true); setWrongCardError(null) }}>
                      ✗ Wrong Card Received — Flag for Staff Review
                    </button>
                  </div>
                )
              })()}
            </div>
          )}

        </main>
      </div>

      {/* WRONG CARD MODAL */}
      {showWrongCardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(200,75,60,0.4)', borderRadius: '16px', padding: '28px', maxWidth: '500px', width: '100%' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Wrong Card <em style={{ fontStyle: 'italic', color: 'var(--accent-red)' }}>Received</em></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
              Flag this return as the wrong card. The buyer will be notified and given 5 days to ship the correct card. The seller will be informed. If the correct card is not received within 5 days, the dispute reverses to seller wins.
            </div>

            <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.25)', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px' }}>
              {[
                'Buyer is notified — must ship correct card within 5 days',
                'Seller is informed the dispute is under review',
                'Return deadline resets from today + 5 days',
                'Day 5 with no correct card received → seller wins automatically',
              ].map((point, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-amber)', flexShrink: 0 }}>→</span>
                  {point}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 500 }}>Notes for buyer (required)</div>
              <textarea
                value={wrongCardNotes}
                onChange={e => setWrongCardNotes(e.target.value)}
                placeholder="Describe what was received vs. what was expected (e.g. 'Received a Pikachu Base Set, listing was for Charizard Holo PSA 9')"
                style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '90px', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
            </div>

            {wrongCardError && <div style={{ color: 'var(--accent-red)', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginBottom: '10px' }}>{wrongCardError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                disabled={wrongCardSubmitting || !wrongCardNotes.trim()}
                onClick={async () => {
                  if (!wrongCardNotes.trim() || !activeReturn) return
                  setWrongCardSubmitting(true)
                  setWrongCardError(null)
                  try {
                    const res = await fetch('/api/orders/wrong-card', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_id: activeReturn, notes: wrongCardNotes }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to flag wrong card')
                    setShowWrongCardModal(false)
                    setWrongCardNotes('')
                    setActiveReturn(null)
                    setChecklist({})
                    fetchQueue()
                  } catch (err) {
                    setWrongCardError(err.message)
                  } finally {
                    setWrongCardSubmitting(false)
                  }
                }}
                style={{ flex: 1, background: wrongCardNotes.trim() ? 'var(--accent-red)' : 'var(--bg-3)', border: 'none', color: wrongCardNotes.trim() ? '#fff' : 'var(--text-muted)', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: wrongCardNotes.trim() ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', opacity: wrongCardSubmitting ? 0.6 : 1 }}>
                {wrongCardSubmitting ? 'Flagging…' : 'Flag — Notify Buyer & Seller'}
              </button>
              <button onClick={() => { setShowWrongCardModal(false); setWrongCardNotes(''); setWrongCardError(null) }} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}