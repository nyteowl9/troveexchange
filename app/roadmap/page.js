'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PHASES = [
  { id: 2, label: 'Phase 2', sub: 'Platform Features',    status: 'building', color: 'var(--teal)' },
  { id: 3, label: 'Phase 3', sub: 'Blockchain Expansion', status: 'next',     color: 'var(--gold)' },
  { id: 4, label: 'Phase 4', sub: 'Scale',                status: 'horizon',  color: 'var(--accent-blue)' },
]

// ── Abstract CSS card art — no real images, no emojis ─────────────────────
function CardArt({ width = 80, height = 108, theme = 'fire' }) {
  const themes = {
    fire: {
      bg: 'linear-gradient(170deg, #080200, #1c0500, #3d0d00, #5c1200)',
      core: 'radial-gradient(ellipse at 50% 95%, rgba(255,90,0,0.9) 0%, rgba(255,140,0,0.55) 28%, rgba(180,40,0,0.2) 58%, transparent 78%)',
      wingL: 'rgba(150,35,0,0.82)',
      wingR: 'rgba(150,35,0,0.82)',
      body:  'rgba(90,20,0,0.95)',
      glow:  'rgba(255,170,50,0.75)',
      embers: ['rgba(255,200,60,0.85)','rgba(255,160,30,0.75)','rgba(255,220,80,0.7)','rgba(255,130,20,0.65)','rgba(255,190,50,0.8)'],
    },
    ice: {
      bg: 'linear-gradient(170deg, #00060d, #000d1f, #001530, #001845)',
      core: 'radial-gradient(ellipse at 50% 95%, rgba(80,180,255,0.85) 0%, rgba(120,220,255,0.45) 30%, rgba(40,120,200,0.15) 60%, transparent 80%)',
      wingL: 'rgba(30,90,180,0.75)',
      wingR: 'rgba(30,90,180,0.75)',
      body:  'rgba(20,60,140,0.9)',
      glow:  'rgba(140,220,255,0.7)',
      embers: ['rgba(180,230,255,0.8)','rgba(140,200,255,0.7)','rgba(200,240,255,0.75)','rgba(100,180,255,0.65)','rgba(160,220,255,0.8)'],
    },
  }
  const t = themes[theme] || themes.fire
  const scale = width / 80
  return (
    <div style={{ width, height, borderRadius: 6, position: 'relative', overflow: 'hidden', background: t.bg, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: t.core }} />
      <div style={{ position: 'absolute', bottom: `${18*scale}%`, left: '-8%', width: '54%', height: '55%', background: t.wingL, clipPath: 'polygon(0 100%, 14% 4%, 88% 32%, 64% 100%)' }} />
      <div style={{ position: 'absolute', bottom: `${18*scale}%`, right: '-8%', width: '54%', height: '55%', background: t.wingR, clipPath: 'polygon(100% 100%, 86% 4%, 12% 32%, 36% 100%)' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', width: '30%', height: '60%', background: t.body, clipPath: 'polygon(50% 0%, 82% 18%, 92% 68%, 50% 100%, 8% 68%, 18% 18%)' }} />
      <div style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)', width: '16%', height: '36%', background: `radial-gradient(ellipse, ${t.glow}, transparent 72%)` }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }} />
      {[{t:7,l:18},{t:14,l:62},{t:5,l:44},{t:20,l:78},{t:10,l:33}].map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: `${p.t}%`, left: `${p.l}%`, width: `${3*scale}px`, height: `${3*scale}px`, borderRadius: '50%', background: t.embers[i], boxShadow: `0 0 ${5*scale}px ${t.embers[i]}` }} />
      ))}
    </div>
  )
}

