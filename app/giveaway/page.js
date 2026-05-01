'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const DRAW_DATE = new Date('2026-05-21T09:00:00-06:00')

function useCountdown(target) {
  const [delta, setDelta] = useState(null)
  useEffect(() => {
    function calc() {
      const ms = target - Date.now()
      if (ms <= 0) return setDelta({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setDelta({
        days:    Math.floor(ms / 86400000),
        hours:   Math.floor((ms % 86400000) / 3600000),
        minutes: Math.floor((ms % 3600000) / 60000),
        seconds: Math.floor((ms % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [target])
  return delta
}

function EntryForm() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState('idle')
  const [msg, setMsg]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res  = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setMsg(err.message)
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '28px 32px', background: 'rgba(201,168,76,0.06)', border: '1.5px solid rgba(201,168,76,0.3)', borderRadius: '16px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#C9A84C', marginBottom: '8px' }}><em>You're in the draw!</em></div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8B4AC', lineHeight: 1.6 }}>
          Winner announced on <strong style={{ color: '#F0EDE6' }}>May 21</strong> on{' '}
          <a href="https://x.com/chasehollowtcg" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A84C', textDecoration: 'none' }}>@chasehollowtcg</a>.
          Check your email too — you're on the early access list.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ display: 'flex', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid rgba(201,168,76,0.45)', background: '#0d0d10' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === 'loading'}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '15px 20px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#F0EDE6' }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="gw-btn"
          style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8CC72 50%, #C9A84C 100%)', backgroundSize: '200% 100%', border: 'none', padding: '15px 26px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.14em', fontWeight: 600, color: '#0A0A0B', whiteSpace: 'nowrap', transition: 'background-position 0.4s ease' }}
        >
          {status === 'loading' ? '···' : 'ENTER TO WIN →'}
        </button>
      </div>
      {status === 'error' && (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#C84B3C', textAlign: 'center', marginTop: '8px' }}>{msg}</div>
      )}
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#6C6A66', textAlign: 'center', marginTop: '10px' }}>
        Free to enter · Also reserves your spot in the Chase Hollow beta · No spam, ever
      </div>
    </form>
  )
}

function CountBox({ value, label }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '72px' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '44px', fontWeight: 500, color: '#C9A84C', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 0 40px rgba(201,168,76,0.6)' }}>
        {String(value ?? 0).padStart(2, '0')}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#6C6A66', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '7px' }}>
        {label}
      </div>
    </div>
  )
}

