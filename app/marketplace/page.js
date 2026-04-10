'use client'

import { useState, useEffect } from 'react'

export default function Marketplace() {
  const [theme, setTheme] = useState('dark')
  const [activeCategory, setActiveCategory] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('featured')
  const [priceRange, setPriceRange] = useState([0, 50000])
  const [activeFilters, setActiveFilters] = useState([])

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

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'pokemon', label: 'Pokémon' },
    { id: 'mtg', label: 'Magic' },
    { id: 'onepiece', label: 'One Piece' },
    { id: 'yugioh', label: 'Yu-Gi-Oh' },
    { id: 'sports', label: 'Sports' },
  ]

  const gradeFilters = ['PSA 10', 'PSA 9', 'PSA 8', 'BGS 9.5', 'BGS 9', 'CGC 9.5', 'CGC 9', 'Raw']
  const gradingFilters = ['PSA', 'BGS', 'CGC', 'SGC', 'Raw/Ungraded']

  const listings = [
    { id: 1, game: 'Pokémon', set: 'Base Set', name: 'Charizard Holo', detail: '1999 Shadowless · #4/102', grade: 'PSA 9', grader: 'PSA', price: 487, comp: '$510 avg', change: '+2.4%', up: true, seller: 'CardKing_88', sellerTier: 'Elite', bg: 'linear-gradient(145deg,#1a3a5c,#0d2035)', icon: '⚡', borderColor: 'rgba(255,215,0,0.2)', wishlist: false },
    { id: 2, game: 'MTG', set: 'Alpha', name: 'Black Lotus', detail: '1993 Limited Edition · Rare', grade: 'BGS 9.5', grader: 'BGS', price: 28400, comp: '$29,000 avg', change: '-1.2%', up: false, seller: 'PowerNine_Pro', sellerTier: 'Pro', bg: 'linear-gradient(145deg,#1c2a1c,#0d1a0d)', icon: '✦', borderColor: 'rgba(76,175,124,0.2)', wishlist: false },
    { id: 3, game: 'Pokémon', set: 'Promo', name: 'Pikachu Illustrator', detail: '1998 CoroCoro · Trophy Card', grade: 'PSA 7', grader: 'PSA', price: 4200, comp: '$4,100 avg', change: '+5.1%', up: true, seller: 'CardKing_88', sellerTier: 'Elite', bg: 'linear-gradient(145deg,#2a1a3e,#1a0d2a)', icon: '★', borderColor: 'rgba(180,100,255,0.2)', wishlist: true },
    { id: 4, game: 'One Piece', set: 'OP-01', name: 'Monkey D. Luffy', detail: 'Romance Dawn · SEC Alt Art', grade: 'PSA 10', grader: 'PSA', price: 890, comp: '$920 avg', change: '+1.8%', up: true, seller: 'SlabMaster', sellerTier: 'Trusted', bg: 'linear-gradient(145deg,#2a1c1c,#1a0d0d)', icon: '☠', borderColor: 'rgba(200,75,60,0.2)', wishlist: false },
    { id: 5, game: 'MTG', set: 'Unlimited', name: 'Mox Sapphire', detail: '1993 Unlimited Edition · Rare', grade: 'BGS 9', grader: 'BGS', price: 6800, comp: '$7,100 avg', change: '+0.8%', up: true, seller: 'PowerNine_Pro', sellerTier: 'Pro', bg: 'linear-gradient(145deg,#1a1a3c,#0d0d24)', icon: '⬟', borderColor: 'rgba(100,100,255,0.2)', wishlist: false },
    { id: 6, game: 'Pokémon', set: 'Base Set', name: 'Blastoise Holo', detail: '1999 Base Set · #2/102', grade: 'PSA 10', grader: 'PSA', price: 3800, comp: '$3,600 avg', change: '+6.1%', up: true, seller: 'RareVault_99', sellerTier: 'Trusted', bg: 'linear-gradient(145deg,#1a2a3a,#0d1a2a)', icon: '💧', borderColor: 'rgba(100,180,255,0.2)', wishlist: false },
    { id: 7, game: 'MTG', set: 'Unlimited', name: 'Mox Ruby', detail: '1993 Unlimited Edition · Rare', grade: 'BGS 8.5', grader: 'BGS', price: 4100, comp: '$4,200 avg', change: '-1.5%', up: false, seller: 'MTGLegacy', sellerTier: 'Pro', bg: 'linear-gradient(145deg,#2a1c0d,#1a0d05)', icon: '🔥', borderColor: 'rgba(255,150,50,0.2)', wishlist: false },
    { id: 8, game: 'Sports', set: '1952 Topps', name: 'Mickey Mantle RC', detail: '1952 Topps · #311', grade: 'PSA 8', grader: 'PSA', price: 2100, comp: '$2,300 avg', change: '-2.1%', up: false, seller: 'VintageVault', sellerTier: 'New', bg: 'linear-gradient(145deg,#1a2a1a,#0d1a0d)', icon: '⚾', borderColor: 'rgba(76,175,124,0.2)', wishlist: false },
    { id: 9, game: 'MTG', set: 'Alpha', name: 'Ancestral Recall', detail: '1993 Limited Alpha · Rare', grade: 'BGS 9', grader: 'BGS', price: 9200, comp: '$9,400 avg', change: '+3.2%', up: true, seller: 'PowerNine_Pro', sellerTier: 'Pro', bg: 'linear-gradient(145deg,#1a2a3c,#0d1a24)', icon: '📜', borderColor: 'rgba(100,150,255,0.2)', wishlist: false },
    { id: 10, game: 'One Piece', set: 'OP-05', name: 'Roronoa Zoro SEC', detail: 'Awakening of the New Era · SEC', grade: 'CGC 9.5', grader: 'CGC', price: 340, comp: '$360 avg', change: '+4.2%', up: true, seller: 'SlabMaster', sellerTier: 'Trusted', bg: 'linear-gradient(145deg,#1a2a1c,#0d1a0d)', icon: '⚔', borderColor: 'rgba(76,175,124,0.2)', wishlist: false },
    { id: 11, game: 'Pokémon', set: 'Base Set', name: 'Venusaur Holo', detail: '1999 Base Set · #15/102', grade: 'PSA 9', grader: 'PSA', price: 680, comp: '$720 avg', change: '+1.1%', up: true, seller: 'CardKing_88', sellerTier: 'Elite', bg: 'linear-gradient(145deg,#1a2a1c,#0d1a10)', icon: '🌿', borderColor: 'rgba(76,200,100,0.2)', wishlist: false },
    { id: 12, game: 'MTG', set: 'Unlimited', name: 'Time Walk', detail: '1993 Unlimited Edition · Rare', grade: 'BGS 8.5', grader: 'BGS', price: 7400, comp: '$7,600 avg', change: '-0.8%', up: false, seller: 'MTGLegacy', sellerTier: 'Pro', bg: 'linear-gradient(145deg,#1a1a2a,#0d0d1a)', icon: '⏳', borderColor: 'rgba(150,100,255,0.2)', wishlist: false },
  ]

  const tierColors = {
    Elite: { bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.3)', color: 'var(--gold)' },
    Pro: { bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)' },
    Trusted: { bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', color: 'var(--accent-blue)' },
    New: { bg: 'rgba(255,255,255,0.05)', border: 'var(--border)', color: 'var(--text-muted)' },
  }

  const filteredListings = activeCategory === 'all'
    ? listings
    : listings.filter(l => l.game.toLowerCase().replace(/[^a-z]/g, '').includes(activeCategory.replace(/[^a-z]/g, '')))

  const btn = (style = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...style
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--nav-bg, rgba(10,10,11,0.94))', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <a href="/" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '24px', height: '24px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </a>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {['Marketplace', 'Recent Sales', 'How It Works', 'Fee Comparison', 'Get Started'].map((link, i) => (
            <a key={i} href={i === 0 ? '/marketplace' : '/'} style={{ fontSize: '12px', fontWeight: i === 0 ? 600 : 500, color: i === 0 ? 'var(--teal)' : 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{link}</a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleTheme} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '15px', color: 'var(--text-secondary)' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
          <button style={btn()}>Sign In</button>
          <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>List a Card</button>
        </div>
      </nav>

      {/* PAGE HEADER */}
      <div style={{ paddingTop: '64px', background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '28px 2.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>
                <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Marketplace</em>
              </h1>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                {filteredListings.length} listings · All cards authenticated · USDC escrow protected
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer' }}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="newest">Newest First</option>
                <option value="ending">Ending Soon</option>
              </select>
              <button onClick={() => setViewMode('grid')} style={{ ...btn(), borderColor: viewMode === 'grid' ? 'var(--teal-border)' : 'var(--border)', color: viewMode === 'grid' ? 'var(--teal)' : 'var(--text-secondary)', background: viewMode === 'grid' ? 'var(--teal-bg)' : 'transparent', padding: '8px 12px' }}>⊞</button>
              <button onClick={() => setViewMode('list')} style={{ ...btn(), borderColor: viewMode === 'list' ? 'var(--teal-border)' : 'var(--border)', color: viewMode === 'list' ? 'var(--teal)' : 'var(--text-secondary)', background: viewMode === 'list' ? 'var(--teal-bg)' : 'transparent', padding: '8px 12px' }}>☰</button>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 0 0 18px', gap: '10px', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>⌕</span>
            <input type="text" placeholder="Search cards, sets, grades, games..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', padding: '14px 0' }} />
            <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, padding: '14px 28px', cursor: 'pointer' }}>Search</button>
          </div>

          {/* CATEGORIES */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingBottom: '0' }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ background: activeCategory === cat.id ? 'var(--teal-bg)' : 'transparent', border: `1.5px solid ${activeCategory === cat.id ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '20px', padding: '6px 16px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: activeCategory === cat.id ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 500, borderBottom: activeCategory === cat.id ? '2px solid var(--teal)' : '2px solid transparent', transition: 'all 0.15s' }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <style>{`
        @media (max-width: 768px) {
          .mkt-layout { grid-template-columns: 1fr !important; padding: 16px 1rem 40px !important; }
          .mkt-filters { display: none !important; }
        }
      `}</style>
      <div className="mkt-layout" style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 1.5rem 60px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>

        {/* SIDEBAR FILTERS */}
        <aside className="mkt-filters">
          <div style={{ position: 'sticky', top: '84px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px', fontWeight: 500 }}>Active Filters</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeFilters.map((f, i) => (
                    <span key={i} onClick={() => setActiveFilters(activeFilters.filter(x => x !== f))} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>{f} ✕</span>
                  ))}
                </div>
              </div>
            )}

            {/* Grade Filter */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Grade</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {gradeFilters.map(grade => (
                  <button key={grade} onClick={() => setActiveFilters(activeFilters.includes(grade) ? activeFilters.filter(x => x !== grade) : [...activeFilters, grade])} style={{ background: activeFilters.includes(grade) ? 'var(--teal-bg)' : 'transparent', border: `1px solid ${activeFilters.includes(grade) ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: activeFilters.includes(grade) ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 500, textAlign: 'center', transition: 'all 0.15s' }}>
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Grading Company */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Grading Company</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {gradingFilters.map(g => (
                  <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--teal)', width: '14px', height: '14px' }} />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Price Range</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input type="number" placeholder="Min" style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
                <input type="number" placeholder="Max" style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
              </div>
              <button style={{ width: '100%', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '6px', padding: '7px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'var(--teal)', cursor: 'pointer' }}>Apply</button>
            </div>

            {/* Seller Tier */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Seller Tier</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['Elite', 'Pro', 'Trusted', 'New'].map(tier => {
                  const tc = tierColors[tier]
                  return (
                    <label key={tier} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ accentColor: 'var(--teal)', width: '14px', height: '14px' }} />
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 10px', borderRadius: '20px', background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontWeight: 500 }}>{tier}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Set / Era */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Set / Era</div>
              <input type="text" placeholder="e.g. Base Set, Alpha..." style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <button style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Clear All Filters
            </button>

          </div>
        </aside>

        {/* LISTINGS */}
        <div>

          {/* RESULT COUNT + ACTIVE FILTER TAGS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
              Showing {filteredListings.length} of {listings.length} listings
            </div>
            {activeFilters.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {activeFilters.map((f, i) => (
                  <span key={i} onClick={() => setActiveFilters(activeFilters.filter(x => x !== f))} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', cursor: 'pointer' }}>{f} ✕</span>
                ))}
              </div>
            )}
          </div>

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {filteredListings.map(card => (
                <div key={card.id} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--teal-border)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: '72%', aspectRatio: '2.5/3.5', borderRadius: '6px', background: card.bg, border: `2px solid ${card.borderColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '28px', opacity: 0.7 }}>{card.icon}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '60%' }}>
                        <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(201,168,76,0.4)', width: '100%' }} />
                        <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(201,168,76,0.2)', width: '70%' }} />
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: '10px', left: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 8px', borderRadius: '5px', fontWeight: 500, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)' }}>{card.grader}</div>
                    <div style={{ position: 'absolute', top: '10px', right: '10px', width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: card.grade.length > 4 ? '9px' : '15px', fontWeight: 600, color: 'var(--gold)' }}>{card.grade}</div>
                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '16px', cursor: 'pointer', opacity: card.wishlist ? 1 : 0.4 }}>♡</div>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px', fontWeight: 500 }}>{card.game} · {card.set}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', lineHeight: 1.2, marginBottom: '2px', color: 'var(--text-primary)' }}>{card.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{card.detail}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', background: tierColors[card.sellerTier].bg, border: `1px solid ${tierColors[card.sellerTier].border}`, color: tierColors[card.sellerTier].color, fontWeight: 500 }}>{card.sellerTier}</span>
                      <span style={{ fontSize: '11px', color: 'var(--teal)' }}>{card.seller}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)' }}>${card.price.toLocaleString()}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: card.up ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: '1px' }}>{card.change} · {card.comp}</div>
                      </div>
                      <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 14px', fontSize: '11px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer' }}>Buy</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredListings.map(card => (
                <div key={card.id} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', flexWrap: 'wrap' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal-border)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ width: '40px', height: '56px', borderRadius: '5px', background: card.bg, border: `2px solid ${card.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{card.icon}</div>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '2px' }}>{card.name}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{card.game} · {card.set} · {card.detail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{card.grader}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>{card.grade}</span>
                  </div>
                  <div style={{ minWidth: '80px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', background: tierColors[card.sellerTier].bg, border: `1px solid ${tierColors[card.sellerTier].border}`, color: tierColors[card.sellerTier].color, fontWeight: 500 }}>{card.sellerTier}</span>
                    <div style={{ fontSize: '11px', color: 'var(--teal)', marginTop: '3px' }}>{card.seller}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)' }}>${card.price.toLocaleString()}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: card.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>{card.change}</div>
                  </div>
                  <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '10px 20px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>Buy Now</button>
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' }}>
            {['←', '1', '2', '3', '4', '5', '→'].map((p, i) => (
              <button key={i} style={{ width: '36px', height: '36px', borderRadius: '8px', border: `1.5px solid ${p === '1' ? 'var(--teal-border)' : 'var(--border)'}`, background: p === '1' ? 'var(--teal-bg)' : 'transparent', color: p === '1' ? 'var(--teal)' : 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>{p}</button>
            ))}
          </div>

        </div>
      </div>

    </div>
  )
}