// ── NFT card — larger, holographic, impressive ────────────────────────────
function NFTCard() {
  return (
    <div style={{ width: '190px', flexShrink: 0 }}>
      <div className="nft-card-holo" style={{ background: 'linear-gradient(160deg, #080510, #0d1020, #0a1528)', border: '2px solid rgba(201,168,76,0.5)', borderRadius: '18px', padding: '16px 14px 14px', boxShadow: '0 0 40px rgba(201,168,76,0.18), 0 0 80px rgba(13,110,110,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        {/* Card header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'rgba(201,168,76,0.8)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Chase Hollow</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>Provenance Token</div>
          </div>
          <div style={{ width: '22px', height: '22px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', opacity: 0.9, boxShadow: '0 0 12px rgba(201,168,76,0.5)' }} />
        </div>

        {/* Art area — full CSS, no external image */}
        <div style={{ position: 'relative', marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
          <CardArt width={162} height={200} theme="fire" />
          {/* Holographic sheen overlay */}
          <div className="holo-sheen" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.03) 40%, rgba(201,168,76,0.06) 50%, rgba(13,110,110,0.04) 60%, transparent 80%)', pointerEvents: 'none' }} />
          {/* Card type badge */}
          <div style={{ position: 'absolute', top: '10px', right: '10px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,100,0,0.5)', color: 'rgba(255,140,50,0.9)', fontWeight: 600, backdropFilter: 'blur(4px)' }}>Fire · Rare</div>
          {/* Token ID badge */}
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(201,168,76,0.4)', color: 'rgba(201,168,76,0.9)', fontWeight: 700, backdropFilter: 'blur(4px)', letterSpacing: '0.06em' }}>CHT #0042</div>
        </div>

        {/* Card name + cert */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>Fire Dragon · Holo</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>PSA 9 · Cert #12345678</div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(76,175,124,0.12)', border: '1px solid rgba(76,175,124,0.35)', color: 'var(--accent-green)', fontWeight: 600 }}>✓ Auth</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.35)', color: '#e07060', fontWeight: 600 }}>🔒 Soulbound</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 600 }}>Base</span>
        </div>

        {/* Tx hash */}
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'rgba(201,168,76,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>0x14721fdf...78b3</div>
      </div>
    </div>
  )
}

// ── Inline Mockup Components ──────────────────────────────────────────────

function MockOffers() {
  const steps = [
    { from: '@collector99', type: 'offer',   val: '$380', note: 'Made an offer · 2h ago' },
    { from: '@cardvault',   type: 'counter', val: '$420', note: 'Countered · 1h ago' },
    { from: '@collector99', type: 'accept',  val: '$420', note: 'Accepted · 22min ago' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
      {/* Listing card */}
      <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
        <CardArt width={64} height={88} theme="fire" />
        <div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Fire Dragon Holo</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>PSA 9 · Base Set · #4/102</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 700, color: 'var(--gold)' }}>$450</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Listed price</div>
        </div>
      </div>

      {/* Offer thread — static, deal agreed state */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: s.type === 'accept' ? 'rgba(76,175,124,0.15)' : s.type === 'counter' ? 'rgba(201,168,76,0.15)' : 'rgba(60,125,200,0.15)', border: `1.5px solid ${s.type === 'accept' ? 'rgba(76,175,124,0.5)' : s.type === 'counter' ? 'rgba(201,168,76,0.5)' : 'rgba(60,125,200,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>
              {s.type === 'accept' ? '✓' : s.type === 'counter' ? '↩' : '→'}
            </div>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '1px' }}>{s.from} · {s.note}</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 700, color: s.type === 'accept' ? 'var(--accent-green)' : s.type === 'counter' ? 'var(--gold)' : 'var(--accent-blue)' }}>{s.val}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: '4px', background: 'rgba(76,175,124,0.08)', border: '1.5px solid rgba(76,175,124,0.35)', borderRadius: '10px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>
          ✓ Deal agreed at $420 · Escrow opening…
        </div>
      </div>
    </div>
  )
}

function MockTrustTier() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: 'var(--gold)', fontWeight: 600 }}>⭐ Elite Seller</div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>500+ sales · &lt;2% dispute rate</div>
      </div>
      <div style={{ display: 'flex', gap: '0', alignItems: 'center' }}>
        {[
          { n: '1', label: 'Escrow',   done: true },
          { n: '2', label: 'Auth',     bypass: true },
          { n: '3', label: 'Ship',     done: false },
          { n: '4', label: 'Inspect',  done: false },
          { n: '5', label: 'Release',  done: false },
        ].map((s, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: s.done ? 'var(--teal)' : s.bypass ? 'rgba(201,168,76,0.15)' : 'var(--bg-3)', border: `2px solid ${s.done ? 'var(--teal)' : s.bypass ? 'rgba(201,168,76,0.6)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s.bypass ? '14px' : '12px', color: s.done ? '#0A0A0B' : s.bypass ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontWeight: 700, boxShadow: s.bypass ? '0 0 14px rgba(201,168,76,0.25)' : 'none' }}>
                {s.done ? '✓' : s.bypass ? '⭐' : s.n}
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: s.bypass ? 'var(--gold)' : 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: s.bypass ? 700 : 400 }}>{s.bypass ? 'Bypassed' : s.label}</div>
            </div>
            {i < arr.length - 1 && <div style={{ flex: 1, height: '2px', background: s.done ? 'var(--teal)' : 'var(--border)', margin: '0 3px', marginBottom: '18px' }} />}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '14px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '10px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--gold)', lineHeight: 1.7 }}>
        Elite sellers still submit 3 listing photos — authentication is photo-reviewed, never zero. Buyer protection is unchanged.
      </div>
    </div>
  )
}

function MockWatchlist() {
  const items = [
    { name: 'Fire Dragon Holo',    grade: 'PSA 10',  price: '$3,200',  delta: '+2.4%', up: true,  alert: '< $3,000', hit: false },
    { name: 'Black Lotus',         grade: 'BGS 8.5', price: '$28,400', delta: '-1.2%', up: false, alert: '< $26,000', hit: false },
    { name: 'Mox Sapphire',        grade: 'PSA 9',   price: '$6,800',  delta: '+0.8%', up: true,  alert: '< $6,500', hit: true },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: item.hit ? 'rgba(76,175,124,0.06)' : 'var(--bg-3)', border: `1.5px solid ${item.hit ? 'rgba(76,175,124,0.4)' : 'var(--border)'}`, borderRadius: '10px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '44px', flexShrink: 0 }}><CardArt width={32} height={44} theme={i === 1 ? 'ice' : 'fire'} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{item.grade}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.price}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: item.up ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{item.delta}</div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {item.hit
              ? <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 9px', borderRadius: '10px', background: 'rgba(76,175,124,0.15)', border: '1px solid rgba(76,175,124,0.45)', color: 'var(--accent-green)', fontWeight: 700 }}>🔔 Alert</div>
              : <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 9px', borderRadius: '10px', background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{item.alert}</div>
            }
          </div>
        </div>
      ))}
    </div>
  )
}

