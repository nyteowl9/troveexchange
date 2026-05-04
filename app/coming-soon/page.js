'use client'

import { useState, useEffect } from 'react'

const LAUNCH_DATE = new Date('2026-05-21T09:00:00-06:00')

const PRIZES = [
  {
    week: 'Week 1',
    status: 'active',
    name: 'Prismatic Evolutions',
    subtitle: 'Pokémon TCG · Booster Box · English',
    value: 95,
    image: '/giveaway/prismatic.jpg',
    tags: ['SEALED', '1 WINNER'],
  },
  {
    week: 'Week 2',
    status: 'upcoming',
    name: '151 Booster Bundle',
    subtitle: 'Pokémon TCG · Scarlet & Violet · English',
    value: 225,
    image: '/giveaway/151booster.jpg',
    tags: ['SEALED', '1 WINNER'],
  },
  {
    week: 'Week 3',
    status: 'upcoming',
    name: 'Monkey D. Luffy PSA 10',
    subtitle: 'One Piece TCG · OP13 #118 · Alt Art',
    value: 300,
    image: '/giveaway/monkeydluffypsa10.png',
    tags: ['PSA 10', '1 WINNER'],
  },
  {
    week: 'Launch Day',
    status: 'grand',
    name: 'Secrets of Strixhaven',
    subtitle: 'Magic: The Gathering · Booster Box · English',
    value: 500,
    image: '/giveaway/strixhaven.jpg',
    tags: ['SEALED', '1 WINNER'],
  },
]

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

