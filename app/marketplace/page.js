'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 24

const TIER_COLORS = {
  elite:   { bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.3)',  color: 'var(--gold)',         label: 'Elite' },
  pro:     { bg: 'rgba(232,168,56,0.1)',  border: 'rgba(232,168,56,0.3)',  color: 'var(--accent-amber)', label: 'Pro' },
  trusted: { bg: 'rgba(60,125,200,0.1)',  border: 'rgba(60,125,200,0.3)',  color: 'var(--accent-blue)',  label: 'Trusted' },
  new:     { bg: 'rgba(255,255,255,0.05)', border: 'var(--border)',         color: 'var(--text-muted)',   label: 'New' },
}

const CATEGORIES = [
  { id: 'all',      label: 'All',       match: null },
  { id: 'pokemon',  label: 'Pokémon',   match: 'pokemon' },
  { id: 'mtg',      label: 'Magic',     match: 'magic' },
  { id: 'onepiece', label: 'One Piece', match: 'one piece' },
  { id: 'yugioh',   label: 'Yu-Gi-Oh',  match: 'yu-gi-oh' },
  { id: 'sports',   label: 'Sports',    match: 'sports' },
]

const GRADE_FILTERS = ['PSA 10', 'PSA 9', 'PSA 8', 'BGS 9.5', 'BGS 9', 'CGC 9.5', 'CGC 9', 'Raw']
const GRADER_FILTERS = ['PSA', 'BGS', 'CGC', 'SGC', 'Raw/Ungraded']

