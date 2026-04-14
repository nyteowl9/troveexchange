'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [theme, setTheme] = useState('dark')
  const [activeCategory, setActiveCategory] = useState('all')
  const [featuredListings, setFeaturedListings] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  useEffect(() => {
    supabase
      .from('listings')
      .select('id, card_name, game, set, grade, grader, photos, price, listing_type')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setFeaturedListings(data || []))
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  const categories = [
    { id: 'all', label: 'All', icon: '⬡' },
    { id: 'pokemon', label: 'Pokémon', icon: '◎' },
    { id: 'mtg', label: 'Magic', icon: '◆' },
    { id: 'onepiece', label: 'One Piece', icon: '☠' },
    { id: 'yugioh', label: 'Yu-Gi-Oh', icon: '⊡' },
    { id: 'sports', label: 'Sports', icon: '⚾' },
  ]

  const recentSales = [
    { name: 'Charizard Holo', set: 'Pokémon · Base Set 1999 Shadowless', grade: 'PSA 9', price: '$487', change: '▲ 2.4%', up: true, time: '2h ago', bg: 'linear-gradient(135deg,#1a3a5c,#0d2035)' },
    { name: 'Ancestral Recall', set: 'MTG · Alpha · Power Nine', grade: 'BGS 9', price: '$9,200', change: '▲ 3.2%', up: true, time: '5h ago', bg: 'linear-gradient(135deg,#1c2a1c,#0d1a0d)' },
    { name: 'Monkey D. Luffy', set: 'One Piece · OP-01 Alt Art SEC', grade: 'PSA 10', price: '$890', change: '▼ 0.8%', up: false, time: '8h ago', bg: 'linear-gradient(135deg,#2a1c1c,#1a0d0d)' },
    { name: 'Blastoise Holo', set: 'Pokémon · Base Set 1999 · #2/102', grade: 'PSA 10', price: '$3,800', change: '▲ 6.1%', up: true, time: '12h ago', bg: 'linear-gradient(135deg,#1a2a3a,#0d1a2a)' },
    { name: 'Mox Ruby', set: 'MTG · Unlimited · Power Nine', grade: 'BGS 8.5', price: '$4,100', change: '▼ 1.5%', up: false, time: 'Yesterday', bg: 'linear-gradient(135deg,#2a1c0d,#1a0d05)' },
  ]

  const wallets = [
    { icon: '🦊', name: 'MetaMask', desc: 'Most popular · Browser extension', tag: 'Most Popular', tagColor: 'var(--teal)', featured: true },
    { icon: '👻', name: 'Phantom', desc: 'Widely used · Base/EVM support', tag: 'Most Popular', tagColor: 'var(--teal)', featured: true },
    { icon: '🌈', name: 'Rainbow', desc: 'Mobile-first · Clean UX', tag: 'Popular', tagColor: 'var(--text-muted)', featured: false },
    { icon: '🔗', name: 'WalletConnect', desc: 'Connects 300+ wallets', tag: 'All Others', tagColor: 'var(--text-muted)', featured: false },
    { icon: '🛡', name: 'Ledger', desc: 'Hardware wallet · Max security', tag: 'Hardware', tagColor: 'var(--text-muted)', featured: false },
    { icon: '⭐', name: 'Trust Wallet', desc: 'Massive global user base', tag: 'Popular', tagColor: 'var(--text-muted)', featured: false },
  ]

  return (
    <>

      {/* HERO */}
      <section style={{
        minHeight: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 2rem 48px',
        textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.28, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 55% at 50% 40%, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <span style={{ width: '28px', height: '0.5px', background: 'var(--gold)', opacity: 0.6, display: 'block' }} />
          Blockchain-Secured TCG Marketplace
          <span style={{ width: '28px', height: '0.5px', background: 'var(--gold)', opacity: 0.6, display: 'block' }} />
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(44px, 7.5vw, 90px)', fontWeight: 300, lineHeight: 1.02, marginBottom: '1.2rem', maxWidth: '860px', position: 'relative' }}>
          Where <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Rare Cards</em><br />Meet Trustless Trade
        </h1>
        <p style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: 1.75, marginBottom: '2.2rem', position: 'relative' }}>
          Every card authenticated by experts. Every USDC locked in escrow. Every transaction settled on-chain — with no middlemen taking a cut.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative' }}>
          <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '13px 32px', fontSize: '14px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', borderRadius: '10px' }}>Explore Listings</button>
          <button style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '13px 32px', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', borderRadius: '10px' }}>How It Works</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          <div style={{ height: '0.5px', width: '40px', background: 'var(--border)' }} />
          <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '10px', padding: '10px 22px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>Home of the 3.5% Fee</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', letterSpacing: '0.1em', marginTop: '3px', fontWeight: 500 }}>SELLERS KEEP MORE · PERIOD</div>
          </div>
          <div style={{ height: '0.5px', width: '40px', background: 'var(--border)' }} />
        </div>
      </section>

      {/* TICKER */}
      <div style={{ background: 'var(--bg-3)', borderTop: '0.5px solid var(--teal-border)', borderBottom: '0.5px solid var(--teal-border)', padding: '10px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ticker 35s linear infinite' }}>
          {[
            { name: 'Charizard Base Holo', grade: 'PSA 9', price: '$487', change: '▲ 2.4%', up: true },
            { name: 'Black Lotus', grade: 'BGS 8.5', price: '$28,400', change: '▼ 1.2%', up: false },
            { name: 'Pikachu Illustrator', grade: 'PSA 7', price: '$4,200', change: '▲ 5.1%', up: true },
            { name: 'Mox Sapphire', grade: 'PSA 9', price: '$6,800', change: '▲ 0.8%', up: true },
            { name: '1st Ed Shadowless Charizard', grade: 'PSA 10', price: '$36,000', change: '▼ 0.5%', up: false },
            { name: 'Ancestral Recall', grade: 'BGS 9', price: '$9,200', change: '▲ 3.2%', up: true },
            { name: 'Monkey D. Luffy Alt Art', grade: 'PSA 10', price: '$890', change: '▲ 1.8%', up: true },
            { name: 'Charizard Base Holo', grade: 'PSA 9', price: '$487', change: '▲ 2.4%', up: true },
            { name: 'Black Lotus', grade: 'BGS 8.5', price: '$28,400', change: '▼ 1.2%', up: false },
            { name: 'Ancestral Recall', grade: 'BGS 9', price: '$9,200', change: '▲ 3.2%', up: true },
          ].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '0 2rem', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>{item.grade}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.price}</span>
              <span style={{ color: item.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>{item.change}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* SEARCH + CATEGORIES */}
      <section style={{ padding: '32px 2.5rem 0', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 0 0 18px', gap: '10px', borderRadius: '12px', overflow: 'hidden' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '18px', flexShrink: 0 }}>⌕</span>
            <input type="text" placeholder="Search cards, sets, grades, games..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', fontSize: '15px', padding: '15px 0' }} />
            <div style={{ display: 'flex', borderLeft: '1px solid var(--border)' }}>
              {['Pokémon ▾', 'MTG ▾', 'Grade ▾', 'Price ▾'].map((f, i) => (
                <button key={i} style={{ background: 'transparent', border: 'none', borderRight: i < 3 ? '1px solid var(--border)' : 'none', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500, padding: '0 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{f}</button>
              ))}
            </div>
            <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, padding: '15px 28px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Search</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                background: activeCategory === cat.id ? 'var(--bg-3)' : 'var(--bg-2)',
                border: `1.5px solid ${activeCategory === cat.id ? 'var(--teal-border)' : 'var(--border)'}`,
                borderRadius: '10px', padding: '12px 20px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                minWidth: '80px', flex: '1 1 auto', transition: 'all 0.2s'
              }}>
                <span style={{ fontSize: '20px', color: activeCategory === cat.id ? 'var(--teal)' : 'var(--text-secondary)' }}>{cat.icon}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: activeCategory === cat.id ? 'var(--teal)' : 'var(--text-secondary)', fontWeight: 500 }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED LISTINGS */}
      <section style={{ padding: '40px 2.5rem 72px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '34px', fontWeight: 300, color: 'var(--text-primary)' }}>
              Featured <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listings</em>
            </h2>
            <a href="/marketplace" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--teal)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>View all →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {featuredListings.length === 0 ? (
              // Skeleton placeholders while loading or if empty
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', opacity: 0.4 }}>
                  <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)' }} />
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-4)', marginBottom: '8px', width: '60%' }} />
                    <div style={{ height: '20px', borderRadius: '4px', background: 'var(--bg-4)', marginBottom: '6px' }} />
                    <div style={{ height: '22px', borderRadius: '4px', background: 'var(--bg-4)', width: '50%', marginTop: '12px' }} />
                  </div>
                </div>
              ))
            ) : featuredListings.map((card) => (
              <Link key={card.id} href={`/listing/${card.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--teal-border)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {card.photos?.[0]
                      ? <img src={card.photos[0]} alt={card.card_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ fontSize: '36px', opacity: 0.3 }}>🃏</div>
                    }
                    {card.grader && <div style={{ position: 'absolute', top: '10px', left: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 9px', borderRadius: '6px', fontWeight: 500, background: 'rgba(201,168,76,0.12)', border: '1px solid var(--teal-border)', color: 'var(--gold)' }}>{card.grader}</div>}
                    {card.grade && <div style={{ position: 'absolute', top: '10px', right: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(201,168,76,0.15)', border: '1.5px solid var(--gold)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>{card.grade}</div>}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 500 }}>{card.game}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '19px', fontWeight: 400, lineHeight: 1.2, marginBottom: '3px', color: 'var(--text-primary)' }}>{card.card_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{card.set}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)' }}>${Number(card.price).toLocaleString()}</div>
                      <div style={{ width: '30px', height: '30px', border: '1.5px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>→</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div style={{ background: 'var(--bg-2)', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', padding: '26px 2.5rem' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          {[
            { icon: '🔒', title: 'Dual Escrow Protection', sub: 'USDC locked until auto-release' },
            { icon: '✓', title: 'Human Authentication', sub: 'Every card verified by experts' },
            { icon: '→', title: 'Tracked Shipping', sub: 'Dual label, full visibility' },
            { icon: '◎', title: 'On-Chain Reputation', sub: 'Immutable seller & buyer history' },
            { icon: '⬡', title: 'Built on Base', sub: 'Ethereum L2 · pennies per tx' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', border: '1.5px solid var(--teal-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'var(--teal)' }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FEE COMPARISON */}
      <section style={{ padding: '80px 2.5rem', background: 'var(--bg-2)', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '12px', fontWeight: 500 }}>Why Chase Hollow</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 300, lineHeight: 1.05, marginBottom: '12px', color: 'var(--text-primary)' }}>
              We Charge <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>3.5%</em>.<br />Everyone Else Charges 13%.
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
              The difference isn't magic — it's blockchain. No credit card companies, no payment processors, no chargeback reserves.
            </p>
          </div>
          <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Platform', 'Marketplace Fee', 'Payment Processing', 'Total Cost', 'On $1,000 Sale'].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center', fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 20px 14px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Chase Hollow', sub: 'Blockchain · USDC · Base', fee: '3.5%', processing: '0%', total: '3.5%', keep: '$965', highlight: true },
                  { name: 'eBay', sub: 'Credit card · PayPal', fee: '12.9%', processing: '2.9%', total: '~15.8%', keep: '$842', highlight: false },
                  { name: 'TCGPlayer', sub: 'Credit card · Stripe', fee: '10.25%', processing: '2.5%', total: '~12.75%', keep: '$872', highlight: false },
                  { name: 'StockX', sub: 'Credit card · Stripe', fee: '9.5%', processing: '3%', total: '~12.5%', keep: '$875', highlight: false },
                  { name: 'PWCC', sub: 'Credit card · ACH', fee: '10%', processing: '3%', total: '~13%', keep: '$870', highlight: false },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--border)', background: row.highlight ? 'var(--teal-bg)' : 'transparent', borderLeft: row.highlight ? '3px solid var(--teal)' : '3px solid transparent' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: row.highlight ? 'var(--teal)' : 'var(--text-primary)' }}>{row.name}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.sub}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: row.highlight ? '26px' : '22px', fontWeight: 600, color: row.highlight ? 'var(--teal)' : 'var(--accent-red)' }}>{row.fee}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: row.highlight ? '26px' : '22px', fontWeight: 600, color: row.highlight ? 'var(--teal)' : 'var(--accent-red)' }}>{row.processing}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: row.highlight ? '28px' : '24px', fontWeight: 600, color: row.highlight ? 'var(--accent-green)' : 'var(--accent-red)' }}>{row.total}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: row.highlight ? '28px' : '24px', fontWeight: 600, color: row.highlight ? 'var(--accent-green)' : 'var(--accent-red)' }}>{row.keep}</div>
                      {row.highlight && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)', marginTop: '2px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '20px', padding: '2px 8px', display: 'inline-block' }}>You keep $965</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '24px 28px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 500 }}>Where eBay's 13% Goes</div>
              {[
                { label: 'Visa / Mastercard cut', val: '~1.8%' },
                { label: 'PayPal / Stripe processing', val: '~1.1%' },
                { label: 'Chargeback fraud reserve', val: '~1.5%' },
                { label: 'Platform overhead', val: '~8.6%' },
                { label: 'Total cost to seller', val: '~13%', total: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: item.total ? '10px 0 0' : '7px 0', borderBottom: item.total ? 'none' : '0.5px solid var(--border)', borderTop: item.total ? '0.5px solid var(--border)' : 'none', marginTop: item.total ? '4px' : '0', fontSize: '13px' }}>
                  <span style={{ color: item.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: item.total ? 600 : 400 }}>{item.label}</span>
                  <span style={{ fontFamily: item.total ? 'Cormorant Garamond, serif' : 'DM Mono, monospace', fontSize: item.total ? '22px' : '12px', color: 'var(--accent-red)', fontWeight: 500 }}>{item.val}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '14px', padding: '24px 28px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '16px', fontWeight: 500 }}>Where Chase Hollow's 3% Goes</div>
              {[
                { label: 'Visa / Mastercard cut', val: '0%', zero: true },
                { label: 'Payment processing', val: '0%', zero: true },
                { label: 'Chargeback fraud reserve', val: '0%', zero: true },
                { label: 'Platform + authentication', val: '3%', zero: false },
                      { label: 'Creator affiliate program', val: '0.5%', zero: false },
                { label: 'Total cost to seller', val: '3.5%', zero: false, total: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: item.total ? '10px 0 0' : '7px 0', borderBottom: item.total ? 'none' : '0.5px solid var(--teal-border)', borderTop: item.total ? '0.5px solid var(--teal-border)' : 'none', marginTop: item.total ? '4px' : '0', fontSize: '13px' }}>
                  <span style={{ color: item.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: item.total ? 600 : 400 }}>{item.label}</span>
                  <span style={{ fontFamily: item.total ? 'Cormorant Garamond, serif' : 'DM Mono, monospace', fontSize: item.total ? '22px' : '12px', color: item.zero ? 'var(--accent-green)' : 'var(--teal)', fontWeight: 500 }}>{item.zero ? `0% — no ${item.label.toLowerCase().split(' ')[0]}s` : item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY BLOCKCHAIN */}
      <section style={{ padding: '80px 2.5rem', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '12px', fontWeight: 500 }}>Why Blockchain</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(34px, 4vw, 50px)', fontWeight: 300, lineHeight: 1.08, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Trustless by Design.<br /><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Cheap by Default.</em>
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '28px' }}>
              Traditional marketplaces charge 13% because they're built on expensive infrastructure — credit card networks, payment processors, fraud departments. We replaced all of that with a smart contract. The code is public, auditable, and does exactly what it says.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { title: 'No middlemen taking a cut', desc: 'Visa and Mastercard each take a percentage of every transaction. We use USDC on Base — a blockchain transaction costs cents, not percentages.' },
                { title: 'No chargebacks, ever', desc: 'USDC is irreversible. Once the smart contract releases funds, the transaction is final. Sellers never eat a chargeback 90 days later.' },
                { title: 'We can\'t freeze your funds', desc: 'Your USDC is held by a smart contract, not by us. The code governs the money, not a company policy.' },
                { title: 'Reputation is immutable', desc: 'Feedback lives on-chain. No company can delete reviews or manipulate scores. Your record is permanent and publicly verifiable.' },
              ].map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', color: 'var(--teal)', fontSize: '14px' }}>⬡</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{point.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{point.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { num: '$0', label: 'Credit card fees', sub: 'Visa and Mastercard charge 1.5–2% per transaction. We charge zero.' },
              { num: '$0', label: 'Chargeback risk', sub: 'Credit card chargebacks cost US merchants $125B annually. Blockchain transactions are final.' },
              { num: '3.5%', label: 'Total seller fee', sub: '3% platform + 0.5% creator program. Still the lowest in the industry.' },
              { num: '~$0.05', label: 'Cost per blockchain transaction', sub: 'Base (Ethereum L2) processes transactions for cents.' },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, color: i === 2 ? 'var(--teal)' : 'var(--gold)', lineHeight: 1, minWidth: '80px' }}>{stat.num}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{stat.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 2.5rem', background: 'var(--bg-2)', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 46px)', fontWeight: 300, marginBottom: '10px', color: 'var(--text-primary)' }}>
              Built for <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Trust</em>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>Every card authenticated. Every dollar escrowed. Neither party can get burned.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
            {[
              { num: '01', title: 'Buyer Funds Escrow', desc: 'USDC locked in a smart contract on Base. Neither party can touch it. No bank, no PayPal — pure code.' },
              { num: '02', title: 'Seller Ships', desc: 'Under $300: seller ships direct to you with 3 photos uploaded. Over $300: pre-paid label to our auth center. 48hrs to ship — miss it and your USDC auto-refunds.' },
              { num: '03', title: 'Expert Authentication', desc: 'Certified human verifies grade, condition, and cert number match the listing exactly. Card ships to buyer on pass.' },
              { num: '04', title: 'Auto Settlement', desc: '72hrs after delivery, USDC releases automatically. No action needed. All on-chain. Final.' },
            ].map((step, i) => (
              <div key={i} style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '28px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '10px', right: '14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '72px', fontWeight: 300, color: 'var(--border)', lineHeight: 1, userSelect: 'none' }}>{step.num}</div>
                <div style={{ width: '40px', height: '40px', border: '1.5px solid var(--teal-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--teal)', position: 'relative', zIndex: 1 }}>{step.num}</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '19px', fontWeight: 400, marginBottom: '8px', color: 'var(--text-primary)', position: 'relative', zIndex: 1 }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, position: 'relative', zIndex: 1 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT SALES */}
      <section style={{ padding: '80px 2.5rem', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '34px', fontWeight: 300, color: 'var(--text-primary)' }}>
              Recent <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Sales</em>
            </h2>
            <a href="#" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--teal)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>Full price guide →</a>
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                  {['Card', 'Grade', 'Sale Price', '30d Change', 'Sold'].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale, i) => (
                  <tr key={i} style={{ borderBottom: i < recentSales.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '30px', height: '42px', borderRadius: '4px', background: sale.bg, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: 'var(--text-primary)' }}>{sale.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '1px' }}>{sale.set}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 9px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{sale.grade}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)' }}>{sale.price}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 500, color: sale.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>{sale.change}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{sale.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BUYER PROTECTION */}
      <section style={{ padding: '80px 2.5rem', background: 'var(--bg-2)', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '12px', fontWeight: 500 }}>For Buyers</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 54px)', fontWeight: 300, lineHeight: 1.05, marginBottom: '14px', color: 'var(--text-primary)' }}>
              Buy With <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Total Confidence</em>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.75 }}>
              Every card authenticated before it reaches you. Your money never touches the seller until you have the card in hand.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px', marginBottom: '40px' }}>
            {[
              { icon: '🔍', iconBg: 'var(--teal-bg)', iconBorder: 'var(--teal-border)', title: 'Every Listing Matches What You Receive', desc: 'Our authenticators verify the card matches the listing — photos, grade label, cert number, and slab integrity. If anything doesn\'t match, full refund automatically.' },
              { icon: '🔒', iconBg: 'rgba(76,175,124,0.1)', iconBorder: 'rgba(76,175,124,0.3)', title: 'Your Money is Always Safe', desc: 'USDC locks in a smart contract — not with us, not with the seller — until the card passes authentication and arrives with you. Nobody can touch it in transit.' },
              { icon: '↩', iconBg: 'rgba(232,168,56,0.1)', iconBorder: 'rgba(232,168,56,0.3)', title: 'Automatic Protection', desc: 'Seller doesn\'t ship within 48hrs? You\'re automatically refunded — no dispute needed, no waiting. Smart contract enforces it. One free extension allowed.' },
              { icon: '⬡', iconBg: 'rgba(60,125,200,0.1)', iconBorder: 'rgba(60,125,200,0.3)', title: 'Verified Seller Reputation', desc: 'Every review is tied to a real on-chain transaction. Sellers can\'t delete feedback or game ratings. What you see is permanently recorded on Base.' },
              { icon: '✓', iconBg: 'rgba(200,75,60,0.1)', iconBorder: 'rgba(200,75,60,0.3)', title: 'Grade Certified by PSA/BGS/CGC', desc: 'Our authenticators verify you receive what was listed. The card\'s grade and authenticity are certified by the grading company — we verify the match.' },
              { icon: '📊', iconBg: 'var(--teal-bg)', iconBorder: 'var(--teal-border)', title: 'Real Price History', desc: 'Every sale on Chase Hollow is verifiable on-chain. No fake sold listings, no inflated comps. Price history is real transaction data.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '28px 26px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: item.iconBg, border: `1.5px solid ${item.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '20px' }}>{item.icon}</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, marginBottom: '8px', color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '28px 32px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '20px', fontWeight: 500 }}>Chase Hollow vs. Buying Anywhere Else</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '2px', background: 'var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--teal-bg)', padding: '16px 20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px', fontWeight: 600 }}>Buying on Chase Hollow</div>
                {['Every card photo or physically authenticated', 'Funds held in escrow — not by seller', 'Auto-refund if seller doesn\'t ship', '72hr window to dispute on delivery', 'Verified on-chain reputation scores', 'Real price history from on-chain sales', 'Card received always matches listing'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                    <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✓</span>{item}
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg-3)', padding: '16px 20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px', fontWeight: 600 }}>Buying on eBay / Facebook / Forums</div>
                {['No authentication — trust the seller', 'Money released immediately on payment', 'Disputes take weeks to resolve', 'Seller can claim card was as described', 'Reviews can be faked or deleted', 'Sold listings can be manipulated', 'No guarantee received card matches listing'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    <span style={{ color: 'var(--accent-red)', flexShrink: 0 }}>✗</span>{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WALLET + USDC GUIDE */}
      <section style={{ padding: '80px 2.5rem', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '12px', fontWeight: 500 }}>Getting Started</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(34px, 4vw, 50px)', fontWeight: 300, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Connect Your Wallet.<br />Get <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Base USDC.</em>
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: 1.7 }}>
              Chase Hollow runs on Base — Ethereum's fastest and cheapest L2. You need USDC on Base to buy or post bonds. Here's everything you need.
            </p>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Supported Wallets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '40px' }}>
            {wallets.map((wallet, i) => (
              <div key={i} style={{ background: 'var(--bg-2)', border: `1.5px solid ${wallet.featured ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '12px', padding: '20px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, border: '1px solid var(--border)' }}>{wallet.icon}</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{wallet.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{wallet.desc}</div>
                </div>
                {wallet.featured && <div style={{ position: 'absolute', top: '10px', right: '10px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 8px', borderRadius: '10px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', fontWeight: 600 }}>{wallet.tag}</div>}
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>How to Get Base USDC</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { num: '01', title: 'Buy USDC on Coinbase', body: 'Create a Coinbase account, buy USDC, then withdraw to the Base network. When withdrawing, select Base — not Ethereum, not Polygon. Base.' },
              { num: '02', title: 'Already Have USDC on Ethereum?', body: 'Bridge it to Base using the official Base Bridge at bridge.base.org. Takes 5–7 minutes. Or swap ETH → USDC on Uniswap on the Base network.' },
              { num: '03', title: 'Connect to Chase Hollow', body: 'Click Connect Wallet on any listing. Select your wallet. Approve the Base network connection. USDC stays in your wallet until you purchase.' },
            ].map((step, i) => (
              <div key={i} style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '42px', fontWeight: 300, color: 'var(--border)', lineHeight: 1, marginBottom: '10px' }}>{step.num}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{step.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.body}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(232,168,56,0.08)', border: '1.5px solid rgba(232,168,56,0.35)', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            ⚠ <strong style={{ color: 'var(--accent-amber)' }}>Important:</strong> Chase Hollow only accepts USDC on the <strong style={{ color: 'var(--text-primary)' }}>Base network</strong>. Sending USDC on Ethereum mainnet will result in inaccessible funds. Always double-check the network before sending.
          </div>
        </div>
      </section>

      {/* SELLER CTA */}
      <section style={{ padding: '72px 2.5rem', background: 'var(--bg-2)', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--teal-border)', padding: '52px 60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px', fontWeight: 500 }}>For Sellers</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(32px, 4vw, 40px)', fontWeight: 300, lineHeight: 1.1, marginBottom: '12px', color: 'var(--text-primary)' }}>
                List Your Cards.<br /><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Keep More.</em>
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: 1.7, marginBottom: '20px' }}>
                We charge 3.5%. That's our full marketplace fee — transparent, fixed, and the lowest in the industry. On a $1,000 card, you pay $35. On eBay, you'd pay $130.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '13px 32px', fontSize: '14px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', borderRadius: '10px' }}>Start Selling</button>
                <button style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '13px 32px', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', borderRadius: '10px' }}>See Full Comparison</button>
              </div>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '96px', fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>3%</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 500 }}>Our only fee</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>vs. ~13% everywhere else</div>
            </div>
          </div>
        </div>
      </section>


    </>
  )
}