function MockScheduling() {
  return (
    <div>
      <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>May 2026</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', fontWeight: 600 }}>3 scheduled</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: '4px' }}>{d}</div>
          ))}
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 3
            const scheduled = [4, 11, 18].includes(day)
            const today = day === 7
            return (
              <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', textAlign: 'center', padding: '4px 2px', borderRadius: '4px', background: scheduled ? 'rgba(13,110,110,0.22)' : today ? 'rgba(201,168,76,0.14)' : 'transparent', border: scheduled ? '1px solid rgba(13,110,110,0.45)' : today ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent', color: scheduled ? 'var(--teal)' : today ? 'var(--gold)' : day > 0 && day <= 31 ? 'var(--text-muted)' : 'transparent' }}>
                {day > 0 && day <= 31 ? day : ''}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ background: 'rgba(13,110,110,0.07)', border: '1px solid rgba(13,110,110,0.28)', borderRadius: '10px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--teal)', lineHeight: 1.8 }}>
        📅 Sunday Drop — May 18, 8:00 PM EST<br/>
        <span style={{ color: 'var(--text-muted)' }}>Fire Dragon PSA 9 · 1st Ed · $1,800</span>
      </div>
    </div>
  )
}

function MockPriceComp() {
  const comps = [
    { label: 'Last Sale',    val: '$442', note: '3 days ago' },
    { label: 'Avg 30d',      val: '$451', note: '14 sales' },
    { label: 'High 90d',     val: '$490', note: 'Peak' },
    { label: 'This Listing', val: '$450', note: 'Current', highlight: true },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {comps.map((c, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.highlight ? 'rgba(201,168,76,0.07)' : 'var(--bg-3)', border: `1px solid ${c.highlight ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`, borderRadius: '9px', padding: '10px 14px' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: c.highlight ? 'var(--gold)' : 'var(--text-muted)', fontWeight: c.highlight ? 700 : 400 }}>{c.label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{c.note}</div>
          </div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '19px', fontWeight: 700, color: c.highlight ? 'var(--gold)' : 'var(--text-primary)' }}>{c.val}</div>
        </div>
      ))}
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-green)', textAlign: 'center', paddingTop: '3px', fontWeight: 600 }}>
        ✓ Priced within 2% of market average
      </div>
    </div>
  )
}