export default function Marketplace() {
  const router = useRouter()

  // Filters
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [gradeFilters, setGradeFilters] = useState([])   // e.g. ['PSA 10']
  const [graderFilters, setGraderFilters] = useState([]) // e.g. ['PSA']
  const [tierFilters, setTierFilters] = useState([])     // e.g. ['elite']
  const [page, setPage] = useState(1)

  // Data
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('listings')
      .select(`
        id, card_name, game, set, grade, grader, listing_type, condition,
        price, auth_tier, photos, created_at, expires_at,
        seller:seller_id (id, username, tier)
      `, { count: 'exact' })
      .eq('status', 'active')

    // Category filter
    const cat = CATEGORIES.find(c => c.id === category)
    if (cat?.match) query = query.ilike('game', `%${cat.match}%`)

    // Search
    if (search.trim()) {
      query = query.or(`card_name.ilike.%${search.trim()}%,set.ilike.%${search.trim()}%,game.ilike.%${search.trim()}%`)
    }

    // Price range
    if (priceMin !== '') query = query.gte('price', parseFloat(priceMin))
    if (priceMax !== '') query = query.lte('price', parseFloat(priceMax))

    // Grader filter (checkbox)
    if (graderFilters.length > 0) {
      const rawSelected = graderFilters.includes('Raw/Ungraded')
      const realGraders = graderFilters.filter(g => g !== 'Raw/Ungraded')
      if (rawSelected && realGraders.length > 0) {
        query = query.or(`grader.in.(${realGraders.join(',')}),grader.is.null`)
      } else if (rawSelected) {
        query = query.is('grader', null)
      } else {
        query = query.in('grader', realGraders)
      }
    }

    // Sort
    switch (sortBy) {
      case 'price-low':  query = query.order('price', { ascending: true });  break
      case 'price-high': query = query.order('price', { ascending: false }); break
      case 'ending':     query = query.order('expires_at', { ascending: true }); break
      default:           query = query.order('created_at', { ascending: false }); break
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE
    query = query.range(from, from + PAGE_SIZE - 1)

    const { data, count } = await query

    // Tier filter is client-side (filtering on joined seller.tier server-side
    // requires a subquery — applying after fetch for simplicity)
    const filtered = tierFilters.length > 0
      ? (data || []).filter(c => tierFilters.includes(c.seller?.tier || 'new'))
      : (data || [])
    setListings(filtered)
    setTotal(count || 0)
    setLoading(false)
  }, [category, search, sortBy, priceMin, priceMax, graderFilters, page])

  useEffect(() => { load() }, [load])

  // Reset to page 1 on any filter change
  useEffect(() => { setPage(1) }, [category, search, sortBy, priceMin, priceMax, graderFilters])

  function toggleFilter(arr, setArr, val) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  function applySearch(e) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  function clearFilters() {
    setCategory('all')
    setSearch('')
    setSearchInput('')
    setSortBy('newest')
    setPriceMin('')
    setPriceMax('')
    setGradeFilters([])
    setGraderFilters([])
    setTierFilters([])
    setPage(1)
  }

  const activeFilterCount = gradeFilters.length + graderFilters.length + tierFilters.length +
    (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (search ? 1 : 0)

  const btn = (style = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...style,
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* PAGE HEADER */}
      <div style={{ paddingTop: '64px', background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '28px 2.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>
                <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Marketplace</em>
              </h1>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                {loading ? '...' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}`} · All cards authenticated · USDC escrow protected
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer' }}>
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="ending">Ending Soon</option>
              </select>
              <button onClick={() => setViewMode('grid')} style={{ ...btn(), borderColor: viewMode === 'grid' ? 'var(--teal-border)' : 'var(--border)', color: viewMode === 'grid' ? 'var(--teal)' : 'var(--text-secondary)', background: viewMode === 'grid' ? 'var(--teal-bg)' : 'transparent', padding: '8px 12px' }}>⊞</button>
              <button onClick={() => setViewMode('list')} style={{ ...btn(), borderColor: viewMode === 'list' ? 'var(--teal-border)' : 'var(--border)', color: viewMode === 'list' ? 'var(--teal)' : 'var(--text-secondary)', background: viewMode === 'list' ? 'var(--teal-bg)' : 'transparent', padding: '8px 12px' }}>☰</button>
            </div>
          </div>

          {/* SEARCH BAR */}
          <form onSubmit={applySearch} style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 0 0 18px', gap: '10px', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>⌕</span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search cards, sets, grades, games..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', padding: '14px 0' }}
            />
            <button type="submit" style={{ background: 'var(--teal)', border: 'none', color: 'var(--bg)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, padding: '14px 28px', cursor: 'pointer' }}>Search</button>
          </form>

          {/* CATEGORIES */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ background: category === cat.id ? 'var(--teal-bg)' : 'transparent', border: `1.5px solid ${category === cat.id ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '20px', padding: '6px 16px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: category === cat.id ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 500, transition: 'all 0.15s' }}>
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

            {activeFilterCount > 0 && (
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px', fontWeight: 500 }}>Active Filters ({activeFilterCount})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {gradeFilters.map(f => <span key={f} onClick={() => toggleFilter(gradeFilters, setGradeFilters, f)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', cursor: 'pointer' }}>{f} ✕</span>)}
                  {graderFilters.map(f => <span key={f} onClick={() => toggleFilter(graderFilters, setGraderFilters, f)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', cursor: 'pointer' }}>{f} ✕</span>)}
                  {search && <span onClick={() => { setSearch(''); setSearchInput('') }} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', color: 'var(--teal)', cursor: 'pointer' }}>"{search}" ✕</span>}
                </div>
              </div>
            )}

            {/* Grade Filter */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Grade</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {GRADE_FILTERS.map(grade => (
                  <button key={grade} onClick={() => toggleFilter(gradeFilters, setGradeFilters, grade)} style={{ background: gradeFilters.includes(grade) ? 'var(--teal-bg)' : 'transparent', border: `1px solid ${gradeFilters.includes(grade) ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: gradeFilters.includes(grade) ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 500, textAlign: 'center', transition: 'all 0.15s' }}>
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Grading Company */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Grading Company</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {GRADER_FILTERS.map(g => (
                  <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: graderFilters.includes(g) ? 'var(--teal)' : 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={graderFilters.includes(g)} onChange={() => toggleFilter(graderFilters, setGraderFilters, g)} style={{ accentColor: 'var(--teal)', width: '14px', height: '14px' }} />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Price Range</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
                <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
              </div>
              <button onClick={() => setPage(1)} style={{ width: '100%', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '6px', padding: '7px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'var(--teal)', cursor: 'pointer' }}>Apply</button>
            </div>

            {/* Seller Tier */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Seller Tier</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(TIER_COLORS).map(([key, tc]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={tierFilters.includes(key)} onChange={() => toggleFilter(tierFilters, setTierFilters, key)} style={{ accentColor: 'var(--teal)', width: '14px', height: '14px' }} />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '2px 10px', borderRadius: '20px', background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontWeight: 500 }}>{tc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={clearFilters} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* LISTINGS AREA */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading...' : `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString()} listings`}
            </div>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', opacity: 0.5 }}>
                  <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)' }} />
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ height: '8px', background: 'var(--bg-3)', borderRadius: '4px', marginBottom: '6px', width: '60%' }} />
                    <div style={{ height: '18px', background: 'var(--bg-3)', borderRadius: '4px', marginBottom: '8px' }} />
                    <div style={{ height: '20px', background: 'var(--bg-3)', borderRadius: '4px', width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && listings.length === 0 && (
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: 'var(--text-muted)', marginBottom: '8px' }}>No listings found</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>Try adjusting your filters or search terms.</div>
              <button onClick={clearFilters} style={{ background: 'var(--teal)', border: 'none', color: 'var(--bg)', padding: '10px 24px', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Clear Filters</button>
            </div>
          )}

          {/* GRID VIEW */}
          {!loading && listings.length > 0 && viewMode === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {listings.map(card => {
                const tc = TIER_COLORS[card.seller?.tier] || TIER_COLORS.new
                const graderLabel = card.grader || 'RAW'
                const gradeLabel = card.grade != null ? card.grade : ''
                return (
                  <Link key={card.id} href={`/listing/${card.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', height: '100%' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--teal-border)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        {card.photos?.[0] ? (
                          <img src={card.photos[0]} alt={card.card_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '72%', aspectRatio: '2.5/3.5', borderRadius: '6px', background: 'var(--bg-4)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', opacity: 0.4 }}>🃏</div>
                        )}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 8px', borderRadius: '5px', fontWeight: 500, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)' }}>{graderLabel}</div>
                        {gradeLabel !== '' && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(201,168,76,0.15)', border: '1.5px solid var(--gold)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>{gradeLabel}</div>
                        )}
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px', fontWeight: 500 }}>{card.game}{card.set ? ` · ${card.set}` : ''}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', lineHeight: 1.2, marginBottom: '6px', color: 'var(--text-primary)' }}>{card.card_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontWeight: 500 }}>{tc.label}</span>
                          <span style={{ fontSize: '11px', color: 'var(--teal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{card.seller?.username || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)' }}>${parseFloat(card.price).toLocaleString()}</div>
                          <button style={{ background: 'var(--teal)', border: 'none', color: 'var(--bg)', padding: '8px 14px', fontSize: '11px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer' }}>Buy</button>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {!loading && listings.length > 0 && viewMode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {listings.map(card => {
                const tc = TIER_COLORS[card.seller?.tier] || TIER_COLORS.new
                return (
                  <Link key={card.id} href={`/listing/${card.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', flexWrap: 'wrap' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal-border)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <div style={{ width: '40px', height: '56px', borderRadius: '5px', background: 'var(--bg-3)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, overflow: 'hidden' }}>
                        {card.photos?.[0] ? <img src={card.photos[0]} alt={card.card_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
                      </div>
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '2px' }}>{card.card_name}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{card.game}{card.set ? ` · ${card.set}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {card.grader && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{card.grader}</span>}
                        {card.grade != null && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>{card.grade}</span>}
                      </div>
                      <div style={{ minWidth: '80px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontWeight: 500 }}>{tc.label}</span>
                        <div style={{ fontSize: '11px', color: 'var(--teal)', marginTop: '3px' }}>@{card.seller?.username || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: 'var(--gold)' }}>${parseFloat(card.price).toLocaleString()}</div>
                      </div>
                      <button style={{ background: 'var(--teal)', border: 'none', color: 'var(--bg)', padding: '10px 20px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>Buy Now</button>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: page === 1 ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', fontSize: '12px', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>←</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                return (
                  <button key={p} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: `1.5px solid ${p === page ? 'var(--teal-border)' : 'var(--border)'}`, background: p === page ? 'var(--teal-bg)' : 'transparent', color: p === page ? 'var(--teal)' : 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>{p}</button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', fontSize: '12px', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
