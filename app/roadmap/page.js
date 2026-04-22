'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PHASES = [
  { id: 2, label: 'Phase 2', sub: 'Platform Features', status: 'building', color: 'var(--teal)' },
  { id: 3, label: 'Phase 3', sub: 'Blockchain Expansion', status: 'next', color: 'var(--gold)' },
  { id: 4, label: 'Phase 4', sub: 'Scale', status: 'horizon', color: 'var(--accent-blue)' },
]

// ── Inline Mockup Components ──────────────────────────────────────────────

function MockOffers() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 3), 2200)
    return () => clearInterval(t)
  }, [])
  const steps = [
    { from: '@collector99', type: 'offer',   val: '$380', note: 'Made an offer' },
    { from: '@seller',      type: 'counter', val: '$420', note: 'Countered' },
    { from: '@collector99', type: 'accept',  val: '$420', note: 'Accepted — going to checkout' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
      {/* Card */}
      <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ width: '52px', height: '72px', borderRadius: '6px', background: 'linear-gradient(145deg,#1a3a5c,#0d2035)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🃏</div>
        <div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '3px' }}>Charizard Holo</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>PSA 9 · Base Set · #4/102</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)', marginTop: '4px' }}>$450</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px' }}>Listed price</div>
        </div>
      </div>
      {/* Offer thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', opacity: i <= active ? 1 : 0.25, transition: 'opacity 0.5s' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: s.type === 'accept' ? 'rgba(76,175,124,0.15)' : s.type === 'counter' ? 'rgba(201,168,76,0.15)' : 'rgba(60,125,200,0.15)', border: `1px solid ${s.type === 'accept' ? 'rgba(76,175,124,0.4)' : s.type === 'counter' ? 'rgba(201,168,76,0.4)' : 'rgba(60,125,200,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0, marginTop: '1px' }}>
              {s.type === 'accept' ? '✓' : s.type === 'counter' ? '↩' : '→'}
            </div>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{s.from} · {s.note}</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 600, color: s.type === 'accept' ? 'var(--accent-green)' : s.type === 'counter' ? 'var(--gold)' : 'var(--accent-blue)' }}>{s.val}</div>
            </div>
          </div>
        ))}
        {active >= 2 && (
          <div style={{ marginTop: '4px', background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '8px', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)' }}>
            ✓ Deal agreed · Escrow opening…
          </div>
        )}
      </div>
    </div>
  )
}

function MockTrustTier() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: 'var(--gold)', fontWeight: 600 }}>⭐ Elite Seller</div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>500+ sales · &lt;2% dispute rate</div>
      </div>
      <div style={{ display: 'flex', gap: '0', alignItems: 'center' }}>
        {[
          { n: '1', label: 'Escrow', done: true },
          { n: '2', label: 'Auth', bypass: true },
          { n: '3', label: 'Ship', done: false },
          { n: '4', label: 'Inspect', done: false },
          { n: '5', label: 'Release', done: false },
        ].map((s, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: s.done ? 'var(--teal)' : s.bypass ? 'rgba(201,168,76,0.15)' : 'var(--bg-3)', border: `1.5px solid ${s.done ? 'var(--teal)' : s.bypass ? 'rgba(201,168,76,0.5)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s.bypass ? '12px' : '10px', color: s.done ? (true ? '#0A0A0B' : '#fff') : s.bypass ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontWeight: 700, position: 'relative' }}>
                {s.done ? '✓' : s.bypass ? '⭐' : s.n}
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', color: s.bypass ? 'var(--gold)' : 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: s.bypass ? 600 : 400 }}>{s.bypass ? 'Bypassed' : s.label}</div>
            </div>
            {i < arr.length - 1 && <div style={{ flex: 1, height: '1.5px', background: s.done ? 'var(--teal)' : 'var(--border)', margin: '0 3px', marginBottom: '14px' }} />}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--gold)', lineHeight: 1.6 }}>
        Elite sellers still submit 3 listing photos — authentication is photo-reviewed, never zero. Buyer protection is unchanged.
      </div>
    </div>
  )
}

function MockWatchlist() {
  const items = [
    { name: 'Charizard Holo', grade: 'PSA 10', price: '$3,200', delta: '+2.4%', up: true,  alert: '< $3,000', alertActive: false },
    { name: 'Black Lotus',    grade: 'BGS 8.5', price: '$28,400', delta: '-1.2%', up: false, alert: '< $26,000', alertActive: false },
    { name: 'Mox Sapphire',   grade: 'PSA 9',  price: '$6,800', delta: '+0.8%', up: true,  alert: '< $6,500', alertActive: true },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: item.alertActive ? 'rgba(76,175,124,0.06)' : 'var(--bg-3)', border: `1px solid ${item.alertActive ? 'rgba(76,175,124,0.35)' : 'var(--border)'}`, borderRadius: '8px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '16px', flexShrink: 0 }}>🃏</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{item.grade}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.price}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: item.up ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{item.delta}</div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {item.alertActive
              ? <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(76,175,124,0.15)', border: '1px solid rgba(76,175,124,0.4)', color: 'var(--accent-green)', fontWeight: 600, whiteSpace: 'nowrap' }}>🔔 Alert</div>
              : <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', padding: '2px 7px', borderRadius: '10px', background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.alert}</div>
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
      <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>May 2026</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--teal)' }}>3 scheduled</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {['S','M','T','W','T','F','S'].map((d,i) => (
            <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: '3px' }}>{d}</div>
          ))}
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 3
            const scheduled = [4, 11, 18].includes(day)
            const today = day === 7
            return (
              <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', textAlign: 'center', padding: '3px', borderRadius: '4px', background: scheduled ? 'rgba(13,110,110,0.2)' : today ? 'rgba(201,168,76,0.12)' : 'transparent', border: scheduled ? '1px solid rgba(13,110,110,0.4)' : today ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent', color: scheduled ? 'var(--teal)' : today ? 'var(--gold)' : day > 0 && day <= 31 ? 'var(--text-muted)' : 'transparent', cursor: scheduled ? 'pointer' : 'default' }}>
                {day > 0 && day <= 31 ? day : ''}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ background: 'rgba(13,110,110,0.06)', border: '1px solid rgba(13,110,110,0.25)', borderRadius: '8px', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', lineHeight: 1.7 }}>
        📅 Sunday Drop — May 18, 8:00 PM EST<br/>
        <span style={{ color: 'var(--text-muted)' }}>Charizard PSA 9 · 1st Ed · $1,800</span>
      </div>
    </div>
  )
}

function MockPriceComp() {
  const comps = [
    { label: 'Last Sale',   val: '$442', note: '3 days ago' },
    { label: 'Avg 30d',     val: '$451', note: '14 sales' },
    { label: 'High 90d',    val: '$490', note: 'Peak' },
    { label: 'This Listing', val: '$450', note: 'Current', highlight: true },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {comps.map((c, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.highlight ? 'rgba(201,168,76,0.06)' : 'var(--bg-3)', border: `1px solid ${c.highlight ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 12px' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: c.highlight ? 'var(--gold)' : 'var(--text-muted)', fontWeight: c.highlight ? 600 : 400 }}>{c.label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginTop: '1px' }}>{c.note}</div>
          </div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 600, color: c.highlight ? 'var(--gold)' : 'var(--text-primary)' }}>{c.val}</div>
        </div>
      ))}
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--accent-green)', textAlign: 'center', paddingTop: '2px' }}>
        ✓ Priced within 2% of market average
      </div>
    </div>
  )
}

function MockBundle() {
  const cards = [
    { name: 'Pikachu', grade: 'PSA 8' },
    { name: 'Blastoise', grade: 'BGS 7.5' },
    { name: 'Venusaur', grade: 'PSA 9' },
    { name: '+2 more', grade: '' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: c.grade ? 'var(--bg-3)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 10px', textAlign: 'center' }}>
            {c.grade && <div style={{ fontSize: '18px', marginBottom: '3px' }}>🃏</div>}
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c.name}</div>
            {c.grade && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{c.grade}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>5-card Starter Lot · Photo auth</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 600, color: 'var(--gold)' }}>$340</div>
      </div>
    </div>
  )
}

function MockNFTProvenance() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'center' }}>
      {/* NFT Card */}
      <div style={{ width: '160px', flexShrink: 0 }}>
        <div style={{ background: 'linear-gradient(145deg, #0d1f35, #091629)', border: '1.5px solid rgba(201,168,76,0.4)', borderRadius: '14px', padding: '14px', boxShadow: '0 0 30px rgba(201,168,76,0.1), 0 0 60px rgba(13,110,110,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', color: 'rgba(201,168,76,0.7)', fontWeight: 600, letterSpacing: '0.1em' }}>CHASE HOLLOW</div>
            <div style={{ width: '14px', height: '14px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', opacity: 0.8 }} />
          </div>
          <div style={{ aspectRatio: '3/4', background: 'linear-gradient(145deg, #1a3a5c, #0d2035)', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', position: 'relative', overflow: 'hidden' }}>
            🃏
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6))', borderRadius: '8px' }} />
          </div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '2px' }}>Charizard Holo</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '8px' }}>PSA 9 · Cert #12345678</div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)' }}>Authenticated</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>🔒 Soulbound</span>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', color: 'rgba(201,168,76,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>CHT #0042 · Base Sepolia</div>
        </div>
      </div>
      {/* Provenance timeline */}
      <div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 500 }}>On-Chain Provenance</div>
        {[
          { event: 'Authenticated', detail: 'Chase Hollow Auth Center · Physical inspection passed', date: 'Apr 2026', color: 'var(--accent-green)', icon: '✓' },
          { event: 'Sold', detail: '@seller123 → @collector99 · $450 USDC · Base', date: 'Apr 2026', color: 'var(--teal)', icon: '⟳' },
          { event: 'Original Auth', detail: 'PSA graded Sept 2019 · Cert verified on-chain', date: 'Sept 2019', color: 'var(--gold)', icon: '◆' },
        ].map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${e.color}15`, border: `1px solid ${e.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: e.color, flexShrink: 0, marginTop: '1px' }}>{e.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{e.event}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{e.date}</div>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{e.detail}</div>
            </div>
          </div>
        ))}
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', marginTop: '4px' }}>
          Tx: 0x14721fdf...78b3 · Non-transferable · Follows the card, not the wallet
        </div>
      </div>
    </div>
  )
}

