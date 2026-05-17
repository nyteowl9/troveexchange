'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'
import ChatModal from '@/app/components/ChatModal'
import ConnectWalletButton, { useWalletConnection } from '@/app/components/ConnectWallet'
import { useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow'

const ACTIVE_STATUSES = ['awaiting_shipment', 'in_transit', 'auth_review', 'auth_passed', 'auth_failed', 'delivered', 'inspection_window', 'disputed', 'awaiting_return', 'return_received', 'return_verified', 'return_received_seller', 'return_disputed_seller']

const STATUS_MAP = {
  awaiting_shipment: { key: 'awaiting',        label: 'Awaiting Shipment',   steps: [true,  false, false, false, false], activeStep: 0 },
  in_transit:        { key: 'shipped',         label: 'In Transit',          steps: [true,  true,  false, false, false], activeStep: 1 },
  auth_review:       { key: 'auth',            label: 'Authenticating',      steps: [true,  true,  true,  false, false], activeStep: 2 },
  auth_passed:       { key: 'auth',            label: 'Auth Passed',         steps: [true,  true,  true,  false, false], activeStep: 2 },
  auth_failed:       { key: 'disputed',       label: 'Auth Failed',         steps: [true,  true,  true,  false, false], activeStep: 2 },
  delivered:         { key: 'auto-release',    label: 'Delivered',           steps: [true,  true,  true,  true,  false], activeStep: 3 },
  inspection_window: { key: 'auto-release',    label: 'Auto-Release Window', steps: [true,  true,  true,  true,  false], activeStep: 3 },
  disputed:          { key: 'disputed',        label: 'Dispute Under Review', steps: [true,  true,  true,  true,  false], activeStep: 3 },
  awaiting_return:   { key: 'return-required', label: 'Return Required',     steps: [true,  true,  true,  true,  false], activeStep: 3 },
  return_received:   { key: 'return-required', label: 'Return Received',     steps: [true,  true,  true,  true,  false], activeStep: 3 },
  return_verified:            { key: 'return-required', label: 'Return Verified',          steps: [true,  true,  true,  true,  false], activeStep: 3 },
  return_received_seller:     { key: 'return-required', label: 'Return Under Review',      steps: [true,  true,  true,  true,  false], activeStep: 3 },
  return_disputed_seller:     { key: 'disputed',        label: 'Return Dispute — Staff Review', steps: [true,  true,  true,  true,  false], activeStep: 3 },
  released:          { key: 'complete',        label: 'Complete',            steps: [true,  true,  true,  true,  true],  activeStep: 4 },
}

const STATUS_COLORS = {
  awaiting:          { bg: 'rgba(232,168,56,0.1)',  border: 'rgba(232,168,56,0.3)',  color: 'var(--accent-amber)' },
  'auto-release':    { bg: 'rgba(232,168,56,0.1)',  border: 'rgba(232,168,56,0.3)',  color: 'var(--accent-amber)' },
  auth:              { bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.28)', color: 'var(--gold)' },
  shipped:           { bg: 'rgba(60,125,200,0.1)',  border: 'rgba(60,125,200,0.3)',  color: 'var(--accent-blue)' },
  disputed:          { bg: 'rgba(200,75,60,0.1)',   border: 'rgba(200,75,60,0.3)',   color: 'var(--accent-red)' },
  'return-required': { bg: 'rgba(232,168,56,0.12)', border: 'rgba(232,168,56,0.4)',  color: 'var(--accent-amber)' },
  complete:          { bg: 'rgba(76,175,124,0.1)',  border: 'rgba(76,175,124,0.3)',  color: 'var(--accent-green)' },
}

const TIER_LABEL = { new: 'New', trusted: 'Trusted', pro: 'Pro', elite: 'Elite' }

// Detect carrier from tracking number and return a tracking URL
function trackingUrl(num) {
  if (!num) return null
  if (/^1Z/i.test(num)) return `https://www.ups.com/track?tracknum=${num}`
  if (/^9[0-9]{21}$/.test(num)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`
  return `https://www.fedex.com/fedextrack/?trknbr=${num}`
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

export default function BuyerDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const { wallets } = useWallets()
  const { walletAddress } = useWalletConnection()
  const router = useRouter()

  const [theme, setTheme] = useState('dark')
  const [activeSection, setActiveSection] = useState('overview')
  const [activeOrders, setActiveOrders]   = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [disputes, setDisputes]           = useState([])
  const [dataLoading, setDataLoading]     = useState(true)
  const [chatOrder, setChatOrder]         = useState(null)
  const [releasingId, setReleasingId]     = useState(null)
  const [releaseError, setReleaseError]   = useState(null)
  const [confirmingReceiptId, setConfirmingReceiptId] = useState(null)
  const [confirmReceiptError, setConfirmReceiptError] = useState({})

  // Review modal state
  const [reviewModal, setReviewModal]     = useState(null) // { orderId, cardName, sellerId }
  const [reviewRating, setReviewRating]   = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewError, setReviewError]     = useState(null)
  const [releaseStatus, setReleaseStatus] = useState(null) // step message during on-chain release

  // Dispute gate — 'gate' shows contact-seller step, 'form' shows the actual form
  const [disputeGateStep, setDisputeGateStep]         = useState('gate')

  // Dispute form state
  const [disputeOrderId, setDisputeOrderId]           = useState('')
  const [disputeReason, setDisputeReason]             = useState('Card does not match listing description')
  const [disputeDescription, setDisputeDescription]   = useState('')
  const [disputePhotos, setDisputePhotos]             = useState([]) // [{ file, preview }]
  const [disputeSubmitting, setDisputeSubmitting]     = useState(false)
  const [disputeError, setDisputeError]               = useState(null)
  const [disputeSuccess, setDisputeSuccess]           = useState(false)

  // Strikes + appeal (buyer and seller)
  const [buyerStrikes, setBuyerStrikes]                       = useState([])
  const [sellerStrikesForStanding, setSellerStrikesForStanding] = useState([])
  const [buyerAppealModal, setBuyerAppealModal]               = useState(null)
  const [buyerAppealReason, setBuyerAppealReason]             = useState('')
  const [buyerAppealSubmitting, setBuyerAppealSubmitting]     = useState(false)
  const [buyerAppealError, setBuyerAppealError]               = useState(null)
  const [buyerAppealDone, setBuyerAppealDone]                 = useState({})

  // Countdown for the most urgent inspection_window order
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 })
  const urgentOrder = activeOrders.find(o => o.status === 'inspection_window' && o.auto_release_at)

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/sign-in?next=/buyer-dashboard')
  }, [authLoading, user, router])

  // Countdown timer from auto_release_at
  useEffect(() => {
    if (!urgentOrder) return
    const tick = () => {
      const diff = Math.max(0, new Date(urgentOrder.auto_release_at) - Date.now())
      const totalSec = Math.floor(diff / 1000)
      setCountdown({ h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60 })
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [urgentOrder])

  const fetchData = useCallback(async () => {
    if (!user) { setDataLoading(false); return }
    try {
      const [activeRes, histRes, dispRes, strikesRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`id, status, ship_method, escrow_amount, auth_tier, tracking_a, tracking_b, tracking_c, shipped_at, delivered_at, auto_release_at, created_at, onchain_order_id, label_c_url, return_deadline_at, shipping_cost,
                   listing:listing_id (id, card_name, game, set, grade, grader, photos, price),
                   seller:seller_id (id, username, seller_tier)`)
          .eq('buyer_id', user.id)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select(`id, status, escrow_amount, shipping_cost, released_at, created_at, seller_id,
                   listing:listing_id (id, card_name, game, set, grade, grader, photos),
                   reviews (id, reviewer_role)`)
          .eq('buyer_id', user.id)
          .in('status', ['released', 'refunded'])
          .order('released_at', { ascending: false })
          .limit(50),
        supabase
          .from('disputes')
          .select(`id, reason, outcome, created_at,
                   order:order_id (id, listing:listing_id (card_name, set))`)
          .eq('raised_by', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('strikes')
          .select('id, strike_number, reason, action_taken, created_at, appealed, appeal_outcome, appeal_submitted_at, order_id, strike_role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      setActiveOrders(activeRes.data || [])
      setHistoryOrders(histRes.data || [])
      setDisputes(dispRes.data || [])
      setBuyerStrikes((strikesRes.data || []).filter(s => s.strike_role === 'buyer'))
      setSellerStrikesForStanding((strikesRes.data || []).filter(s => s.strike_role === 'seller'))
    } catch (err) {
      console.error('[fetchData]', err)
    } finally {
      setDataLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime — re-fetch when any of this buyer's orders change
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`buyer-orders-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `buyer_id=eq.${user.id}`,
      }, () => fetchData())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, fetchData])

  const handleConfirmReceipt = async (orderId) => {
    setConfirmingReceiptId(orderId)
    setConfirmReceiptError(prev => ({ ...prev, [orderId]: null }))
    try {
      const res = await fetch('/api/orders/buyer-confirm-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to confirm receipt')
      await fetchData()
    } catch (err) {
      setConfirmReceiptError(prev => ({ ...prev, [orderId]: err.message }))
    } finally {
      setConfirmingReceiptId(null)
    }
  }

  const handleRelease = async (order) => {
    setReleasingId(order.id)
    setReleaseError(null)
    setReleaseStatus(null)
    try {
      // On-chain release: contract requires msg.sender == order.buyer
      if (order.onchain_order_id) {
        const wallet = wallets.find(w => w.address?.toLowerCase() === walletAddress?.toLowerCase()) || wallets[0]
        if (!wallet) throw new Error('No wallet connected. Please connect your wallet to release funds.')

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
        setReleaseStatus('Confirm in wallet — releasing escrow to seller…')
        const provider = new ethers.BrowserProvider(eip1193)
        const signer = await provider.getSigner()
        const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
        const tx = await escrowContract.releaseEscrow(order.onchain_order_id, { gasLimit: 300000n })
        setReleaseStatus('Submitted — waiting for block confirmation…')
        const receipt = await tx.wait()
        if (!receipt || receipt.status === 0) {
          throw new Error(`On-chain release reverted (tx: ${tx.hash}). The order may not be in Delivered state on-chain — markDelivered may have failed.`)
        }
        order.__releaseTxHash = tx.hash
        setReleaseStatus(null)
      }

      // DB update + emails
      const res = await fetch('/api/orders/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, tx_hash: order.__releaseTxHash }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Release failed')
      await fetchData()
    } catch (err) {
      setReleaseError(err?.reason || err?.message || 'Release failed')
      setReleaseStatus(null)
    } finally {
      setReleasingId(null)
    }
  }

  const handleSubmitDispute = async () => {
    const effectiveOrderId = disputeOrderId || inspectionOrders[0]?.id
    if (!effectiveOrderId) {
      setDisputeError('Please select an order.')
      return
    }
    const order = inspectionOrders.find(o => o.id === effectiveOrderId)
    if (!order) { setDisputeError('Order not found.'); return }

    setDisputeSubmitting(true)
    setDisputeError(null)
    let onchainTxHash = null

    try {
      // On-chain: call openDispute() — contract requires msg.sender == order.buyer
      if (order.onchain_order_id) {
        const wallet = wallets.find(w => w.address?.toLowerCase() === walletAddress?.toLowerCase()) || wallets[0]
        if (!wallet) throw new Error('No wallet connected. Please connect your wallet.')

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
        const signer = await provider.getSigner()
        const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
        const tx = await escrowContract.openDispute(order.onchain_order_id, { gasLimit: 200000n })
        await tx.wait()
        onchainTxHash = tx.hash
      }

      // Upload evidence photos via API (server-side, bypasses storage RLS)
      const evidenceUrls = []
      for (const { file } of disputePhotos) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('order_id', order.id)
        const upRes = await fetch('/api/disputes/open', { method: 'PUT', body: fd })
        const upData = await upRes.json()
        if (upRes.ok && upData.url) evidenceUrls.push(upData.url)
      }

      // API: create dispute record + update order status
      const res = await fetch('/api/disputes/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          reason: disputeReason,
          description: disputeDescription,
          onchain_tx_hash: onchainTxHash,
          buyer_evidence: evidenceUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open dispute')

      setDisputeSuccess(true)
      setDisputeDescription('')
      setDisputePhotos([])
      await fetchData()
    } catch (err) {
      setDisputeError(err?.reason || err?.message || 'Failed to open dispute')
    } finally {
      setDisputeSubmitting(false)
    }
  }

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

  const pad = n => String(n).padStart(2, '0')

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '7px 14px', fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '8px', ...extra,
  })

  const totalSpent = historyOrders.reduce((sum, o) => sum + Number(o.escrow_amount || 0), 0)
  const initials   = (profile?.username || 'U').slice(0, 2).toUpperCase()
  const tierLabel  = TIER_LABEL[profile?.seller_tier] || 'New'
  const inspectionOrders = activeOrders.filter(o =>
    o.status === 'inspection_window' ||
    ((o.ship_method === 'self_ship' || o.ship_method === 'self_ship_untracked') && o.status === 'in_transit')
  )
  const [inboxThreads, setInboxThreads] = useState([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxUnread, setInboxUnread]   = useState(0)

  const fetchInbox = useCallback(async () => {
    setInboxLoading(true)
    try {
      const res = await fetch('/api/messages/inbox')
      const data = await res.json()
      const threads = data.threads || []
      setInboxThreads(threads)
      setInboxUnread(threads.reduce((sum, t) => sum + (t.unread || 0), 0))
    } catch {}
    setInboxLoading(false)
  }, [])

  useEffect(() => {
    if (activeSection === 'messages') fetchInbox()
  }, [activeSection, fetchInbox])

  const navBadge   = (key) => {
    if (key === 'active')     return activeOrders.length || null
    if (key === 'inspection') return inspectionOrders.length || null
    if (key === 'messages')   return inboxUnread || null
    if (key === 'history')    return null
    if (key === 'disputes')   return disputes.filter(d => !d.outcome).length || null
    if (key === 'standing')   return (profile?.buyer_strike_count || 0) > 0 ? profile.buyer_strike_count : null
    return null
  }

  const navItems = [
    { id: 'overview',      icon: '◈', label: 'Dashboard' },
    { id: 'notifications', icon: '◉', label: 'Notifications' },
    { id: 'active',        icon: '⇄', label: 'Active Purchases',  badgeColor: 'var(--accent-amber)' },
    { id: 'inspection',    icon: '⏱', label: 'Auto-Release',      badgeColor: 'var(--accent-red)' },
    { id: 'messages',      icon: '💬', label: 'Messages',          badgeColor: 'var(--accent-red)' },
    { id: 'watchlist',     icon: '♡', label: 'Watchlist' },
    { id: 'offers',        icon: '◆', label: 'My Offers' },
    { id: 'history',       icon: '◎', label: 'Purchase History' },
    { id: 'disputes',      icon: '⚠', label: 'Disputes',           badgeColor: 'var(--accent-red)' },
    { id: 'standing',      icon: '⚑', label: 'Account Standing',   badgeColor: 'var(--accent-red)' },
    { id: 'account',       icon: '⚙', label: 'Account' },
  ]

  const OrderCard = ({ order }) => {
    const sm   = STATUS_MAP[order.status] || STATUS_MAP.shipped
    const sc   = STATUS_COLORS[sm.key] || STATUS_COLORS.shipped
    const card = order.listing
    const photo = card?.photos?.[0]
    const isUrgent = order.status === 'inspection_window'
    const isPhysical = order.auth_tier === 'physical'

    // Tier 2 (physical): Funded → Shipped → Auth → Transit → Done
    // Tier 1 (remote):   Funded → Shipped → Transit → Auth → Done
    const stepLabels = isPhysical
      ? ['Funded', 'Shipped', 'Auth', 'Transit', 'Done']
      : ['Funded', 'Shipped', 'Transit', 'Auth', 'Done']

    const getPhysicalProgress = (status) => {
      switch (status) {
        case 'awaiting_shipment': return { steps: [true,  false, false, false, false], activeStep: 0 }
        case 'in_transit':        return { steps: [true,  true,  false, false, false], activeStep: 1 }
        case 'auth_review':       return { steps: [true,  true,  true,  false, false], activeStep: 2 }
        case 'auth_passed':       return { steps: [true,  true,  true,  true,  false], activeStep: 3 }
        case 'delivered':
        case 'inspection_window':
        case 'disputed':          return { steps: [true,  true,  true,  true,  true],  activeStep: 4 }
        case 'released':          return { steps: [true,  true,  true,  true,  true],  activeStep: 4 }
        default:                  return sm
      }
    }

    // Tier 1 (remote): Funded → Shipped → Transit → Auth → Done
    const getRemoteProgress = (status) => {
      switch (status) {
        case 'awaiting_shipment': return { steps: [true,  false, false, false, false], activeStep: 0 }
        case 'in_transit':        return { steps: [true,  true,  true,  false, false], activeStep: 2 }
        case 'auth_review':       return { steps: [true,  true,  true,  true,  false], activeStep: 3 }
        case 'auth_passed':       return { steps: [true,  true,  true,  true,  false], activeStep: 3 }
        case 'delivered':
        case 'inspection_window':
        case 'disputed':          return { steps: [true,  true,  true,  true,  true],  activeStep: 4 }
        case 'released':          return { steps: [true,  true,  true,  true,  true],  activeStep: 4 }
        default:                  return sm
      }
    }

    const progress = isPhysical ? getPhysicalProgress(order.status) : getRemoteProgress(order.status)
    const { steps, activeStep } = progress

    return (
      <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${isUrgent ? 'rgba(232,168,56,0.4)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ width: '36px', height: '50px', borderRadius: '4px', background: 'var(--bg-4)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '2px' }}>{card?.card_name || '—'}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{card?.game}{card?.set ? ` · ${card.set}` : ''} · {shortId(order.id)}</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500, flexShrink: 0 }}>{sm.label}</span>
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', textAlign: 'right' }}>{fmtUSD(order.escrow_amount)}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right' }}>Escrowed USDC</div>
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          {/* Progress */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              {stepLabels.map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: steps[i] ? (i === activeStep ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--bg-4)', border: `2px solid ${steps[i] ? (i === activeStep ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--border)'}`, flexShrink: 0 }} />
                  {i < 4 && <div style={{ flex: 1, height: '2px', background: steps[i] && steps[i + 1] ? 'var(--accent-green)' : 'var(--border)' }} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {stepLabels.map((label, i) => (
                <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: steps[i] ? (i === activeStep ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--text-muted)', flex: 1, textAlign: i === 0 ? 'left' : i === 4 ? 'right' : 'center' }}>{label}</div>
              ))}
            </div>
          </div>
          {/* Tracking info */}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', lineHeight: 1.6 }}>
            {order.status === 'awaiting_shipment' && `Waiting for seller to ship · 48hr deadline`}
            {order.status === 'in_transit' && order.auth_tier === 'physical' &&
              `In transit to authentication center`}
            {order.status === 'in_transit' && order.auth_tier !== 'physical' && (
              order.tracking_a
                ? <>In transit · <a href={trackingUrl(order.tracking_a)} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{order.tracking_a} ↗</a></>
                : 'In transit'
            )}
            {order.status === 'auth_review' && `At Chase Hollow authentication center · Inspection in progress`}
            {order.status === 'auth_passed' && (
              order.tracking_b
                ? <>Authenticated · In transit to you · <a href={trackingUrl(order.tracking_b)} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{order.tracking_b} ↗</a></>
                : 'Authenticated · Preparing shipment to you'
            )}
            {order.status === 'inspection_window' && (() => {
              const expired = order.auto_release_at && new Date(order.auto_release_at) <= new Date()
              return expired
                ? `Inspection window closed · Funds releasing automatically`
                : (order.auto_release_at ? `Delivered ${fmtDate(order.delivered_at)} · Auto-release ${fmtDate(order.auto_release_at)} · Inspect and dispute if anything is wrong` : 'Delivered · Inspection window open')
            })()}
            {order.status === 'awaiting_return' && (() => {
              const daysLeft = order.return_deadline_at
                ? Math.max(0, Math.ceil((new Date(order.return_deadline_at) - Date.now()) / (1000 * 60 * 60 * 24)))
                : null
              return <>Dispute won · Print your return label and ship the card back · <strong style={{ color: daysLeft <= 1 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{daysLeft !== null ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Deadline set'}</strong> · Refund releases on delivery</>
            })()}
            {order.status === 'disputed' && `Dispute filed · Chase Hollow staff is reviewing your case · No action needed — you will be notified of the outcome`}
            {order.status === 'return_received' && `Card received by Chase Hollow · Inspecting return · Refund pending`}
            {order.status === 'return_verified' && `Return verified · Refund processing`}
            {order.status === 'return_received_seller' && `Card delivered to seller · Seller reviewing return · You will be notified once they confirm or dispute`}
            {order.status === 'return_disputed_seller' && `Seller has disputed the returned card · Chase Hollow staff is reviewing evidence · No action required from you`}
            {order.status === 'auth_failed' && `Authentication failed — our team found an issue with this card · Your funds will be refunded · You will be contacted with next steps`}
          </div>

          {/* Dispute filed — waiting for review */}
          {order.status === 'disputed' && (
            <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--accent-red)' }}>Dispute under review</strong> · Your funds are frozen and protected. Staff will review your evidence and the seller's response.
              {order.auth_tier === 'physical'
                ? ' If you win, you\'ll receive a prepaid return label to ship the card back to our auth center.'
                : ' If you win, you\'ll receive a prepaid return label to ship the card back to the seller.'}
              {' '}Decisions are typically made within 1–3 business days.
            </div>
          )}

          {/* Return required banner */}
          {order.status === 'awaiting_return' && (
            <div style={{ background: 'rgba(232,168,56,0.08)', border: '1px solid rgba(232,168,56,0.35)', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent-amber)' }}>Action required:</strong> You must ship the card back using the prepaid label below. Your refund will be released once the carrier confirms delivery. If you do not ship within the deadline, the dispute will be reversed.
            </div>
          )}

          {/* Auth failed banner */}
          {order.status === 'auth_failed' && (
            <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--accent-red)' }}>Authentication failed</strong> · Our team was unable to verify this card's authenticity. Your funds are protected and a full refund will be issued. The seller has been penalized. If you have questions, contact Chase Hollow support.
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {order.status === 'inspection_window' && (() => {
              const expired = order.auto_release_at && new Date(order.auto_release_at) <= new Date()
              if (expired) return null
              return (
                <>
                  <button
                    onClick={() => handleRelease(order)}
                    disabled={releasingId === order.id}
                    style={btn({ background: 'var(--accent-green)', border: 'none', color: '#fff', fontWeight: 600, opacity: releasingId === order.id ? 0.6 : 1, cursor: releasingId === order.id ? 'not-allowed' : 'pointer' })}
                  >
                    {releasingId === order.id ? 'Releasing…' : 'Release Early'}
                  </button>
                  <button onClick={() => { setDisputeOrderId(order.id); setDisputeGateStep('gate'); setActiveSection('disputes') }} style={btn({ border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)' })}>Raise Dispute</button>
                  {releasingId === order.id && releaseStatus && <div style={{ width: '100%', fontSize: '11px', color: 'var(--accent-amber)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{releaseStatus}</div>}
                  {releaseError && releasingId === null && <div style={{ width: '100%', fontSize: '11px', color: 'var(--accent-red)', marginTop: '4px' }}>{releaseError}</div>}
                </>
              )
            })()}
            {(order.ship_method === 'self_ship' || order.ship_method === 'self_ship_untracked') && order.status === 'in_transit' && (
              <>
                <button
                  onClick={() => handleConfirmReceipt(order.id)}
                  disabled={confirmingReceiptId === order.id}
                  style={btn({ background: 'var(--accent-green)', border: 'none', color: '#fff', fontWeight: 600, opacity: confirmingReceiptId === order.id ? 0.6 : 1, cursor: confirmingReceiptId === order.id ? 'not-allowed' : 'pointer' })}
                >
                  {confirmingReceiptId === order.id ? 'Confirming…' : '✓ I Received This'}
                </button>
                <button onClick={() => { setDisputeOrderId(order.id); setDisputeGateStep('gate'); setActiveSection('disputes') }} style={btn({ border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)' })}>Raise Dispute</button>
                {confirmReceiptError[order.id] && <div style={{ width: '100%', fontSize: '11px', color: 'var(--accent-red)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{confirmReceiptError[order.id]}</div>}
              </>
            )}
            {order.status === 'awaiting_return' && order.label_c_url && (
              <a href={order.label_c_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button style={btn({ background: 'var(--accent-amber)', border: 'none', color: '#0A0A0B', fontWeight: 700 })}>Print Return Label</button>
              </a>
            )}
            {order.status === 'awaiting_return' && order.tracking_c && (
              <a href={trackingUrl(order.tracking_c)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button style={btn({ border: '1.5px solid rgba(232,168,56,0.35)', color: 'var(--accent-amber)' })}>Track Return</button>
              </a>
            )}
            <button onClick={() => setChatOrder({ id: order.id, label: card?.card_name })} style={btn({ border: '1.5px solid var(--teal-border)', color: 'var(--teal)' })}>Message Seller</button>
            <Link href={`/listing/${order.listing?.id || ''}`} style={{ textDecoration: 'none' }}>
              <button style={btn()}>View Listing</button>
            </Link>
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
          orderId={chatOrder.listingId ? undefined : chatOrder.id}
          listingId={chatOrder.listingId}
          contextLabel={chatOrder.label}
          onClose={() => { setChatOrder(null); if (activeSection === 'messages') fetchInbox() }}
        />
      )}

      {/* Review modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget && !reviewSubmitting) { setReviewModal(null); setReviewSuccess(false); setReviewRating(5); setReviewComment(''); setReviewError(null) } }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '28px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>Rate <em style={{ color: 'var(--gold)' }}>Seller</em></div>
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
                    placeholder="Describe your experience with this seller…"
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
        <aside className="dash-aside" style={{ width: '220px', flexShrink: 0, background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', position: 'fixed', top: '64px', left: 0, height: 'calc(100vh - 64px)', overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 16px', marginBottom: '4px', fontWeight: 500 }}>Overview</div>
          {navItems.slice(0, 2).map(item => {
            const badge = navBadge(item.id)
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', transition: 'all 0.15s', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
                <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
                {item.label}
                {badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor || 'var(--teal)', color: '#fff', fontWeight: 600 }}>{badge}</span>}
              </button>
            )
          })}

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px 4px', fontWeight: 500 }}>Purchases</div>
          {navItems.slice(2, 5).map(item => {
            const badge = navBadge(item.id)
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
                <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
                {item.label}
                {badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor || 'var(--teal)', color: '#fff', fontWeight: 600 }}>{badge}</span>}
              </button>
            )
          })}

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px 4px', fontWeight: 500 }}>Activity</div>
          {navItems.slice(5).map(item => {
            const badge = navBadge(item.id)
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: `2px solid ${activeSection === item.id ? 'var(--teal)' : 'transparent'}`, background: activeSection === item.id ? 'var(--teal-bg)' : 'transparent', color: activeSection === item.id ? 'var(--teal)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', width: '100%' }}>
                <span style={{ width: '16px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
                {item.label}
                {badge && <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: item.badgeColor || 'var(--teal)', color: '#fff', fontWeight: 600 }}>{badge}</span>}
              </button>
            )
          })}

          {/* Rep card */}
          <div style={{ margin: '16px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', borderRadius: '10px', padding: '14px', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '4px', fontWeight: 500 }}>Buyer Reputation</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>{profile?.buyer_rep_score?.toFixed(2) ?? '—'}</div>
            <div style={{ color: 'var(--gold)', fontSize: '12px', letterSpacing: '1px', margin: '3px 0' }}>★★★★★</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{historyOrders.length} purchases · {disputes.length} disputes</div>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{profile?.username || 'Collector'}</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{tierLabel} Buyer · {historyOrders.length} purchases · Member since {fmtDate(profile?.joined_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <ConnectWalletButton />
                  <Link href="/marketplace" style={{ textDecoration: 'none' }}>
                    <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Marketplace</button>
                  </Link>
                </div>
              </div>

              {/* Suspension / ban banner */}
              {(profile?.banned || (profile?.suspended_until && new Date(profile.suspended_until) > new Date())) && (() => {
                const isBanned = profile.banned
                const until    = !isBanned && new Date(profile.suspended_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                return (
                  <div style={{ background: 'rgba(200,75,60,0.08)', border: '1.5px solid rgba(200,75,60,0.4)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>⚑</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-red)', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        {isBanned ? 'ACCOUNT BANNED' : 'ACCOUNT SUSPENDED'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {isBanned
                          ? 'Your account has been permanently banned. You cannot purchase or sell on Chase Hollow.'
                          : <>Your account is suspended until <strong style={{ color: 'var(--text-primary)' }}>{until}</strong>. You cannot purchase until this restriction is lifted.</>}
                      </div>
                      <button onClick={() => setActiveSection('standing')} style={{ marginTop: '10px', background: 'transparent', border: '1px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        View Account Standing →
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Inspection Alert — only when there's an order in inspection_window */}
              {urgentOrder && (() => {
                const windowExpired = countdown.h === 0 && countdown.m === 0 && countdown.s === 0
                return (
                <div style={{ background: windowExpired ? 'rgba(108,106,102,0.08)' : 'rgba(232,168,56,0.08)', border: `1.5px solid ${windowExpired ? 'var(--border)' : 'rgba(232,168,56,0.35)'}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: windowExpired ? 'rgba(108,106,102,0.1)' : 'rgba(232,168,56,0.15)', border: `1px solid ${windowExpired ? 'var(--border)' : 'rgba(232,168,56,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{windowExpired ? '✓' : '⏱'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {windowExpired
                        ? 'Inspection Window Closed — Funds Releasing Automatically'
                        : `Delivery Confirmed — Funds Auto-Release in ${pad(countdown.h)}h ${pad(countdown.m)}m`}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: windowExpired ? '0' : '8px' }}>
                      {windowExpired
                        ? <>Your <strong>{urgentOrder.listing?.card_name}</strong> inspection window has closed. <strong>{fmtUSD(urgentOrder.escrow_amount)} USDC</strong> will be released to the seller automatically — no action needed.</>
                        : <>Your <strong>{urgentOrder.listing?.card_name}</strong> ({shortId(urgentOrder.id)}) was delivered {fmtDate(urgentOrder.delivered_at)}. <strong>{fmtUSD(urgentOrder.escrow_amount)} USDC releases automatically to the seller on {fmtDate(urgentOrder.auto_release_at)}</strong> — no action needed. Raise a dispute before then if anything is wrong.</>}
                    </div>
                    {!windowExpired && (
                      <>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', marginTop: '8px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
                          {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)} remaining
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleRelease(urgentOrder)} disabled={releasingId === urgentOrder?.id} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: releasingId === urgentOrder?.id ? 0.6 : 1 }}>{releasingId === urgentOrder?.id ? 'Releasing…' : 'Release Funds Early'}</button>
                          <button onClick={() => { setDisputeGateStep('gate'); setActiveSection('disputes') }} style={{ background: 'transparent', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Something is Wrong — Dispute</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                )
              })()}

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Total Spent',   val: fmtUSD(totalSpent),        sub: `Lifetime · ${historyOrders.length} purchases`,   color: 'var(--gold)' },
                  { label: 'Active Orders', val: String(activeOrders.length), sub: inspectionOrders.length ? `${inspectionOrders.length} releasing soon` : 'All on track', color: 'var(--text-primary)' },
                  { label: 'Completed',     val: String(historyOrders.length),sub: 'Released orders',                               color: 'var(--teal)' },
                  { label: 'Buyer Rating',  val: profile?.buyer_rep_score?.toFixed(2) ?? '—', sub: `${disputes.length} disputes`,         color: 'var(--teal)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Active Orders Preview */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
                {activeOrders.length > 2 && <button onClick={() => setActiveSection('active')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>}
              </div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading orders…</div>
              ) : activeOrders.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🃏</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '6px' }}>No active orders</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Browse the marketplace to find your next card</div>
                  <Link href="/marketplace" style={{ textDecoration: 'none' }}>
                    <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Marketplace</button>
                  </Link>
                </div>
              ) : (
                activeOrders.slice(0, 3).map((order) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          )}

          {/* ACTIVE PURCHASES */}
          {activeSection === 'active' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Purchases</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'DM Mono, monospace' }}>{activeOrders.length} orders in progress</div>
                </div>
              </div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading…</div>
              ) : activeOrders.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No active orders</div>
              ) : (
                activeOrders.map((order) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          )}

          {/* AUTO-RELEASE / INSPECTION */}
          {activeSection === 'inspection' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Auto-Release <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Window</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Funds release automatically — only act if something is wrong</div>

              {inspectionOrders.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>No orders in the inspection window</div>
              ) : inspectionOrders.map((order) => {
                const expired = order.auto_release_at && new Date(order.auto_release_at) <= new Date()
                const isUrgent = order.id === urgentOrder?.id
                return (
                <div key={order.id}>
                  <div style={{ background: expired ? 'rgba(108,106,102,0.06)' : 'rgba(232,168,56,0.08)', border: `1.5px solid ${expired ? 'var(--border)' : 'rgba(232,168,56,0.35)'}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{shortId(order.id)} — {order.listing?.card_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                      {expired
                        ? <>Inspection window closed. <strong>{fmtUSD(order.escrow_amount)} USDC</strong> is releasing automatically to the seller — no action needed.</>
                        : <>Your card was delivered {fmtDate(order.delivered_at)}. <strong>{fmtUSD(order.escrow_amount)} USDC releases automatically to the seller on {fmtDate(order.auto_release_at)}</strong> — you don't need to do anything if everything is fine.</>}
                    </div>
                    {!expired && isUrgent && (
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
                        {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)} remaining · Expires {fmtDate(order.auto_release_at)}
                      </div>
                    )}
                  </div>

                  {!expired && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                        <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>What to Check</div>
                          {['Card matches listing photos exactly', 'Slab is intact — no cracks or tampering', order.listing?.grade ? `Grade label matches listing (${order.listing.grader} ${order.listing.grade})` : 'Condition matches listing', 'No shipping damage to card or slab'].map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              <span style={{ color: 'var(--teal)', flexShrink: 0 }}>✓</span>{item}
                            </div>
                          ))}
                        </div>
                        <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Order Summary</div>
                          {[
                            { label: 'Card',     val: order.listing?.card_name },
                            { label: 'Seller',   val: order.seller?.username || '—', teal: true },
                            { label: 'You paid', val: fmtUSD(order.escrow_amount), gold: true },
                          ].map((row, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                              <span style={{ color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : 'var(--text-primary)', fontFamily: row.gold ? 'Playfair Display, serif' : 'inherit', fontSize: row.gold ? '17px' : '13px', fontWeight: 500 }}>{row.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleRelease(order)} disabled={releasingId === order.id} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '14px 28px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: releasingId === order.id ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: releasingId === order.id ? 0.6 : 1 }}>
                          {releasingId === order.id ? 'Releasing…' : '✓ Release Funds Early — Everything is Good'}
                        </button>
                        <button onClick={() => { setDisputeGateStep('gate'); setActiveSection('disputes') }} style={{ background: 'transparent', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '14px 28px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>⚠ Something is Wrong — Raise Dispute</button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.6 }}>Releasing early sends funds to the seller immediately. Funds release automatically on {fmtDate(order.auto_release_at)} with no action needed.</div>
                    </>
                  )}
                </div>
                )
              })}
            </div>
          )}

          {/* WATCHLIST — Phase 3 */}
          {activeSection === 'watchlist' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Watchlist</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'DM Mono, monospace' }}>Price alerts coming in Phase 3</div>
                </div>
                <Link href="/marketplace" style={{ textDecoration: 'none' }}>
                  <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Cards</button>
                </Link>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>♡</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Watchlist coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>Save cards, get price drop alerts, and track market movement. Available at public launch.</div>
              </div>
            </div>
          )}

          {/* OFFERS — Phase 3 */}
          {activeSection === 'offers' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Offers</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Offer system coming in Phase 3</div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>◆</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Make Offers coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>Counter-offer and negotiation tools are planned for public launch.</div>
              </div>
            </div>
          )}

          {/* PURCHASE HISTORY */}
          {activeSection === 'history' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Purchase <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{historyOrders.length} completed · {fmtUSD(totalSpent)} total spent</div>
                </div>
              </div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading…</div>
              ) : historyOrders.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>No completed purchases yet</div>
              ) : (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                        {['Card', 'Grade', 'Paid', 'Date', ''].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrders.map((order, i) => (
                        <tr key={order.id} style={{ borderBottom: i < historyOrders.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '26px', height: '36px', borderRadius: '3px', background: 'var(--bg-4)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                                {order.listing?.photos?.[0] ? <img src={order.listing.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
                              </div>
                              <div>
                                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{order.listing?.card_name || '—'}</div>
                                <div style={{ fontSize: '10px', color: order.status === 'refunded' ? 'var(--accent-green)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '1px' }}>{order.status === 'refunded' ? 'Dispute Won — Refunded' : (order.listing?.set || '—')}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {order.listing?.grade ? (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 9px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{order.listing.grader} {order.listing.grade}</span>
                            ) : <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Raw</span>}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {order.status === 'refunded' && order.shipping_cost > 0 ? (
                              <div>
                                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 600, color: 'var(--accent-green)' }}>{fmtUSD(order.escrow_amount - order.shipping_cost)}</div>
                                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>−{fmtUSD(order.shipping_cost)} shipping kept</div>
                              </div>
                            ) : (
                              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 600, color: order.status === 'refunded' ? 'var(--accent-green)' : 'var(--gold)' }}>{fmtUSD(order.escrow_amount)}</div>
                            )}
                          </td>
                          <td style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(order.released_at || order.created_at)}</td>
                          <td style={{ padding: '13px 16px' }}>
                            {order.reviews?.some(r => r.reviewer_role === 'buyer') ? (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-green)' }}>Reviewed ✓</span>
                            ) : (
                              <button onClick={e => { e.stopPropagation(); setReviewModal({ orderId: order.id, cardName: order.listing?.card_name || 'Card', sellerId: order.seller_id }); setReviewRating(5); setReviewComment(''); setReviewSuccess(false); setReviewError(null) }}
                                style={{ background: 'var(--teal)', border: 'none', color: '#fff', padding: '6px 14px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                                Rate Seller
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS — Phase 3 */}
          {activeSection === 'notifications' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Notifications</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>Email notifications active — in-app alerts coming in Phase 3</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>◉</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>In-app notifications coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>You're receiving order updates by email. Real-time alerts will be added at public launch.</div>
              </div>
            </div>
          )}

          {/* MESSAGES INBOX */}
          {activeSection === 'messages' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Messages
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>
                All conversations — pre-sale questions and order messages.
              </div>
              {inboxLoading ? (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</div>
              ) : inboxThreads.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: 'var(--text-muted)', marginBottom: '8px' }}>No messages yet</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Message a seller from any listing page to get started.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inboxThreads.map(thread => (
                    <button key={`${thread.type}-${thread.id}`}
                      onClick={() => setChatOrder(thread.type === 'order' ? { id: thread.id, label: thread.title } : { listingId: thread.id, label: thread.title })}
                      style={{ background: thread.unread ? 'rgba(201,168,76,0.05)' : 'var(--bg-2)', border: `1.5px solid ${thread.unread ? 'rgba(201,168,76,0.25)' : 'var(--border)'}`, borderRadius: '12px', padding: '14px 18px', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--teal)', flexShrink: 0 }}>
                        {thread.type === 'listing' ? '💬' : '🧾'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>@{thread.otherUsername}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{thread.type === 'listing' ? '· Pre-sale' : '· Order'}</span>
                          {thread.unread > 0 && <span style={{ background: 'var(--accent-red)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '9px', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{thread.unread} new</span>}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.lastMessage || '…'}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{thread.title}</div>
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(thread.lastAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DISPUTES */}
          {activeSection === 'disputes' && (
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Raise a <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Dispute</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Only open a dispute if there is a genuine issue with your order</div>

              {/* Active disputes — pending/under review */}
              {disputes.filter(d => !d.outcome || d.outcome === 'pending').length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '12px' }}>Active Disputes</div>
                  {disputes.filter(d => !d.outcome || d.outcome === 'pending').map((d) => (
                    <div key={d.id} style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(232,168,56,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{d.order?.listing?.card_name || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>{d.reason} · Opened {fmtDate(d.created_at)}</div>
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.3)', color: 'var(--accent-amber)', fontWeight: 500 }}>Under Review</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Gate — contact seller first */}
              {disputeGateStep === 'gate' && inspectionOrders.length > 0 && (
                <div style={{ background: 'rgba(232,168,56,0.05)', border: '1.5px solid rgba(232,168,56,0.25)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>Have you contacted the <em style={{ color: 'var(--gold)' }}>seller</em> first?</div>
                  {(() => {
                    const targetOrder = inspectionOrders.find(o => o.id === disputeOrderId) || inspectionOrders[0]
                    return targetOrder ? (
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        {targetOrder.listing?.card_name || 'Card'} · #{targetOrder.id.slice(0,8).toUpperCase()}
                      </div>
                    ) : null
                  })()}
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>Most issues can be resolved directly. Message the seller — they have every incentive to make it right. If you've already tried and couldn't reach an agreement, you can proceed with a formal dispute.</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {(() => {
                      const targetOrder = inspectionOrders.find(o => o.id === disputeOrderId) || inspectionOrders[0]
                      return (
                        <button
                          onClick={() => setChatOrder({ id: targetOrder.id, label: targetOrder.listing?.card_name || 'Order' })}
                          style={{ background: 'var(--teal)', border: 'none', color: '#fff', padding: '11px 22px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          Message Seller
                        </button>
                      )
                    })()}
                    <button
                      onClick={() => setDisputeGateStep('form')}
                      style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-muted)', padding: '11px 22px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      I've already tried — continue to dispute
                    </button>
                  </div>
                </div>
              )}

              {/* New dispute form — only if there's an eligible order */}
              {disputeGateStep === 'form' && inspectionOrders.length > 0 ? (
                <div style={{ background: 'rgba(200,75,60,0.05)', border: '1.5px solid rgba(200,75,60,0.25)', borderRadius: '12px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚠</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Open Dispute</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inspectionOrders.length} order{inspectionOrders.length > 1 ? 's' : ''} in inspection window</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {['You submit your dispute with photos and description', 'Seller has 48hrs to respond with their evidence', 'Chase Hollow reviews both sides within 72hrs', 'Win: full refund to you, seller bond forfeited. Lose: escrow releases to seller.'].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-red)', flexShrink: 0, fontWeight: 500 }}>{i + 1}</div>
                        {step}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.6, marginBottom: '20px' }}>⚠ Only raise a dispute if there is a genuine problem. False disputes result in a negative mark on your buyer reputation.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Order</div>
                      <select
                        value={disputeOrderId || inspectionOrders[0]?.id || ''}
                        onChange={e => setDisputeOrderId(e.target.value)}
                        style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%', cursor: 'pointer' }}
                      >
                        {inspectionOrders.map(o => <option key={o.id} value={o.id}>{shortId(o.id)} — {o.listing?.card_name || '—'}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Reason for dispute</div>
                      <select
                        value={disputeReason}
                        onChange={e => setDisputeReason(e.target.value)}
                        style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%', cursor: 'pointer' }}
                      >
                        <option>Card does not match listing description</option>
                        <option>Slab is damaged or cracked</option>
                        <option>Wrong card received</option>
                        <option>Card not delivered</option>
                        <option>Grade label does not match listing</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Description</div>
                      <textarea
                        value={disputeDescription}
                        onChange={e => setDisputeDescription(e.target.value)}
                        style={{ background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', width: '100%', resize: 'vertical', minHeight: '100px', lineHeight: 1.6, boxSizing: 'border-box' }}
                        placeholder="Describe the issue in detail…"
                      />
                    </div>
                    {/* Evidence photos — optional */}
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 500 }}>Evidence Photos <span style={{ color: 'var(--border)', textTransform: 'none', letterSpacing: 0 }}>(optional · up to 5)</span></div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {disputePhotos.map((p, i) => (
                          <div key={p.preview} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid var(--border)', flexShrink: 0 }}>
                            <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button onClick={() => { URL.revokeObjectURL(p.preview); setDisputePhotos(prev => prev.filter((_, j) => j !== i)) }}
                              style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.8)', border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                        {disputePhotos.length < 5 && (
                          <label style={{ width: '72px', height: '72px', borderRadius: '6px', border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '22px', flexShrink: 0 }}>
                            +
                            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                              onChange={e => {
                                const files = Array.from(e.target.files || []).slice(0, 5 - disputePhotos.length)
                                setDisputePhotos(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
                                e.target.value = ''
                              }} />
                          </label>
                        )}
                      </div>
                    </div>

                    {disputeError && (
                      <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.35)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-red)', lineHeight: 1.5 }}>{disputeError}</div>
                    )}
                    {disputeSuccess && (
                      <div style={{ background: 'rgba(76,175,124,0.08)', border: '1px solid rgba(76,175,124,0.35)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-green)', lineHeight: 1.5 }}>Dispute opened successfully. Chase Hollow will review within 72hrs.</div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleSubmitDispute}
                        disabled={disputeSubmitting || disputeSuccess}
                        style={{ background: (disputeSubmitting || disputeSuccess) ? 'var(--bg-4)' : 'var(--accent-red)', border: 'none', color: '#fff', padding: '13px 24px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: (disputeSubmitting || disputeSuccess) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', flex: 1, opacity: (disputeSubmitting || disputeSuccess) ? 0.6 : 1 }}
                      >
                        {disputeSubmitting ? 'Confirm in wallet…' : disputeSuccess ? 'Dispute Opened ✓' : 'Submit Dispute'}
                      </button>
                      <button onClick={() => { setActiveSection('inspection'); setDisputeError(null); setDisputeSuccess(false) }} style={btn({ padding: '13px 24px', borderRadius: '10px' })}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>No orders currently eligible for dispute. Orders can be disputed during the inspection window after delivery, or while a self-ship order is in transit.</div>
              )}

              {/* Resolved disputes — shown at the bottom */}
              {disputes.filter(d => d.outcome && d.outcome !== 'pending').length > 0 && (
                <div style={{ marginTop: '32px' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--text-muted)', marginBottom: '12px' }}>Past Disputes</div>
                  {disputes.filter(d => d.outcome && d.outcome !== 'pending').map((d) => {
                    const won = d.outcome === 'buyer_wins'
                    return (
                      <div key={d.id} style={{ background: 'var(--bg-2)', border: `1.5px solid ${won ? 'rgba(76,175,124,0.2)' : 'rgba(200,75,60,0.2)'}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{d.order?.listing?.card_name || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>{d.reason} · {fmtDate(d.created_at)}</div>
                        </div>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: won ? 'rgba(76,175,124,0.1)' : 'rgba(200,75,60,0.1)', border: `1px solid ${won ? 'rgba(76,175,124,0.3)' : 'rgba(200,75,60,0.3)'}`, color: won ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>{won ? 'Refunded' : 'Closed'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ACCOUNT STANDING */}
          {activeSection === 'standing' && (() => {
            const strikeCount    = profile?.buyer_strike_count || 0
            const isBanned       = profile?.banned
            const isSuspended    = profile?.suspended_until && new Date(profile.suspended_until) > new Date()
            const suspendedUntil = isSuspended ? new Date(profile.suspended_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
            const statusColor    = isBanned ? 'var(--accent-red)' : isSuspended ? 'var(--accent-amber)' : 'var(--accent-green)'
            const statusLabel    = isBanned ? 'Banned' : isSuspended ? 'Suspended' : 'Good Standing'
            return (
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '4px' }}>Account <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Standing</em></div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', fontFamily: 'DM Mono, monospace' }}>Your buyer account status and violation history</div>

                {/* Status card */}
                <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${isBanned || isSuspended ? statusColor + '55' : 'var(--border)'}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: statusColor, letterSpacing: '0.06em' }}>{statusLabel.toUpperCase()}</div>
                    {isSuspended && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>Suspended until <strong style={{ color: 'var(--text-primary)' }}>{suspendedUntil}</strong>. You cannot purchase until this date.</div>}
                    {isBanned && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>Your account has been permanently banned due to repeated violations.</div>}
                    {!isBanned && !isSuspended && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Your account is in good standing. No active restrictions.</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 300, color: strikeCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{strikeCount}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>BUYER STRIKE{strikeCount !== 1 ? 'S' : ''}</div>
                  </div>
                </div>

                {/* Strike records — combine buyer + seller into one list, sorted by date */}
                {[...buyerStrikes, ...sellerStrikesForStanding].length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>STRIKE RECORD</div>
                    {[...buyerStrikes, ...sellerStrikesForStanding].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(s => {
                      const daysLeft = Math.max(0, 7 - Math.floor((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)))
                      const canAppeal = !s.appealed && !s.appeal_outcome && s.strike_number < 3 && daysLeft > 0
                      return (
                        <div key={s.id} style={{ background: 'var(--bg-2)', border: '1.5px solid rgba(200,75,60,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '4px' }}>STRIKE {s.strike_number} · {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{s.reason}</div>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{s.action_taken}</div>
                            </div>
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              {s.appeal_outcome === 'approved' && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', color: 'var(--accent-green)', fontWeight: 600 }}>APPEAL APPROVED</span>}
                              {s.appeal_outcome === 'denied'   && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)', fontWeight: 600 }}>APPEAL DENIED</span>}
                              {s.appealed && !s.appeal_outcome && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(60,125,200,0.1)', border: '1px solid rgba(60,125,200,0.3)', color: 'var(--accent-blue)', fontWeight: 600 }}>APPEAL PENDING</span>}
                              {canAppeal && (
                                <button onClick={() => { setBuyerAppealModal({ strikeId: s.id }); setBuyerAppealReason(''); setBuyerAppealError(null) }}
                                  style={{ display: 'block', marginTop: s.appealed ? '6px' : '0', background: 'transparent', border: '1px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                                  Appeal · {daysLeft}d left
                                </button>
                              )}
                              {buyerAppealDone[s.id] && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--accent-green)', marginTop: '4px' }}>Appeal submitted</div>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Strike progression */}
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>STRIKE THRESHOLDS</div>
                  {[
                    { n: 1, label: 'Strike 1', action: '7-day account suspension' },
                    { n: 2, label: 'Strike 2', action: '30-day account suspension' },
                    { n: 3, label: 'Strike 3', action: 'Permanent ban' },
                  ].map(({ n, label, action }) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: n < 3 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: strikeCount >= n ? 'rgba(200,75,60,0.15)' : 'var(--bg-3)', border: `1.5px solid ${strikeCount >= n ? 'rgba(200,75,60,0.5)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 700, color: strikeCount >= n ? 'var(--accent-red)' : 'var(--text-muted)' }}>{n}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', color: strikeCount >= n ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: strikeCount >= n ? 600 : 400 }}>{label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '1px' }}>{action}</div>
                      </div>
                      {strikeCount >= n && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', color: 'var(--accent-red)', fontWeight: 600 }}>APPLIED</span>}
                    </div>
                  ))}
                </div>

                {/* What triggers buyer strikes */}
                <div style={{ background: 'rgba(60,125,200,0.06)', border: '1px solid rgba(60,125,200,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--accent-blue)', marginBottom: '8px', fontWeight: 600 }}>WHAT CAUSES BUYER STRIKES</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Buyer strikes are issued when a dispute investigation confirms that a fraudulent card was returned — for example, returning a different card than the one received. Strikes are reviewed by our team and applied only after evidence is examined.
                  </div>
                </div>

                {/* Appeal modal */}
                {buyerAppealModal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '480px' }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '6px' }}>Appeal This Strike</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>Explain why you believe this strike was applied in error. Our team reviews all appeals within 48 hours.</div>
                      <textarea
                        value={buyerAppealReason}
                        onChange={e => setBuyerAppealReason(e.target.value)}
                        placeholder="Describe what happened and why this strike should be removed..."
                        rows={5}
                        style={{ width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
                      />
                      {buyerAppealError && <div style={{ color: 'var(--accent-red)', fontSize: '11px', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>{buyerAppealError}</div>}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setBuyerAppealModal(null)} style={{ flex: 1, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
                        <button disabled={!buyerAppealReason.trim() || buyerAppealSubmitting} onClick={async () => {
                          setBuyerAppealSubmitting(true)
                          setBuyerAppealError(null)
                          try {
                            const res = await fetch('/api/strikes/appeal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ strike_id: buyerAppealModal.strikeId, reason: buyerAppealReason }) })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data.error || 'Failed')
                            setBuyerAppealDone(p => ({ ...p, [buyerAppealModal.strikeId]: true }))
                            setBuyerAppealModal(null)
                            await fetchData()
                          } catch (err) {
                            setBuyerAppealError(err.message)
                          } finally {
                            setBuyerAppealSubmitting(false)
                          }
                        }} style={{ flex: 2, background: buyerAppealReason.trim() && !buyerAppealSubmitting ? 'var(--teal)' : 'var(--bg-3)', border: 'none', color: buyerAppealReason.trim() && !buyerAppealSubmitting ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', padding: '10px', borderRadius: '8px', cursor: buyerAppealReason.trim() && !buyerAppealSubmitting ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600 }}>
                          {buyerAppealSubmitting ? 'Submitting…' : 'Submit Appeal'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ACCOUNT */}
          {activeSection === 'account' && (
            <AccountSection user={user} profile={profile} supabase={supabase} btn={btn} />
          )}

        </main>
      </div>
    </div>
  )
}

function AccountSection({ user, profile, supabase, btn }) {
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')
  const [error, setError]         = useState('')
  const [form, setForm]           = useState({
    full_name: profile?.full_name || '',
    street1:   profile?.street1   || '',
    street2:   profile?.street2   || '',
    city:      profile?.city      || '',
    state:     profile?.state     || '',
    zip:       profile?.zip       || '',
  })

  const inputStyle = { width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 500 }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('users')
      .update({
        full_name: form.full_name.trim(),
        street1:   form.street1.trim(),
        street2:   form.street2.trim() || null,
        city:      form.city.trim(),
        state:     form.state.trim().toUpperCase(),
        zip:       form.zip.trim(),
      })
      .eq('id', user.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaveMsg('Saved')
    setEditing(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>
        My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Account</em>
      </div>

      {/* Profile info */}
      <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px', fontWeight: 500 }}>Profile</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Username',  val: profile?.username || '—' },
            { label: 'Email',     val: user?.email || '—' },
            { label: 'Member since', val: profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
            { label: 'Buyer tier',  val: profile?.seller_tier ? profile.seller_tier.charAt(0).toUpperCase() + profile.seller_tier.slice(1) : 'New' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '10px', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.label}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping address */}
      <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>Shipping Address</div>
          {!editing && <button onClick={() => setEditing(true)} style={btn({ fontSize: '11px', padding: '5px 12px' })}>Edit</button>}
        </div>

        {!editing ? (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            {profile?.full_name && <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile.full_name}</div>}
            {profile?.street1
              ? <>
                  <div>{profile.street1}{profile.street2 ? `, ${profile.street2}` : ''}</div>
                  <div>{profile.city}, {profile.state} {profile.zip}</div>
                  <div>United States</div>
                </>
              : <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>No address on file — add one so we can generate shipping labels.</div>
            }
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Street Address</label>
              <input type="text" value={form.street1} onChange={e => setForm(f => ({ ...f, street1: e.target.value }))} placeholder="123 Main St" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Apt, Suite <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={form.street2} onChange={e => setForm(f => ({ ...f, street2: e.target.value }))} placeholder="Apt 4B" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>State</label>
                <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2) }))} placeholder="NY" maxLength={2} style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={labelStyle}>ZIP Code</label>
                <input type="text" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value.replace(/[^0-9-]/g, '').slice(0, 10) }))} placeholder="10001" style={inputStyle} />
              </div>
            </div>
            {error && <div style={{ fontSize: '12px', color: 'var(--accent-red)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={handleSave} disabled={saving} style={{ background: 'var(--teal)', border: 'none', color: '#0A0A0B', padding: '10px 24px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? 'Saving...' : 'Save Address'}
              </button>
              <button onClick={() => { setEditing(false); setError('') }} style={btn({ padding: '10px 16px' })}>Cancel</button>
            </div>
          </div>
        )}
        {saveMsg && <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '10px' }}>✓ {saveMsg}</div>}
      </div>
    </div>
  )
}
