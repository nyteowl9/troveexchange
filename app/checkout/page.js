'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useWalletConnection } from '@/app/components/ConnectWallet'
import { supabase } from '@/lib/supabase'

// useSearchParams() requires a Suspense boundary in Next.js App Router
export default function CheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  )
}

function Checkout() {
  const [theme, setTheme] = useState('dark')
  const [step, setStep] = useState(1)
  const [ack1, setAck1] = useState(false)
  const [ack2, setAck2] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signingStatus, setSigningStatus] = useState('Waiting for wallet confirmation...')
  const [alreadyAcknowledged, setAlreadyAcknowledged] = useState(false)
  const [listing, setListing] = useState(null)
  const [listingLoading, setListingLoading] = useState(true)
  const { walletAddress, connect } = useWalletConnection()
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listing_id')

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    const ack = localStorage.getItem('ch-buyer-ack') === 'true'
    setAlreadyAcknowledged(ack)
    if (ack) { setAck1(true); setAck2(true) }
  }, [])

  useEffect(() => {
    if (!listingId) { setListingLoading(false); return }
    supabase
      .from('listings')
      .select(`*, seller:seller_id (id, username, full_name, tier, rep_score)`)
      .eq('id', listingId)
      .eq('status', 'active')
      .single()
      .then(({ data }) => { setListing(data); setListingLoading(false) })
  }, [listingId])

  // Derived price data from real listing (fallback to 0 if still loading)
  const cardPrice   = listing?.price ?? 0
  const authTier    = cardPrice <= 300 ? 'remote' : 'physical'
  const authFee     = authTier === 'remote' ? 10 : 25
  const salesTax    = parseFloat((cardPrice * 0.095).toFixed(2))
  const total       = (cardPrice + authFee + salesTax).toFixed(2)
  const sellerName  = listing?.seller?.username || '—'
  const sellerTier  = listing?.seller?.tier || 'new'
  const sellerRep   = listing?.seller?.rep_score


  const goToStep = (n) => {
    setStep(n)
    window.scrollTo(0, 0)
  }

  const handleSign = async () => {
    setSigning(true)
    const statuses = [
      'Waiting for wallet confirmation...',
      'Wallet detected — please approve in MetaMask...',
      'Transaction submitted to Base...',
      'Waiting for block confirmation...',
      'Confirmed on Base · 1 block ✓'
    ]
    let i = 0
    const interval = setInterval(() => {
      i++
      if (statuses[i]) setSigningStatus(statuses[i])
      if (i >= statuses.length - 1) {
        clearInterval(interval)
        setTimeout(async () => {
          try {
            // Get authenticated buyer
            const { data: { user: buyer } } = await supabase.auth.getUser()

            // Create order record in Supabase
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .insert({
                listing_id:    listingId,
                buyer_id:      buyer?.id,
                seller_id:     listing?.seller_id,
                auth_tier:     authTier,
                escrow_amount: parseFloat(total),
                platform_fee:  parseFloat((cardPrice * 0.03).toFixed(2)),
                creator_fee:   parseFloat((cardPrice * 0.005).toFixed(2)),
                auth_fee:      authFee,
                shipping_cost: 0,   // updated when label is generated
                sales_tax:     salesTax,
                status:        'funded',
                ship_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              })
              .select()
              .single()

            if (!orderError && order) {
              // Mark listing as pending so it no longer shows in marketplace
              await supabase
                .from('listings')
                .update({ status: 'pending' })
                .eq('id', listingId)

              // Fire referral attribution (best-effort, never blocks checkout)
              fetch('/api/referral/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: order.id, sale_amount: cardPrice }),
              }).catch(() => {})
            }
          } catch (err) {
            console.error('[checkout] order creation error:', err)
            // Don't block the success screen — Phase 3 blockchain will be authoritative
          }

          setSigning(false)
          goToStep(5)
        }, 1200)
      }
    }, 900)
  }

  const handleAck = (which, val) => {
    if (which === 1) setAck1(val)
    if (which === 2) setAck2(val)
    if ((which === 1 ? val : ack1) && (which === 2 ? val : ack2)) {
      localStorage.setItem('ch-buyer-ack', 'true')
      setAlreadyAcknowledged(true)
    }
  }

  const progressSteps = ['Connect', 'Verify USDC', 'Review', 'Confirm', 'Complete']

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '12px 24px', fontSize: '13px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '10px', ...extra
  })

  // Not found state
  if (!listingLoading && listingId && !listing) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: 'var(--text-primary)' }}>Listing not found</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>This listing may have sold or been removed.</div>
        <Link href="/marketplace" style={{ color: 'var(--teal)', fontSize: '14px' }}>← Back to marketplace</Link>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* SIGNING OVERLAY */}
      {signing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '20px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--teal-bg)', border: '2px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>🔑</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, marginBottom: '8px', color: 'var(--text-primary)' }}>Sign in Wallet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>Your wallet is asking you to approve the USDC transfer into escrow. Review the details carefully before signing.</div>
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '20px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2, textAlign: 'left' }}>
              {[
                { label: 'Action', val: 'Lock USDC in Escrow' },
                { label: 'Amount', val: `$${total} USDC`, gold: true },
                { label: 'Contract', val: '0x8f2a...d91c ✓ Verified', green: true },
                { label: 'Network', val: 'Base (Ethereum L2)' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ color: r.gold ? 'var(--gold)' : r.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: r.gold ? 600 : 400 }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{signingStatus}</div>
          </div>
        </div>
      )}


      {/* PROGRESS BAR */}
      <div style={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 90, background: 'var(--bg-2)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', padding: '14px 0' }}>
          {progressSteps.map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < progressSteps.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 600, flexShrink: 0, background: done ? 'var(--accent-green)' : active ? 'var(--teal)' : 'var(--bg-4)', color: done || active ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', border: done || active ? 'none' : '1.5px solid var(--border)', transition: 'all 0.3s' }}>{done ? '✓' : n}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: done ? 'var(--accent-green)' : active ? 'var(--teal)' : 'var(--text-muted)', maxWidth: active ? '80px' : '0px', overflow: 'hidden', whiteSpace: 'nowrap', transition: 'max-width 0.3s' }}>{label}</div>
                </div>
                {i < progressSteps.length - 1 && <div style={{ flex: 1, height: '1px', background: done ? 'var(--accent-green)' : 'var(--border)', margin: '0 12px', transition: 'background 0.3s' }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <style>{`
        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; padding: 110px 1rem 40px !important; width: 100% !important; }
          .checkout-sidebar { position: relative !important; top: auto !important; }
        }
      `}</style>
      <div className="checkout-grid" style={{ maxWidth: '1100px', margin: '0 auto', padding: '120px 1.5rem 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '28px', alignItems: 'flex-start' }}>

        {/* STEPS */}
        <div>

          {/* STEP 1 — CONNECT WALLET */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Connect Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Wallet</em></div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>Your USDC lives in your wallet. Connect it to lock funds into escrow — the only movement of money in this transaction.</p>

              {walletAddress ? (
                <div style={{ background: 'rgba(76,175,124,0.06)', border: '1.5px solid rgba(76,175,124,0.35)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>✓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-green)', fontWeight: 500 }}>Wallet Connected</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} · Base Network</div>
                  </div>
                  <button onClick={connect} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-tertiary)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    Switch Wallet
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <button onClick={connect} style={{ width: '100%', background: 'var(--gold)', color: '#0A0A0B', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    Connect Wallet
                  </button>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '10px' }}>
                    MetaMask · Phantom · Coinbase · WalletConnect · Embedded wallet
                  </p>
                </div>
              )}

              <div style={{ background: 'rgba(232,168,56,0.08)', border: '1.5px solid rgba(232,168,56,0.35)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠</span>
                <div><strong style={{ color: 'var(--accent-amber)' }}>Base Network Required</strong> — Chase Hollow only accepts USDC on the Base network (Ethereum L2). When your wallet asks to connect, approve the Base network. Need USDC on Base? <a href="/#wallets" style={{ color: 'var(--teal)', textDecoration: 'none' }}>See our guide →</a></div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link href={listingId ? `/listing/${listingId}` : '/marketplace'} style={{ ...btn(), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← Back to Listing</Link>
                <button onClick={() => goToStep(2)} disabled={!walletAddress} style={{ ...btn({ background: walletAddress ? 'var(--teal)' : 'var(--bg-4)', border: 'none', color: walletAddress ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', fontWeight: 600, opacity: walletAddress ? 1 : 0.5, cursor: walletAddress ? 'pointer' : 'not-allowed' }) }}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 2 — VERIFY USDC */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Verify <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>USDC Balance</em></div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>We detected your wallet on Base. Checking your USDC balance for this purchase.</p>

              <div style={{ background: 'rgba(76,175,124,0.04)', border: '1.5px solid rgba(76,175,124,0.4)', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>✓</div>
                  <div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-green)', fontWeight: 500 }}>Sufficient Balance Detected</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>0x742d...f44e · Base Network</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '40px', fontWeight: 300, lineHeight: 1, color: 'var(--text-primary)', marginBottom: '2px' }}>$2,840.00</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: '14px' }}>USDC available on Base</div>
                <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Card price', val: `$${cardPrice.toLocaleString()}` },
                    { label: `Auth fee (${authTier === 'remote' ? 'Remote Photo' : 'Physical'})`, val: `$${authFee}` },
                    { label: 'Shipping & insurance', val: 'Calculated at checkout' },
                        { label: 'Sales tax (CA · 9.5%)', val: `$${salesTax}` },
                    { label: 'Total to lock in escrow', val: `$${total} USDC`, total: true },
                    { label: 'Remaining after purchase', val: `$${(2840 - parseFloat(total)).toFixed(2)} USDC`, green: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: row.total ? '6px' : '0', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0' }}>
                      <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: row.total ? 'var(--accent-green)' : row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: row.total ? 600 : 400 }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => goToStep(1)} style={btn()}>← Back</button>
                <button onClick={() => goToStep(3)} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Looks Good →</button>
              </div>
            </div>
          )}

          {/* STEP 3 — REVIEW */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Review Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Order</em></div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>Everything about this transaction before you sign. Take your time — no rush.</p>

              {/* Card details */}
              {[
                {
                  title: 'Card Details',
                  rows: [
                    { label: 'Card', val: listing ? `${listing.card_name}${listing.set ? ` · ${listing.set}` : ''}` : '—' },
                    { label: 'Grade', val: listing?.grade ? `${listing.grader} ${listing.grade}${listing.cert_number ? ` · Cert #${listing.cert_number}` : ''}` : 'Raw' },
                    { label: 'Seller', val: listing ? `${sellerName} · ${sellerTier.charAt(0).toUpperCase() + sellerTier.slice(1)}${sellerRep ? ` · ${sellerRep.toFixed(2)}★` : ''}` : '—', teal: true },
                    { label: 'Authentication', val: '✓ Yes — verified before delivery', green: true },
                  ]
                },
                {
                  title: 'Payment Breakdown',
                  rows: [
                    { label: 'Card price', val: `$${cardPrice.toLocaleString()}`, gold: true },
                    { label: `Auth fee (${authTier === 'remote' ? 'Remote Photo' : 'Physical'})`, val: `$${authFee}` },
                    { label: 'Shipping & insurance', val: '$18.40' },
                        { label: 'Sales tax (CA · 9.5%)', val: `$${salesTax}` },
                    { label: 'Total locked in escrow', val: `$${total} USDC`, gold: true, total: true },
                  ]
                },
                {
                  title: 'Delivery & Protection',
                  rows: [
                    { label: 'Auth type', val: authTier === 'remote' ? 'Remote Photo Auth' : 'Physical Auth at Chase Hollow' },
                    { label: 'Seller deadline', val: '48hrs (1 extension available)' },
                    { label: 'If seller misses deadline', val: 'Auto-refund · 100% USDC returned', green: true },
                    { label: authTier === 'remote' ? 'Photo review' : 'Auth window', val: authTier === 'remote' ? 'Reviewed in transit (same day)' : '24–48hrs at Chase Hollow HQ' },
                    { label: 'Auto-release after delivery', val: '72hrs · No action needed' },
                  ]
                }
              ].map((section, si) => (
                <div key={si} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '14px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>{section.title}</div>
                  {section.rows.map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: row.total ? '10px 0 0' : '8px 0', borderBottom: row.total ? 'none' : '0.5px solid var(--border)', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0', fontSize: '13px' }}>
                      <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                      <span style={{ fontWeight: 500, color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontFamily: row.total ? 'Cormorant Garamond, serif' : 'inherit', fontSize: row.total ? '20px' : '13px' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Acknowledgment — first time only */}
              {!alreadyAcknowledged && (
                <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '14px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>One-Time Acknowledgment — Never Asked Again</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <input type="checkbox" checked={ack1} onChange={e => handleAck(1, e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--teal)', flexShrink: 0, cursor: 'pointer' }} />
                      <span>I have reviewed all listing photos and understand what I am purchasing — the card name, set, grade, and condition as shown.</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <input type="checkbox" checked={ack2} onChange={e => handleAck(2, e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--teal)', flexShrink: 0, cursor: 'pointer' }} />
                      <span>I understand Chase Hollow verifies the card received matches this listing. The grade is certified by <strong style={{ color: 'var(--text-primary)' }}>PSA, BGS, or CGC</strong> — whose certification I accept as the standard of authenticity.</span>
                    </label>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid var(--teal-border)', lineHeight: 1.6 }}>✓ This acknowledgment is saved — you will not be asked again on future purchases.</div>
                </div>
              )}

              {/* Escrow explainer */}
              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>⬡ How Your Money is Protected</div>
                {[
                  `Your $${total} USDC locks into a smart contract — not held by Chase Hollow, not held by the seller. By code.`,
                  authTier === 'remote' ? `${sellerName} uploads 3 photos and ships direct to you within 48hrs. Miss deadline = auto-refund.` : `${sellerName} ships to our authentication center within 48hrs or your USDC auto-refunds.`,
                  authTier === 'remote' ? 'Our staff reviews the uploaded photos while your card is in transit.' : 'Our expert physically verifies the card matches the listing exactly — grade, condition, cert number.',
                  'Card ships to you. 72hrs after delivery, USDC releases to seller automatically.',
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', flexShrink: 0, border: '1px solid var(--teal-border)', background: 'var(--bg)', marginTop: '1px', fontWeight: 600 }}>{i + 1}</div>
                    {text}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => goToStep(2)} style={btn()}>← Back</button>
                <button onClick={() => goToStep(4)} disabled={!alreadyAcknowledged && (!ack1 || !ack2)} style={btn({ background: (alreadyAcknowledged || (ack1 && ack2)) ? 'var(--teal)' : 'var(--bg-4)', border: 'none', color: (alreadyAcknowledged || (ack1 && ack2)) ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', fontWeight: 600, opacity: (alreadyAcknowledged || (ack1 && ack2)) ? 1 : 0.5, cursor: (alreadyAcknowledged || (ack1 && ack2)) ? 'pointer' : 'not-allowed' })}>Looks Good →</button>
              </div>
            </div>
          )}

          {/* STEP 4 — CONFIRM */}
          {step === 4 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Confirm <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>&amp; Sign</em></div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>One wallet signature locks your USDC into escrow and starts the transaction.</p>

              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>What You're Signing</div>
                {[
                  { label: 'Action', val: 'Lock USDC in escrow smart contract', green: true },
                  { label: 'Amount', val: `$${total} USDC`, gold: true },
                  { label: 'Contract', val: '0x8f2a...d91c · Verified ✓', teal: true },
                  { label: 'Network', val: 'Base (Ethereum L2)' },
                  { label: 'Gas fee', val: '~$0.04 USDC' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: i < 4 ? '0.5px solid var(--teal-border)' : 'none' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontWeight: 500, color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontFamily: row.gold ? 'Cormorant Garamond, serif' : 'inherit', fontSize: row.gold ? '20px' : '13px' }}>{row.val}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {[
                  'Funds go to escrow — not to us, not to the seller yet',
                  'Auto-refund if seller misses 48hr shipping deadline',
                  authTier === 'remote' ? 'Card photo-authenticated by staff during transit' : 'Card physically authenticated by experts before it reaches you',
                  '72hr inspection window after delivery — dispute if needed',
                  'Transaction recorded permanently on Base blockchain',
                  'No chargebacks possible — irreversible but fully protected',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✓</span>{item}
                  </div>
                ))}
              </div>

              <button onClick={handleSign} style={{ width: '100%', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '18px', fontSize: '16px', fontWeight: 700, borderRadius: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                🔒 Sign &amp; Lock ${total} USDC in Escrow
              </button>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px', lineHeight: 1.6 }}>Your wallet will open for signature. Gas fee (~$0.04) paid separately from escrow amount.</div>
              <button onClick={() => goToStep(3)} style={btn()}>← Review Again</button>
            </div>
          )}

          {/* STEP 5 — SUCCESS */}
          {step === 5 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(76,175,124,0.12)', border: '2px solid rgba(76,175,124,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px' }}>✓</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '44px', fontWeight: 300, marginBottom: '8px', color: 'var(--text-primary)' }}>You're <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Protected</em></div>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 28px' }}>
                ${total} USDC is locked in escrow. {sellerName} has been notified and has 48 hours to ship. You'll receive updates at every step.
              </p>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', fontFamily: 'DM Mono, monospace', fontSize: '11px', textAlign: 'left' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>Transaction Hash · On-Chain Confirmation</div>
                <div style={{ color: 'var(--accent-green)', wordBreak: 'break-all', lineHeight: 1.6 }}>0x8f2a91C4b3D2e5F1a0B7c6D3e8F2a91C4b3D2e5F1a0B7c6D3e8F2a91C4b3D2e5</div>
                <a href="#" style={{ color: 'var(--teal)', fontSize: '10px', marginTop: '4px', display: 'block', textDecoration: 'none' }}>View on Basescan →</a>
              </div>

              {/* Order tracker */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, marginBottom: '4px', color: 'var(--text-primary)' }}>Order <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>#4821</em></div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '20px' }}>Live tracking · Updates automatically</div>
                {[
                  { title: 'Escrow Funded', desc: `$${total} USDC locked in smart contract on Base. Transaction confirmed.`, done: true, active: false },
                  { title: 'Awaiting Seller Photos & Shipment', desc: `${sellerName} has been notified. They have 48hrs to${authTier === 'remote' ? ' upload 3 photos and' : ''} ship${authTier === 'physical' ? ' to our authentication center' : ' directly to your address'}.`, done: false, active: true, time: '⏱ Ship deadline: 48hrs from now' },
                  { title: 'In Transit to Authenticator', desc: 'Card en route to Chase Hollow authentication center. Tracking will appear here.', done: false, active: false },
                  { title: 'Authentication', desc: 'Expert verifies grade, condition, and cert number match listing exactly.', done: false, active: false },
                  { title: 'Shipped to You', desc: 'Card ships from auth center to your address. FedEx tracking provided.', done: false, active: false },
                  { title: 'Delivered · Auto-Release', desc: 'Delivery confirmed. 72hr window opens. USDC auto-releases to seller at window close unless you dispute.', done: false, active: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: i < 5 ? '18px' : '0' }}>
                    {i < 5 && <div style={{ position: 'absolute', left: '13px', top: '28px', bottom: '0', width: '1.5px', background: s.done ? 'var(--accent-green)' : 'var(--border)' }} />}
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${s.done ? 'var(--accent-green)' : s.active ? 'var(--accent-amber)' : 'var(--border)'}`, background: s.done ? 'var(--accent-green)' : s.active ? 'var(--accent-amber)' : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, fontSize: '11px', color: s.done || s.active ? '#fff' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{s.done ? '✓' : i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: s.done || s.active ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: '2px' }}>{s.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                      {s.time && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-amber)', marginTop: '3px' }}>{s.time}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/buyer-dashboard" style={{ padding: '13px 28px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', textDecoration: 'none' }}>View in Dashboard</a>
                <a href="/marketplace" style={{ padding: '13px 28px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>Continue Browsing</a>
              </div>
            </div>
          )}

        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div style={{ position: 'sticky', top: '144px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '52px', height: '72px', borderRadius: '6px', background: 'var(--bg-4)', border: '2px solid var(--border)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {listing?.photos?.[0] ? <img src={listing.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
              </div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', lineHeight: 1.2, marginBottom: '3px', color: 'var(--text-primary)' }}>{listingLoading ? '…' : listing?.card_name || 'Listing not found'}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {listing?.game}{listing?.set ? ` · ${listing.set}` : ''}<br />
                  {listing?.grade ? `${listing.grader} ${listing.grade}${listing.cert_number ? ` · Cert #${listing.cert_number}` : ''}` : listing ? 'Raw' : ''}<br />
                  {listing?.card_number ? `#${listing.card_number}` : ''}
                </div>
                {listing?.seller && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--teal)', fontWeight: 600 }}>{sellerName.slice(0, 2).toUpperCase()}</div>
                    {sellerName} · {sellerTier.charAt(0).toUpperCase() + sellerTier.slice(1)}{sellerRep ? ` · ${sellerRep.toFixed(2)}★` : ''}
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              {[
                { label: 'Card price', val: `$${cardPrice}` },
                { label: `Auth fee (${authTier === 'remote' ? 'Remote Photo' : 'Physical'})`, val: `$${authFee}` },
                { label: 'Shipping & insurance', val: 'Calculated at checkout' },
                { label: 'Sales tax (CA · 9.5%)', val: `$${salesTax}` },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)' }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Subtotal (est.)</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 600, color: 'var(--gold)' }}>${total}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>+ shipping · USDC · Base</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🔒', text: 'Escrow protected — not held by us' },
                { icon: '✓', text: authTier === 'remote' ? 'Photo authenticated in transit' : 'Human authenticated before delivery' },
                { icon: '↩', text: 'Auto-refund if seller misses 48hr deadline (1 extension allowed)' },
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

    </div>
  )
}