function EmailForm({ id = 'hero', buttonLabel = 'Get Early Access', pill = false }) {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState(null)
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
    if (pill) {
      return (
        <div style={{ textAlign: 'center', padding: '24px 28px', background: 'rgba(201,168,76,0.06)', border: '1.5px solid rgba(201,168,76,0.3)', borderRadius: '14px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#C9A84C', marginBottom: '6px' }}><em>You're in the draw!</em></div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC', lineHeight: 1.6 }}>
            Winner announced <strong style={{ color: '#F0EDE6' }}>May 21</strong> on{' '}
            <a href="https://x.com/chasehollowtcg" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A84C', textDecoration: 'none' }}>@chasehollowtcg</a>
          </div>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '12px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#4CAF7C' }}>
        <span style={{ fontSize: '18px' }}>✓</span> {message}
      </div>
    )
  }

  if (pill) {
    return (
      <form onSubmit={submit}>
        <div style={{ display: 'flex', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid rgba(201,168,76,0.45)', background: '#0d0d10' }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setStatus(null) }}
            placeholder="your@email.com"
            required
            disabled={status === 'loading'}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '14px 18px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#F0EDE6' }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8CC72 50%, #C9A84C 100%)', backgroundSize: '200% 100%', border: 'none', padding: '14px 24px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', fontWeight: 600, color: '#0A0A0B', whiteSpace: 'nowrap' }}
          >
            {status === 'loading' ? '···' : buttonLabel}
          </button>
        </div>
        {status === 'error' && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#C84B3C', textAlign: 'center', marginTop: '8px' }}>{message}</div>}
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#6C6A66', textAlign: 'center', marginTop: '10px' }}>
          Free to enter · Also reserves your spot in the Chase Hollow beta
        </div>
      </form>
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

function CountBox({ value, label }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '54px' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '32px', fontWeight: 500, color: '#C9A84C', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 0 28px rgba(201,168,76,0.5)' }}>
        {String(value ?? 0).padStart(2, '0')}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#6C6A66', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '5px' }}>
        {label}
      </div>
    </div>
  )
}

function PrizeCard({ week, status, name, subtitle, value, image }) {
  const isActive  = status === 'active'
  const isGrand   = status === 'grand'
  return (
    <div style={{
      background:  isActive ? 'rgba(201,168,76,0.04)' : isGrand ? 'linear-gradient(135deg, #1a1408 0%, #111114 100%)' : '#111114',
      border:      `1.5px solid ${isActive ? 'rgba(201,168,76,0.45)' : isGrand ? 'rgba(201,168,76,0.22)' : '#2A2A32'}`,
      borderRadius: '14px',
      padding:     '20px 16px',
      textAlign:   'center',
      animation:   isGrand ? 'grand-pulse 3s ease-in-out infinite' : undefined,
      position:    'relative',
      overflow:    'hidden',
    }}>
      {isGrand && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />}

      <div style={{ marginBottom: '14px' }}>
        <span style={{
          fontFamily: 'DM Mono, monospace', fontSize: '7px', padding: '3px 10px', borderRadius: '20px',
          background: isActive ? '#C9A84C' : isGrand ? 'rgba(201,168,76,0.1)' : 'rgba(42,42,50,0.8)',
          color:      isActive ? '#0A0A0B' : isGrand ? '#C9A84C' : '#6C6A66',
          border:     isActive ? 'none' : `1px solid ${isGrand ? 'rgba(201,168,76,0.3)' : '#2A2A32'}`,
          letterSpacing: '0.1em', fontWeight: isActive ? 700 : 500, textTransform: 'uppercase',
        }}>
          {isActive ? 'ACTIVE NOW' : isGrand ? 'GRAND PRIZE' : 'COMING SOON'}
        </span>
      </div>

      <div style={{ width: '88px', height: '116px', margin: '0 auto 14px', borderRadius: '10px', overflow: 'hidden', border: `1.5px solid ${isActive ? 'rgba(201,168,76,0.4)' : isGrand ? 'rgba(201,168,76,0.2)' : '#2A2A32'}` }}>
        <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#6C6A66', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>{week}</div>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: isActive || isGrand ? '#C9A84C' : '#F0EDE6', fontStyle: 'italic', marginBottom: '3px', lineHeight: 1.2 }}>{name}</div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: '#6C6A66', marginBottom: '12px', lineHeight: 1.4 }}>{subtitle}</div>

      <div style={{
        fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px',
        background: isActive ? 'rgba(201,168,76,0.1)' : 'rgba(42,42,50,0.5)',
        border:     `1px solid ${isActive ? 'rgba(201,168,76,0.3)' : '#2A2A32'}`,
        color:      isActive ? '#C9A84C' : '#B8B4AC',
        display: 'inline-block', letterSpacing: '0.06em',
      }}>
        ~${value.toLocaleString()} VALUE
      </div>
    </div>
  )
}

export default function ComingSoon() {
  const countdown = useCountdown(LAUNCH_DATE)
  const [entryCount, setEntryCount] = useState(null)

  useEffect(() => {
    fetch('/api/giveaway')
      .then(r => r.json())
      .then(({ count }) => setEntryCount(count))
      .catch(() => {})
  }, [])

  const countDisplay = entryCount !== null && entryCount >= 50
    ? `${entryCount.toLocaleString()} people entered`
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#F0EDE6', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes float-left   { 0%,100% { transform: rotate(-12deg) translateY(0px);  } 50% { transform: rotate(-12deg) translateY(-14px); } }
        @keyframes float-center { 0%,100% { transform: rotate(-2deg)  translateY(0px);  } 50% { transform: rotate(-2deg)  translateY(-18px); } }
        @keyframes float-right  { 0%,100% { transform: rotate(10deg)  translateY(0px);  } 50% { transform: rotate(10deg)  translateY(-11px); } }
        @keyframes prize-float  { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-16px); } }
        @keyframes prize-glow   { 0%,100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes grand-pulse  { 0%,100% { box-shadow: 0 0 30px rgba(201,168,76,0.15), 0 0 60px rgba(201,168,76,0.05); } 50% { box-shadow: 0 0 50px rgba(201,168,76,0.35), 0 0 100px rgba(201,168,76,0.14); } }
        @keyframes badge-in     { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .prize-float  { animation: prize-float 4.5s ease-in-out infinite; }
        .glow-ring    { animation: prize-glow  4.5s ease-in-out infinite; }
        .step-card    { transition: border-color 0.2s, transform 0.2s; }
        .step-card:hover { border-color: rgba(201,168,76,0.3) !important; transform: translateY(-2px); }
        @media (max-width: 700px)  { .prize-grid       { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px)  { .prize-grid       { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px)  { .gw-hero-grid     { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px)  { .gw-steps-grid    { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}>
        <div style={{ borderBottom: '1px solid #2A2A32', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', letterSpacing: '0.08em', color: '#C9A84C', fontWeight: 600 }}>
            ⬡ CHASE HOLLOW
          </div>
          <a href="/marketplace" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em', color: '#6C6A66', textDecoration: 'none' }}>
            Already have access? →
          </a>
        </div>

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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', background: '#2A2A32', border: '1px solid #2A2A32', borderRadius: '12px', overflow: 'hidden' }}>
              {[
                { stat: 'USDC',   sub: 'Escrow on Base' },
                { stat: 'Trust',  sub: 'Every Card Inspected' },
                { stat: '0%',     sub: 'Buyer Fees' },
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
            <style>{`
              @keyframes float-left   { 0%,100% { transform: rotate(-12deg) translateY(0px);  } 50% { transform: rotate(-12deg) translateY(-14px); } }
              @keyframes float-center { 0%,100% { transform: rotate(-2deg)  translateY(0px);  } 50% { transform: rotate(-2deg)  translateY(-18px); } }
              @keyframes float-right  { 0%,100% { transform: rotate(10deg)  translateY(0px);  } 50% { transform: rotate(10deg)  translateY(-11px); } }
            `}</style>
            <div style={{ position: 'relative', width: '340px', height: '340px', filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.5))' }}>
              <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', width: '280px', height: '60px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
              <img src="/cards/card-1.png" alt="" style={{ position: 'absolute', width: '185px', left: '0px', top: '40px', borderRadius: '12px', zIndex: 1, animation: 'float-left 3.8s ease-in-out infinite', boxShadow: '0 20px 50px rgba(0,0,0,0.75), 0 6px 30px rgba(160,50,50,0.3)' }} />
              <img src="/cards/card-2.png" alt="" style={{ position: 'absolute', width: '205px', left: '67px', top: '8px', borderRadius: '12px', zIndex: 3, animation: 'float-center 4.4s ease-in-out infinite', boxShadow: '0 28px 70px rgba(0,0,0,0.85), 0 8px 40px rgba(201,168,76,0.25)' }} />
              <img src="/cards/card-3.png" alt="" style={{ position: 'absolute', width: '178px', right: '0px', top: '52px', borderRadius: '12px', zIndex: 2, animation: 'float-right 3.2s ease-in-out infinite', boxShadow: '0 20px 50px rgba(0,0,0,0.75), 0 6px 30px rgba(30,130,130,0.3)' }} />
            </div>

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

      {/* ── Giveaway Section ── */}
      <section style={{ background: '#0D0D10', borderTop: '1px solid #2A2A32', borderBottom: '1px solid #2A2A32' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '80px 24px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <SectionLabel>Beta Launch Giveaway Series</SectionLabel>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 14px', lineHeight: 1.05 }}>
              Win big — <em style={{ color: '#C9A84C' }}>enter free</em>
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#B8B4AC', margin: '0 auto', maxWidth: '440px', lineHeight: 1.7 }}>
              Sign up once — you're entered into every weekly draw until launch day.
            </p>
            {countDisplay && (
              <div style={{ display: 'inline-block', fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '5px 16px', borderRadius: '20px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', letterSpacing: '0.1em', marginTop: '16px', animation: 'badge-in 0.4s ease forwards' }}>
                🏆 {countDisplay}
              </div>
            )}
          </div>

          {/* Active prize featured */}
          <div className="gw-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center', marginBottom: '64px' }}>

            {/* Floating prize image */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div className="glow-ring" style={{ position: 'absolute', width: '300px', height: '380px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,168,76,0.26) 0%, rgba(201,168,76,0.07) 55%, transparent 75%)', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              <div className="prize-float" style={{ position: 'relative', zIndex: 1 }}>
                <img
                  src={PRIZES[0].image}
                  alt={PRIZES[0].name}
                  style={{ width: '230px', borderRadius: '14px', border: '2px solid rgba(201,168,76,0.5)', boxShadow: '0 0 40px rgba(201,168,76,0.25), 0 24px 64px rgba(0,0,0,0.65)', display: 'block' }}
                />
                <div style={{ width: '160px', height: '20px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.14) 0%, transparent 70%)', margin: '12px auto 0', borderRadius: '50%' }} />
              </div>
            </div>

            {/* Prize details + countdown + form */}
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '8px' }}>Week 1 · Current Giveaway</div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 300, color: '#F0EDE6', margin: '0 0 6px', lineHeight: 1.05 }}>
                <em style={{ color: '#C9A84C' }}>{PRIZES[0].name}</em>
              </h3>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC', marginBottom: '22px' }}>{PRIZES[0].subtitle}</div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', letterSpacing: '0.08em', fontWeight: 500 }}>~${PRIZES[0].value} VALUE</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.25)', color: '#4CAF7C', letterSpacing: '0.08em', fontWeight: 500 }}>1 WINNER</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(60,125,200,0.08)', border: '1px solid rgba(60,125,200,0.25)', color: '#3C7DC8', letterSpacing: '0.08em', fontWeight: 500 }}>SEALED</span>
              </div>

              {countdown && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '12px' }}>Draw in</div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <CountBox value={countdown.days}    label="days" />
                    <div style={{ color: '#2A2A32', fontSize: '20px', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>:</div>
                    <CountBox value={countdown.hours}   label="hrs" />
                    <div style={{ color: '#2A2A32', fontSize: '20px', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>:</div>
                    <CountBox value={countdown.minutes} label="min" />
                    <div style={{ color: '#2A2A32', fontSize: '20px', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>:</div>
                    <CountBox value={countdown.seconds} label="sec" />
                  </div>
                </div>
              )}

              <EmailForm id="giveaway-entry" buttonLabel="ENTER TO WIN →" pill />
            </div>
          </div>

          {/* All 4 prizes */}
          <div style={{ marginBottom: '56px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6C6A66' }}>
                All Prizes · One entry covers every draw
              </div>
            </div>
            <div className="prize-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              {PRIZES.map(prize => <PrizeCard key={prize.week} {...prize} />)}
            </div>
          </div>

          {/* How to enter */}
          <div style={{ background: '#111114', border: '1.5px solid #2A2A32', borderRadius: '16px', padding: '40px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '8px' }}>How It Works</div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: '#F0EDE6', margin: 0 }}>Three steps to win</h3>
            </div>
            <div className="gw-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { n: '01', title: 'Enter your email', body: 'Sign up for Chase Hollow beta access. Your email is your entry — one per person, automatically entered in every weekly draw.' },
                { n: '02', title: 'Follow on X',       body: 'Follow @chasehollowtcg for winner announcements. Winners are contacted via X DM or email within 48hrs of each draw.' },
                { n: '03', title: 'Win & get shipped', body: 'Weekly winners drawn until launch day — May 21. Your prize ships directly to you, sealed and insured.' },
              ].map(step => (
                <div key={step.n} className="step-card" style={{ background: '#0A0A0B', border: '1.5px solid #2A2A32', borderRadius: '14px', padding: '28px 22px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '26px', color: 'rgba(201,168,76,0.2)', fontWeight: 500, marginBottom: '14px', lineHeight: 1 }}>{step.n}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#F0EDE6', marginBottom: '8px' }}>{step.title}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6C6A66', lineHeight: 1.6 }}>{step.body}</div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#3a3a44', lineHeight: 1.8, letterSpacing: '0.04em', textAlign: 'center', marginTop: '28px', marginBottom: 0 }}>
            No purchase necessary. Open to US residents 18+. One entry per email address. Winners selected randomly and notified via email and/or X DM within 48 hours of draw. Prize shipped sealed and insured.
          </p>

        </div>
      </section>

      {/* ── Trust bar ── */}
      <div style={{ borderTop: '1px solid #2A2A32', borderBottom: '1px solid #2A2A32', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
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
                { n: '2', title: 'Card sells — ship within 48hrs', body: "You'll get an email the moment a buyer locks funds. Upload 3 pre-ship photos, print your Chase Hollow label, and hand it to the carrier." },
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
          <FeatureCard icon="🔒" title="USDC Escrow — Always"           body="Funds lock on-chain the moment a buyer purchases. The seller can't touch it. The buyer can't claw it back. Only a verified outcome — delivery, authentication pass, or dispute resolution — moves the money." />
          <FeatureCard icon="🔍" title="Authentication on Every Card"   body="Remote photo auth for cards under $300. Physical inspection at our auth center for $301+. No tier skips, no exceptions. Every card is verified before it reaches the buyer." />
          <FeatureCard icon="⚖️" title="Human Dispute Resolution"       body="When something goes wrong, a real person reviews the evidence — not an algorithm. Staff recommends, the owner executes. Both sides get a fair hearing, every time." />
          <FeatureCard icon="💸" title="3.5% Flat — Sellers Only"       body="Buyers pay zero platform fees. Ever. Sellers pay 3.5% — that's it. No withdrawal fees, no hidden charges, no subscription. We make money when you do." />
          <FeatureCard icon="🛡" title="Seller Bond System"             body="Every seller posts a small USDC bond per transaction — collateral, not a fee, returned after settlement. It keeps bad actors out and gives buyers a real financial backstop if anything goes wrong." />
          <FeatureCard icon="🎯" title="Creator Affiliate Program"      body="Refer a sale through your link and earn 0.5% of the transaction — deposited in USDC, every month, forever. Build an audience, earn from every card your community buys." />
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
                ['Buyer opens dispute',       'Submits photos + description'],
                ['Seller responds',           '48hr window to submit counter-evidence'],
                ['Staff reviews all evidence','Listing photos, pre-ship photos, both sides'],
                ['Owner executes on-chain',   'Funds move — no manual transfers'],
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
            ['0.5%',    'Per referred sale'],
            ['30 days', 'Attribution window'],
            ['Monthly', 'USDC payout'],
            ['Open',    'Application — anyone can apply'],
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