function MockReputation() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>@seller123</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>0x14721...78B3</div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontWeight: 600 }}>⭐ Elite</div>
      </div>
      {[
        { label: 'On-chain trades', val: '512', color: 'var(--teal)' },
        { label: 'Dispute win rate', val: '98.4%', color: 'var(--accent-green)' },
        { label: 'Rep score', val: '4.94 / 5.00', color: 'var(--gold)' },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{r.label}</span>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: 600, color: r.color }}>{r.val}</span>
        </div>
      ))}
      <div style={{ marginTop: '10px', fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', lineHeight: 1.6 }}>
        Reputation is portable — verifiable on-chain by any marketplace or buyer, forever.
      </div>
    </div>
  )
}

function MockBulk() {
  return (
    <div>
      <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0', borderBottom: '0.5px solid var(--border)' }}>
          {['Card Name', 'Grade', 'Price', ''].map((h, i) => (
            <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '7px', color: 'var(--text-muted)', padding: '7px 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
          ))}
        </div>
        {[
          { name: 'Charizard', grade: 'PSA 9', price: '$450' },
          { name: 'Blastoise', grade: 'BGS 8', price: '$180' },
          { name: 'Venusaur', grade: 'PSA 8', price: '$140' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none', background: i === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--text-primary)', padding: '8px 10px' }}>{r.name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--gold)', padding: '8px 10px' }}>{r.grade}</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '12px', color: 'var(--text-primary)', padding: '8px 10px' }}>{r.price}</div>
            <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center' }}><div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(76,175,124,0.15)', border: '1px solid rgba(76,175,124,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--accent-green)' }}>✓</div></div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, background: 'var(--teal)', borderRadius: '7px', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#0A0A0B', fontWeight: 600, textAlign: 'center' }}>Import CSV</div>
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>+47 more rows</div>
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
    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}55`, color, fontWeight: 600, letterSpacing: '0.08em', display: 'inline-block' }}>{label}</span>
  )

  const statusBadge = (status) => {
    const map = {
      building: { label: '● Building Now', color: 'var(--accent-green)' },
      next:     { label: '◆ Up Next',      color: 'var(--gold)' },
      horizon:  { label: '◇ The Future',   color: 'var(--accent-blue)' },
    }
    const s = map[status]
    return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: `${s.color}12`, border: `1px solid ${s.color}45`, color: s.color, fontWeight: 600, letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{s.label}</span>
  }

  const featureCard = ({ title, desc, tag, children, wide, phase }) => {
    const borderColor = phase === 2 ? 'rgba(13,110,110,0.2)' : phase === 3 ? 'rgba(201,168,76,0.2)' : 'rgba(60,125,200,0.2)'
    const glowColor   = phase === 2 ? 'rgba(13,110,110,0.04)' : phase === 3 ? 'rgba(201,168,76,0.04)' : 'rgba(60,125,200,0.04)'
    return (
      <div style={{ background: `var(--bg-2)`, border: `1.5px solid ${borderColor}`, borderRadius: '16px', padding: '22px 24px', gridColumn: wide ? 'span 2' : 'span 1', background: glowColor, backdropFilter: 'blur(4px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
          {tag && pill(tag, phase === 3 ? 'var(--gold)' : phase === 4 ? 'var(--accent-blue)' : 'var(--teal)')}
        </div>
        <div style={{ borderTop: `0.5px solid var(--border)`, paddingTop: '14px', marginTop: '4px' }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        .phase-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 768px) { .phase-grid { grid-template-columns: 1fr !important; } .phase-grid > * { grid-column: span 1 !important; } }
      `}</style>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', paddingTop: '120px', paddingBottom: '80px', textAlign: 'center', padding: '120px 1.5rem 80px' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(13,110,110,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '60%', left: '30%', width: '400px', height: '300px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)', marginBottom: '20px', padding: '5px 14px', borderRadius: '20px', background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.25)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Phase 2 is in active development
          </div>

          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.01em' }}>
            The Chase Hollow<br/>
            <em style={{ fontStyle: 'italic', color: 'var(--gold)', background: 'linear-gradient(90deg, var(--gold), #e8c96c, var(--gold))', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>Roadmap</em>
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto 36px' }}>
            Every feature we're building. Every phase of the vision. From buyer offers and watchlists to soulbound NFT provenance — here's what's coming.
          </p>

          {/* Phase progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', maxWidth: '500px', margin: '0 auto' }}>
            {PHASES.map((ph, i) => (
              <div key={ph.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: ph.status === 'building' ? ph.color : 'var(--bg-2)', border: `2px solid ${ph.status === 'building' ? ph.color : ph.status === 'next' ? `${ph.color}60` : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 700, color: ph.status === 'building' ? '#0A0A0B' : ph.color, boxShadow: ph.status === 'building' ? `0 0 20px ${ph.color}40` : 'none', animation: ph.status === 'building' ? 'float 3s ease-in-out infinite' : 'none' }}>
                    {ph.id}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: ph.status === 'building' ? ph.color : 'var(--text-muted)', fontWeight: 600 }}>{ph.label}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'var(--text-muted)' }}>{ph.sub}</div>
                  </div>
                </div>
                {i < PHASES.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: i === 0 ? `linear-gradient(to right, var(--teal), rgba(201,168,76,0.3))` : 'var(--border)', margin: '0 8px', marginBottom: '24px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 100px' }}>

        {/* ── PHASE 2 ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '42px', fontWeight: 700, color: 'rgba(13,110,110,0.15)', lineHeight: 1, userSelect: 'none' }}>02</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Platform <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}>Features</em></h2>
                {statusBadge('building')}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>The tools buyers and sellers have been asking for — offers, watchlists, smart scheduling, and more.</div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(13,110,110,0.4), transparent)', marginBottom: '24px' }} />

          <div className="phase-grid">
            {/* Offers — full width featured */}
            {featureCard({
              title: 'Offers System',
              desc: 'Buyers make offers on any listing. Sellers accept, counter, or decline. Agreed price triggers checkout automatically.',
              tag: 'Phase 2A',
              wide: true,
              phase: 2,
              children: <MockOffers />,
            })}

            {/* Trust Tier */}
            {featureCard({
              title: 'Trust Tier — Auth Bypass',
              desc: 'Elite and Legend sellers with 500+ sales and a &lt;2% dispute rate bypass the physical auth step. Photo review still required — buyer protection never waived.',
              tag: 'Phase 2A',
              phase: 2,
              children: <MockTrustTier />,
            })}

            {/* Watchlist */}
            {featureCard({
              title: 'Watchlist + Price Alerts',
              desc: 'Save any listing. Set an alert threshold — get notified the moment a matching card drops below your target price.',
              tag: 'Phase 2A',
              phase: 2,
              children: <MockWatchlist />,
            })}

            {/* Scheduling */}
            {featureCard({
              title: 'Listing Drafts & Scheduling',
              desc: "Save a listing as a draft, pick a go-live time. Sunday 8pm drops, timed releases, bulk prep — sellers control exactly when their cards hit the market.",
              tag: 'Phase 2A',
              phase: 2,
              children: <MockScheduling />,
            })}

            {/* Price Comp */}
            {featureCard({
              title: 'Price Comparison at Checkout',
              desc: 'Before funding escrow, buyers see how this listing compares to recent sales, 30-day average, and current listings. Full market context at the moment of purchase.',
              tag: 'Phase 2B',
              phase: 2,
              children: <MockPriceComp />,
            })}

            {/* Bundle */}
            {featureCard({
              title: 'Bundle & Lot Listings',
              desc: 'Sell multiple cards as a single lot. Elite and Legend sellers can list bundles with photo auth. One checkout, one escrow, one clean transaction.',
              tag: 'Phase 2C',
              phase: 2,
              children: <MockBundle />,
            })}

            {/* Analytics */}
            {featureCard({
              title: 'Seller Analytics',
              desc: 'Full visibility into sales history, revenue over time, dispute rate, and how your rep score is trending — all in your seller dashboard.',
              tag: 'Phase 2B',
              phase: 2,
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[{ label: 'Total Revenue', val: '$14,820', delta: '+18%', up: true }, { label: 'Cards Sold', val: '47', delta: '+5 this mo', up: true }, { label: 'Dispute Rate', val: '0.8%', delta: 'Well below 2%', up: true }].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{s.val}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--accent-green)' }}>↑ {s.delta}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: 'span 3', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'flex-end', gap: '4px', height: '50px' }}>
                    {[30,45,28,60,42,71,55,80,63,90,74,95].map((h,i) => (
                      <div key={i} style={{ flex: 1, background: i === 11 ? 'var(--teal)' : 'rgba(13,110,110,0.3)', borderRadius: '2px', height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              ),
            })}

            {/* Pre-sale messaging */}
            {featureCard({
              title: 'Pre-Sale Messaging',
              desc: 'Buyers can message sellers before purchasing — ask about condition, request additional photos, confirm bundle contents. Scoped: text only, 500 char limit.',
              tag: 'Phase 2B',
              phase: 2,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[{ from: '@buyer', text: 'Any edge wear on the slab? Hard to tell from photos.', mine: false }, { from: '@seller', text: "Corners are clean — I'll add a close-up. Just updated the listing.", mine: true }].map((m, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: m.mine ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: m.mine ? 'rgba(13,110,110,0.2)' : 'rgba(60,125,200,0.2)', border: `1px solid ${m.mine ? 'rgba(13,110,110,0.4)' : 'rgba(60,125,200,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', flexShrink: 0 }}>👤</div>
                      <div style={{ maxWidth: '70%', background: m.mine ? 'rgba(13,110,110,0.1)' : 'var(--bg-3)', border: `1px solid ${m.mine ? 'rgba(13,110,110,0.25)' : 'var(--border)'}`, borderRadius: '8px', padding: '7px 10px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.text}</div>
                    </div>
                  ))}
                </div>
              ),
            })}
          </div>
        </div>

        {/* ── PHASE 3 ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '42px', fontWeight: 700, color: 'rgba(201,168,76,0.12)', lineHeight: 1, userSelect: 'none' }}>03</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Blockchain <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Expansion</em></h2>
                {statusBadge('next')}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>Every card authenticated on-chain. Every seller reputation portable. Every referral paid automatically in USDC.</div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(201,168,76,0.4), transparent)', marginBottom: '24px' }} />

          <div className="phase-grid">
            {/* NFT Provenance — full width */}
            {featureCard({
              title: 'NFT Provenance — Soulbound Auth Records',
              desc: "Every card authenticated at Chase Hollow gets a non-transferable NFT minted on Base. It follows the card's cert number — not a wallet — so its full history lives on-chain forever. Any buyer can pull up the complete verification and ownership chain before purchasing.",
              tag: 'Phase 3',
              wide: true,
              phase: 3,
              children: <MockNFTProvenance />,
            })}

            {/* On-chain Reputation */}
            {featureCard({
              title: 'On-Chain Reputation',
              desc: 'Seller and buyer rep scores written to a Base registry contract after every completed trade. Portable across any marketplace that reads the registry.',
              tag: 'Phase 3',
              phase: 3,
              children: <MockReputation />,
            })}

            {/* Auto USDC Referral */}
            {featureCard({
              title: 'Auto USDC Referral Payouts',
              desc: 'Creator commissions paid directly from the escrow contract on settlement — no monthly batch, no manual step. Funds arrive in the creator wallet the moment a sale closes.',
              tag: 'Phase 3',
              phase: 3,
              children: (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {[
                      { label: 'Sale settles', icon: '✓', color: 'var(--accent-green)', note: 'Buyer releases escrow' },
                      { label: 'Platform fee split', icon: '⟳', color: 'var(--teal)', note: '3% Chase Hollow · 0.5% creator' },
                      { label: 'Creator paid instantly', icon: '⚡', color: 'var(--gold)', note: '@creator123 · +$2.25 USDC' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${s.color}15`, border: `1px solid ${s.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: s.color, flexShrink: 0 }}>{s.icon}</div>
                        <div>
                          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)' }}>{s.label}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)' }}>{s.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '12px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    No monthly threshold. No waiting. On-chain, trustless, automatic.
                  </div>
                </div>
              ),
            })}

            {/* Bulk Tools */}
            {featureCard({
              title: 'Bulk & Institutional Seller Tools',
              desc: 'Card shops, LCS owners, estate liquidators — import 100+ cards via CSV, apply bulk pricing rules, manage inventory at scale. This is where serious GMV lives.',
              tag: 'Phase 3',
              phase: 3,
              children: <MockBulk />,
            })}
          </div>
        </div>

        {/* ── PHASE 4 ──────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '42px', fontWeight: 700, color: 'rgba(60,125,200,0.1)', lineHeight: 1, userSelect: 'none' }}>04</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Scale & <em style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}>The Future</em></h2>
                {statusBadge('horizon')}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>Where Chase Hollow becomes infrastructure for the entire TCG market.</div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(60,125,200,0.3), transparent)', marginBottom: '24px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {[
              { icon: '📱', title: 'Mobile App', desc: 'Native iOS and Android. Full marketplace, push price alerts, one-tap checkout.' },
              { icon: '⚡', title: 'Live Auction Format', desc: 'Timed on-chain auctions for high-value cards. Bid history on-chain. Anti-snipe protection. BGS Black Labels deserve a stage.' },
              { icon: '🏆', title: 'Grading Partnerships', desc: 'PSA and BGS direct submission pipelines. Submit from Chase Hollow, track grading status, receive authenticated and listed — all in one flow.' },
              { icon: '🌍', title: 'International Expansion', desc: 'USDC is already borderless. Shippo handles international labels. Cards and collectors are everywhere.' },
              { icon: '⚙️', title: 'API Access', desc: 'Query your own data. Automate repricing. Pull market comps. Chase Hollow becomes infrastructure, not just a storefront.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(60,125,200,0.02)', backdropFilter: 'blur(2px)' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>{item.icon}</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>{item.title}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER CTA ─────────────────────────────────────────────── */}
        <div style={{ marginTop: '80px', background: 'linear-gradient(135deg, rgba(13,110,110,0.08), rgba(201,168,76,0.06))', border: '1.5px solid rgba(201,168,76,0.2)', borderRadius: '20px', padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Built in public. Shipping <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>fast.</em>
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 28px', lineHeight: 1.7 }}>
            Chase Hollow is live on Base now. Every feature above is already designed — we're building it in order, shipping as we go.
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/marketplace" style={{ background: 'var(--teal)', border: 'none', color: '#0A0A0B', padding: '12px 28px', fontSize: '13px', fontWeight: 700, borderRadius: '10px', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', display: 'inline-block' }}>Explore Marketplace →</Link>
            <Link href="/seller-dashboard?section=new-listing" style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '12px 28px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', display: 'inline-block' }}>List a Card</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
