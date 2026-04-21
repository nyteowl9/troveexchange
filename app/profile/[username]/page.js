'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const TIERS = {
  new:     { label: 'New Seller',      color: '#B8B4AC', bg: 'rgba(184,180,172,0.1)',  border: 'rgba(184,180,172,0.3)',  next: 10,   nextLabel: '10 sales → Trusted' },
  trusted: { label: 'Trusted Seller',  color: '#3C7DC8', bg: 'rgba(60,125,200,0.1)',   border: 'rgba(60,125,200,0.3)',   next: 100,  nextLabel: '100 sales → Pro' },
  pro:     { label: 'Pro Seller',      color: '#0D6E6E', bg: 'rgba(13,110,110,0.1)',   border: 'rgba(13,110,110,0.3)',   next: 500,  nextLabel: '500 sales → Elite' },
  elite:   { label: '⭐ Elite Seller',  color: '#C9A84C', bg: 'rgba(201,168,76,0.15)',  border: 'rgba(201,168,76,0.3)',   next: 2500, nextLabel: '2,500 sales → Legend' },
  legend:  { label: '👑 Legend',        color: '#E8A838', bg: 'rgba(232,168,56,0.15)',  border: 'rgba(232,168,56,0.4)',   next: null, nextLabel: null },
}

function StarRating({ score, count, label }) {
  if (!score) return null
  const full  = Math.floor(score)
  const half  = score - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 300, color: 'var(--gold)' }}>{parseFloat(score).toFixed(2)}</span>
      <span style={{ display: 'flex', gap: '1px' }}>
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(empty)}
      </span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>({count} {label})</span>
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '3px' }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ color: i <= review.rating ? 'var(--gold)' : 'var(--border)', fontSize: '14px' }}>★</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>@{review.reviewer_username}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>
            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
      {review.comment && (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{review.comment}</div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const [activeTab, setActiveTab]       = useState('listings')
  const [feedbackView, setFeedbackView] = useState('seller') // 'seller' | 'buyer'
  const [profile, setProfile]           = useState(null)
  const [listings, setListings]         = useState([])
  const [sellerReviews, setSellerReviews] = useState([])
  const [buyerReviews, setBuyerReviews]   = useState([])
  const [salesHistory, setSalesHistory]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [notFoundState, setNotFoundState] = useState(false)

  useEffect(() => {
    if (!username) return
    loadProfile()
  }, [username])

  async function loadProfile() {
    setLoading(true)

    // Extended profile from API
    const res = await fetch(`/api/profile/${username.toLowerCase()}`)
    if (!res.ok) {
      setNotFoundState(true)
      setLoading(false)
      return
    }
    const data = await res.json()
    setProfile(data.user)
    setSellerReviews(data.sellerReviews || [])
    setBuyerReviews(data.buyerReviews || [])
    setSalesHistory(data.salesHistory || [])

    // Active listings
    const { data: listingData } = await supabase
      .from('listings')
      .select('id, card_name, game, set, grade, grader, listing_type, price, auth_tier, photos, created_at')
      .eq('seller_id', data.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(24)

    setListings(listingData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Loading...</div>
      </div>
    )
  }

  if (notFoundState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', color: 'var(--text-muted)' }}>404</div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-secondary)' }}>User @{username} not found.</div>
        <Link href="/marketplace" style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--gold)', textDecoration: 'none', marginTop: '8px' }}>← Back to Marketplace</Link>
      </div>
    )
  }

  const tier         = TIERS[profile.seller_tier] || TIERS.new
  const initials     = (profile.username || '??').slice(0, 2).toUpperCase()
  const joinedYear   = new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const shortWallet  = profile.wallet_address
    ? `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`
    : null

  // Tier progress bar
  const tierPrev     = { new: 0, trusted: 10, pro: 100, elite: 500, legend: 2500 }[profile.seller_tier] || 0
  const tierNext     = tier.next
  const sales        = profile.total_sales || 0
  const progressPct  = tierNext
    ? Math.min(100, Math.round(((sales - tierPrev) / (tierNext - tierPrev)) * 100))
    : 100

  const totalFeedbackCount = (profile.seller_review_count || 0) + (profile.buyer_review_count || 0)

  const tabs = [
    { id: 'listings',  label: 'Listings',      count: listings.length },
    { id: 'feedback',  label: 'Feedback',       count: totalFeedbackCount || null },
    { id: 'history',   label: 'Sales History',  count: salesHistory.length || null },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; padding: 16px 1rem 40px !important; }
          .profile-sidebar { position: relative !important; top: auto !important; }
          .profile-header-row { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 16px !important; }
          .profile-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
        }
      `}</style>

      <div style={{ paddingTop: '64px' }}>

        {/* PROFILE HEADER */}
        <div style={{ background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', padding: '36px 2.5rem 0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="profile-header-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', marginBottom: '28px', flexWrap: 'wrap' }}>

              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--teal-bg)', border: '3px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '38px', fontWeight: 600, color: 'var(--teal)' }}>
                  {initials}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '34px', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>
                    @{profile.username}
                  </h1>
                  {/* Tier badge — only shown if user has sales */}
                  {sales > 0 && (
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 12px', borderRadius: '20px', background: tier.bg, border: `1.5px solid ${tier.border}`, color: tier.color, fontWeight: 600 }}>
                      {tier.label}
                    </span>
                  )}
                  {profile.strike_count === 0 && sales > 0 && (
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                      0 Strikes
                    </span>
                  )}
                  {profile.strike_count > 0 && (
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)', fontWeight: 500 }}>
                      {profile.strike_count} Strike{profile.strike_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>{listings.length}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Active Listings</span>
                  </div>
                  {sales > 0 && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>{sales.toLocaleString()}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Sales</span>
                    </div>
                  )}
                  {profile.seller_rep_score > 0 && (
                    <StarRating score={profile.seller_rep_score} count={profile.seller_review_count} label="seller reviews" />
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Member since {joinedYear}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>@{profile.username}</span>
                  </div>
                </div>

                {/* Tier progress bar */}
                {tier.next && sales >= 0 && (
                  <div style={{ marginBottom: '10px', maxWidth: '320px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{sales.toLocaleString()} / {tier.next.toLocaleString()} sales</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: tier.color }}>{tier.nextLabel}</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--bg-4)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: tier.color, borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                {/* Wallet address */}
                {shortWallet && (
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ width: '6px', height: '6px', background: 'var(--accent-blue)', borderRadius: '50%', display: 'inline-block' }} />
                    {shortWallet} · Base Network
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs" style={{ display: 'flex', gap: '0', borderTop: '0.5px solid var(--border)' }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', padding: '14px 22px', border: 'none', background: 'transparent', color: activeTab === tab.id ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, letterSpacing: '0.06em', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--teal)' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.15s' }}>
                  {tab.label}
                  {tab.count != null && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '1px 6px', borderRadius: '10px', background: activeTab === tab.id ? 'var(--teal-bg)' : 'var(--bg-4)', color: activeTab === tab.id ? 'var(--teal)' : 'var(--text-muted)' }}>{tab.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="profile-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 2.5rem 60px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'flex-start' }}>

          {/* MAIN CONTENT */}
          <div>

            {/* LISTINGS TAB */}
            {activeTab === 'listings' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listings</em></div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{listings.length} cards</div>
                </div>
                {listings.length === 0 ? (
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: 'var(--text-muted)', marginBottom: '8px' }}>No active listings</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>This seller has no cards listed right now.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '12px' }}>
                    {listings.map((card) => (
                      <Link key={card.id} href={`/listing/${card.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--teal-border)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                        >
                          <div style={{ aspectRatio: '3/4', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                            {card.photos?.[0] ? (
                              <img src={card.photos[0]} alt={card.card_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '65%', aspectRatio: '2.5/3.5', borderRadius: '5px', background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.5 }}>🃏</div>
                            )}
                            <div style={{ position: 'absolute', top: '8px', right: '8px', fontFamily: 'DM Mono, monospace', fontSize: '8px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 500 }}>Live</div>
                          </div>
                          <div style={{ padding: '11px 12px' }}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>{card.game}{card.set ? ` · ${card.set}` : ''}</div>
                            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', lineHeight: 1.2, marginBottom: '8px', color: 'var(--text-primary)' }}>{card.card_name}{card.grade ? ` ${card.grader} ${card.grade}` : ''}</div>
                            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>${parseFloat(card.price).toLocaleString()}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FEEDBACK TAB */}
            {activeTab === 'feedback' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)' }}>
                    <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Feedback</em>
                  </div>
                  {/* Toggle buyer / seller view */}
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-3)', borderRadius: '8px', padding: '3px' }}>
                    {[
                      { id: 'seller', label: `As Seller (${profile.seller_review_count || 0})` },
                      { id: 'buyer',  label: `As Buyer (${profile.buyer_review_count || 0})` },
                    ].map(v => (
                      <button key={v.id} onClick={() => setFeedbackView(v.id)}
                        style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: feedbackView === v.id ? 'var(--bg-2)' : 'transparent', color: feedbackView === v.id ? 'var(--teal)' : 'var(--text-muted)', fontWeight: feedbackView === v.id ? 600 : 400 }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary row */}
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                  {feedbackView === 'seller' ? (
                    <>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Seller Rating</div>
                        {profile.seller_rep_score ? (
                          <StarRating score={profile.seller_rep_score} count={profile.seller_review_count} label="reviews" />
                        ) : (
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No reviews yet</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Sales</div>
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: 'var(--text-primary)' }}>{(profile.total_sales || 0).toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Buyer Rating</div>
                      {profile.buyer_rep_score ? (
                        <StarRating score={profile.buyer_rep_score} count={profile.buyer_review_count} label="reviews" />
                      ) : (
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No reviews yet</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Review list */}
                {(feedbackView === 'seller' ? sellerReviews : buyerReviews).length === 0 ? (
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: 'var(--text-muted)', marginBottom: '8px' }}>No reviews yet</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Reviews are left after each completed transaction.</div>
                  </div>
                ) : (
                  (feedbackView === 'seller' ? sellerReviews : buyerReviews).map(r => <ReviewCard key={r.id} review={r} />)
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)' }}>Sales <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{salesHistory.length} completed</div>
                </div>
                {salesHistory.length === 0 ? (
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: 'var(--text-muted)', marginBottom: '8px' }}>No completed sales</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>This seller has not completed any sales yet.</div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                      {['Card', 'Amount', 'Settled'].map(h => (
                        <div key={h} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</div>
                      ))}
                    </div>
                    {salesHistory.map((order, i) => (
                      <div key={order.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '12px 16px', borderBottom: i < salesHistory.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.listing?.card_name
                            ? `${order.listing.card_name}${order.listing.grade ? ` ${order.listing.grader} ${order.listing.grade}` : ''}`
                            : `Order ${order.id.slice(0, 8)}…`}
                        </div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                          ${parseFloat(order.escrow_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {order.released_at ? new Date(order.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* SIDEBAR */}
          <div className="profile-sidebar" style={{ position: 'sticky', top: '84px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Trust card */}
            <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Seller Trust</div>
              {[
                { label: 'Seller Tier',   val: sales > 0 ? tier.label : 'Not yet selling', color: sales > 0 ? tier.color : 'var(--text-muted)' },
                { label: 'Total Sales',   val: sales.toLocaleString(), color: 'var(--text-primary)' },
                { label: 'Seller Rating', val: profile.seller_rep_score ? `${parseFloat(profile.seller_rep_score).toFixed(2)} / 5.00` : 'No reviews', color: profile.seller_rep_score ? 'var(--gold)' : 'var(--text-muted)' },
                { label: 'Buyer Rating',  val: profile.buyer_rep_score  ? `${parseFloat(profile.buyer_rep_score).toFixed(2)} / 5.00`  : 'No reviews', color: profile.buyer_rep_score  ? 'var(--gold)' : 'var(--text-muted)' },
                { label: 'Strikes',       val: profile.strike_count === 0 ? 'None' : profile.strike_count, color: profile.strike_count === 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                { label: 'Member Since',  val: joinedYear, color: 'var(--text-primary)' },
                { label: 'Auth Required', val: 'Every transaction', color: 'var(--text-primary)' },
                { label: 'Escrow',        val: 'USDC on Base', color: 'var(--accent-blue)' },
              ].map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: item.color, fontWeight: 600 }}>{item.val}</span>
                </div>
              ))}
            </div>

            {/* Chase Hollow guarantee */}
            <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(13,110,110,0.08))', border: '1.5px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '10px', fontWeight: 500 }}>Chase Hollow Protected</div>
              {[
                'Every card photo or physically authenticated',
                'USDC held in escrow until you approve',
                '72-hour inspection window on delivery',
                'Seller bond covers every transaction',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--accent-green)', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