function MockBundle() {
  const cards = [
    { name: 'Fire Dragon', grade: 'PSA 8', theme: 'fire' },
    { name: 'Ice Dragon',  grade: 'BGS 7.5', theme: 'ice' },
    { name: 'Fire Drake',  grade: 'PSA 9', theme: 'fire' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ marginBottom: '5px' }}><CardArt width={36} height={50} theme={c.theme} /></div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{c.grade}</div>
          </div>
        ))}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border)', borderRadius: '9px', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)' }}>+2 more</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>5-card Starter Lot · Photo auth</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>$340</div>
      </div>
    </div>
  )
}

function MockNFTProvenance() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '28px', alignItems: 'start' }}>
      <NFTCard />
      <div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px', fontWeight: 600 }}>On-Chain Provenance</div>
        {[
          { event: 'Authenticated',  detail: 'Chase Hollow Auth Center · Physical inspection passed · Staff #E3175F', date: 'Apr 2026', color: 'var(--accent-green)', icon: '✓' },
          { event: 'Transfer',       detail: '@cardvault → @collector99 · $450 USDC · Base', date: 'Apr 2026', color: 'var(--teal)', icon: '⟳' },
          { event: 'First Listing',  detail: '@cardvault listed · $475 USDC · Marketplace', date: 'Mar 2026', color: 'var(--accent-blue)', icon: '◆' },
          { event: 'Original Grade', detail: 'PSA graded · Cert #12345678 · Verified on-chain', date: 'Sept 2019', color: 'var(--gold)', icon: '★' },
        ].map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${e.color}18`, border: `1.5px solid ${e.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: e.color }}>{e.icon}</div>
              {i < 3 && <div style={{ width: '1.5px', height: '14px', background: 'var(--border)', marginTop: '3px' }} />}
            </div>
            <div style={{ flex: 1, paddingTop: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{e.event}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px', flexShrink: 0 }}>{e.date}</div>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{e.detail}</div>
            </div>
          </div>
        ))}
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', lineHeight: 1.7 }}>
          <span style={{ color: 'var(--gold)' }}>Tx:</span> 0x14721fdf8c2b3a9e...78b3 · Non-transferable · Follows the cert, not the wallet
        </div>
      </div>
    </div>
  )
}

function MockReputation() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👤</div>
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>@cardvault</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>0x14721...78B3</div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: 'var(--gold)', fontWeight: 700 }}>⭐ Elite</div>
      </div>
      {[
        { label: 'On-chain trades',  val: '512',        color: 'var(--teal)' },
        { label: 'Dispute win rate', val: '98.4%',      color: 'var(--accent-green)' },
        { label: 'Rep score',        val: '4.94 / 5',   color: 'var(--gold)' },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{r.label}</span>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 700, color: r.color }}>{r.val}</span>
        </div>
      ))}
      <div style={{ marginTop: '12px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', lineHeight: 1.7 }}>
        Portable — verifiable on-chain by any marketplace or buyer, forever.
      </div>
    </div>
  )
}

