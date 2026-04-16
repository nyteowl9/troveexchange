'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/app/components/Nav'
import { supabase } from '@/lib/supabase'

const TIER_COLORS = {
  elite:   { color: 'var(--gold)',         bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.3)',  label: '⭐ Elite' },
  pro:     { color: 'var(--accent-amber)', bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)',  label: 'Pro' },
  trusted: { color: 'var(--accent-blue)',  bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)',  label: 'Trusted' },
  new:     { color: 'var(--text-muted)',   bg: 'rgba(255,255,255,0.05)', border: 'var(--border)',        label: 'New' },
}

export default function ListingPage() {
  const { id } = useParams()
  const router = useRouter()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    loadListing()
  }, [id])

  async function loadListing() {
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select(`
        id, card_name, game, set, card_number, grade, grader, cert_number,
        condition, description, listing_type, price, auth_tier, photos, created_at, expires_at, status,
        seller:seller_id (id, username, full_name, tier, strike_count, wallet_address)
      `)
      .eq('id', id)
      .single()

    if (!data || data.status !== 'active') {
      setNotFound(true)
    } else {
      setListing(data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <>
        <Nav />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', paddingTop: '64px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Loading...</div>
        </div>
      </>
    )
  }

  if (notFound) {
    return (
      <>
        <Nav />
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px', paddingTop: '64px' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', color: 'var(--text-muted)' }}>404</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-secondary)' }}>This listing doesn't exist or is no longer active.</div>
          <Link href="/marketplace" style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--gold)', textDecoration: 'none' }}>← Back to Marketplace</Link>
        </div>
      </>
    )
  }

  const { card_name, game, set, card_number, grade, grader, cert_number, condition, description, listing_type, price, auth_tier, photos, seller } = listing
  const isGraded = listing_type === 'graded' && grader
  const isPhysical = auth_tier === 'physical'
  const authFee = isPhysical ? 25 : 10
  const buyTotal = (parseFloat(price) + authFee).toFixed(2)
  const tc = TIER_COLORS[seller?.tier] || TIER_COLORS.new
  const sellerInitials = (seller?.username || '??').slice(0, 2).toUpperCase()
  const photoList = photos?.filter(Boolean) || []

  const detailCells = [
    isGraded && { label: 'Grader',    val: grader,      color: 'var(--accent-blue)' },
    isGraded && { label: 'Grade',     val: grade,       color: 'var(--accent-green)' },
    isGraded && cert_number && { label: 'Cert #', val: cert_number, mono: true },
    card_number && { label: 'Card #', val: card_number, mono: true },
    set && { label: 'Set',            val: set },
    condition && { label: 'Condition', val: condition },
    { label: 'Type', val: listing_type?.charAt(0).toUpperCase() + listing_type?.slice(1) },
    { label: 'Game', val: game },
  ].filter(Boolean)

  const authChecklist = isPhysical
    ? ['Photos match listing exactly', 'Grade label verified on slab', `Cert #${cert_number || '—'} verified on ${grader || ''} database`, 'Slab intact — no cracks, tampering, or re-sealing', 'Holo sticker authentic', 'If anything doesn\'t match — full refund, automatically']
    : [`Front, back, and sealed-package photos reviewed`, `${isGraded ? `Grade label shows ${grader} ${grade} — verified` : 'Condition matches listing'}`, isGraded ? `Cert #${cert_number || '—'} verified on ${grader || ''} database` : null, 'If anything doesn\'t match — full refund, automatically']
  const authChecklistFiltered = authChecklist.filter(Boolean)

  const transactionSteps = [
    { num: '01', title: 'You Lock USDC in Escrow', desc: `$${buyTotal}+ USDC locked in smart contract on Base. Neither party can touch it. Seller is notified immediately.` },
    { num: '02', title: isPhysical ? 'Seller Ships to Chase Hollow' : 'Seller Ships Direct + Photos', desc: isPhysical ? 'Seller ships to our auth center within 48hrs. Miss the deadline — your USDC auto-refunds automatically.' : 'Seller uploads 3 photos and ships directly to you within 48hrs. Photos reviewed during transit. Miss the deadline — auto-refund.' },
    { num: '03', title: isPhysical ? 'Expert Authentication' : 'Photo Review In Transit', desc: isPhysical ? 'Our authenticator physically verifies the card — photos, grade label, cert number, slab integrity. Pass = ships to you.' : 'Our staff reviews the 3 uploaded photos while your card is in transit. Pass = card continues to you. Fail = full refund.' },
    { num: '04', title: 'Delivered · Auto-Release', desc: 'Card ships to your address. 72hrs after delivery, USDC releases to seller automatically. You can release early anytime.' },
  ]

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '8px 18px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra,
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <Nav />

      <style>{`
        @media (max-width: 768px) {
          .listing-grid { grid-template-columns: 1fr !important; padding: 12px 0.75rem 40px !important; gap: 16px !important; }
          .listing-right { position: relative !important; top: auto !important; order: -1 !important; }
          .listing-fee-breakdown { display: none !important; }
          .listing-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* BUY MODAL */}
      {showBuyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', position: 'relative' }}>
            <button onClick={() => setShowBuyModal(false)} style={{ position: 'absolute', top: '14px', right: '14px', width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '15px' }}>✕</button>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, marginBottom: '6px' }}>Confirm <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Purchase</em></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>Clicking confirm will take you to checkout where your USDC will be locked in escrow on Base.</div>

            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2 }}>
              {[
                { label: 'Card',            val: `${card_name}${isGraded ? ` ${grader} ${grade}` : ''}` },
                { label: 'Seller',          val: `@${seller?.username} · ${tc.label}` },
                { label: 'Card price',      val: `$${parseFloat(price).toLocaleString()}`, gold: true },
                { label: `Auth fee`,        val: `$${authFee} (${isPhysical ? 'Physical' : 'Remote Photo'})` },
                { label: 'Shipping + tax',  val: 'Calculated at checkout' },
                { label: 'Network',         val: 'Base (Ethereum L2)' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ color: r.gold ? 'var(--gold)' : 'var(--text-primary)', fontWeight: r.gold ? 600 : 400 }}>{r.val}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {['Card matches listing exactly or full refund', 'Auto-refund if seller misses 48hr ship deadline', isPhysical ? 'Human authenticated before card ships to you' : 'Photo reviewed by Chase Hollow staff in transit', '72hr inspection window after delivery'].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✓</span>{item}
                </div>
              ))}
            </div>

            <Link href={`/checkout?listing_id=${id}`} style={{ display: 'block', width: '100%', background: 'var(--teal)', border: 'none', color: 'var(--bg)', padding: '16px', fontSize: '15px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', textDecoration: 'none', marginBottom: '8px' }}>
              🔒 Continue to Checkout
            </Link>
            <button onClick={() => setShowBuyModal(false)} style={btn({ width: '100%', padding: '12px', borderRadius: '10px' })}>Cancel</button>
          </div>
        </div>
      )}

      {/* BREADCRUMB */}
      <div style={{ background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', padding: isMobile ? '76px 1rem 8px' : '76px 2.5rem 12px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <span>→</span>
          <Link href="/marketplace" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Marketplace</Link>
          <span>→</span>
          <Link href={`/marketplace?game=${encodeURIComponent(game)}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{game}</Link>
          <span>→</span>
          <span style={{ color: 'var(--text-primary)' }}>{card_name}{isGraded ? ` ${grader} ${grade}` : ''}</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="listing-grid" style={{ maxWidth: '1300px', margin: '0 auto', padding: isMobile ? '12px 0.75rem 40px' : '24px 2rem 60px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: isMobile ? '16px' : '32px', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box' }}>

        {/* LEFT */}
        <div style={{ order: isMobile ? 2 : 1, minWidth: 0, width: '100%' }}>

          {/* PHOTO GALLERY */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ aspectRatio: '4/3', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {photoList.length > 0 ? (
                <img src={photoList[activePhoto]} alt={`${card_name} photo ${activePhoto + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '45%', aspectRatio: '2.5/3.5', borderRadius: '8px', background: 'var(--bg-4)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', opacity: 0.3 }}>🃏</div>
              )}
              {isGraded && (
                <>
                  <div style={{ position: 'absolute', top: '16px', left: '16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '4px 12px', borderRadius: '6px', background: 'rgba(10,10,11,0.82)', border: '1px solid rgba(201,168,76,0.5)', color: 'var(--gold)', fontWeight: 600, backdropFilter: 'blur(4px)' }}>{grader}</div>
                  <div style={{ position: 'absolute', top: '16px', right: '16px', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(10,10,11,0.82)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--gold)', backdropFilter: 'blur(4px)' }}>{grade}</div>
                </>
              )}
            </div>
            {photoList.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '0.5px solid var(--border)', overflowX: 'auto' }}>
                {photoList.map((url, i) => (
                  <div key={i} onClick={() => setActivePhoto(i)} style={{ flexShrink: 0, cursor: 'pointer' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '8px', border: `1.5px solid ${activePhoto === i ? 'var(--teal)' : 'var(--border)'}`, overflow: 'hidden', opacity: activePhoto === i ? 1 : 0.5, transition: 'all 0.15s' }}>
                      <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: activePhoto === i ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 500, textAlign: 'center', marginTop: '4px' }}>Photo {i + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARD DETAILS */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: isMobile ? '14px' : '22px', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, marginBottom: '4px', color: 'var(--text-primary)' }}>
              {card_name}{card_number ? <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}> {card_number}</em> : ''}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: description ? '14px' : '18px' }}>{game}{set ? ` · ${set}` : ''}</div>

            <div style={{ fontSize: '14px', color: description ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.7, marginBottom: '18px', fontStyle: description ? 'normal' : 'italic' }}>
              {description || 'No description provided.'}
            </div>

            {detailCells.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                {detailCells.map((cell, i) => (
                  <div key={i} style={{ background: 'var(--bg-3)', padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{cell.label}</div>
                    <div style={{ fontSize: cell.mono ? '12px' : '14px', fontWeight: 500, color: cell.color || 'var(--text-primary)', fontFamily: cell.mono ? 'DM Mono, monospace' : 'DM Sans, sans-serif' }}>{cell.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Seller row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-3)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 600, color: 'var(--teal)', flexShrink: 0 }}>{sellerInitials}</div>
              <div style={{ flex: 1 }}>
                <Link href={`/profile/${seller?.username}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>@{seller?.username}</Link>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: tc.color, marginTop: '2px' }}>{tc.label}</div>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: seller?.strike_count === 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {seller?.strike_count === 0 ? '0 strikes' : `${seller?.strike_count} strike${seller.strike_count > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>

          {/* AUTHENTICATION GUARANTEE */}
          <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '14px', padding: isMobile ? '14px' : '22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>✓</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Chase Hollow {isPhysical ? 'Physical' : 'Remote'} Authentication</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)' }}>{isPhysical ? 'Expert inspection at our auth center before this card ships to you' : 'Staff photo review in transit — card verified before delivery'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {authChecklistFiltered.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--teal)', flexShrink: 0, marginTop: '1px' }}>✓</span>{item}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '0.5px solid var(--teal-border)', paddingTop: '12px' }}>
              {isGraded ? `Grade and authenticity certified by ${grader} — Chase Hollow verifies you receive exactly what was listed.` : 'Condition verified by Chase Hollow — you receive exactly what was listed.'}{' '}
              <a href="/#how-it-works" style={{ color: 'var(--teal)', textDecoration: 'none' }}>How authentication works →</a>
            </div>
          </div>

          {/* PRICE HISTORY PLACEHOLDER */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: isMobile ? '14px' : '22px', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, marginBottom: '12px', color: 'var(--text-primary)' }}>Price <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Price history and comparable sales coming in Phase 3.<br />
                All transactions will be publicly verifiable on Base — not self-reported.
              </div>
            </div>
          </div>

          {/* TRANSACTION FLOW */}
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: isMobile ? '14px' : '22px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, marginBottom: '20px', color: 'var(--text-primary)' }}>
              How This <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Transaction Works</em>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {transactionSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: i < transactionSteps.length - 1 ? '20px' : '0' }}>
                  {i < transactionSteps.length - 1 && <div style={{ position: 'absolute', left: '14px', top: '30px', bottom: '0', width: '1px', background: 'var(--border)' }} />}
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--teal-border)', background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', flexShrink: 0, zIndex: 1 }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{step.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT — PURCHASE PANEL */}
        <div className="listing-right" style={{ position: isMobile ? 'relative' : 'sticky', top: isMobile ? 'auto' : '84px', order: isMobile ? 1 : 2, minWidth: 0, width: '100%' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>

            {/* Card preview */}
            <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '52px', height: '72px', borderRadius: '6px', background: 'var(--bg-3)', border: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {photoList[0] ? <img src={photoList[0]} alt={card_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '22px', opacity: 0.4 }}>🃏</span>}
              </div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', lineHeight: 1.2, marginBottom: '3px', color: 'var(--text-primary)' }}>{card_name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {game}{set ? ` · ${set}` : ''}<br />
                  {isGraded ? `${grader} ${grade}${cert_number ? ` · #${cert_number}` : ''}` : (condition || listing_type)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--teal)', fontWeight: 600 }}>{sellerInitials}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>@{seller?.username} · <span style={{ color: tc.color }}>{tc.label}</span></span>
                </div>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="listing-fee-breakdown" style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Fee Breakdown</div>
              {[
                { label: 'Card price', val: `$${parseFloat(price).toLocaleString()}` },
                { label: `Auth fee (${isPhysical ? 'Physical' : 'Remote Photo'})`, val: `$${authFee}` },
                { label: 'Shipping & insurance', val: 'At checkout' },
                { label: 'Sales tax', val: 'At checkout' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Subtotal</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 600, color: 'var(--gold)' }}>${parseFloat(buyTotal).toLocaleString()}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>+ shipping & tax · USDC · Base</div>
                </div>
              </div>
            </div>

            {/* Buy button */}
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              {currentUserId && currentUserId === seller?.id ? (
                <div style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', color: 'var(--text-muted)', padding: '16px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '10px', textAlign: 'center' }}>
                  This is your listing
                </div>
              ) : (
                <>
                  <button onClick={() => setShowBuyModal(true)} style={{ width: '100%', background: 'var(--teal)', border: 'none', color: 'var(--bg)', padding: '16px', fontSize: '15px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    🔒 Buy Now — ${parseFloat(price).toLocaleString()} USDC
                  </button>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', lineHeight: 1.6 }}>
                    Auto-refund if seller misses 48hr deadline · 72hr inspection window
                  </div>
                </>
              )}
            </div>

            {/* Trust items */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🔒', text: 'Escrow protected — funds held by smart contract' },
                { icon: '✓', text: isPhysical ? 'Human authenticated before delivery' : 'Photo authenticated in transit' },
                { icon: '↩', text: "Auto-refund if seller doesn't ship in 48hrs" },
                { icon: '⏱', text: '72hr inspection window after delivery' },
                { icon: '⬡', text: 'Permanent on-chain record on Base' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '13px', flexShrink: 0 }}>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