function MysteryCard({ week, hint }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #111114 0%, #16161a 100%)', border: '1.5px solid #2A2A32', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.012) 6px, rgba(255,255,255,0.012) 12px)', pointerEvents: 'none' }} />
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.18em', color: '#6C6A66', textTransform: 'uppercase', marginBottom: '20px' }}>{week}</div>
      <div style={{ width: '80px', height: '110px', margin: '0 auto 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #1a1a22, #222228)', border: '1.5px dashed #2A2A32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '40px', color: '#3a3a44', fontStyle: 'italic' }}>?</div>
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 12px', borderRadius: '20px', background: 'rgba(42,42,50,0.8)', border: '1px solid #2A2A32', color: '#6C6A66', display: 'inline-block', letterSpacing: '0.08em', marginBottom: '10px' }}>LOCKED</div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#4a4a58', lineHeight: 1.4 }}>{hint}</div>
    </div>
  )
}

export default function GiveawayPage() {
  const [entryCount, setEntryCount] = useState(null)
  const [imgErr, setImgErr]         = useState(false)
  const countdown                   = useCountdown(DRAW_DATE)

  useEffect(() => {
    fetch('/api/giveaway')
      .then(r => r.json())
      .then(({ count }) => setEntryCount(count))
      .catch(() => {})
  }, [])

  const countDisplay = entryCount !== null
    ? entryCount >= 50
      ? `${entryCount.toLocaleString()} people entered`
      : 'Be among the first to enter'
    : null

  return (
    <>
      <style>{`
        @keyframes prize-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-16px); }
        }
        @keyframes prize-glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes shimmer-sweep {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes grand-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(201,168,76,0.2), 0 0 60px rgba(201,168,76,0.08); }
          50%       { box-shadow: 0 0 60px rgba(201,168,76,0.45), 0 0 120px rgba(201,168,76,0.2); }
        }
        @keyframes badge-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .prize-float { animation: prize-float 4.5s ease-in-out infinite; }
        .glow-ring   { animation: prize-glow  4.5s ease-in-out infinite; }
        .grand-card  { animation: grand-pulse 3s ease-in-out infinite; }
        .gw-btn:hover { background-position: 100% center !important; }
        .step-card:hover { border-color: rgba(201,168,76,0.3) !important; transform: translateY(-2px); }
        .step-card { transition: border-color 0.2s, transform 0.2s; }
      `}</style>

      <div style={{ background: '#0A0A0B', minHeight: '100vh', paddingTop: '64px' }}>

        {/* ── HERO ──────────────────────────────────────────────── */}
        <div style={{ paddingTop: '60px', paddingBottom: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Grid bg */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
          {/* Top glow */}
          <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: '860px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '20px', opacity: 0.8 }}>
              Chase Hollow · Beta Launch Series · Week 1
            </div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(52px, 9vw, 96px)', fontWeight: 300, lineHeight: 0.95, color: '#F0EDE6', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
              Win a Box of<br />
              <em style={{ color: '#C9A84C', textShadow: '0 0 60px rgba(201,168,76,0.4)' }}>Prismatic Evolutions</em>
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '17px', color: '#B8B4AC', maxWidth: '520px', margin: '0 auto 36px', lineHeight: 1.6 }}>
              Sign up for Chase Hollow beta access to enter. One winner selected on launch day — announced live on X.
            </p>

            {/* Entry count badge */}
            {countDisplay && (
              <div style={{ display: 'inline-block', fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '5px 16px', borderRadius: '20px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', letterSpacing: '0.1em', marginBottom: '36px', animation: 'badge-in 0.4s ease forwards' }}>
                🏆 {countDisplay}
              </div>
            )}
          </div>
        </div>

        {/* ── PRIZE SHOWCASE ────────────────────────────────────── */}
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 2rem 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          {/* Left: floating prize */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div className="glow-ring" style={{ position: 'absolute', width: '260px', height: '350px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(201,168,76,0.28) 0%, rgba(201,168,76,0.08) 50%, transparent 75%)', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="prize-float" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '200px', height: '270px', borderRadius: '14px', overflow: 'hidden',
                border: '2px solid rgba(201,168,76,0.5)',
                boxShadow: '0 0 40px rgba(201,168,76,0.25), 0 20px 60px rgba(0,0,0,0.6)',
                background: 'linear-gradient(135deg, #1a0a2e 0%, #0a1a2e 20%, #0a2e1a 40%, #2e1a0a 60%, #2e0a1a 80%, #1a0a2e 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '10px', padding: '20px', position: 'relative',
              }}>
                {/* Iridescent shimmer overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.03) 100%)', pointerEvents: 'none' }} />
                {!imgErr && (
                  <img
                    src="/giveaway/prismatic.png"
                    alt="Prismatic Evolutions Booster Box"
                    onError={() => setImgErr(true)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                  />
                )}
                {imgErr && (
                  <>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', zIndex: 1 }}>Pokémon TCG</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#F0EDE6', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.2, zIndex: 1, padding: '0 8px' }}>Prismatic Evolutions</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', zIndex: 1 }}>Booster Box</div>
                  </>
                )}
              </div>
              {/* Reflection */}
              <div style={{ width: '160px', height: '20px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.15) 0%, transparent 70%)', margin: '10px auto 0', borderRadius: '50%' }} />
            </div>
          </div>

          {/* Right: info + countdown + entry */}
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '10px' }}>Current Prize — Week 1</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, color: '#F0EDE6', marginBottom: '6px', lineHeight: 1.1 }}>
              <em style={{ color: '#C9A84C' }}>Prismatic Evolutions</em>
            </h2>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8B4AC', marginBottom: '20px' }}>
              Pokémon TCG · Booster Box · English
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', letterSpacing: '0.08em', fontWeight: 500 }}>~$150 VALUE</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.25)', color: '#4CAF7C', letterSpacing: '0.08em', fontWeight: 500 }}>1 WINNER</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(60,125,200,0.08)', border: '1px solid rgba(60,125,200,0.25)', color: '#3C7DC8', letterSpacing: '0.08em', fontWeight: 500 }}>SEALED</span>
            </div>

            {/* Countdown */}
            {countdown && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '12px' }}>Draw in</div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <CountBox value={countdown.days}    label="days" />
                  <div style={{ color: '#2A2A32', fontSize: '24px', fontFamily: 'DM Mono, monospace', marginBottom: '14px' }}>:</div>
                  <CountBox value={countdown.hours}   label="hrs" />
                  <div style={{ color: '#2A2A32', fontSize: '24px', fontFamily: 'DM Mono, monospace', marginBottom: '14px' }}>:</div>
                  <CountBox value={countdown.minutes} label="min" />
                  <div style={{ color: '#2A2A32', fontSize: '24px', fontFamily: 'DM Mono, monospace', marginBottom: '14px' }}>:</div>
                  <CountBox value={countdown.seconds} label="sec" />
                </div>
              </div>
            )}

            <EntryForm />
          </div>
        </div>

        {/* ── MOBILE PRIZE + ENTRY (stacked) ────────────────────── */}
        <style>{`
          @media (max-width: 640px) {
            .prize-grid { grid-template-columns: 1fr !important; }
            .upcoming-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* ── HOW IT WORKS ──────────────────────────────────────── */}
        <div style={{ borderTop: '0.5px solid #1a1a22', borderBottom: '0.5px solid #1a1a22', background: '#111114', padding: '60px 2rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '12px' }}>How It Works</div>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, color: '#F0EDE6', marginBottom: '40px' }}>
              Three steps to <em style={{ color: '#C9A84C' }}>win</em>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { n: '01', title: 'Enter your email', body: 'Sign up for Chase Hollow beta early access. Your email is your entry — one per person.' },
                { n: '02', title: 'Follow on X', body: 'Follow @chasehollowtcg for the winner announcement. Winners are contacted via X DM or email.' },
                { n: '03', title: 'Win & get shipped', body: 'We announce the winner on launch day — May 21. Your prize ships directly to you, sealed and insured.' },
              ].map(step => (
                <div key={step.n} className="step-card" style={{ background: '#0A0A0B', border: '1.5px solid #2A2A32', borderRadius: '16px', padding: '28px 24px', textAlign: 'left' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '28px', color: 'rgba(201,168,76,0.2)', fontWeight: 500, marginBottom: '16px', lineHeight: 1 }}>{step.n}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 600, color: '#F0EDE6', marginBottom: '8px' }}>{step.title}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6C6A66', lineHeight: 1.6 }}>{step.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── UPCOMING GIVEAWAYS ────────────────────────────────── */}
        <div style={{ padding: '70px 2rem', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#6C6A66', marginBottom: '12px' }}>Coming Up</div>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '40px', fontWeight: 300, color: '#F0EDE6' }}>
              More prizes <em style={{ color: '#C9A84C' }}>every week</em>
            </h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6C6A66', marginTop: '10px' }}>
              Sign up once — you're entered into every weekly draw until launch.
            </p>
          </div>

          <div className="upcoming-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <MysteryCard week="Week 2 · Coming Soon" hint="Another TCG prize worth signing up for" />
            <MysteryCard week="Week 3 · Coming Soon" hint="Something for the graded card collectors…" />

            {/* Grand Prize Card */}
            <div className="grand-card" style={{ background: 'linear-gradient(135deg, #1a1408 0%, #111114 50%, #1a1408 100%)', border: '1.5px solid rgba(201,168,76,0.4)', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.18em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '20px', position: 'relative' }}>Launch Day · Grand Prize</div>
              <div style={{ width: '80px', height: '110px', margin: '0 auto 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #1a1408, #2a2010)', border: '1.5px solid rgba(201,168,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', color: 'rgba(201,168,76,0.4)', fontStyle: 'italic', fontWeight: 300 }}>?</div>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 12px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', display: 'inline-block', letterSpacing: '0.1em', marginBottom: '10px' }}>REVEALED AT LAUNCH</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#C9A84C', fontStyle: 'italic', marginBottom: '6px' }}>The Big One</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6C6A66', lineHeight: 1.4 }}>Our biggest prize yet — announced on launch day alongside the platform going live.</div>
            </div>
          </div>
        </div>

        {/* ── SECOND ENTRY CTA ──────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(180deg, #111114 0%, #0f0f12 100%)', borderTop: '0.5px solid #1a1a22', borderBottom: '0.5px solid #1a1a22', padding: '60px 2rem' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '38px', fontWeight: 300, color: '#F0EDE6', marginBottom: '12px', lineHeight: 1.15 }}>
              Haven't entered yet?
            </h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8B4AC', marginBottom: '32px', lineHeight: 1.6 }}>
              One entry. Every weekly draw. Cancel any time before launch.
            </p>
            <EntryForm />
            <div style={{ marginTop: '28px', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Just entered to win a Prismatic Evolutions Booster Box from @chasehollowtcg 🎉\n\nNew blockchain TCG marketplace launching soon — early access giveaway live now:\nhttps://chasehollow.com/giveaway")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#F0EDE6', background: '#111114', border: '1.5px solid #2A2A32', borderRadius: '8px', padding: '10px 18px', textDecoration: 'none', transition: 'border-color 0.2s' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.257 5.628 5.907-5.628zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Share on X
              </a>
              <Link href="/coming-soon" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6C6A66', textDecoration: 'none' }}>
                Back to launch page →
              </Link>
            </div>
          </div>
        </div>

        {/* ── RULES ─────────────────────────────────────────────── */}
        <div style={{ padding: '32px 2rem', maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#3a3a44', lineHeight: 1.8, letterSpacing: '0.04em' }}>
            No purchase necessary. Open to US residents 18+. One entry per email address.
            Winners selected randomly and notified via email and/or X DM within 48 hours of draw.
            Prize shipped sealed and insured. Chase Hollow reserves the right to modify or cancel the giveaway at any time.
            By entering you agree to receive Chase Hollow launch communications; unsubscribe any time.
          </p>
        </div>

      </div>
    </>
  )
}
