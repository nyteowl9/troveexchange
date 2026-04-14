'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'

const ACTIVE_ORDER_STATUSES = ['funded', 'shipped', 'in_transit', 'auth_pending', 'inspection_window']

const BOND_RATE = { new: 0.04, trusted: 0.03, pro: 0.02, elite: 0.01 }
const TIER_LABEL = { new: 'New', trusted: 'Trusted', pro: 'Pro', elite: 'Elite' }

const SELLER_STATUS_MAP = {
  funded:           { label: '⚡ Ship Now',      color: 'var(--accent-red)',   bg: 'rgba(200,75,60,0.1)',   border: 'rgba(200,75,60,0.3)',   urgent: true  },
  shipped:          { label: 'In Transit',       color: 'var(--accent-blue)',  bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', urgent: false },
  in_transit:       { label: 'In Transit',       color: 'var(--accent-blue)',  bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', urgent: false },
  auth_pending:     { label: 'Authenticating',   color: 'var(--gold)',          bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)',urgent: false },
  inspection_window:{ label: 'Auto-Releasing',   color: 'var(--accent-green)', bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', urgent: false },
}

function fmtUSD(n) {
  if (!n && n !== 0) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortId(id) {
  return '#' + String(id).slice(0, 6).toUpperCase()
}

function shipDeadline(createdAt) {
  if (!createdAt) return null
  return new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000)
}

function hoursUntil(ts) {
  if (!ts) return null
  const diff = new Date(ts) - Date.now()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60)))
}