function MockBulk() {
  return (
    <div>
      <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', borderBottom: '0.5px solid var(--border)' }}>
          {['Card Name', 'Grade', 'Price', ''].map((h, i) => (
            <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', padding: '9px 12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
          ))}
        </div>
        {[
          { name: 'Fire Dragon', grade: 'PSA 9', price: '$450' },
          { name: 'Ice Dragon',  grade: 'BGS 8', price: '$180' },
          { name: 'Fire Drake',  grade: 'PSA 8', price: '$140' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none', background: i === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', padding: '10px 12px' }}>{r.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--gold)', padding: '10px 12px', fontWeight: 600 }}>{r.grade}</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', color: 'var(--text-primary)', padding: '10px 12px' }}>{r.price}</div>
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(76,175,124,0.15)', border: '1px solid rgba(76,175,124,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--accent-green)', fontWeight: 700 }}>✓</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1, background: 'var(--teal)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#0A0A0B', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>Import CSV</div>
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>+47 more rows</div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const pill = (label, color = 'var(--teal)') => (
    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '4px 12px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}55`, color, fontWeight: 700, letterSpacing: '0.08em', display: 'inline-block', flexShrink: 0 }}>{label}</span>
  )

  const statusBadge = (status) => {
    const map = {
      building: { label: '● Building Now', color: 'var(--accent-green)' },
      next:     { label: '◆ Up Next',      color: 'var(--gold)' },
      horizon:  { label: '◇ The Future',   color: 'var(--accent-blue)' },
    }
    const s = map[status]
    return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: `${s.color}12`, border: `1px solid ${s.color}45`, color: s.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{s.label}</span>
  }

  const featureCard = ({ title, desc, tag, children, wide, phase }) => {
    const borderColor = phase === 2 ? 'rgba(13,110,110,0.22)' : phase === 3 ? 'rgba(201,168,76,0.22)' : 'rgba(60,125,200,0.22)'
    const glowBg      = phase === 2 ? 'rgba(13,110,110,0.03)' : phase === 3 ? 'rgba(201,168,76,0.03)' : 'rgba(60,125,200,0.03)'
    return (
      <div style={{ background: glowBg, border: `1.5px solid ${borderColor}`, borderRadius: '18px', padding: '24px 26px', gridColumn: wide ? 'span 2' : 'span 1' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '21px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '5px' }}>{title}</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
          </div>
          {tag && pill(tag, phase === 3 ? 'var(--gold)' : phase === 4 ? 'var(--accent-blue)' : 'var(--teal)')}
        </div>
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes holo    {
          0%  {border-color:rgba(201,168,76,0.55); box-shadow:0 0 40px rgba(201,168,76,0.2),0 0 80px rgba(13,110,110,0.1);}
          33% {border-color:rgba(13,110,110,0.55); box-shadow:0 0 40px rgba(13,110,110,0.2),0 0 80px rgba(60,125,200,0.1);}
          66% {border-color:rgba(60,125,200,0.55); box-shadow:0 0 40px rgba(60,125,200,0.2),0 0 80px rgba(201,168,76,0.1);}
          100%{border-color:rgba(201,168,76,0.55); box-shadow:0 0 40px rgba(201,168,76,0.2),0 0 80px rgba(13,110,110,0.1);}
        }
        .nft-card-holo { animation: holo 5s ease-in-out infinite; }
        .phase-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
        @media(max-width:768px){.phase-grid{grid-template-columns:1fr!important;}.phase-grid>*{grid-column:span 1!important;}}
      `}</style>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '120px 1.5rem 80px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '900px', height: '450px', background: 'radial-gradient(ellipse, rgba(13,110,110,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '60%', left: '25%', width: '500px', height: '350px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--accent-green)', marginBottom: '24px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.28)', fontWeight: 600 }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Phase 2 is in active development
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '22px', letterSpacing: '-0.01em' }}>
            The Chase Hollow<br/>
            <em style={{ fontStyle: 'italic', color: 'var(--gold)', background: 'linear-gradient(90deg, var(--gold), #e8c96c, var(--gold))', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>Roadmap</em>
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '17px', color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: '580px', margin: '0 auto 40px' }}>
            Every feature we're building. Every phase of the vision. From buyer offers and watchlists to soulbound NFT provenance — here's what's coming.
          </p>
          {/* Phase progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '520px', margin: '0 auto' }}>
            {PHASES.map((ph, i) => (
              <div key={ph.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: ph.status === 'building' ? ph.color : 'var(--bg-2)', border: `2px solid ${ph.status === 'building' ? ph.color : ph.status === 'next' ? `${ph.color}60` : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: ph.status === 'building' ? '#0A0A0B' : ph.color, boxShadow: ph.status === 'building' ? `0 0 24px ${ph.color}45` : 'none', animation: ph.status === 'building' ? 'float 3s ease-in-out infinite' : 'none' }}>
                    {ph.id}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: ph.status === 'building' ? ph.color : 'var(--text-muted)', fontWeight: 700 }}>{ph.label}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)' }}>{ph.sub}</div>
                  </div>
                </div>
                {i < PHASES.length - 1 && <div style={{ flex: 1, height: '2px', background: i === 0 ? `linear-gradient(to right, var(--teal), rgba(201,168,76,0.3))` : 'var(--border)', margin: '0 8px', marginBottom: '28px' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 1.5rem 100px' }}>

        {/* ── PHASE 2 ── */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '48px', fontWeight: 700, color: 'rgba(13,110,110,0.14)', lineHeight: 1, userSelect: 'none', flexShrink: 0 }}>02</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Platform <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}>Features</em></h2>
                {statusBadge('building')}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-muted)' }}>The tools buyers and sellers have been asking for — offers, watchlists, smart scheduling, and more.</div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(13,110,110,0.45), transparent)', marginBottom: '26px' }} />
          <div className="phase-grid">
            {featureCard({ title: 'Offers System', desc: 'Buyers make offers on any listing. Sellers accept, counter, or decline. Agreed price triggers checkout automatically.', tag: 'Phase 2A', wide: true, phase: 2, children: <MockOffers /> })}
            {featureCard({ title: 'Trust Tier — Auth Bypass', desc: 'Elite and Legend sellers with 500+ sales and a <2% dispute rate bypass the physical auth step. Photo review still required — buyer protection never waived.', tag: 'Phase 2A', phase: 2, children: <MockTrustTier /> })}
            {featureCard({ title: 'Watchlist + Price Alerts', desc: 'Save any listing. Set an alert threshold — get notified the moment a matching card drops below your target price.', tag: 'Phase 2A', phase: 2, children: <MockWatchlist /> })}
            {featureCard({ title: 'Listing Drafts & Scheduling', desc: "Save a listing as a draft, pick a go-live time. Sunday 8pm drops, timed releases, bulk prep — sellers control exactly when their cards hit the market.", tag: 'Phase 2A', phase: 2, children: <MockScheduling /> })}
            {featureCard({ title: 'Price Comparison at Checkout', desc: 'Before funding escrow, buyers see how this listing compares to recent sales, 30-day average, and peak. Full market context at the moment of purchase.', tag: 'Phase 2B', phase: 2, children: <MockPriceComp /> })}
            {featureCard({ title: 'Bundle & Lot Listings', desc: 'Sell multiple cards as a single lot. Elite and Legend sellers can list bundles with photo auth. One checkout, one escrow, one clean transaction.', tag: 'Phase 2C', phase: 2, children: <MockBundle /> })}
            {featureCard({ title: 'Seller Analytics', desc: 'Full visibility into sales history, revenue over time, dispute rate, and how your rep score is trending — all in your seller dashboard.', tag: 'Phase 2B', phase: 2, children: (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[{ label: 'Total Revenue', val: '$14,820', delta: '+18% this month' }, { label: 'Cards Sold', val: '47', delta: '+5 this month' }, { label: 'Dispute Rate', val: '0.8%', delta: 'Well below 2%' }].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px' }}>{s.label}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>{s.val}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)', fontWeight: 600 }}>↑ {s.delta}</div>
                  </div>
                ))}
                <div style={{ gridColumn: 'span 3', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'flex-end', gap: '4px', height: '56px' }}>
                  {[30,45,28,60,42,71,55,80,63,90,74,95].map((h, i) => (
                    <div key={i} style={{ flex: 1, background: i === 11 ? 'var(--teal)' : 'rgba(13,110,110,0.32)', borderRadius: '2px', height: `${h}%` }} />
                  ))}
                </div>
              </div>
            )})}
            {featureCard({ title: 'Pre-Sale Messaging', desc: 'Buyers can message sellers before purchasing — ask about condition, request additional photos, confirm bundle contents. Text only, 500 char limit.', tag: 'Phase 2B', phase: 2, children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[{ from: '@collector99', text: 'Any edge wear on the slab? Hard to tell from photos.', mine: false }, { from: '@cardvault', text: "Corners are clean — I'll add a close-up. Just updated the listing.", mine: true }].map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: m.mine ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: m.mine ? 'rgba(13,110,110,0.22)' : 'rgba(60,125,200,0.22)', border: `1.5px solid ${m.mine ? 'rgba(13,110,110,0.45)' : 'rgba(60,125,200,0.45)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>👤</div>
                    <div style={{ maxWidth: '72%', background: m.mine ? 'rgba(13,110,110,0.1)' : 'var(--bg-3)', border: `1px solid ${m.mine ? 'rgba(13,110,110,0.28)' : 'var(--border)'}`, borderRadius: '10px', padding: '9px 13px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{m.text}</div>
                  </div>
                ))}
              </div>
            )})}
          </div>
        </div>

        {/* ── PHASE 3 ── */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '48px', fontWeight: 700, color: 'rgba(201,168,76,0.11)', lineHeight: 1, userSelect: 'none', flexShrink: 0 }}>03</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Blockchain <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Expansion</em></h2>
                {statusBadge('next')}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-muted)' }}>Every card authenticated on-chain. Every seller reputation portable. Every referral paid automatically in USDC.</div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(201,168,76,0.45), transparent)', marginBottom: '26px' }} />
          <div className="phase-grid">
            {featureCard({ title: 'NFT Provenance — Soulbound Auth Records', desc: "Every card authenticated at Chase Hollow gets a non-transferable NFT minted on Base. It follows the card's cert number — not a wallet — so its full history lives on-chain forever. Any buyer can verify the complete authentication and ownership chain before purchasing.", tag: 'Phase 3', wide: true, phase: 3, children: <MockNFTProvenance /> })}
            {featureCard({ title: 'On-Chain Reputation', desc: 'Seller and buyer rep scores written to a Base registry contract after every completed trade. Portable across any marketplace that reads the registry.', tag: 'Phase 3', phase: 3, children: <MockReputation /> })}
            {featureCard({ title: 'Auto USDC Referral Payouts', desc: 'Creator commissions paid directly from the escrow contract on settlement — no monthly batch, no manual step. Funds arrive in the creator wallet the moment a sale closes.', tag: 'Phase 3', phase: 3, children: (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {[{ label: 'Sale settles', icon: '✓', color: 'var(--accent-green)', note: 'Buyer releases escrow' }, { label: 'Platform fee split', icon: '⟳', color: 'var(--teal)', note: '3% Chase Hollow · 0.5% creator' }, { label: 'Creator paid instantly', icon: '⚡', color: 'var(--gold)', note: '@creator123 · +$2.25 USDC' }].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${s.color}15`, border: `1.5px solid ${s.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: s.color, flexShrink: 0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{s.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.22)', borderRadius: '9px', padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.7, fontStyle: 'italic' }}>
                  No monthly threshold. No waiting. On-chain, trustless, automatic.
                </div>
              </div>
            )})}
            {featureCard({ title: 'Bulk & Institutional Seller Tools', desc: 'Card shops, LCS owners, estate liquidators — import 100+ cards via CSV, apply bulk pricing rules, manage inventory at scale. This is where serious GMV lives.', tag: 'Phase 3', phase: 3, children: <MockBulk /> })}
          </div>
        </div>

        {/* ── PHASE 4 ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '48px', fontWeight: 700, color: 'rgba(60,125,200,0.1)', lineHeight: 1, userSelect: 'none', flexShrink: 0 }}>04</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Scale & <em style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}>The Future</em></h2>
                {statusBadge('horizon')}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-muted)' }}>Where Chase Hollow becomes infrastructure for the entire TCG market.</div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(60,125,200,0.32), transparent)', marginBottom: '26px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { icon: '📱', title: 'Mobile App',            desc: 'Native iOS and Android. Full marketplace, push price alerts, one-tap checkout.' },
              { icon: '⚡', title: 'Live Auction Format',   desc: 'Timed on-chain auctions for high-value cards. Bid history on-chain. Anti-snipe protection. BGS Black Labels deserve a stage.' },
              { icon: '🏆', title: 'Grading Partnerships',  desc: 'PSA and BGS direct submission pipelines. Submit, track grading status, receive authenticated and listed — all in one flow.' },
              { icon: '🌍', title: 'International',         desc: 'USDC is already borderless. Shippo handles international labels. Cards and collectors are everywhere.' },
              { icon: '⚙️', title: 'API Access',            desc: 'Query your own data. Automate repricing. Pull market comps. Chase Hollow becomes infrastructure, not just a storefront.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(60,125,200,0.025)', border: '1.5px solid rgba(60,125,200,0.14)', borderRadius: '16px', padding: '22px' }}>
                <div style={{ fontSize: '30px', marginBottom: '12px' }}>{item.icon}</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>{item.title}</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.65 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER CTA ── */}
        <div style={{ marginTop: '88px', background: 'linear-gradient(135deg, rgba(13,110,110,0.09), rgba(201,168,76,0.07))', border: '1.5px solid rgba(201,168,76,0.22)', borderRadius: '22px', padding: '52px 44px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Built in public. Shipping <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>fast.</em>
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.75 }}>
            Chase Hollow is live on Base now. Every feature above is already designed — we're building it in order, shipping as we go.
          </div>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/marketplace" style={{ background: 'var(--teal)', border: 'none', color: '#0A0A0B', padding: '13px 30px', fontSize: '14px', fontWeight: 700, borderRadius: '11px', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', display: 'inline-block' }}>Explore Marketplace →</Link>
            <Link href="/seller-dashboard?section=new-listing" style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '13px 30px', fontSize: '14px', fontWeight: 600, borderRadius: '11px', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', display: 'inline-block' }}>List a Card</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
