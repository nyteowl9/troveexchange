'use client'

import { useState, useEffect } from 'react'

// ── Change this to your target beta launch date ──────────────────
const LAUNCH_DATE = new Date('2026-05-21T09:00:00-06:00')
// ─────────────────────────────────────────────────────────────────

function useCountdown(target) {
  const [delta, setDelta] = useState(null)
  useEffect(() => {
    function calc() {
      const ms = target - Date.now()
      if (ms <= 0) return setDelta({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setDelta({
        days:    Math.floor(ms / 86400000),
        hours:   Math.floor((ms % 86400000) / 3600000),
        minutes: Math.floor((ms % 3600000)  / 60000),
        seconds: Math.floor((ms % 60000)    / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [target])
  return delta
}


function EmailForm({ id = 'hero', buttonLabel = 'Get Early Access' }) {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState(null) // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res  = await fetch('/api/early-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStatus('success')
      setMessage("You're on the list — we'll reach out when beta opens.")
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  if (status === 'success') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '12px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#4CAF7C' }}>
        <span style={{ fontSize: '18px' }}>✓</span> {message}
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <input
        id={id}
        type="email"
        required
        value={email}
        onChange={e => { setEmail(e.target.value); setStatus(null) }}
        placeholder="your@email.com"
        style={{ flex: '1 1 260px', maxWidth: '320px', background: '#18181C', border: '1.5px solid #2A2A32', borderRadius: '10px', padding: '13px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#F0EDE6', outline: 'none' }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{ background: '#C9A84C', color: '#0A0A0B', border: 'none', borderRadius: '10px', padding: '13px 28px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1, whiteSpace: 'nowrap' }}
      >
        {status === 'loading' ? 'Saving…' : buttonLabel}
      </button>
      {status === 'error' && <div style={{ width: '100%', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#C84B3C', textAlign: 'center' }}>{message}</div>}
    </form>
  )
}

function FeatureCard({ icon, title, body }) {
  return (
    <div style={{ background: '#111114', border: '1.5px solid #2A2A32', borderRadius: '14px', padding: '28px 24px', flex: '1 1 240px' }}>
      <div style={{ fontSize: '28px', marginBottom: '14px' }}>{icon}</div>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: '#F0EDE6', marginBottom: '10px', lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC', lineHeight: 1.7 }}>{body}</div>
    </div>
  )
}


function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '14px', fontWeight: 500 }}>
      {children}
    </div>
  )
}

export default function ComingSoon() {
  const countdown = useCountdown(LAUNCH_DATE)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#F0EDE6', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}>
        {/* Nav inside hero */}
        <div style={{ borderBottom: '1px solid #2A2A32', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', letterSpacing: '0.08em', color: '#C9A84C', fontWeight: 600 }}>
            ⬡ CHASE HOLLOW
          </div>
          <a href="/marketplace" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em', color: '#6C6A66', textDecoration: 'none' }}>
            Already have access? →
          </a>
        </div>

        {/* Giveaway announcement banner */}
        <a href="/giveaway" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', background: 'linear-gradient(90deg, rgba(201,168,76,0.07) 0%, rgba(201,168,76,0.13) 50%, rgba(201,168,76,0.07) 100%)', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '11px 24px', textDecoration: 'none', transition: 'background 0.2s', cursor: 'pointer' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 9px', borderRadius: '20px', background: '#C9A84C', color: '#0A0A0B', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>GIVEAWAY</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#F0EDE6', fontWeight: 500 }}>
            Win a <strong style={{ color: '#C9A84C' }}>Prismatic Evolutions Booster Box</strong> — sign up to enter
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#C9A84C', flexShrink: 0 }}>→</span>
        </a>

        {/* Two-column hero body */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 40px 56px', display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>

          {/* Left — copy */}
          <div style={{ flex: '1 1 400px', maxWidth: '560px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '5px 14px', marginBottom: '28px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
              Beta launching soon
            </div>

            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(42px, 6vw, 76px)', fontWeight: 300, lineHeight: 1.05, color: '#F0EDE6', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
              The TCG Market<br />
              <em style={{ color: '#C9A84C', fontStyle: 'italic' }}>Built on Trust</em>
            </h1>

            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 32px', maxWidth: '460px' }}>
              USDC escrow on Base. Physical card authentication. Zero buyer fees.
              Chase Hollow is a new kind of TCG marketplace — one where every card is
              authenticated and every transaction is secured on-chain.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <EmailForm id="hero-email" buttonLabel="Join the Waitlist" />
            </div>

            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '36px' }}>
              2,431 collectors already in line
            </div>

            {/* Stat strip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', background: '#2A2A32', border: '1px solid #2A2A32', borderRadius: '12px', overflow: 'hidden' }}>
              {[
                { stat: 'USDC',  sub: 'Escrow on Base' },
                { stat: 'Trust', sub: 'Every Card Inspected' },
                { stat: '0%',   sub: 'Buyer Fees' },
                { stat: 'Shared', sub: 'Creator Program' },
              ].map(({ stat, sub }) => (
                <div key={stat} style={{ flex: '1 1 80px', background: '#0A0A0B', padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', fontWeight: 700, color: '#C9A84C', letterSpacing: '0.06em' }}>{stat}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6C6A66', marginTop: '3px' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating cards + countdown */}
          <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '36px' }}>

            {/* Cards */}
            <style>{`
              @keyframes float-left   { 0%,100% { transform: rotate(-12deg) translateY(0px);  } 50% { transform: rotate(-12deg) translateY(-14px); } }
              @keyframes float-center { 0%,100% { transform: rotate(-2deg)  translateY(0px);  } 50% { transform: rotate(-2deg)  translateY(-18px); } }
              @keyframes float-right  { 0%,100% { transform: rotate(10deg)  translateY(0px);  } 50% { transform: rotate(10deg)  translateY(-11px); } }
            `}</style>
            <div style={{ position: 'relative', width: '340px', height: '340px', filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.5))' }}>
              {/* Soft glow pool beneath cards */}
              <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', width: '280px', height: '60px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
              {/* Left card */}
              <img
                src="/cards/card-1.png"
                alt=""
                style={{ position: 'absolute', width: '185px', left: '0px', top: '40px', borderRadius: '12px', zIndex: 1, animation: 'float-left 3.8s ease-in-out infinite', boxShadow: '0 20px 50px rgba(0,0,0,0.75), 0 6px 30px rgba(160,50,50,0.3)' }}
              />
              {/* Center card — front */}
              <img
                src="/cards/card-2.png"
                alt=""
                style={{ position: 'absolute', width: '205px', left: '67px', top: '8px', borderRadius: '12px', zIndex: 3, animation: 'float-center 4.4s ease-in-out infinite', boxShadow: '0 28px 70px rgba(0,0,0,0.85), 0 8px 40px rgba(201,168,76,0.25)' }}
              />
              {/* Right card */}
              <img
                src="/cards/card-3.png"
                alt=""
                style={{ position: 'absolute', width: '178px', right: '0px', top: '52px', borderRadius: '12px', zIndex: 2, animation: 'float-right 3.2s ease-in-out infinite', boxShadow: '0 20px 50px rgba(0,0,0,0.75), 0 6px 30px rgba(30,130,130,0.3)' }}
              />
            </div>

            {/* Countdown */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '16px' }}>
                ◆ Beta opens in ◆
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[
                  { value: countdown?.days,    label: 'Days' },
                  { value: countdown?.hours,   label: 'Hours' },
                  { value: countdown?.minutes, label: 'Min' },
                  { value: countdown?.seconds, label: 'Sec' },
                ].map(({ value, label }) => (
                  <div key={label} style={{ background: '#111114', border: '1px solid #2A2A32', borderRadius: '10px', padding: '14px 16px', minWidth: '68px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '32px', fontWeight: 700, color: '#F0EDE6', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {value === null || value === undefined ? '—' : String(value).padStart(2, '0')}
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6C6A66', marginTop: '6px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div style={{ borderTop: '1px solid #2A2A32', borderBottom: '1px solid #2A2A32', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>

          {/* Two featured stats */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ flex: '1 1 300px', background: 'rgba(201,168,76,0.05)', border: '1.5px solid rgba(201,168,76,0.25)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '42px', fontWeight: 600, color: '#C9A84C', lineHeight: 1, flexShrink: 0 }}>3.5%</div>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 600, color: '#F0EDE6', marginBottom: '3px' }}>Flat seller fee. That's it.</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC' }}>Buyers pay zero platform fees — ever. No hidden charges, no subscriptions.</div>
              </div>
            </div>
            <div style={{ flex: '1 1 300px', background: 'rgba(76,175,124,0.04)', border: '1.5px solid rgba(76,175,124,0.2)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '32px', flexShrink: 0 }}>⚖️</div>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 600, color: '#F0EDE6', marginBottom: '3px' }}>Every dispute reviewed by a human</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC' }}>No bots, no canned responses. Real staff, real evidence review, every time.</div>
              </div>
            </div>
          </div>

          {/* Supporting items */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 28px' }}>
            {['USDC Escrow on Base', 'Physical Card Authentication', 'Earn With Every Sale — Creator Program'].map(item => (
              <div key={item} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6C6A66' }}>
                <span style={{ color: '#C9A84C', marginRight: '8px' }}>⬡</span>{item}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── How it works ── */}
      <section style={{ maxWidth: '1060px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <SectionLabel>How It Works</SectionLabel>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 300, color: '#F0EDE6', margin: 0 }}>
            Simple for everyone
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

          {/* Buyer column */}
          <div style={{ flex: '1 1 440px', background: '#111114', border: '1.5px solid #2A2A32', borderRadius: '16px', padding: '32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(60,125,200,0.15)', border: '1.5px solid rgba(60,125,200,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>👤</div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: '#F0EDE6', lineHeight: 1 }}>Buying a Card</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3C7DC8', marginTop: '4px' }}>Zero platform fees</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { n: '1', title: 'Find your card', body: 'Browse the marketplace by game, grade, or price. Every listing includes photos and every card is authenticated before it reaches you.' },
                { n: '2', title: 'Buy with USDC', body: 'Connect your wallet and lock funds in escrow. Your money sits on-chain — not in our account — until the card is verified and delivered.' },
                { n: '3', title: 'Card authenticated & shipped', body: 'Chase Hollow reviews every card before it reaches you — remote photo auth or physical inspection at our center for high-value cards.' },
                { n: '4', title: 'Inspect, then done', body: 'You get 72 hours to inspect after delivery. Satisfied? Escrow releases automatically. Problem? Open a dispute and a real person handles it.' },
              ].map(({ n, title, body }, i, arr) => (
                <div key={n} style={{ display: 'flex', gap: '16px', paddingBottom: i < arr.length - 1 ? '24px' : '0', position: 'relative' }}>
                  {i < arr.length - 1 && <div style={{ position: 'absolute', left: '15px', top: '32px', bottom: '0', width: '1px', background: '#2A2A32' }} />}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(60,125,200,0.12)', border: '1.5px solid rgba(60,125,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: 700, color: '#3C7DC8', flexShrink: 0, zIndex: 1 }}>{n}</div>
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#F0EDE6', marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC', lineHeight: 1.65 }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seller column */}
          <div style={{ flex: '1 1 440px', background: '#111114', border: '1.5px solid #2A2A32', borderRadius: '16px', padding: '32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🏪</div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: '#F0EDE6', lineHeight: 1 }}>Selling a Card</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginTop: '4px' }}>3.5% flat fee</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { n: '1', title: 'List your card', body: 'Upload photos, set your price, and go live instantly. No wallet needed to list — you only connect at transaction time.' },
                { n: '2', title: 'Card sells — ship within 48hrs', body: 'You\'ll get an email the moment a buyer locks funds. Upload 3 pre-ship photos, print your Chase Hollow label, and hand it to the carrier.' },
                { n: '3', title: 'Authentication happens in transit', body: 'Our staff reviews your photos while the card is on its way. No delays — for physical auth, the card routes through our center first.' },
                { n: '4', title: 'Get paid in USDC', body: 'Once the buyer confirms delivery (or 72hrs pass), escrow releases. You receive the sale price minus 3.5%, direct to your wallet.' },
              ].map(({ n, title, body }, i, arr) => (
                <div key={n} style={{ display: 'flex', gap: '16px', paddingBottom: i < arr.length - 1 ? '24px' : '0', position: 'relative' }}>
                  {i < arr.length - 1 && <div style={{ position: 'absolute', left: '15px', top: '32px', bottom: '0', width: '1px', background: '#2A2A32' }} />}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: 700, color: '#C9A84C', flexShrink: 0, zIndex: 1 }}>{n}</div>
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#F0EDE6', marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC', lineHeight: 1.65 }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Feature cards ── */}
      <section style={{ maxWidth: '1060px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <SectionLabel>Why Chase Hollow</SectionLabel>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 300, color: '#F0EDE6', margin: 0 }}>
            Every feature exists to protect you
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <FeatureCard
            icon="🔒"
            title="USDC Escrow — Always"
            body="Funds lock on-chain the moment a buyer purchases. The seller can't touch it. The buyer can't claw it back. Only a verified outcome — delivery, authentication pass, or dispute resolution — moves the money."
          />
          <FeatureCard
            icon="🔍"
            title="Authentication on Every Card"
            body="Remote photo auth for cards under $300. Physical inspection at our auth center for $301+. No tier skips, no exceptions. Every card is verified before it reaches the buyer."
          />
          <FeatureCard
            icon="⚖️"
            title="Human Dispute Resolution"
            body="When something goes wrong, a real person reviews the evidence — not an algorithm. Staff recommends, the owner executes. Both sides get a fair hearing, every time."
          />
          <FeatureCard
            icon="💸"
            title="3.5% Flat — Sellers Only"
            body="Buyers pay zero platform fees. Ever. Sellers pay 3.5% — that's it. No withdrawal fees, no hidden charges, no subscription. We make money when you do."
          />
          <FeatureCard
            icon="🛡"
            title="Seller Bond System"
            body="Every seller posts a small USDC bond per transaction — collateral, not a fee, returned after settlement. It keeps bad actors out and gives buyers a real financial backstop if anything goes wrong."
          />
          <FeatureCard
            icon="🎯"
            title="Creator Affiliate Program"
            body="Refer a sale through your link and earn 0.5% of the transaction — deposited in USDC, every month, forever. Build an audience, earn from every card your community buys."
          />
        </div>
      </section>

      {/* ── Escrow section ── */}
      <section style={{ background: '#0D0D10', borderTop: '1px solid #2A2A32', borderBottom: '1px solid #2A2A32' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '80px 24px', display: 'flex', gap: '60px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px' }}>
            <SectionLabel>Blockchain Escrow</SectionLabel>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 20px', lineHeight: 1.2 }}>
              Your money lives on-chain.<br />
              <em style={{ color: '#C9A84C' }}>Not in our bank account.</em>
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 20px' }}>
              Chase Hollow runs on Base — Ethereum Layer 2. When you buy a card, your USDC locks in a smart contract we can't touch. It releases automatically on confirmed delivery, or resolves via our dispute system. No float, no counterparty risk.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Funds lock at purchase — not at listing', 'Auto-release 72hrs after delivery', 'Full refund if card fails authentication', 'Dispute resolution executes on-chain'].map(point => (
                <div key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC' }}>
                  <span style={{ color: '#4CAF7C', marginTop: '1px', flexShrink: 0 }}>✓</span>{point}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: '1 1 400px' }}>
            <img src="/screenshots/escrow.png" alt="Chase Hollow escrow checkout" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'block' }} />
          </div>
        </div>
      </section>

      {/* ── Auth section ── */}
      <section style={{ maxWidth: '1060px', margin: '0 auto', padding: '80px 24px', display: 'flex', gap: '60px', alignItems: 'center', flexWrap: 'wrap-reverse' }}>
        <div style={{ flex: '1 1 400px' }}>
          <img src="/screenshots/authenticator.png" alt="Chase Hollow authentication portal" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'block' }} />
        </div>
        <div style={{ flex: '1 1 340px' }}>
          <SectionLabel>Authentication</SectionLabel>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 20px', lineHeight: 1.2 }}>
            Every card verified.<br />
            <em style={{ color: '#C9A84C' }}>No exceptions.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 20px' }}>
            Remote photo authentication on every card under $300 — front, back, sealed package — reviewed by our staff while the card is in transit. Physical inspection at our authentication center for high-value cards. The buyer never receives an unverified card.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['Photo match', 'Grade label verify', 'PSA / BGS / CGC cert DB', 'Slab integrity', 'Holographic sticker', 'Sealed package confirm'].map(check => (
              <div key={check} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B8B4AC', background: '#111114', border: '1px solid #2A2A32', borderRadius: '6px', padding: '5px 10px' }}>
                {check}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dispute section ── */}
      <section style={{ background: '#0D0D10', borderTop: '1px solid #2A2A32', borderBottom: '1px solid #2A2A32' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '80px 24px', display: 'flex', gap: '60px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px' }}>
            <SectionLabel>Dispute Resolution</SectionLabel>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 20px', lineHeight: 1.2 }}>
              Disputes resolved by<br />
              <em style={{ color: '#C9A84C' }}>people, not policies.</em>
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 0 24px' }}>
              If something goes wrong, both parties submit evidence. A Chase Hollow staff member reviews everything — the listing photos, the pre-ship photos, the buyer's claim, the seller's response — and recommends an outcome. The owner executes the final decision on-chain. No bots, no canned responses.
            </p>
            <div style={{ background: '#111114', border: '1px solid #2A2A32', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '10px' }}>How it works</div>
              {[
                ['Buyer opens dispute', 'Submits photos + description'],
                ['Seller responds', '48hr window to submit counter-evidence'],
                ['Staff reviews all evidence', 'Listing photos, pre-ship photos, both sides'],
                ['Owner executes on-chain', 'Funds move — no manual transfers'],
              ].map(([step, detail]) => (
                <div key={step} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px solid #1A1A20', fontSize: '12px' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', color: '#F0EDE6', fontWeight: 500 }}>{step}</span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', color: '#6C6A66', textAlign: 'right' }}>{detail}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: '1 1 400px' }}>
            <img src="/screenshots/dispute.png" alt="Chase Hollow dispute resolution" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'block' }} />
          </div>
        </div>
      </section>

      {/* ── Creator section ── */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <SectionLabel>Creator Program</SectionLabel>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 20px', lineHeight: 1.15 }}>
          Earn <em style={{ color: '#C9A84C' }}>0.5%</em> on every card<br />your community buys
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 auto 40px', maxWidth: '560px' }}>
          Apply for a creator referral link. Share it on YouTube, TikTok, X — anywhere. When someone buys through your link, you earn 0.5% of the sale price in USDC, paid out monthly. No cap. No expiry. Just a clean 30-day attribution window and a wallet payout.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            ['0.5%', 'Per referred sale'],
            ['30 days', 'Attribution window'],
            ['Monthly', 'USDC payout'],
            ['Open', 'Application — anyone can apply'],
          ].map(([stat, label]) => (
            <div key={label} style={{ background: '#111114', border: '1.5px solid #2A2A32', borderRadius: '12px', padding: '20px 24px', minWidth: '140px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 600, color: '#C9A84C', lineHeight: 1 }}>{stat}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6C6A66', marginTop: '6px' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Marketplace tease ── */}
      <section style={{ background: '#0D0D10', borderTop: '1px solid #2A2A32', borderBottom: '1px solid #2A2A32' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <SectionLabel>The Marketplace</SectionLabel>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 300, color: '#F0EDE6', margin: '0 auto 16px', maxWidth: '600px', lineHeight: 1.2 }}>
            Every card. Every game.<br />
            <em style={{ color: '#C9A84C' }}>Every transaction protected.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 auto 40px', maxWidth: '520px' }}>
            Pokémon, Magic, One Piece, Lorcana, Sports — graded slabs, raw singles, sealed product. Filtered, searchable, and backed by the same escrow and auth system on every listing.
          </p>
          <img src="/screenshots/marketplace.png" alt="Chase Hollow marketplace" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'block' }} />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ maxWidth: '620px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 16px', lineHeight: 1.15 }}>
          Be first through the door
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#B8B4AC', lineHeight: 1.75, margin: '0 auto 32px', maxWidth: '480px' }}>
          Join the waitlist and we'll email you when beta opens — before it goes public. Early sellers get priority listing slots.
        </p>
        <EmailForm id="footer-email" buttonLabel="Secure My Spot" />
      </section>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #2A2A32', padding: '28px 24px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#C9A84C', letterSpacing: '0.06em' }}>
            ⬡ CHASE HOLLOW
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <a href="https://x.com/chasehollowtcg" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#6C6A66', textDecoration: 'none', letterSpacing: '0.08em' }}>
              𝕏 @chasehollowtcg
            </a>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#3A3A42' }}>
            © 2026 Chase Hollow
          </div>
        </div>
      </div>

    </div>
  )
}