export default function SellerDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection]   = useState('overview')
  const [activeOrders, setActiveOrders]     = useState([])
  const [myListings, setMyListings]         = useState([])
  const [completedSales, setCompletedSales] = useState([])
  const [dataLoading, setDataLoading]       = useState(true)

  // New listing form
  const [listingType, setListingType] = useState('graded')
  const [grader, setGrader]           = useState('PSA')
  const [price, setPrice]             = useState('')
  const [photos, setPhotos]           = useState([])
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData]       = useState({ game: 'Pokémon TCG', language: 'English', card_name: '', set: '', card_number: '', grade: '', cert_number: '', grader_other: '', condition: 'Near Mint (NM)', condition_notes: '', quantity: '', seal_condition: 'Factory Sealed — Unopened', lot_description: '' })
  const fileInputRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/sign-in')
  }, [authLoading, user, router])

  const fetchData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    const [ordersRes, listingsRes, salesRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`id, status, escrow_amount, auth_tier, tracking_a, shipped_at, created_at, auto_release_at,
                 listing:listing_id (id, card_name, game, set, grade, grader, photos, price, auth_tier),
                 buyer:buyer_id (id, username)`)
        .eq('seller_id', user.id)
        .in('status', ACTIVE_ORDER_STATUSES)
        .order('created_at', { ascending: false }),
      supabase
        .from('listings')
        .select('id, card_name, game, set, grade, grader, photos, price, status, listing_type, created_at, expires_at')
        .eq('seller_id', user.id)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select(`id, escrow_amount, platform_fee, shipping_cost, released_at,
                 listing:listing_id (card_name, game, set, grade, grader)`)
        .eq('seller_id', user.id)
        .eq('status', 'released')
        .order('released_at', { ascending: false })
        .limit(50),
    ])
    setActiveOrders(ordersRes.data || [])
    setMyListings(listingsRes.data || [])
    setCompletedSales(salesRes.data || [])
    setDataLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const calcFees = (p) => {
    const num = parseFloat(p) || 0
    const platform = (num * 0.035).toFixed(2)
    const shipCost = 15
    const net = (num - parseFloat(platform) - shipCost).toFixed(2)
    return { platform, shipCost, net }
  }

  const fees = calcFees(price)
  const bondRate = BOND_RATE[profile?.tier] || BOND_RATE.new
  const bondAmount = price ? (parseFloat(price) * bondRate).toFixed(2) : null

  const ordersNeedingShip = activeOrders.filter(o => o.status === 'funded')
  const totalActiveSalesValue = myListings.reduce((sum, l) => sum + Number(l.price || 0), 0)
  const totalCompletedRevenue = completedSales.reduce((sum, s) => sum + Number(s.escrow_amount || 0), 0)
  const bondInFlight = activeOrders.reduce((sum, o) => sum + (Number(o.escrow_amount || 0) * bondRate), 0)

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra,
  })

  const inputStyle = {
    width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  }

  const Label = ({ text }) => (
    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{text}</div>
  )

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const urls = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `listings/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: false })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('listing-photos').getPublicUrl(path)
        urls.push(publicUrl)
      }
    }
    setPhotos(prev => [...prev, ...urls])
  }

  async function handleSubmitListing() {
    setSubmitError('')
    if (!formData.card_name.trim()) { setSubmitError('Card name is required'); return }
    if (!price || parseFloat(price) < 1) { setSubmitError('Price must be at least $1'); return }
    if (photos.length < 1) { setSubmitError('At least 1 photo is required'); return }

    setSubmitting(true)
    const isGraded = listingType === 'graded'
    const priceNum = parseFloat(price)
    const authTier = priceNum <= 300 ? 'remote' : 'physical'
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const payload = {
      seller_id:    user.id,
      listing_type: listingType,
      game:         formData.game,
      card_name:    formData.card_name.trim(),
      set:          formData.set.trim() || null,
      card_number:  formData.card_number.trim() || null,
      grade:        isGraded ? formData.grade.trim() || null : null,
      grader:       isGraded ? (grader === 'Other' ? formData.grader_other.trim() : grader) : null,
      cert_number:  isGraded && grader !== 'Other' ? formData.cert_number.trim() || null : null,
      condition:    listingType === 'raw' ? formData.condition : null,
      price:        priceNum,
      auth_tier:    authTier,
      photos:       photos,
      status:       'active',
      expires_at:   expiresAt,
    }

    const { error } = await supabase.from('listings').insert(payload)
    setSubmitting(false)
    if (error) {
      setSubmitError('Failed to publish listing. Please try again.')
    } else {
      setPrice(''); setPhotos([]); setFormData({ game: 'Pokémon TCG', language: 'English', card_name: '', set: '', card_number: '', grade: '', cert_number: '', grader_other: '', condition: 'Near Mint (NM)', condition_notes: '', quantity: '', seal_condition: 'Factory Sealed — Unopened', lot_description: '' })
      await fetchData()
      setActiveSection('listings')
    }
  }

  async function handleDeleteListing(id) {
    await supabase.from('listings').update({ status: 'expired' }).eq('id', id).eq('seller_id', user.id)
    setMyListings(prev => prev.filter(l => l.id !== id))
  }

  const navItems = [
    { id: 'overview',     icon: '◈', label: 'Dashboard' },
    { id: 'notifications',icon: '◉', label: 'Notifications' },
    { id: 'orders',       icon: '⇄', label: 'Active Orders',  badgeColor: 'var(--accent-amber)' },
    { id: 'listings',     icon: '◆', label: 'My Listings',    badgeColor: 'var(--accent-green)' },
    { id: 'new-listing',  icon: '+', label: 'New Listing' },
    { id: 'earnings',     icon: '$', label: 'Earnings' },
    { id: 'bond',         icon: '🔒', label: 'Bond Wallet' },
    { id: 'profile',      icon: '◑', label: 'Profile' },
  ]

  const navBadge = (id) => {
    if (id === 'orders')   return activeOrders.length || null
    if (id === 'listings') return myListings.length || null
    return null
  }

  const OrderRow = ({ order }) => {
    const sm  = SELLER_STATUS_MAP[order.status] || SELLER_STATUS_MAP.shipped
    const dl  = shipDeadline(order.created_at)
    const hrs = order.status === 'funded' ? hoursUntil(dl) : null
    const photo = order.listing?.photos?.[0]
    return (
      <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${sm.urgent ? 'rgba(200,75,60,0.4)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ width: '32px', height: '46px', borderRadius: '4px', background: 'var(--bg-4)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '2px' }}>{order.listing?.card_name || '—'}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{order.listing?.game} · {shortId(order.id)} · Buyer: {order.buyer?.username || '—'}</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sm.bg, border: `1px solid ${sm.border}`, color: sm.color, fontWeight: 500, flexShrink: 0 }}>{sm.label}</span>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>{fmtUSD(order.escrow_amount)}</div>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: sm.urgent ? 'var(--accent-amber)' : 'var(--text-secondary)', background: 'var(--bg-3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', lineHeight: 1.5 }}>
            {order.status === 'funded'            && `⚠ Ship within ${hrs}hrs · Deadline ${fmtDate(dl)} · Auto-refund + Strike if missed`}
            {order.status === 'shipped'           && (order.tracking_a ? `Tracking: ${order.tracking_a}` : 'Shipped · En route to buyer')}
            {order.status === 'in_transit'        && (order.tracking_a ? `In transit · ${order.tracking_a}` : 'In transit')}
            {order.status === 'auth_pending'      && `At Chase Hollow HQ · Authentication in progress`}
            {order.status === 'inspection_window' && (order.auto_release_at ? `Delivered · Buyer inspection window · Auto-releases ${fmtDate(order.auto_release_at)}` : 'Delivered · Buyer inspection window open')}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {order.status === 'funded' && order.listing?.auth_tier === 'remote' && (
              <>
                <button style={{ background: 'rgba(60,125,200,0.15)', border: '1.5px solid rgba(60,125,200,0.4)', color: 'var(--accent-blue)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>📷 Upload 3 Photos</button>
                <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>🖨 Print Label</button>
              </>
            )}
            {order.status === 'funded' && order.listing?.auth_tier === 'physical' && (
              <button style={{ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>🖨 Print Label → Ship to Auth Center</button>
            )}
            {order.listing?.id && (
              <Link href={`/listing/${order.listing.id}`} style={{ textDecoration: 'none' }}>
                <button style={btn()}>View Listing</button>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (authLoading || (!user && !authLoading)) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>
      <style>{`
        @media (max-width: 768px) {
          .dash-aside { display: none !important; }
          .dash-main { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; padding: 16px 1rem 40px !important; }
          .mobile-section-nav { display: block !important; }
        }
        @media (min-width: 769px) { .mobile-section-nav { display: none !important; } }
      `}</style>

      <div style={{ display: 'flex', flexWrap: 'wrap', paddingTop: '64px', minHeight: '100vh' }}>

        {/* SIDEBAR */}
        <aside className="dash-aside" style={{ width: '220px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '64px', left: 0, height: 'calc(100vh - 64px)', overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          {navItems.map((item, i) => {
            const badge = navBadge(item.id)
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%', marginTop: i === 4 ? '8px' : 0 }}>
                <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
                {item.label}
                {badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor || 'var(--teal)', color: '#fff', fontWeight: 600 }}>{badge}</span>}
              </button>
            )
          })}

          <div style={{ margin: '16px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '10px', padding: '14px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px', fontWeight: 500 }}>Seller Stats</div>
            {[
              { label: 'Rating',    val: profile?.rep_score ? `${profile.rep_score.toFixed(2)} ★` : '—', gold: true },
              { label: 'Strikes',   val: String(profile?.strike_count ?? 0), green: profile?.strike_count === 0 },
              { label: 'Tier',      val: TIER_LABEL[profile?.tier] || 'New' },
              { label: 'Bond rate', val: `${((bondRate) * 100).toFixed(0)}% per sale` },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{stat.label}</span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 300, color: stat.gold ? 'var(--gold)' : stat.green ? 'var(--accent-green)' : 'var(--text-primary)' }}>{stat.val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dash-main" style={{ marginLeft: '220px', flex: 1, padding: '28px 24px 60px', minWidth: 0 }}>
          {/* MOBILE NAV */}
          <div className="mobile-section-nav" style={{ marginBottom: '20px', display: 'none' }}>
            <select value={activeSection} onChange={e => setActiveSection(e.target.value)} style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
              {navItems.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{profile?.username || 'Seller'}</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{TIER_LABEL[profile?.tier] || 'New'} Seller · {completedSales.length} sales · {profile?.strike_count ?? 0} strikes · Ship within 48hrs of sale</div>
                </div>
                <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ New Listing</button>
              </div>

              {/* Ship-now alert */}
              {ordersNeedingShip.length > 0 && (
                <div style={{ background: 'rgba(200,75,60,0.06)', border: '1.5px solid rgba(200,75,60,0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>⚡ Action required — {ordersNeedingShip.length} order{ordersNeedingShip.length > 1 ? 's' : ''} waiting to ship</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ordersNeedingShip[0].listing?.card_name || '—'} ({shortId(ordersNeedingShip[0].id)}). {hoursUntil(shipDeadline(ordersNeedingShip[0].created_at))}hrs remaining. Miss deadline = auto-refund + Strike 1.</div>
                  </div>
                  <button onClick={() => setActiveSection('orders')} style={{ background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Print Label →</button>
                </div>
              )}

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Active Orders',    val: String(activeOrders.length),           sub: ordersNeedingShip.length ? `${ordersNeedingShip.length} need shipping` : 'All on track',  color: ordersNeedingShip.length ? 'var(--accent-red)' : 'var(--text-primary)' },
                  { label: 'Active Listings',  val: String(myListings.length),              sub: fmtUSD(totalActiveSalesValue) + ' total value',                                            color: 'var(--text-primary)' },
                  { label: 'Completed Sales',  val: String(completedSales.length),          sub: fmtUSD(totalCompletedRevenue) + ' gross',                                                  color: 'var(--accent-green)' },
                  { label: 'Bond In-Flight',   val: fmtUSD(bondInFlight),                   sub: 'Returns within 5–7 days',                                                                 color: 'var(--gold)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
                {activeOrders.length > 2 && <button onClick={() => setActiveSection('orders')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>}
              </div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading orders…</div>
              ) : activeOrders.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No active orders</div>
              ) : (
                activeOrders.slice(0, 2).map(order => <OrderRow key={order.id} order={order} />)
              )}
            </div>
          )}

          {/* ORDERS */}
          {activeSection === 'orders' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>{activeOrders.length} orders in progress · Ship within 48hrs of sale · One extension available</div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading…</div>
              ) : activeOrders.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No active orders</div>
              ) : (
                activeOrders.map(order => <OrderRow key={order.id} order={order} />)
              )}
            </div>
          )}

          {/* LISTINGS */}
          {activeSection === 'listings' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listings</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{myListings.length} active · {fmtUSD(totalActiveSalesValue)} total value · Listings go live immediately</div>
                </div>
                <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ New Listing</button>
              </div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading…</div>
              ) : myListings.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>◆</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No active listings</div>
                  <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ Create First Listing</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                  {myListings.map((listing) => {
                    const photo = listing.photos?.[0]
                    return (
                      <div key={listing.id} style={{ background: 'var(--bg-2)', border: `1.5px solid ${listing.status === 'paused' ? 'rgba(232,168,56,0.3)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '32px', opacity: 0.4 }}>🃏</div>}
                          <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: listing.status === 'paused' ? 'rgba(232,168,56,0.15)' : 'rgba(76,175,124,0.1)', border: `1px solid ${listing.status === 'paused' ? 'rgba(232,168,56,0.3)' : 'rgba(76,175,124,0.3)'}`, color: listing.status === 'paused' ? 'var(--accent-amber)' : 'var(--accent-green)', fontWeight: 500 }}>{listing.status === 'paused' ? 'Paused' : 'Live'}</div>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>{listing.game}</div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', lineHeight: 1.2, marginBottom: '6px', color: 'var(--text-primary)' }}>{listing.card_name}</div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', marginBottom: '10px' }}>{fmtUSD(listing.price)}</div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Link href={`/listing/${listing.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                              <button style={btn({ fontSize: '10px', padding: '5px 10px', width: '100%', textAlign: 'center' })}>View</button>
                            </Link>
                            <button onClick={() => handleDeleteListing(listing.id)} style={btn({ fontSize: '10px', padding: '5px 10px', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)' })}>Remove</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* NEW LISTING */}
          {activeSection === 'new-listing' && (
            <div style={{ maxWidth: '720px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>New <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listing</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', fontFamily: 'DM Mono, monospace' }}>Listings go live immediately — no wallet needed until a buyer purchases</div>

              {/* Listing type */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Listing Type</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['graded', 'raw', 'pack', 'box', 'case', 'lot'].map(type => (
                    <button key={type} onClick={() => setListingType(type)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${listingType === type ? 'var(--teal-border)' : 'var(--border)'}`, background: listingType === type ? 'var(--teal-bg)' : 'transparent', color: listingType === type ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize' }}>{type}</button>
                  ))}
                </div>
              </div>

              {/* Card details */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Card Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <Label text="GAME" />
                      <select value={formData.game} onChange={e => setFormData(p => ({ ...p, game: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>Pokémon TCG</option>
                        <option>Magic: The Gathering</option>
                        <option>One Piece TCG</option>
                        <option>Yu-Gi-Oh!</option>
                        <option>Sports Cards</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <Label text="LANGUAGE" />
                      <select value={formData.language} onChange={e => setFormData(p => ({ ...p, language: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>English</option>
                        <option>Japanese</option>
                        <option>Korean</option>
                        <option>Chinese</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label text="CARD NAME *" />
                    <input type="text" placeholder="e.g. Charizard Holo" value={formData.card_name} onChange={e => setFormData(p => ({ ...p, card_name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <Label text="SET / EDITION" />
                      <input type="text" placeholder="e.g. Base Set Shadowless" value={formData.set} onChange={e => setFormData(p => ({ ...p, set: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <Label text="CARD NUMBER" />
                      <input type="text" placeholder="e.g. 4/102" value={formData.card_number} onChange={e => setFormData(p => ({ ...p, card_number: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  {listingType === 'graded' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <Label text="GRADING COMPANY" />
                          <select value={grader} onChange={e => setGrader(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option>PSA</option>
                            <option>BGS / Beckett</option>
                            <option>CGC</option>
                            <option>SGC</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <Label text="GRADE" />
                          <input type="text" placeholder="e.g. 9 or 9.5" value={formData.grade} onChange={e => setFormData(p => ({ ...p, grade: e.target.value }))} style={inputStyle} />
                        </div>
                      </div>
                      {grader !== 'Other' ? (
                        <div>
                          <Label text={`CERT NUMBER (${grader})`} />
                          <input type="text" placeholder="e.g. 12847291" value={formData.cert_number} onChange={e => setFormData(p => ({ ...p, cert_number: e.target.value }))} style={inputStyle} />
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>Buyers and our authenticators will verify this cert on the {grader} official database. Must be accurate.</div>
                        </div>
                      ) : (
                        <div>
                          <Label text="GRADER NAME" />
                          <input type="text" placeholder="e.g. TAG, HGA, Arena Club…" value={formData.grader_other} onChange={e => setFormData(p => ({ ...p, grader_other: e.target.value }))} style={inputStyle} />
                        </div>
                      )}
                    </div>
                  )}

                  {listingType === 'raw' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <Label text="CONDITION" />
                          <select value={formData.condition} onChange={e => setFormData(p => ({ ...p, condition: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option>Near Mint (NM)</option>
                            <option>Lightly Played (LP)</option>
                            <option>Moderately Played (MP)</option>
                            <option>Heavily Played (HP)</option>
                            <option>Damaged (DMG)</option>
                          </select>
                        </div>
                        <div>
                          <Label text="YEAR PRINTED" />
                          <input type="text" placeholder="e.g. 1999" style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <Label text="CONDITION NOTES (Required)" />
                        <textarea placeholder="Describe any flaws, wear, creases, or notable details buyers should know." value={formData.condition_notes} onChange={e => setFormData(p => ({ ...p, condition_notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                      </div>
                      <div style={{ background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>⚠ Raw cards are authenticated for condition match. Misrepresented condition results in rejection, full buyer refund, and a strike.</div>
                    </div>
                  )}

                  {(listingType === 'pack' || listingType === 'box' || listingType === 'case') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <Label text="QUANTITY" />
                        <input type="number" placeholder="e.g. 1" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <Label text="SEAL CONDITION" />
                        <select value={formData.seal_condition} onChange={e => setFormData(p => ({ ...p, seal_condition: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option>Factory Sealed — Unopened</option>
                          <option>Resealed — Disclosed</option>
                          <option>Open / Loose</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {listingType === 'lot' && (
                    <div>
                      <Label text="LOT DESCRIPTION" />
                      <textarea placeholder="Describe all cards included — names, sets, conditions, grades if any." value={formData.lot_description} onChange={e => setFormData(p => ({ ...p, lot_description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Photos (Required · Min 1)</div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-3)', marginBottom: photos.length ? '12px' : '0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>📷</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>Upload Card Photos</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {listingType === 'graded' && 'Front, back, full slab, grade label · Min 3 required'}
                    {listingType === 'raw'    && 'Front, back, all four corners · Min 4 required'}
                    {(listingType === 'pack' || listingType === 'box' || listingType === 'case') && 'All sides of sealed product · Min 3 required'}
                    {listingType === 'lot'   && 'All cards spread out + individual shots · Min 4 required'}
                  </div>
                </div>
                {photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {photos.map((url, i) => (
                      <div key={i} style={{ position: 'relative', width: '60px', height: '84px', borderRadius: '4px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price + fees */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Price & Fee Calculator</div>
                <Label text="LISTING PRICE (USDC) *" />
                <input type="number" placeholder="Minimum $1" value={price} onChange={e => setPrice(e.target.value)} style={{ ...inputStyle, marginBottom: '14px', fontSize: '18px', fontFamily: 'Cormorant Garamond, serif' }} />
                {price && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px' }}>
                    {[
                      { label: 'Your listing price',       val: `$${parseFloat(price).toLocaleString()}` },
                      { label: 'Platform fee (3.5%)',      val: `-$${fees.platform}` },
                      { label: 'Shipping & insurance',     val: `-$${fees.shipCost}` },
                      { label: 'Auth tier',                val: parseFloat(price) <= 300 ? 'Remote Photo ($10 buyer)' : 'Physical ($25 buyer)' },
                      { label: 'You receive on settlement',val: `$${fees.net}`, green: true, total: true },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: row.total ? '8px 0 0' : '5px 0', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0' }}>
                        <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                        <span style={{ fontFamily: row.total ? 'Cormorant Garamond, serif' : 'DM Mono, monospace', fontSize: row.total ? '20px' : '12px', color: row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bond notice */}
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500 }}>Bond — Separate from fees</div>
                {[
                  { label: 'Bond posted at purchase', val: price && bondAmount ? `-$${bondAmount} (${(bondRate * 100).toFixed(0)}% ${TIER_LABEL[profile?.tier] || 'New'})` : `-${(bondRate * 100).toFixed(0)}% of sale price`, amber: true },
                  { label: 'Bond returned',            val: 'Within 5–7 days', green: true },
                  { label: 'Net bond cost',            val: '$0.00', green: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: row.green ? 'var(--accent-green)' : row.amber ? 'var(--accent-amber)' : 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>Bond is collateral — not a fee. It posts when a buyer purchases and returns in full on successful completion.</div>
              </div>
              <div style={{ background: 'rgba(200,75,60,0.05)', border: '1px solid rgba(200,75,60,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Ship within 48hrs of sale.</strong> One free extension available. Miss deadline = auto-refund to buyer + Strike 1. Three strikes = permanent ban.
              </div>

              {submitError && (
                <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: 'var(--accent-red)' }}>{submitError}</div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSubmitListing} disabled={submitting} style={{ flex: 1, background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Publishing…' : 'Publish Listing — Go Live'}</button>
              </div>
            </div>
          )}

          {/* EARNINGS */}
          {activeSection === 'earnings' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Earnings</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{completedSales.length} completed sales · All USDC on Base</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Gross Revenue',  val: fmtUSD(totalCompletedRevenue), sub: 'All completed sales', color: 'var(--gold)' },
                  { label: 'Fees Paid (3.5%)',val: fmtUSD(totalCompletedRevenue * 0.035), sub: 'Platform fee',    color: 'var(--accent-red)' },
                  { label: 'Net Received',   val: fmtUSD(totalCompletedRevenue * (1 - 0.035) - completedSales.length * 15), sub: 'After fees + shipping', color: 'var(--accent-green)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              {completedSales.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>No completed sales yet</div>
              ) : (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                        {['Card', 'Date', 'Gross', 'Fee (3.5%)', 'Net'].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 14px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {completedSales.map((sale, i) => {
                        const gross = Number(sale.escrow_amount || 0)
                        const fee   = gross * 0.035
                        const ship  = Number(sale.shipping_cost || 15)
                        const net   = gross - fee - ship
                        return (
                          <tr key={sale.id} style={{ borderBottom: i < completedSales.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{sale.listing?.card_name || '—'}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(sale.released_at)}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: 'var(--gold)', fontWeight: 600 }}>{fmtUSD(gross)}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-red)' }}>-{fmtUSD(fee)}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: 'var(--accent-green)', fontWeight: 600 }}>{fmtUSD(net)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* BOND WALLET */}
          {activeSection === 'bond' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Bond <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Wallet</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Bonds post per transaction when a buyer purchases — not when you list. All bonds return within 5–7 days on completion.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Currently Locked', val: fmtUSD(bondInFlight), sub: `Across ${activeOrders.length} active orders · Returns within 5–7 days each`, color: 'var(--accent-amber)' },
                  { label: 'Bond Tier',         val: `${(bondRate * 100).toFixed(0)}%`, sub: `${TIER_LABEL[profile?.tier] || 'New'} seller`,                                   color: 'var(--teal)' },
                  { label: 'Strikes',           val: String(profile?.strike_count ?? 0), sub: profile?.strike_count === 0 ? 'None — clean record' : 'Strike 2 → bond jumps to 4%', color: profile?.strike_count === 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Bond Tier Structure</div>
                {[
                  { tier: 'New Seller', range: '0–9 sales',   rate: 4 },
                  { tier: 'Trusted',    range: '10–99 sales',  rate: 3 },
                  { tier: 'Pro',        range: '100–499 sales',rate: 2 },
                  { tier: 'Elite',      range: '500+ sales',   rate: 1 },
                ].map((t, i) => {
                  const tierKey = ['new', 'trusted', 'pro', 'elite'][i]
                  const isMe = profile?.tier === tierKey
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: isMe ? 600 : 400, color: isMe ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{t.tier} {isMe && '← You are here'}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{t.range}</div>
                      </div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 600, color: isMe ? 'var(--teal)' : 'var(--text-muted)' }}>{t.rate}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS — Phase 3 */}
          {activeSection === 'notifications' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Notifications</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Email notifications active — in-app alerts coming in Phase 3</div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>◉</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>In-app notifications coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>You're receiving order updates by email. Real-time alerts will be added at public launch.</div>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activeSection === 'profile' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Profile</em></div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>◑</div>
                <div>Profile settings — bio, specialties, shipping preferences, contact info.</div>
                {profile?.username && (
                  <Link href={`/profile/${profile.username}`} style={{ color: 'var(--teal)', textDecoration: 'none', fontSize: '13px', marginTop: '12px', display: 'block' }}>View public profile →</Link>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
