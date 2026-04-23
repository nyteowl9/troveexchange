'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'
import ChatModal from '@/app/components/ChatModal'
import ConnectWalletButton, { useWalletConnection } from '@/app/components/ConnectWallet'
import { useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'
import { ESCROW_ADDRESS, USDC_ADDRESS, USDC_ABI, ESCROW_ABI } from '@/lib/escrow'

export default function SellerDashboardPage() {
  return <Suspense><SellerDashboard /></Suspense>
}

const ACTIVE_ORDER_STATUSES = ['awaiting_shipment', 'in_transit', 'auth_review', 'auth_passed', 'delivered', 'inspection_window', 'disputed', 'awaiting_return', 'return_received', 'return_verified', 'return_received_seller', 'return_disputed_seller']

const BOND_RATE  = { new: 0.04, trusted: 0.03, pro: 0.02, elite: 0.01, legend: 0.01 }
const TIER_LABEL = { new: 'New', trusted: 'Trusted', pro: 'Pro', elite: 'Elite', legend: 'Legend' }
const BOND_FLOOR = 20 // $20 flat floor added to every bond

const SELLER_STATUS_MAP = {
  awaiting_shipment:{ label: '⚡ Ship Now',      color: 'var(--accent-red)',   bg: 'rgba(200,75,60,0.1)',   border: 'rgba(200,75,60,0.3)',   urgent: true  },
  in_transit:       { label: 'In Transit',       color: 'var(--accent-blue)',  bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', urgent: false },
  auth_review:      { label: 'Authenticating',   color: 'var(--gold)',          bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.28)',urgent: false },
  auth_passed:      { label: 'Auth Passed',       color: 'var(--accent-blue)',  bg: 'rgba(60,125,200,0.1)', border: 'rgba(60,125,200,0.3)', urgent: false },
  delivered:        { label: 'Delivered',         color: 'var(--accent-green)', bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', urgent: false },
  inspection_window:{ label: 'Auto-Releasing',   color: 'var(--accent-green)', bg: 'rgba(76,175,124,0.1)', border: 'rgba(76,175,124,0.3)', urgent: false },
  disputed:         { label: 'Dispute Filed',      color: 'var(--accent-red)',   bg: 'rgba(200,75,60,0.1)',  border: 'rgba(200,75,60,0.3)',  urgent: true  },
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

function SellerDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const { walletAddress, ready: walletReady, connect: connectWallet, disconnect: disconnectWallet } = useWalletConnection()
  const { wallets } = useWallets()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection]   = useState(() => searchParams.get('section') || 'overview')
  const [chatOrder, setChatOrder]           = useState(null)
  const [activeOrders, setActiveOrders]     = useState([])
  const [myListings, setMyListings]         = useState([])
  const [completedSales, setCompletedSales] = useState([])
  const [dataLoading, setDataLoading]       = useState(true)
  const [labelLoading, setLabelLoading]     = useState({}) // { [orderId]: true }
  const [labelError, setLabelError]         = useState({}) // { [orderId]: message }
  const [bondLoading, setBondLoading]       = useState({}) // { [orderId]: true }
  const [bondError, setBondError]           = useState({}) // { [orderId]: message }
  const [bondStatus, setBondStatus]         = useState({}) // { [orderId]: status string }
  const [photoOrderId, setPhotoOrderId]         = useState(null) // which order has upload modal open
  const [photoOrderAuthTier, setPhotoOrderAuthTier] = useState(null)
  const [authPhotoFiles, setAuthPhotoFiles] = useState([])   // { file, preview }[]
  const [authPhotoUploading, setAuthPhotoUploading] = useState(false)
  const [authPhotoError, setAuthPhotoError] = useState('')
  const [authPhotosDone, setAuthPhotosDone] = useState({}) // { [orderId]: true }

  // Dispute evidence state
  const [disputeModal, setDisputeModal]             = useState(null) // { orderId, disputeId, cardName, existingEvidence }
  const [disputeEvidenceFiles, setDisputeEvidenceFiles] = useState([]) // { file, preview, url }[]
  const [disputeSellerNotes, setDisputeSellerNotes]     = useState('')
  const [disputeEvidenceUploading, setDisputeEvidenceUploading] = useState(false)
  const [disputeEvidenceError, setDisputeEvidenceError] = useState('')
  const [disputeEvidenceDone, setDisputeEvidenceDone]   = useState({}) // { [orderId]: true }

  // Return review state (Tier 1 — seller confirms correct card or disputes wrong card)
  const [returnDisputeModal, setReturnDisputeModal]       = useState(null) // { orderId, cardName }
  const [returnDisputeNotes, setReturnDisputeNotes]       = useState('')
  const [returnDisputeFiles, setReturnDisputeFiles]       = useState([]) // { file, preview }[]
  const [returnDisputeUploading, setReturnDisputeUploading] = useState(false)
  const [returnDisputeError, setReturnDisputeError]       = useState('')
  const [confirmReturnLoading, setConfirmReturnLoading]   = useState({}) // { [orderId]: bool }
  const [confirmReturnError, setConfirmReturnError]       = useState({}) // { [orderId]: message }

  // Review modal state
  const [reviewModal, setReviewModal]           = useState(null) // { orderId, cardName, buyerId }
  const [reviewRating, setReviewRating]         = useState(5)
  const [reviewComment, setReviewComment]       = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSuccess, setReviewSuccess]       = useState(false)
  const [reviewError, setReviewError]           = useState(null)

  // Account standing (live check on mount)
  const [accountStanding, setAccountStanding] = useState(null) // { banned, suspended_until }

  // New listing form
  const [listingType, setListingType] = useState('graded')
  const [grader, setGrader]           = useState('PSA')
  const [price, setPrice]             = useState('')
  const [photos, setPhotos]           = useState([])
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState('')
  const [photoError, setPhotoError]     = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [formData, setFormData]       = useState({ game: 'Pokémon TCG', language: 'English', card_name: '', set: '', card_number: '', grade: '', cert_number: '', grader_other: '', condition: 'Near Mint (NM)', description: '', quantity: '', seal_condition: 'Factory Sealed — Unopened' })
  // Edit listing state
  const [editingListingId, setEditingListingId]   = useState(null)
  const [editListingType, setEditListingType]     = useState('graded')
  const [editGrader, setEditGrader]               = useState('PSA')
  const [editPrice, setEditPrice]                 = useState('')
  const [editPhotos, setEditPhotos]               = useState([]) // [{ type:'existing', url } | { type:'new', file, preview }]
  const [editFormData, setEditFormData]           = useState({})
  const [editSubmitting, setEditSubmitting]       = useState(false)
  const [editSubmitError, setEditSubmitError]     = useState('')
  const [editPhotoError, setEditPhotoError]       = useState('')
  const [editDragOver, setEditDragOver]           = useState(false)
  const [editSaved, setEditSaved]                 = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/sign-in?next=/seller-dashboard')
  }, [authLoading, user, router])

  const fetchData = useCallback(async () => {
    if (!user) { setDataLoading(false); return }
    try {
      const [ordersRes, listingsRes, salesRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`id, status, escrow_amount, auth_tier, bond_amount, bond_tx_hash, onchain_order_id, tracking_a, label_a_url, shipped_at, created_at, auto_release_at, return_deadline_at, return_review_deadline_at,
                   listing:listing_id (id, card_name, game, set, grade, grader, photos, price, auth_tier),
                   buyer:buyer_id (id, username),
                   disputes (id, reason, seller_evidence, outcome)`)
          .eq('seller_id', user.id)
          .in('status', ACTIVE_ORDER_STATUSES)
          .order('created_at', { ascending: false }),
        supabase
          .from('listings')
          .select('id, card_name, game, set, grade, grader, cert_number, condition, description, card_number, photos, price, status, listing_type, created_at, expires_at')
          .eq('seller_id', user.id)
          .in('status', ['active', 'paused'])
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select(`id, status, platform_fee, creator_fee, shipping_cost, bond_amount, released_at, buyer_id,
                   listing:listing_id (card_name, game, set, grade, grader, price),
                   reviews (id, reviewer_role)`)
          .eq('seller_id', user.id)
          .in('status', ['released', 'refunded'])
          .order('released_at', { ascending: false })
          .limit(50),
      ])
      setActiveOrders(ordersRes.data || [])
      setMyListings(listingsRes.data || [])
      setCompletedSales(salesRes.data || [])
    } catch (err) {
      console.error('[seller-dashboard] fetchData error:', err)
    } finally {
      setDataLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // Live standing check — always fresh from DB, never relies on cached profile
  useEffect(() => {
    if (!user) return
    supabase.from('users').select('banned, suspended_until').eq('id', user.id).single()
      .then(({ data }) => setAccountStanding(data || {}))
  }, [user])

  // Realtime — re-fetch when any of this seller's orders or listings change
  useEffect(() => {
    if (!user) return
    const ordersChannel = supabase
      .channel(`seller-orders-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${user.id}`,
      }, () => fetchData())
      .subscribe()
    const listingsChannel = supabase
      .channel(`seller-listings-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listings',
        filter: `seller_id=eq.${user.id}`,
      }, () => fetchData())
      .subscribe()
    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(listingsChannel)
    }
  }, [user, fetchData])

  const calcFees = (p) => {
    const num = parseFloat(p) || 0
    const platform = (num * 0.035).toFixed(2)
    const shipCost = 8
    const net = (num - parseFloat(platform) - shipCost).toFixed(2)
    return { platform, shipCost, net }
  }

  const fees = calcFees(price)
  const bondRate   = BOND_RATE[profile?.seller_tier] || BOND_RATE.new
  const bondAmount = price ? (BOND_FLOOR + parseFloat(price) * bondRate).toFixed(2) : null

  const ordersNeedLabel   = activeOrders.filter(o => o.status === 'awaiting_shipment' && !o.label_a_url)
  const ordersLabelReady  = activeOrders.filter(o => o.status === 'awaiting_shipment' && o.label_a_url)
  const ordersNeedingShip = [...ordersNeedLabel, ...ordersLabelReady]
  const totalActiveSalesValue = myListings.reduce((sum, l) => sum + Number(l.price || 0), 0)
  const releasedSales        = completedSales.filter(s => s.status === 'released')
  const totalCompletedRevenue = releasedSales.reduce((sum, s) => sum + Number(s.listing?.price || 0), 0)
  const totalFeesPaid        = releasedSales.reduce((sum, s) => sum + Number(s.platform_fee || 0) + Number(s.creator_fee || 0), 0)
  const totalShippingPaid    = releasedSales.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0)
  const totalNetReceived     = Math.max(0, totalCompletedRevenue - totalFeesPaid - totalShippingPaid)
  const bondInFlight = activeOrders.filter(o => o.bond_tx_hash).reduce((sum, o) => sum + Number(o.bond_amount || 0), 0)

  const submitReview = async () => {
    if (!reviewModal || reviewSubmitting) return
    setReviewSubmitting(true)
    setReviewError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: reviewModal.orderId,
          reviewer_id: user.id,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      setReviewSuccess(true)
      await fetchData()
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setReviewSubmitting(false)
    }
  }

  const submitDisputeEvidence = async () => {
    if (!disputeModal || disputeEvidenceUploading) return
    setDisputeEvidenceUploading(true)
    setDisputeEvidenceError('')
    try {
      const newFiles = disputeEvidenceFiles.filter(f => f.file)
      const uploadedUrls = []
      for (const item of newFiles) {
        const fd = new FormData()
        fd.append('file', item.file)
        fd.append('order_id', disputeModal.orderId)
        fd.append('dispute_id', disputeModal.disputeId)
        const upRes = await fetch('/api/disputes/seller-evidence', { method: 'PUT', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || 'Upload failed')
        uploadedUrls.push(upData.url)
      }
      const allUrls = [...(disputeModal.existingEvidence || []), ...uploadedUrls]
      const res = await fetch('/api/disputes/seller-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispute_id: disputeModal.disputeId, seller_evidence: allUrls, seller_notes: disputeSellerNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setDisputeEvidenceDone(prev => ({ ...prev, [disputeModal.orderId]: true }))
      setDisputeModal(null)
      setDisputeEvidenceFiles([])
      setDisputeSellerNotes('')
      await fetchData()
    } catch (err) {
      setDisputeEvidenceError(err.message)
    } finally {
      setDisputeEvidenceUploading(false)
    }
  }

  const submitReturnDispute = async () => {
    if (!returnDisputeModal || returnDisputeUploading) return
    if (!returnDisputeNotes.trim()) { setReturnDisputeError('Please describe what was received'); return }
    setReturnDisputeUploading(true)
    setReturnDisputeError('')
    try {
      const uploadedUrls = []
      for (const item of returnDisputeFiles) {
        const fd = new FormData()
        fd.append('file', item.file)
        fd.append('order_id', returnDisputeModal.orderId)
        const upRes = await fetch('/api/disputes/seller-evidence', { method: 'PUT', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || 'Upload failed')
        uploadedUrls.push(upData.url)
      }
      const res = await fetch('/api/orders/dispute-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: returnDisputeModal.orderId, notes: returnDisputeNotes, evidence: uploadedUrls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setReturnDisputeModal(null)
      setReturnDisputeFiles([])
      setReturnDisputeNotes('')
      await fetchData()
    } catch (err) {
      setReturnDisputeError(err.message)
    } finally {
      setReturnDisputeUploading(false)
    }
  }

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

  // photos state shape: [{ file: File, preview: string (blob URL) }]
  function addPhotoFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return
    if (photos.length + imageFiles.length > 15) {
      setPhotoError('Maximum 15 photos allowed per listing')
      return
    }
    setPhotoError('')
    const newPhotos = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setPhotos(prev => [...prev, ...newPhotos])
  }

  function handlePhotoUpload(e) {
    addPhotoFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    addPhotoFiles(Array.from(e.dataTransfer.files))
  }

  const minPhotos = listingType === 'graded' ? 2 : listingType === 'raw' ? 2 : listingType === 'lot' ? 2 : 2

  async function handleSubmitListing() {
    setSubmitError('')
    // Re-fetch standing fresh at submit time (fail-closed — if query fails, block)
    const { data: standing } = await supabase.from('users').select('banned, suspended_until').eq('id', user.id).single()
    if (!standing) { setSubmitError('Unable to verify account standing. Please refresh and try again.'); return }
    if (standing.banned) { setSubmitError('Your account has been permanently banned and cannot create listings.'); return }
    if (standing.suspended_until && new Date(standing.suspended_until) > new Date()) {
      const until = new Date(standing.suspended_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      setSubmitError(`Your account is suspended until ${until}. You cannot create new listings during a suspension.`)
      return
    }
    if (!profile?.wallet_address) { setSubmitError('You must connect a wallet before publishing — go to Bond Wallet to connect MetaMask.'); return }
    if (!formData.card_name.trim()) { setSubmitError('Listing title is required'); return }
    if (!formData.description.trim()) { setSubmitError('Description is required'); return }
    if (listingType === 'graded') {
      if (!formData.grade.trim()) { setSubmitError('Grade is required for graded listings'); return }
    }
    if (listingType === 'raw' && !formData.condition) { setSubmitError('Condition is required for raw cards'); return }
    if (!price || parseFloat(price) < 1) { setSubmitError('Price must be at least $1'); return }
    if (parseFloat(price) > 50000) { setSubmitError('Maximum listing price is $50,000'); return }
    if (photos.length < minPhotos) { setSubmitError(`At least ${minPhotos} photos are required`); return }

    setSubmitting(true)
    try {
      const isGraded = listingType === 'graded'
      const priceNum = parseFloat(price)
      const authTier = priceNum <= 300 ? 'remote' : 'physical'
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

      // Upload photos to Supabase storage at submit time
      // Path starts with user.id to match standard storage RLS policies
      const uploadedUrls = []
      for (const { file } of photos) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: false, contentType: file.type })
        if (uploadError) {
          setSubmitError(`Photo upload failed: ${uploadError.message}`)
          setSubmitting(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from('listing-photos').getPublicUrl(path)
        uploadedUrls.push(publicUrl)
      }

      const payload = {
        seller_id:       user.id,
        listing_type:    listingType,
        game:            formData.game,
        card_name:       formData.card_name.trim(),
        set:             formData.set.trim() || null,
        card_number:     formData.card_number.trim() || null,
        grade:           isGraded ? formData.grade.trim() || null : null,
        grader:          isGraded ? (grader === 'Other' ? formData.grader_other.trim() : grader) : null,
        cert_number:     isGraded && grader !== 'Other' ? formData.cert_number.trim() || null : null,
        condition:       listingType === 'raw' ? formData.condition : null,
        description:     formData.description.trim() || null,
        price:           priceNum,
        auth_tier:       authTier,
        photos:          uploadedUrls,
        status:          'active',
        expires_at:      expiresAt,
      }

      const { error } = await supabase.from('listings').insert(payload)
      console.log('[listing insert]', { error, payload })
      if (error) {
        setSubmitError(`Failed to publish listing: ${error.message} (code: ${error.code})`)
      } else {
        photos.forEach(p => URL.revokeObjectURL(p.preview))
        setPrice(''); setPhotos([]); setFormData({ game: 'Pokémon TCG', language: 'English', card_name: '', set: '', card_number: '', grade: '', cert_number: '', grader_other: '', condition: 'Near Mint (NM)', description: '', quantity: '', seal_condition: 'Factory Sealed — Unopened' })
        await fetchData()
        setActiveSection('listings')
      }
    } catch (err) {
      setSubmitError(`Unexpected error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteListing(id) {
    await supabase.from('listings').update({ status: 'expired' }).eq('id', id).eq('seller_id', user.id)
    setMyListings(prev => prev.filter(l => l.id !== id))
  }

  function handleEditListing(listing) {
    setEditingListingId(listing.id)
    setEditListingType(listing.listing_type || 'graded')
    setEditGrader(listing.grader || 'PSA')
    setEditPrice(String(listing.price || ''))
    setEditPhotos((listing.photos || []).map(url => ({ type: 'existing', url })))
    setEditFormData({
      game:           listing.game || 'Pokémon TCG',
      language:       listing.language || 'English',
      card_name:      listing.card_name || '',
      set:            listing.set || '',
      card_number:    listing.card_number || '',
      grade:          String(listing.grade ?? ''),
      cert_number:    listing.cert_number || '',
      grader_other:   '',
      condition:      listing.condition || 'Near Mint (NM)',
      description:    listing.description || '',
      quantity:       listing.quantity || '',
      seal_condition: listing.seal_condition || 'Factory Sealed — Unopened',
    })
    setEditSubmitError('')
    setEditSaved(false)
    setActiveSection('edit-listing')
  }

  function addEditPhotoFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return
    if (editPhotos.length + imageFiles.length > 15) {
      setEditPhotoError('Maximum 15 photos allowed')
      return
    }
    setEditPhotoError('')
    setEditPhotos(prev => [...prev, ...imageFiles.map(file => ({ type: 'new', file, preview: URL.createObjectURL(file) }))])
  }

  async function handleUpdateListing() {
    setEditSubmitError('')
    setEditSaved(false)
    if (!editFormData.card_name?.trim()) { setEditSubmitError('Listing title is required'); return }
    if (!editFormData.description?.trim()) { setEditSubmitError('Description is required'); return }
    if (editListingType === 'graded' && !editFormData.grade?.trim()) { setEditSubmitError('Grade is required for graded listings'); return }
    if (!editPrice || parseFloat(editPrice) < 1) { setEditSubmitError('Price must be at least $1'); return }
    if (parseFloat(editPrice) > 50000) { setEditSubmitError('Maximum listing price is $50,000'); return }
    if (editPhotos.length < 2) { setEditSubmitError('At least 2 photos are required'); return }

    setEditSubmitting(true)
    try {
      // Upload any new photos
      const newUploaded = []
      for (const p of editPhotos.filter(p => p.type === 'new')) {
        const ext = p.file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, p.file, { upsert: false, contentType: p.file.type })
        if (upErr) { setEditSubmitError(`Photo upload failed: ${upErr.message}`); setEditSubmitting(false); return }
        const { data: { publicUrl } } = supabase.storage.from('listing-photos').getPublicUrl(path)
        newUploaded.push(publicUrl)
      }

      const allPhotos = [
        ...editPhotos.filter(p => p.type === 'existing').map(p => p.url),
        ...newUploaded,
      ]
      const isGraded = editListingType === 'graded'
      const priceNum = parseFloat(editPrice)

      const { error } = await supabase.from('listings').update({
        listing_type: editListingType,
        game:         editFormData.game,
        card_name:    editFormData.card_name.trim(),
        set:          editFormData.set?.trim() || null,
        card_number:  editFormData.card_number?.trim() || null,
        grade:        isGraded ? editFormData.grade?.trim() || null : null,
        grader:       isGraded ? (editGrader === 'Other' ? editFormData.grader_other?.trim() : editGrader) : null,
        cert_number:  isGraded && editGrader !== 'Other' ? editFormData.cert_number?.trim() || null : null,
        condition:    editListingType === 'raw' ? editFormData.condition : null,
        description:  editFormData.description?.trim() || null,
        price:        priceNum,
        auth_tier:    priceNum <= 300 ? 'remote' : 'physical',
        photos:       allPhotos,
      }).eq('id', editingListingId).eq('seller_id', user.id)

      if (error) {
        setEditSubmitError(`Update failed: ${error.message}`)
      } else {
        editPhotos.filter(p => p.type === 'new').forEach(p => URL.revokeObjectURL(p.preview))
        setEditSaved(true)
        await fetchData()
        setTimeout(() => setActiveSection('listings'), 1000)
      }
    } catch (err) {
      setEditSubmitError(`Unexpected error: ${err.message}`)
    } finally {
      setEditSubmitting(false)
    }
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

  const handlePostBond = async (order) => {
    setBondError(prev  => ({ ...prev, [order.id]: null }))
    setBondLoading(prev => ({ ...prev, [order.id]: true }))
    try {
      if (!walletAddress) throw new Error('Connect your wallet first (Bond Wallet section).')
      if (!order.onchain_order_id) throw new Error('Missing on-chain order ID. Contact support.')
      if (!order.bond_amount)      throw new Error('Bond amount not set on this order.')

      // Find the connected wallet matching the seller's stored wallet address
      const wallet = wallets.find(w => w.address?.toLowerCase() === walletAddress.toLowerCase())
        || wallets[0]
      if (!wallet) throw new Error('No wallet connected. Please connect in the Bond Wallet section.')

      const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ID === '84532'
      const targetChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453')
      const chainHex = '0x' + targetChainId.toString(16)

      const eip1193 = await wallet.getEthereumProvider()
      const currentChain = await eip1193.request({ method: 'eth_chainId' })
      if (currentChain !== chainHex) {
        try {
          await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] })
        } catch {
          await eip1193.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: chainHex, chainName: isTestnet ? 'Base Sepolia' : 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [isTestnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org'], blockExplorerUrls: [isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org'] }],
          })
        }
      }

      const provider = new ethers.BrowserProvider(eip1193)
      const signer   = await provider.getSigner()
      const bondU    = ethers.parseUnits(parseFloat(order.bond_amount).toFixed(6), 6)

      setBondStatus(prev => ({ ...prev, [order.id]: 'Step 1 of 2 — Approve USDC · confirm in wallet…' }))
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer)
      const approveTx = await usdcContract.approve(ESCROW_ADDRESS, bondU, { gasLimit: 100000n })
      setBondStatus(prev => ({ ...prev, [order.id]: 'Approval submitted — waiting for confirmation…' }))
      await approveTx.wait()

      // Verify allowance is readable — Sepolia RPC can lag a block behind
      let allowanceConfirmed = false
      for (let i = 0; i < 5; i++) {
        const allowance = await usdcContract.allowance(walletAddress, ESCROW_ADDRESS)
        if (allowance >= bondU) { allowanceConfirmed = true; break }
        await new Promise(r => setTimeout(r, 1000))
      }
      if (!allowanceConfirmed) throw new Error('USDC approval did not confirm. Please try again.')

      setBondStatus(prev => ({ ...prev, [order.id]: 'Step 2 of 2 — Post bond · confirm in wallet…' }))
      const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const confirmTx = await escrowContract.confirmOrder(order.onchain_order_id, { gasLimit: 200000n })
      setBondStatus(prev => ({ ...prev, [order.id]: 'Submitted — waiting for block confirmation…' }))
      await confirmTx.wait()

      // Save bond_tx_hash via API (direct Supabase update blocked by RLS)
      const saveRes = await fetch('/api/orders/confirm-bond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, tx_hash: confirmTx.hash }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.error || 'Failed to save bond confirmation')
      }

      setBondStatus(prev => ({ ...prev, [order.id]: 'Bond posted ✓' }))
      await fetchData()
    } catch (err) {
      const msg = err?.reason || err?.message || 'Bond posting failed'
      setBondError(prev => ({ ...prev, [order.id]: msg }))
      setBondStatus(prev => ({ ...prev, [order.id]: null }))
    } finally {
      setBondLoading(prev => ({ ...prev, [order.id]: false }))
    }
  }

  const handlePrintLabel = async (order) => {
    // If label already exists, open it
    if (order.label_a_url) {
      window.open(order.label_a_url, '_blank')
      return
    }
    setLabelLoading(prev => ({ ...prev, [order.id]: true }))
    setLabelError(prev => ({ ...prev, [order.id]: null }))
    try {
      const res = await fetch('/api/shipping/seller-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Label generation failed')
      // Refresh orders so the stored label_a_url is picked up
      await fetchData()
      window.open(data.label_url, '_blank')
    } catch (err) {
      setLabelError(prev => ({ ...prev, [order.id]: err.message }))
    } finally {
      setLabelLoading(prev => ({ ...prev, [order.id]: false }))
    }
  }

  async function handleSubmitAuthPhotos(orderId) {
    if (authPhotoFiles.length < 3) { setAuthPhotoError('Please upload all 3 photos'); return }
    setAuthPhotoUploading(true)
    setAuthPhotoError('')
    const isWaived = photoOrderAuthTier === 'none'
    try {
      const urls = []
      for (const { file } of authPhotoFiles) {
        const ext = file.name.split('.').pop()
        const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('auth-photos').upload(path, file, { upsert: false, contentType: file.type })
        if (error) throw new Error(`Upload failed: ${error.message}`)
        // auth-photos is private — store path, not public URL
        urls.push(path)
      }
      // Store in auth_inspections — decision='waived' skips the authenticator queue
      const { error: inspErr } = await supabase.from('auth_inspections').insert({
        order_id:         orderId,
        authenticator_id: user.id,
        type:             'remote',
        photos:           urls,
        decision:         isWaived ? 'waived' : 'pending',
        notes:            isWaived ? 'Seller-submitted evidence photos — buyer waived authentication' : 'Seller-submitted auth photos',
      })
      if (inspErr) throw new Error(inspErr.message)
      setAuthPhotosDone(prev => ({ ...prev, [orderId]: true }))
      setPhotoOrderId(null)
      setPhotoOrderAuthTier(null)
      setAuthPhotoFiles([])
    } catch (err) {
      setAuthPhotoError(err.message)
    } finally {
      setAuthPhotoUploading(false)
    }
  }

  const OrderRow = ({ order }) => {
    const sm  = SELLER_STATUS_MAP[order.status] || SELLER_STATUS_MAP.in_transit
    const dl  = shipDeadline(order.created_at)
    const hrs = order.status === 'awaiting_shipment' ? hoursUntil(dl) : null
    const photo = order.listing?.photos?.[0]
    return (
      <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${sm.urgent ? 'rgba(200,75,60,0.4)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ width: '32px', height: '46px', borderRadius: '4px', background: 'var(--bg-4)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '2px' }}>{order.listing?.card_name || '—'}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>{order.listing?.game} · {shortId(order.id)} · Buyer: {order.buyer?.username || '—'}</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sm.bg, border: `1px solid ${sm.border}`, color: sm.color, fontWeight: 500, flexShrink: 0 }}>{sm.label}</span>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>{fmtUSD(order.listing?.price ?? order.escrow_amount)}</div>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: sm.urgent ? 'var(--accent-amber)' : 'var(--text-secondary)', background: 'var(--bg-3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', lineHeight: 1.5 }}>
            {order.status === 'awaiting_shipment' && `⚠ Ship within ${hrs !== null ? hrs : '—'}hrs · Deadline ${fmtDate(dl)} · Auto-refund + Strike if missed`}
            {order.status === 'in_transit'        && (order.tracking_a
              ? <><span>In transit · </span><a href={(/^1Z/i.test(order.tracking_a) ? `https://www.ups.com/track?tracknum=` : /^9[0-9]{21}$/.test(order.tracking_a) ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=` : `https://www.fedex.com/fedextrack/?trknbr=`) + order.tracking_a} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontFamily: 'DM Mono, monospace' }}>{order.tracking_a} ↗</a></>
              : 'In transit · En route')}
            {order.status === 'auth_review'       && `At Chase Hollow HQ · Authentication in progress`}
            {order.status === 'auth_passed'       && `Authentication passed · Shipping to buyer`}
            {order.status === 'delivered'         && `Delivered · Buyer inspection window open`}
            {order.status === 'inspection_window' && (order.auto_release_at ? `Delivered · Auto-releases ${fmtDate(order.auto_release_at)}` : 'Delivered · Buyer inspection window open')}
            {order.status === 'disputed'          && `Buyer opened a dispute · Submit your evidence before staff review`}
          </div>
          {(bondError[order.id] || labelError[order.id]) && (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-red)', marginBottom: '8px' }}>{bondError[order.id] || labelError[order.id]}</div>
          )}
          {bondStatus[order.id] && (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-amber)', marginBottom: '8px' }}>{bondStatus[order.id]}</div>
          )}
          {order.status === 'awaiting_shipment' && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* STEP 1 — Post Bond */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: order.bond_tx_hash ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 600 }}>Step 1</span>
                {order.bond_tx_hash ? (
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-green)', padding: '8px 14px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '8px', whiteSpace: 'nowrap' }}>✓ Bond Posted</span>
                ) : (
                  <button onClick={() => handlePostBond(order)} disabled={bondLoading[order.id]} style={{ background: 'var(--accent-amber)', border: 'none', color: '#0A0A0B', padding: '8px 16px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', cursor: bondLoading[order.id] ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: bondLoading[order.id] ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                    {bondLoading[order.id] ? '⏳ Posting…' : `🔒 Post Bond — $${Number(order.bond_amount || 0).toFixed(2)}`}
                  </button>
                )}
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '14px', paddingBottom: '9px' }}>→</div>

              {/* STEP 2 — Upload 3 Auth Photos (remote or none tier — dispute evidence) */}
              {(order.auth_tier === 'remote' || order.auth_tier === 'none') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: order.bond_tx_hash ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: 600 }}>{order.auth_tier === 'none' ? 'Step 2 · Evidence' : 'Step 2'}</span>
                  {authPhotosDone[order.id] ? (
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-green)', padding: '8px 14px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '8px', whiteSpace: 'nowrap' }}>✓ 3 Photos Uploaded</span>
                  ) : (
                    <button onClick={() => { if (order.bond_tx_hash) { setPhotoOrderId(order.id); setPhotoOrderAuthTier(order.auth_tier); setAuthPhotoFiles([]); setAuthPhotoError('') } }} disabled={!order.bond_tx_hash} style={{ background: order.bond_tx_hash ? 'rgba(60,125,200,0.15)' : 'var(--bg-3)', border: `1.5px solid ${order.bond_tx_hash ? 'rgba(60,125,200,0.4)' : 'var(--border)'}`, color: order.bond_tx_hash ? 'var(--accent-blue)' : 'var(--text-muted)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: order.bond_tx_hash ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                      📷 Upload 3 Photos
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: order.bond_tx_hash ? 'var(--teal)' : 'var(--text-muted)', fontWeight: 600 }}>{(order.auth_tier === 'remote' || order.auth_tier === 'none') ? 'Step 3' : 'Step 2'}</span>
                {(() => {
                  const photosRequired = (order.auth_tier === 'remote' || order.auth_tier === 'none') && !authPhotosDone[order.id]
                  const canLabel = order.bond_tx_hash && !labelLoading[order.id] && !photosRequired
                  return (
                    <button onClick={() => canLabel && handlePrintLabel(order)} disabled={!canLabel} title={photosRequired ? 'Upload 3 auth photos first' : ''} style={{ background: canLabel ? 'var(--teal)' : 'var(--bg-3)', border: `1.5px solid ${canLabel ? 'transparent' : 'var(--border)'}`, color: canLabel ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: canLabel ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', opacity: labelLoading[order.id] ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                      {labelLoading[order.id] ? '⏳ Generating…' : order.label_a_url ? (order.listing?.auth_tier === 'physical' ? '🖨 Print Label → Auth Center' : '🖨 Print Label') : (order.listing?.auth_tier === 'physical' ? '🖨 Get Label → Auth Center' : '🖨 Get Label')}
                    </button>
                  )
                })()}
              </div>
            </div>
          )}
          {order.status === 'disputed' && (() => {
            const activeDispute = order.disputes?.find(d => d.outcome === 'pending')
            if (!activeDispute) return null
            const alreadySubmitted = disputeEvidenceDone[order.id] || (activeDispute.seller_evidence?.length > 0)
            return (
              <div style={{ marginTop: '10px', background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.25)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--accent-red)' }}>Dispute filed:</strong> {activeDispute.reason}
                </div>
                {alreadySubmitted ? (
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-green)' }}>
                    ✓ Evidence submitted ({activeDispute.seller_evidence?.length || 0} photo{(activeDispute.seller_evidence?.length || 0) !== 1 ? 's' : ''}) · Awaiting staff review
                  </div>
                ) : (
                  <button onClick={() => { setDisputeModal({ orderId: order.id, disputeId: activeDispute.id, cardName: order.listing?.card_name, reason: activeDispute.reason, existingEvidence: activeDispute.seller_evidence || [] }); setDisputeEvidenceFiles([]) }}
                    style={{ background: 'rgba(200,75,60,0.12)', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Submit Counter Evidence →
                  </button>
                )}
              </div>
            )
          })()}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button onClick={() => setChatOrder({ id: order.id, label: order.listing?.card_name })} style={btn({ border: '1.5px solid var(--teal-border)', color: 'var(--teal)' })}>Message Buyer</button>
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

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  )
  if (!user) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {chatOrder && (
        <ChatModal
          orderId={chatOrder.id}
          orderLabel={chatOrder.label}
          onClose={() => setChatOrder(null)}
        />
      )}

      {/* Dispute Evidence Modal */}
      {disputeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget && !disputeEvidenceUploading) { setDisputeModal(null); setDisputeEvidenceFiles([]); setDisputeSellerNotes('') } }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(200,75,60,0.4)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '28px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>Submit <em style={{ color: 'var(--accent-red)' }}>Counter Evidence</em></div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>{disputeModal.cardName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent-red)' }}>Buyer's claim:</strong> {disputeModal.reason}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Your rebuttal</div>
            <textarea
              value={disputeSellerNotes}
              onChange={e => setDisputeSellerNotes(e.target.value)}
              placeholder="Describe your side of the situation — condition when shipped, any relevant details, why the buyer's claim is inaccurate…"
              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '90px', lineHeight: 1.6, marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Upload photos / evidence (optional, up to 5)</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {disputeEvidenceFiles.map((item, i) => (
                <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setDisputeEvidenceFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
              {disputeEvidenceFiles.length < 5 && (
                <label style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1.5px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '22px', color: 'var(--text-muted)' }}>
                  +
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                    const files = Array.from(e.target.files).slice(0, 5 - disputeEvidenceFiles.length)
                    setDisputeEvidenceFiles(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
                  }} />
                </label>
              )}
            </div>
            {disputeEvidenceError && <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginBottom: '10px' }}>{disputeEvidenceError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitDisputeEvidence} disabled={disputeEvidenceUploading || (!disputeSellerNotes.trim() && disputeEvidenceFiles.length === 0)}
                style={{ flex: 1, background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: (disputeEvidenceUploading || (!disputeSellerNotes.trim() && disputeEvidenceFiles.length === 0)) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: (disputeEvidenceUploading || (!disputeSellerNotes.trim() && disputeEvidenceFiles.length === 0)) ? 0.6 : 1 }}>
                {disputeEvidenceUploading ? 'Uploading…' : 'Submit Evidence'}
              </button>
              <button onClick={() => { setDisputeModal(null); setDisputeEvidenceFiles([]); setDisputeSellerNotes('') }} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Dispute Modal — seller claims wrong card was returned (Tier 1) */}
      {returnDisputeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget && !returnDisputeUploading) { setReturnDisputeModal(null); setReturnDisputeFiles([]); setReturnDisputeNotes(''); setReturnDisputeError('') } }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(200,75,60,0.4)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '28px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>Dispute <em style={{ color: 'var(--accent-red)' }}>Returned Card</em></div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>{returnDisputeModal.cardName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', lineHeight: 1.6 }}>
              Chase Hollow staff will review your photos and notes and make a final decision. No further shipping is required from either party — this is a photo-evidence review only.
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>What did you receive? (required)</div>
            <textarea
              value={returnDisputeNotes}
              onChange={e => setReturnDisputeNotes(e.target.value)}
              placeholder="Describe what you received vs. what was expected — include any identifying details (e.g. wrong set, wrong card name, wrong grade)…"
              style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '90px', lineHeight: 1.6, marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Photos of what was received (up to 5)</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {returnDisputeFiles.map((item, i) => (
                <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setReturnDisputeFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
              {returnDisputeFiles.length < 5 && (
                <label style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1.5px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '22px', color: 'var(--text-muted)' }}>
                  +
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                    const files = Array.from(e.target.files).slice(0, 5 - returnDisputeFiles.length)
                    setReturnDisputeFiles(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
                  }} />
                </label>
              )}
            </div>
            {returnDisputeError && <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginBottom: '10px' }}>{returnDisputeError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitReturnDispute} disabled={returnDisputeUploading || !returnDisputeNotes.trim()}
                style={{ flex: 1, background: returnDisputeNotes.trim() ? 'var(--accent-red)' : 'var(--bg-3)', border: 'none', color: returnDisputeNotes.trim() ? '#fff' : 'var(--text-muted)', padding: '12px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: (returnDisputeUploading || !returnDisputeNotes.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: returnDisputeUploading ? 0.6 : 1 }}>
                {returnDisputeUploading ? 'Submitting…' : 'Submit — Request Staff Review'}
              </button>
              <button onClick={() => { setReturnDisputeModal(null); setReturnDisputeFiles([]); setReturnDisputeNotes(''); setReturnDisputeError('') }} style={btn({ padding: '12px 20px', borderRadius: '10px' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget && !reviewSubmitting) { setReviewModal(null); setReviewSuccess(false); setReviewRating(5); setReviewComment(''); setReviewError(null) } }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '28px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>Rate <em style={{ color: 'var(--gold)' }}>Buyer</em></div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '20px' }}>{reviewModal.cardName}</div>
            {reviewSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>★</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--accent-green)' }}>Review submitted</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'DM Mono, monospace' }}>Thanks for the feedback</div>
                <button onClick={() => { setReviewModal(null); setReviewSuccess(false); setReviewRating(5); setReviewComment('') }} style={{ marginTop: '16px', background: 'var(--teal)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600 }}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>Rating</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setReviewRating(n)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', padding: '4px', color: n <= reviewRating ? '#C9A84C' : 'var(--border)', transition: 'color 0.1s' }}>★</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>Comment <span style={{ color: 'var(--border)' }}>(optional)</span></div>
                  <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} maxLength={500}
                    placeholder="Describe your experience with this buyer…"
                    style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '90px', lineHeight: 1.6, boxSizing: 'border-box' }} />
                </div>
                {reviewError && <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.35)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-red)', marginBottom: '16px' }}>{reviewError}</div>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={submitReview} disabled={reviewSubmitting}
                    style={{ flex: 1, background: 'var(--teal)', border: 'none', color: '#fff', padding: '12px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: reviewSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: reviewSubmitting ? 0.6 : 1 }}>
                    {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                  <button onClick={() => { setReviewModal(null); setReviewRating(5); setReviewComment(''); setReviewError(null) }}
                    style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-muted)', padding: '12px 20px', fontSize: '13px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AUTH PHOTO UPLOAD MODAL */}
      {photoOrderId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '480px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '6px' }}>Upload Auth Photos</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>3 required: front, back, card in sealed package</div>

            <input id="auth-photo-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
              const files = Array.from(e.target.files || [])
              const combined = [...authPhotoFiles, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 3)
              setAuthPhotoFiles(combined)
              e.target.value = ''
            }} />

            {authPhotoFiles.length < 3 && (
              <label htmlFor="auth-photo-input"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                  const combined = [...authPhotoFiles, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 3)
                  setAuthPhotoFiles(combined)
                }}
                style={{ display: 'block', border: '2px dashed var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
                + Add photos ({authPhotoFiles.length}/3) · or drag &amp; drop
              </label>
            )}

            {authPhotoFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {authPhotoFiles.map((p, i) => (
                  <div key={p.preview} style={{ position: 'relative', width: '80px', height: '110px', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                    <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => { URL.revokeObjectURL(p.preview); setAuthPhotoFiles(f => f.filter((_, j) => j !== i)) }} style={{ position: 'absolute', top: '3px', right: '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.8)', border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {authPhotoError && <div style={{ color: 'var(--accent-red)', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginBottom: '12px' }}>{authPhotoError}</div>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setPhotoOrderId(null); authPhotoFiles.forEach(p => URL.revokeObjectURL(p.preview)); setAuthPhotoFiles([]) }} style={{ flex: 1, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
              <button onClick={() => handleSubmitAuthPhotos(photoOrderId)} disabled={authPhotoFiles.length < 3 || authPhotoUploading} style={{ flex: 2, background: authPhotoFiles.length >= 3 && !authPhotoUploading ? 'var(--teal)' : 'var(--bg-3)', border: 'none', color: authPhotoFiles.length >= 3 && !authPhotoUploading ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', padding: '10px', borderRadius: '8px', cursor: authPhotoFiles.length >= 3 && !authPhotoUploading ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600 }}>
                {authPhotoUploading ? 'Uploading…' : 'Submit Photos'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              { label: 'Rating',    val: profile?.seller_rep_score ? `${profile.seller_rep_score.toFixed(2)} ★` : '—', gold: true },
              { label: 'Strikes',   val: String(profile?.strike_count ?? 0), green: profile?.strike_count === 0 },
              { label: 'Tier',      val: TIER_LABEL[profile?.seller_tier] || 'New' },
              { label: 'Bond rate', val: `${((bondRate) * 100).toFixed(0)}% per sale` },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{stat.label}</span>
                <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 300, color: stat.gold ? 'var(--gold)' : stat.green ? 'var(--accent-green)' : 'var(--text-primary)' }}>{stat.val}</span>
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

          {/* SUSPENSION / BAN BANNER — shown on every section */}
          {accountStanding?.banned && (
            <div style={{ background: 'rgba(200,75,60,0.12)', border: '1.5px solid rgba(200,75,60,0.5)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>🚫</span>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-red)', letterSpacing: '0.06em' }}>ACCOUNT PERMANENTLY BANNED</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Your account has been permanently closed. You cannot create listings or sell on Chase Hollow.</div>
              </div>
            </div>
          )}
          {!accountStanding?.banned && accountStanding?.suspended_until && new Date(accountStanding.suspended_until) > new Date() && (
            <div style={{ background: 'rgba(232,168,56,0.08)', border: '1.5px solid rgba(232,168,56,0.4)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>⏸</span>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-amber)', letterSpacing: '0.06em' }}>SELLING SUSPENDED</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  You cannot create new listings until <strong style={{ color: 'var(--text-primary)' }}>{new Date(accountStanding.suspended_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>. Active listings have been paused. All existing orders are unaffected.
                </div>
              </div>
            </div>
          )}
          {/* RETURN RECEIVED — SELLER REVIEW REQUIRED (Tier 1) */}
          {activeOrders.filter(o => o.status === 'return_received_seller').map(o => {
            const hoursLeft = o.return_review_deadline_at
              ? Math.max(0, Math.ceil((new Date(o.return_review_deadline_at) - Date.now()) / (1000 * 60 * 60)))
              : null
            const isUrgent = hoursLeft !== null && hoursLeft <= 12
            return (
              <div key={o.id} style={{ background: 'rgba(232,168,56,0.06)', border: `1.5px solid ${isUrgent ? 'rgba(200,75,60,0.5)' : 'rgba(232,168,56,0.4)'}`, borderRadius: '10px', padding: '16px 18px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📦</span>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: isUrgent ? 'var(--accent-red)' : 'var(--accent-amber)', letterSpacing: '0.06em' }}>
                    RETURN RECEIVED — ACTION REQUIRED
                    {hoursLeft !== null && ` · ${hoursLeft}hr${hoursLeft !== 1 ? 's' : ''} remaining`}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
                  The buyer has returned the card (<strong style={{ color: 'var(--text-primary)' }}>{o.listing?.card_name || shortId(o.id)}</strong>). Review it now and confirm whether the correct card was returned. If you received a wrong card, dispute it with photos — Chase Hollow staff will review.
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    disabled={!!confirmReturnLoading[o.id]}
                    onClick={async () => {
                      setConfirmReturnLoading(p => ({ ...p, [o.id]: true }))
                      setConfirmReturnError(p => ({ ...p, [o.id]: null }))
                      try {
                        const res = await fetch('/api/orders/confirm-return', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ order_id: o.id }),
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || 'Failed')
                        await fetchData()
                      } catch (err) {
                        setConfirmReturnError(p => ({ ...p, [o.id]: err.message }))
                      } finally {
                        setConfirmReturnLoading(p => ({ ...p, [o.id]: false }))
                      }
                    }}
                    style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '9px 18px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: confirmReturnLoading[o.id] ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: confirmReturnLoading[o.id] ? 0.6 : 1 }}>
                    {confirmReturnLoading[o.id] ? 'Processing…' : '✓ Correct Card Received'}
                  </button>
                  <button
                    onClick={() => { setReturnDisputeModal({ orderId: o.id, cardName: o.listing?.card_name || shortId(o.id) }); setReturnDisputeNotes(''); setReturnDisputeFiles([]); setReturnDisputeError('') }}
                    style={{ background: 'rgba(200,75,60,0.1)', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '9px 18px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    ✗ Wrong Card Received
                  </button>
                </div>
                {confirmReturnError[o.id] && <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent-red)', fontFamily: 'DM Mono, monospace' }}>{confirmReturnError[o.id]}</div>}
              </div>
            )
          })}

          {/* RETURN UNDER REVIEW — dispute filed, waiting for staff decision */}
          {activeOrders.some(o => o.status === 'return_disputed_seller') && (
            <div style={{ background: 'rgba(60,125,200,0.06)', border: '1.5px solid rgba(60,125,200,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>🔍</span>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.06em' }}>RETURN DISPUTE UNDER REVIEW</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You disputed the returned card. Chase Hollow staff is reviewing the evidence and will make a final decision. No further action is required from you at this time.
              </div>
            </div>
          )}

          {/* DISPUTE LOST BANNER — shown when buyer is returning card (Tier 2 / awaiting return) */}
          {activeOrders.some(o => ['awaiting_return', 'return_received', 'return_verified'].includes(o.status)) && (
            <div style={{ background: 'rgba(200,75,60,0.08)', border: '1.5px solid rgba(200,75,60,0.4)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>⚠</span>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-red)', letterSpacing: '0.06em' }}>DISPUTE LOST — BUYER RETURNING CARD</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                A dispute was decided in the buyer's favor. The buyer has been given a prepaid return label and has 5 days to ship the card back. Your bond has been forfeited. <strong style={{ color: 'var(--text-primary)' }}>Funds will be refunded to the buyer once the return is confirmed delivered.</strong> If the buyer does not ship within 5 days, the dispute is automatically reversed and funds release to you.
              </div>
              {activeOrders.filter(o => ['awaiting_return', 'return_received', 'return_verified'].includes(o.status)).map(o => {
                const daysLeft = o.return_deadline_at
                  ? Math.max(0, Math.ceil((new Date(o.return_deadline_at) - Date.now()) / (1000 * 60 * 60 * 24)))
                  : null
                return (
                  <div key={o.id} style={{ marginTop: '8px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{o.listing?.card_name || 'Order'} · #{o.id.slice(0, 6).toUpperCase()}</span>
                    <span style={{ color: o.status === 'awaiting_return' ? (daysLeft <= 1 ? 'var(--accent-red)' : 'var(--accent-amber)') : 'var(--accent-green)' }}>
                      {o.status === 'awaiting_return' ? (daysLeft !== null ? `${daysLeft}d left` : 'Awaiting return') : o.status === 'return_received' ? 'Return received' : 'Return verified'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{profile?.username || 'Seller'}</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{TIER_LABEL[profile?.seller_tier] || 'New'} Seller · {releasedSales.length} sales · {profile?.strike_count ?? 0} strikes · Ship within 48hrs of sale</div>
                </div>
                <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ New Listing</button>
              </div>

              {/* No-wallet banner — listings are unpurchasable */}
              {walletReady && !profile?.wallet_address && myListings.filter(l => l.status === 'active').length > 0 && (
                <div style={{ background: 'rgba(201,168,76,0.07)', border: '1.5px solid rgba(201,168,76,0.35)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gold)', marginBottom: '4px' }}>⚠ Your listings can't be purchased yet</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      You have {myListings.filter(l => l.status === 'active').length} active listing{myListings.filter(l => l.status === 'active').length > 1 ? 's' : ''} but no payment wallet connected. Go to <button onClick={() => setActiveSection('bond')} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, textDecoration: 'underline' }}>Bond Wallet</button> to connect MetaMask — one time, and all your listings become purchasable immediately.
                    </div>
                  </div>
                </div>
              )}

              {/* Ship-now alert — label not yet generated */}
              {ordersNeedLabel.length > 0 && (
                <div style={{ background: 'rgba(200,75,60,0.06)', border: '1.5px solid rgba(200,75,60,0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>⚡ Action required — {ordersNeedLabel.length} order{ordersNeedLabel.length > 1 ? 's' : ''} need{ordersNeedLabel.length === 1 ? 's' : ''} a label</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ordersNeedLabel[0].listing?.card_name || '—'} ({shortId(ordersNeedLabel[0].id)}). {hoursUntil(shipDeadline(ordersNeedLabel[0].created_at))}hrs remaining. Miss deadline = auto-refund + Strike 1.</div>
                  </div>
                  <button onClick={() => setActiveSection('orders')} style={{ background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Get Label →</button>
                </div>
              )}

              {/* Label ready — just needs drop-off */}
              {ordersLabelReady.length > 0 && (
                <div style={{ background: 'rgba(232,168,56,0.06)', border: '1.5px solid rgba(232,168,56,0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>📦 Label ready — drop off your package</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ordersLabelReady[0].listing?.card_name || '—'} ({shortId(ordersLabelReady[0].id)}) · {hoursUntil(shipDeadline(ordersLabelReady[0].created_at))}hrs until deadline · Take to any FedEx location.</div>
                  </div>
                  <button onClick={() => setActiveSection('orders')} style={{ background: 'rgba(232,168,56,0.15)', border: '1px solid rgba(232,168,56,0.4)', color: 'var(--accent-amber)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>View Orders →</button>
                </div>
              )}

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Active Orders',    val: String(activeOrders.length),           sub: ordersNeedLabel.length ? `${ordersNeedLabel.length} need a label` : ordersLabelReady.length ? `${ordersLabelReady.length} ready to drop off` : 'All on track',  color: ordersNeedLabel.length ? 'var(--accent-red)' : ordersLabelReady.length ? 'var(--accent-amber)' : 'var(--text-primary)' },
                  { label: 'Active Listings',  val: String(myListings.length),              sub: fmtUSD(totalActiveSalesValue) + ' total value',                                            color: 'var(--text-primary)' },
                  { label: 'Completed Sales',  val: String(releasedSales.length),           sub: fmtUSD(totalCompletedRevenue) + ' gross',                                                  color: 'var(--accent-green)' },
                  { label: 'Bond In-Flight',   val: fmtUSD(bondInFlight),                   sub: 'Returns within 5–7 days',                                                                 color: 'var(--gold)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
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
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
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
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listings</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{myListings.length} active · {fmtUSD(totalActiveSalesValue)} total value · Listings go live immediately</div>
                </div>
                <button onClick={() => setActiveSection('new-listing')} style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>+ New Listing</button>
              </div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading…</div>
              ) : myListings.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>◆</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No active listings</div>
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
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', lineHeight: 1.2, marginBottom: '6px', color: 'var(--text-primary)' }}>{listing.card_name}</div>
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', marginBottom: '10px' }}>{fmtUSD(listing.price)}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <Link href={`/listing/${listing.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                                <button style={btn({ fontSize: '10px', padding: '5px 8px', width: '100%', textAlign: 'center' })}>View</button>
                              </Link>
                              <button onClick={() => handleEditListing(listing)} style={btn({ fontSize: '10px', padding: '5px 8px', flex: 1, border: '1px solid var(--teal-border)', color: 'var(--teal)' })}>Edit</button>
                            </div>
                            {confirmDeleteId === listing.id ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => { handleDeleteListing(listing.id); setConfirmDeleteId(null) }} style={btn({ fontSize: '9px', padding: '5px 8px', background: 'rgba(200,75,60,0.15)', border: '1px solid rgba(200,75,60,0.5)', color: 'var(--accent-red)', fontWeight: 700 })}>Confirm</button>
                                <button onClick={() => setConfirmDeleteId(null)} style={btn({ fontSize: '9px', padding: '5px 8px' })}>Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(listing.id)} style={btn({ fontSize: '10px', padding: '5px 10px', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)', width: '100%' })}>Remove</button>
                            )}
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
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>New <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listing</em></div>
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
                    <Label text="LISTING TITLE *" />
                    <input type="text" placeholder="e.g. Charizard Base Set Holo" value={formData.card_name} onChange={e => setFormData(p => ({ ...p, card_name: e.target.value }))} style={inputStyle} />
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
                      <div>
                        <Label text="LISTING DESCRIPTION *" />
                        <textarea placeholder="Describe the card — centering, surface quality, any notable characteristics buyers should know." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                      </div>
                    </div>
                  )}

                  {listingType === 'raw' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <Label text="CONDITION *" />
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
                        <Label text="ITEM DESCRIPTION & CONDITION NOTES *" />
                        <textarea placeholder="Describe the card — key details, any flaws, wear, creases, or notable characteristics buyers should know." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                      </div>
                      <div style={{ background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>⚠ Raw cards are authenticated for condition match. Misrepresented condition results in rejection, full buyer refund, and a strike.</div>
                    </div>
                  )}

                  {(listingType === 'pack' || listingType === 'box' || listingType === 'case') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                      <div>
                        <Label text="LISTING DESCRIPTION *" />
                        <textarea placeholder="Describe the product — set, language, any notable details." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                      </div>
                    </div>
                  )}

                  {listingType === 'lot' && (
                    <div>
                      <Label text="LOT DESCRIPTION *" />
                      <textarea placeholder="Describe all cards included — names, sets, conditions, grades if any." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>
                  Photos (Required · Min {minPhotos} · Max 15)
                </div>
                <input id="photo-upload-input" type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                <label htmlFor="photo-upload-input"
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{ display: 'block', border: `2px dashed ${dragOver ? 'var(--teal)' : 'var(--border)'}`, borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'var(--teal-bg)' : 'var(--bg-3)', marginBottom: photos.length ? '12px' : '0', transition: 'border-color 0.15s, background 0.15s' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: dragOver ? 1 : 0.4 }}>📷</div>
                  <div style={{ fontSize: '14px', color: dragOver ? 'var(--teal)' : 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>{dragOver ? 'Drop to add photos' : 'Click or drag photos here'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {listingType === 'graded' && 'Front, back, full slab, grade label — min 2, more photos help buyers'}
                    {listingType === 'raw'    && 'Front, back, all four corners — min 2, more photos help buyers'}
                    {(listingType === 'pack' || listingType === 'box' || listingType === 'case') && 'All sides of sealed product — min 2, more photos help buyers'}
                    {listingType === 'lot'   && 'All cards spread out + individual shots — min 2, more photos help buyers'}
                  </div>
                </label>
                {photoError && (
                  <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginBottom: '8px', marginTop: '8px' }}>{photoError}</div>
                )}
                {photos.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'DM Mono, monospace' }}>
                      First photo is your primary listing image — click any photo to make it primary
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {photos.map((photo, i) => (
                        <div key={photo.preview} style={{ position: 'relative', width: '60px', height: '84px', borderRadius: '4px', overflow: 'hidden', border: `1.5px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'}`, cursor: i > 0 ? 'pointer' : 'default' }}
                          onClick={() => { if (i > 0) setPhotos(p => [p[i], ...p.filter((_, j) => j !== i)]) }}
                          title={i === 0 ? 'Primary photo' : 'Click to set as primary'}
                        >
                          <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {i === 0 && (
                            <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'var(--gold)', borderRadius: '3px', padding: '1px 4px', fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#0A0A0B', fontWeight: 700 }}>★</div>
                          )}
                          <button onClick={e => { e.stopPropagation(); URL.revokeObjectURL(photo.preview); setPhotos(p => p.filter((_, j) => j !== i)) }} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price + fees */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Price & Fee Calculator</div>
                <Label text="LISTING PRICE (USDC) *" />
                <input type="number" placeholder="Minimum $1" value={price} onChange={e => setPrice(e.target.value)} onWheel={e => e.target.blur()} style={{ ...inputStyle, marginBottom: parseFloat(price) > 50000 ? '8px' : '14px', fontSize: '18px', fontFamily: 'Playfair Display, serif', borderColor: parseFloat(price) > 50000 ? 'rgba(200,75,60,0.6)' : undefined }} />
                {parseFloat(price) > 50000 && (
                  <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.35)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700 }}>⚠</span> Maximum listing price is $50,000. Please lower your price to publish.
                  </div>
                )}
                {price && parseFloat(price) <= 50000 && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px' }}>
                    {[
                      { label: 'Your listing price',           val: `$${parseFloat(price).toLocaleString()}` },
                      { label: 'Platform fee (3.5%)',          val: `-$${fees.platform}` },
                      { label: 'Shipping & insurance (est.)',  val: `~$${fees.shipCost}` },
                      { label: 'You receive on settlement',    val: `~$${fees.net}`, green: true, total: true },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: row.total ? '8px 0 0' : '5px 0', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0' }}>
                        <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                        <span style={{ fontFamily: row.total ? 'Playfair Display, serif' : 'DM Mono, monospace', fontSize: row.total ? '20px' : '12px', color: row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bond notice */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '8px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: 500 }}>Seller Bond — What is this?</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 14px' }}>
                  When a buyer purchases your listing, a <strong style={{ color: 'var(--text-primary)' }}>bond is held as collateral</strong> alongside the buyer's payment in escrow. It is <strong style={{ color: 'var(--accent-green)' }}>not a fee</strong> — it is returned to you in full within 5–7 business days after the sale completes. On every clean sale, your net bond cost is <strong style={{ color: 'var(--accent-green)' }}>$0.00.</strong>
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 14px' }}>
                  The bond only becomes relevant if a dispute is opened after delivery. In that case it covers return shipping costs — Chase Hollow manages the full return process and generates all labels. The bond is only forfeited if you lose the dispute, which is rare and entirely avoidable with accurate listings.
                </p>
                <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '4px' }}>
                  {[
                    { label: 'Bond formula',       val: price && bondAmount ? `$${bondAmount}  ($20 + ${(bondRate * 100).toFixed(0)}% × $${price})` : `$20 + ${(bondRate * 100).toFixed(0)}% of sale price`, amber: true },
                    { label: 'Posted',             val: 'When buyer purchases — not when you list' },
                    { label: 'Returned',           val: 'Within 5–7 days after settlement', green: true },
                    { label: 'Forfeited only if',  val: 'You lose a dispute' },
                    { label: 'Net cost (clean sale)', val: '$0.00', green: true },
                  ].map((row, i, arr) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none', gap: '12px' }}>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '10px', flexShrink: 0 }}>{row.label}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: row.green ? 'var(--accent-green)' : row.amber ? 'var(--accent-amber)' : 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(200,75,60,0.05)', border: '1px solid rgba(200,75,60,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Ship within 48hrs of sale.</strong> One free extension available. Miss deadline = auto-refund to buyer + Strike 1. Three strikes = permanent ban.
              </div>

              {walletReady && !profile?.wallet_address && (
                <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: 'var(--gold)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                    Connect a wallet to publish — buyers pay to your wallet address.
                  </div>
                  <ConnectWalletButton style={{ padding: '8px 16px', fontSize: '12px' }} />
                </div>
              )}

              {submitError && (
                <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: 'var(--accent-red)' }}>{submitError}</div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSubmitListing} disabled={submitting || parseFloat(price) > 50000} style={{ flex: 1, background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: (submitting || parseFloat(price) > 50000) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: (submitting || parseFloat(price) > 50000) ? 0.4 : 1 }}>{submitting ? 'Publishing…' : 'Publish Listing — Go Live'}</button>
              </div>
            </div>
          )}

          {/* EDIT LISTING */}
          {activeSection === 'edit-listing' && (
            <div style={{ maxWidth: '720px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
                <button onClick={() => setActiveSection('listings')} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', padding: 0 }}>← My Listings</button>
              </div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Edit <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Listing</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', fontFamily: 'DM Mono, monospace' }}>Changes go live immediately — active buyers will see the updated listing</div>

              {/* Listing type */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Listing Type</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['graded', 'raw', 'pack', 'box', 'case', 'lot'].map(type => (
                    <button key={type} onClick={() => setEditListingType(type)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${editListingType === type ? 'var(--teal-border)' : 'var(--border)'}`, background: editListingType === type ? 'var(--teal-bg)' : 'transparent', color: editListingType === type ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize' }}>{type}</button>
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
                      <select value={editFormData.game || 'Pokémon TCG'} onChange={e => setEditFormData(p => ({ ...p, game: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>Pokémon TCG</option><option>Magic: The Gathering</option><option>One Piece TCG</option><option>Yu-Gi-Oh!</option><option>Sports Cards</option><option>Other</option>
                      </select>
                    </div>
                    <div>
                      <Label text="LANGUAGE" />
                      <select value={editFormData.language || 'English'} onChange={e => setEditFormData(p => ({ ...p, language: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>English</option><option>Japanese</option><option>Korean</option><option>Chinese</option><option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label text="LISTING TITLE *" />
                    <input type="text" value={editFormData.card_name || ''} onChange={e => setEditFormData(p => ({ ...p, card_name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <Label text="SET / EDITION" />
                      <input type="text" value={editFormData.set || ''} onChange={e => setEditFormData(p => ({ ...p, set: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <Label text="CARD NUMBER" />
                      <input type="text" value={editFormData.card_number || ''} onChange={e => setEditFormData(p => ({ ...p, card_number: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  {editListingType === 'graded' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <Label text="GRADING COMPANY" />
                          <select value={editGrader} onChange={e => setEditGrader(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option>PSA</option><option>BGS / Beckett</option><option>CGC</option><option>SGC</option><option>Other</option>
                          </select>
                        </div>
                        <div>
                          <Label text="GRADE" />
                          <input type="text" value={editFormData.grade || ''} onChange={e => setEditFormData(p => ({ ...p, grade: e.target.value }))} style={inputStyle} />
                        </div>
                      </div>
                      {editGrader !== 'Other' ? (
                        <div>
                          <Label text={`CERT NUMBER (${editGrader})`} />
                          <input type="text" value={editFormData.cert_number || ''} onChange={e => setEditFormData(p => ({ ...p, cert_number: e.target.value }))} style={inputStyle} />
                        </div>
                      ) : (
                        <div>
                          <Label text="GRADER NAME" />
                          <input type="text" value={editFormData.grader_other || ''} onChange={e => setEditFormData(p => ({ ...p, grader_other: e.target.value }))} style={inputStyle} />
                        </div>
                      )}
                      <div>
                        <Label text="LISTING DESCRIPTION *" />
                        <textarea value={editFormData.description || ''} onChange={e => setEditFormData(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                      </div>
                    </div>
                  )}

                  {editListingType === 'raw' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <Label text="CONDITION *" />
                        <select value={editFormData.condition || 'Near Mint (NM)'} onChange={e => setEditFormData(p => ({ ...p, condition: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option>Near Mint (NM)</option><option>Lightly Played (LP)</option><option>Moderately Played (MP)</option><option>Heavily Played (HP)</option><option>Damaged (DMG)</option>
                        </select>
                      </div>
                      <div>
                        <Label text="ITEM DESCRIPTION & CONDITION NOTES *" />
                        <textarea value={editFormData.description || ''} onChange={e => setEditFormData(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                      </div>
                    </div>
                  )}

                  {(editListingType === 'pack' || editListingType === 'box' || editListingType === 'case' || editListingType === 'lot') && (
                    <div>
                      <Label text="DESCRIPTION *" />
                      <textarea value={editFormData.description || ''} onChange={e => setEditFormData(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Photos ({editPhotos.length}/15 · Min 2)</div>
                <input id="edit-photo-input" type="file" accept="image/*" multiple onChange={e => { addEditPhotoFiles(Array.from(e.target.files)); e.target.value = '' }} style={{ display: 'none' }} />
                <label htmlFor="edit-photo-input"
                  onDragOver={e => { e.preventDefault(); setEditDragOver(true) }}
                  onDragLeave={() => setEditDragOver(false)}
                  onDrop={e => { e.preventDefault(); setEditDragOver(false); addEditPhotoFiles(Array.from(e.dataTransfer.files)) }}
                  style={{ display: 'block', border: `2px dashed ${editDragOver ? 'var(--teal)' : 'var(--border)'}`, borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: editDragOver ? 'var(--teal-bg)' : 'var(--bg-3)', marginBottom: editPhotos.length ? '12px' : '0' }}
                >
                  <div style={{ fontSize: '13px', color: editDragOver ? 'var(--teal)' : 'var(--text-secondary)' }}>Click or drag to add more photos</div>
                </label>
                {editPhotoError && <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginTop: '8px' }}>{editPhotoError}</div>}
                {editPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {editPhotos.map((photo, i) => (
                      <div key={photo.type === 'existing' ? photo.url : photo.preview} style={{ position: 'relative', width: '60px', height: '84px', borderRadius: '4px', overflow: 'hidden', border: `1.5px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'}`, cursor: i > 0 ? 'pointer' : 'default' }}
                        onClick={() => { if (i > 0) setEditPhotos(p => [p[i], ...p.filter((_, j) => j !== i)]) }}
                        title={i === 0 ? 'Primary photo' : 'Click to set as primary'}
                      >
                        <img src={photo.type === 'existing' ? photo.url : photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {i === 0 && <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'var(--gold)', borderRadius: '3px', padding: '1px 4px', fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#0A0A0B', fontWeight: 700 }}>★</div>}
                        <button onClick={e => { e.stopPropagation(); if (photo.type === 'new') URL.revokeObjectURL(photo.preview); setEditPhotos(p => p.filter((_, j) => j !== i)) }} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Price</div>
                <Label text="LISTING PRICE (USDC) *" />
                <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} onWheel={e => e.target.blur()} style={{ ...inputStyle, fontSize: '18px', fontFamily: 'Playfair Display, serif', marginBottom: parseFloat(editPrice) > 50000 ? '8px' : '14px', borderColor: parseFloat(editPrice) > 50000 ? 'rgba(200,75,60,0.6)' : undefined }} />
                {parseFloat(editPrice) > 50000 && (
                  <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.35)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700 }}>⚠</span> Maximum listing price is $50,000.
                  </div>
                )}
                {editPrice && parseFloat(editPrice) > 0 && parseFloat(editPrice) <= 50000 && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px' }}>
                    {[
                      { label: 'Your listing price',           val: `$${parseFloat(editPrice).toLocaleString()}` },
                      { label: 'Platform fee (3.5%)',          val: `-$${calcFees(editPrice).platform}` },
                      { label: 'Shipping & insurance (est.)',  val: `~$${calcFees(editPrice).shipCost}` },
                      { label: 'You receive on settlement',    val: `~$${calcFees(editPrice).net}`, green: true, total: true },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: row.total ? '8px 0 0' : '5px 0', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0' }}>
                        <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                        <span style={{ fontFamily: row.total ? 'Playfair Display, serif' : 'DM Mono, monospace', fontSize: row.total ? '20px' : '12px', color: row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {editSubmitError && (
                <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: 'var(--accent-red)' }}>{editSubmitError}</div>
              )}
              {editSaved && (
                <div style={{ background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: 'var(--accent-green)' }}>Listing updated ✓ — returning to listings…</div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleUpdateListing} disabled={editSubmitting || editSaved} style={{ flex: 1, background: (editSubmitting || editSaved) ? 'var(--bg-4)' : 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: (editSubmitting || editSaved) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: (editSubmitting || editSaved) ? 0.5 : 1 }}>
                  {editSubmitting ? 'Saving…' : editSaved ? 'Saved ✓' : 'Save Changes'}
                </button>
                <button onClick={() => setActiveSection('listings')} style={btn({ padding: '14px 24px', borderRadius: '10px' })}>Cancel</button>
              </div>
            </div>
          )}

          {/* EARNINGS */}
          {activeSection === 'earnings' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Earnings</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{releasedSales.length} completed sales · All USDC on Base</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Gross Revenue',   val: fmtUSD(totalCompletedRevenue), sub: 'Sum of listing prices',    color: 'var(--gold)' },
                  { label: 'Fees Paid (3.5%)', val: fmtUSD(totalFeesPaid),        sub: 'Platform + affiliate fee', color: 'var(--accent-red)' },
                  { label: 'Net Received',     val: fmtUSD(totalNetReceived),      sub: 'After fees & shipping',    color: 'var(--accent-green)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 300, color: m.color }}>{m.val}</div>
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
                        {['Card', 'Date', 'Sale Price', 'Fee (3.5%)', 'Shipping', 'Net Payout', 'Bond', ''].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 14px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {completedSales.map((sale, i) => {
                        const isRefunded = sale.status === 'refunded'
                        const gross  = Number(sale.listing?.price || 0)
                        const fee    = Number(sale.platform_fee || 0) + Number(sale.creator_fee || 0)
                        const ship   = Number(sale.shipping_cost || 0)
                        const net    = isRefunded ? 0 : Math.max(0, gross - fee - ship)
                        const bond   = Number(sale.bond_amount || 0)
                        return (
                          <tr key={sale.id} style={{ borderBottom: i < completedSales.length - 1 ? '0.5px solid var(--border)' : 'none', opacity: isRefunded ? 0.7 : 1 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{sale.listing?.card_name || '—'}</div>
                              {isRefunded && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-red)', marginTop: '2px', letterSpacing: '0.08em' }}>DISPUTE LOST — REFUNDED</div>}
                            </td>
                            <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(sale.released_at)}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'Playfair Display, serif', fontSize: '16px', color: isRefunded ? 'var(--accent-red)' : 'var(--gold)', fontWeight: 600 }}>{fmtUSD(gross)}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-red)' }}>{isRefunded ? '—' : `−${fmtUSD(fee)}`}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-red)' }}>{isRefunded ? '—' : `−${fmtUSD(ship)}`}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'Playfair Display, serif', fontSize: '16px', color: isRefunded ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600 }}>{isRefunded ? '—' : fmtUSD(net)}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: bond > 0 ? (isRefunded ? 'var(--accent-red)' : 'var(--accent-green)') : 'var(--text-muted)' }}>{bond > 0 ? (isRefunded ? `${fmtUSD(bond)} Forfeited` : `${fmtUSD(bond)} ✓`) : '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              {sale.reviews?.some(r => r.reviewer_role === 'seller') ? (
                                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)' }}>Reviewed ✓</span>
                              ) : (
                                <button onClick={() => { setReviewModal({ orderId: sale.id, cardName: sale.listing?.card_name || 'Card', buyerId: sale.buyer_id }); setReviewRating(5); setReviewComment(''); setReviewSuccess(false); setReviewError(null) }}
                                  style={{ background: 'var(--teal)', border: 'none', color: '#fff', padding: '6px 14px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                                  Rate Buyer
                                </button>
                              )}
                            </td>
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
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Bond <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Wallet</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Bonds post per transaction when a buyer purchases — not when you list. All bonds return within 5–7 days on completion.</div>

              {/* Payment wallet */}
              <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${profile?.wallet_address ? 'var(--border)' : 'rgba(201,168,76,0.4)'}`, borderRadius: '12px', padding: '18px 20px', marginBottom: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>Payment Wallet</div>
                {!profile?.wallet_address && (
                  <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--gold)', lineHeight: 1.6 }}>
                    ⚠ No wallet connected — buyers cannot complete purchases on any of your listings until you connect a MetaMask or other external wallet below.
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    {profile?.wallet_address ? (
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {profile.wallet_address.slice(0, 10)}...{profile.wallet_address.slice(-8)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not set</div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      USDC payments and bond returns go to this address · MetaMask, Coinbase, or any external wallet
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={connectWallet} style={{ background: 'var(--gold)', color: '#0A0A0B', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '12px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                      {profile?.wallet_address ? 'Change Wallet' : 'Connect Wallet'}
                    </button>
                    {profile?.wallet_address && (
                      <button onClick={disconnectWallet} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '9px 14px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer' }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Currently Locked', val: fmtUSD(bondInFlight), sub: `Across ${activeOrders.length} active orders · Returns within 5–7 days each`, color: 'var(--accent-amber)' },
                  { label: 'Bond Tier',         val: `${(bondRate * 100).toFixed(0)}% + $20`, sub: `${TIER_LABEL[profile?.seller_tier] || 'New'} seller`, color: 'var(--teal)' },
                  { label: 'Strikes',           val: String(profile?.strike_count ?? 0), sub: profile?.strike_count === 0 ? 'None — clean record' : 'Strike 2 → bond jumps to 4%', color: profile?.strike_count === 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Why does the bond exist — full explanation */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '22px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 500 }}>What is the bond — and why does it exist?</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 14px' }}>
                  The bond is a <strong style={{ color: 'var(--text-primary)' }}>security deposit, not a fee.</strong> It posts when a buyer purchases your card and is returned to you in full within 5–7 business days after the sale completes successfully. On a clean sale, your net bond cost is always <strong style={{ color: 'var(--accent-green)' }}>$0.00.</strong>
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 14px' }}>
                  Chase Hollow physically authenticates every card at our center before it reaches the buyer. If a dispute is filed after delivery, we manage the full return shipping chain — the card is returned to us for inspection, then sent back to you. That process involves up to four shipping labels, all generated and paid for by Chase Hollow. The bond exists to cover that cost in the rare event of a disputed sale where the buyer wins.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 16px' }}>
                  The bond also signals to buyers that you stand behind your listing. It's one of the reasons buyers trust Chase Hollow sellers over other platforms.
                </p>
                {[
                  { icon: '✓', color: 'var(--accent-green)', text: 'Bond is returned 100% on every successful sale — it is not a fee' },
                  { icon: '✓', color: 'var(--accent-green)', text: 'Bond posts only at the time of purchase — never required to list' },
                  { icon: '✓', color: 'var(--accent-green)', text: 'Bond rate decreases as you build your sales history (see tier table below)' },
                  { icon: '⚠', color: 'var(--accent-amber)', text: 'Bond is forfeited only if you lose a dispute — this is rare and preventable by accurate listings' },
                  { icon: '⚠', color: 'var(--accent-amber)', text: 'Strike 2 resets your bond rate to 4% regardless of tier — maintain your record' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', borderTop: '0.5px solid var(--border)' }}>
                    <span style={{ color: item.color, fontFamily: 'DM Mono, monospace', fontSize: '11px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Bond formula */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>How is my bond calculated?</div>
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Bond = $20 base + ({(bondRate * 100).toFixed(0)}% × sale price)
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  The $20 base covers worst-case return shipping costs. The percentage portion scales with sale value. For example — a $400 sale at your current {(bondRate * 100).toFixed(0)}% tier: <strong style={{ color: 'var(--text-primary)' }}>${(20 + 400 * bondRate).toFixed(2)} bond</strong>, returned in full on completion.
                </p>
              </div>

              {/* Bond tier structure */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>Bond Tier Structure</div>
                {[
                  { tier: 'New Seller',  range: '0–9 sales',        rate: 4,  key: 'new'     },
                  { tier: 'Trusted',     range: '10–99 sales',       rate: 3,  key: 'trusted' },
                  { tier: 'Pro',         range: '100–499 sales',     rate: 2,  key: 'pro'     },
                  { tier: 'Elite',       range: '500–2,499 sales',   rate: 1,  key: 'elite'   },
                  { tier: 'Legend',      range: '2,500+ sales',      rate: 1,  key: 'legend'  },
                ].map((t, i) => {
                  const isMe = (profile?.seller_tier || 'new') === t.key
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? '0.5px solid var(--border)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: isMe ? 600 : 400, color: isMe ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {t.tier} {isMe && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--teal)', marginLeft: '6px' }}>← You are here</span>}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{t.range}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, color: isMe ? 'var(--teal)' : 'var(--text-muted)' }}>{t.rate}%<span style={{ fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}> + $20</span></div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)' }}>per sale</div>
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Your tier is calculated automatically from your completed sales history. Elite and Legend tiers also require a &lt;2% dispute loss rate and account age of 365+ days.
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS — Phase 3 */}
          {activeSection === 'notifications' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Notifications</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Email notifications active — in-app alerts coming in Phase 3</div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>◉</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>In-app notifications coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>You're receiving order updates by email. Real-time alerts will be added at public launch.</div>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activeSection === 'profile' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Profile</em></div>
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
