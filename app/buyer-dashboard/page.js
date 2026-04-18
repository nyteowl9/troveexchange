'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'
import ChatModal from '@/app/components/ChatModal'
import { useWalletConnection } from '@/app/components/ConnectWallet'
import { useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow'

const ACTIVE_STATUSES = ['awaiting_shipment', 'in_transit', 'auth_review', 'auth_passed', 'delivered', 'inspection_window', 'disputed']

const STATUS_MAP = {
  awaiting_shipment:{ key: 'awaiting',     label: 'Awaiting Shipment',   steps: [true,  false, false, false, false], activeStep: 0 },
  in_transit:       { key: 'shipped',      label: 'In Transit',          steps: [true,  true,  false, false, false], activeStep: 1 },
  auth_review:      { key: 'auth',         label: 'Authenticating',      steps: [true,  true,  true,  false, false], activeStep: 2 },
  auth_passed:      { key: 'auth',         label: 'Auth Passed',         steps: [true,  true,  true,  false, false], activeStep: 2 },
  delivered:        { key: 'auto-release', label: 'Delivered',           steps: [true,  true,  true,  true,  false], activeStep: 3 },
  inspection_window:{ key: 'auto-release', label: 'Auto-Release Window', steps: [true,  true,  true,  true,  false], activeStep: 3 },
  disputed:         { key: 'disputed',     label: 'Disputed',            steps: [true,  true,  true,  true,  false], activeStep: 3 },
  released:         { key: 'complete',     label: 'Complete',            steps: [true,  true,  true,  true,  true],  activeStep: 4 },
}

const STATUS_COLORS = {
  awaiting:     { bg: 'rgba(232,168,56,0.1)',  border: 'rgba(232,168,56,0.3)',  color: 'var(--accent-amber)' },
  'auto-release':{ bg: 'rgba(232,168,56,0.1)', border: 'rgba(232,168,56,0.3)', color: 'var(--accent-amber)' },
  auth:         { bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.28)', color: 'var(--gold)' },
  shipped:      { bg: 'rgba(60,125,200,0.1)',  border: 'rgba(60,125,200,0.3)',  color: 'var(--accent-blue)' },
  disputed:     { bg: 'rgba(200,75,60,0.1)',   border: 'rgba(200,75,60,0.3)',   color: 'var(--accent-red)' },
  complete:     { bg: 'rgba(76,175,124,0.1)',  border: 'rgba(76,175,124,0.3)',  color: 'var(--accent-green)' },
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
  const [chatOrder, setChatOrder]         = useState(null) // { id, label }
  const [releasingId, setReleasingId]     = useState(null) // order ID currently being released
  const [releaseError, setReleaseError]   = useState(null)
  const [releaseStatus, setReleaseStatus] = useState(null) // step message during on-chain release

  // Dispute form state
  const [disputeOrderId, setDisputeOrderId]           = useState('')
  const [disputeReason, setDisputeReason]             = useState('Card does not match listing description')
  const [disputeDescription, setDisputeDescription]   = useState('')
  const [disputeSubmitting, setDisputeSubmitting]     = useState(false)
  const [disputeError, setDisputeError]               = useState(null)
  const [disputeSuccess, setDisputeSuccess]           = useState(false)

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
      const [activeRes, histRes, dispRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`id, status, escrow_amount, auth_tier, tracking_a, tracking_b, shipped_at, delivered_at, auto_release_at, created_at, onchain_order_id,
                   listing:listing_id (id, card_name, game, set, grade, grader, photos, price),
                   seller:seller_id (id, username, seller_tier)`)
          .eq('buyer_id', user.id)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select(`id, status, escrow_amount, released_at, created_at,
                   listing:listing_id (id, card_name, game, set, grade, grader, photos)`)
          .eq('buyer_id', user.id)
          .eq('status', 'released')
          .order('released_at', { ascending: false })
          .limit(50),
        supabase
          .from('disputes')
          .select(`id, reason, outcome, created_at,
                   order:order_id (id, listing:listing_id (card_name, set))`)
          .eq('raised_by', user.id)
          .order('created_at', { ascending: false }),
      ])
      setActiveOrders(activeRes.data || [])
      setHistoryOrders(histRes.data || [])
      setDisputes(dispRes.data || [])
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
        const tx = await escrowContract.releaseEscrow(order.onchain_order_id)
        setReleaseStatus('Submitted — waiting for block confirmation…')
        await tx.wait()
        setReleaseStatus(null)
      }

      // DB update + emails
      const res = await fetch('/api/orders/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
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
    if (!disputeOrderId) {
      setDisputeError('Please select an order.')
      return
    }
    const order = inspectionOrders.find(o => o.id === disputeOrderId)
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
        const tx = await escrowContract.openDispute(order.onchain_order_id)
        await tx.wait()
        onchainTxHash = tx.hash
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open dispute')

      setDisputeSuccess(true)
      setDisputeDescription('')
      await fetchData()
    } catch (err) {
      setDisputeError(err?.reason || err?.message || 'Failed to open dispute')
    } finally {
      setDisputeSubmitting(false)
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
  const tierLabel  = TIER_LABEL[profile?.tier] || 'New'
  const inspectionOrders = activeOrders.filter(o => o.status === 'inspection_window')
  const navBadge   = (key) => {
    if (key === 'active')     return activeOrders.length || null
    if (key === 'inspection') return inspectionOrders.length || null
    if (key === 'history')    return null
    if (key === 'disputes')   return disputes.filter(d => !d.outcome).length || null
    return null
  }

  const navItems = [
    { id: 'overview',      icon: '◈', label: 'Dashboard' },
    { id: 'notifications', icon: '◉', label: 'Notifications' },
    { id: 'active',        icon: '⇄', label: 'Active Purchases',  badgeColor: 'var(--accent-amber)' },
    { id: 'inspection',    icon: '⏱', label: 'Auto-Release',      badgeColor: 'var(--accent-red)' },
    { id: 'watchlist',     icon: '♡', label: 'Watchlist' },
    { id: 'offers',        icon: '◆', label: 'My Offers' },
    { id: 'history',       icon: '◎', label: 'Purchase History' },
    { id: 'disputes',      icon: '⚠', label: 'Disputes',           badgeColor: 'var(--accent-red)' },
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
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '2px' }}>{card?.card_name || '—'}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{card?.game}{card?.set ? ` · ${card.set}` : ''} · {shortId(order.id)}</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 500, flexShrink: 0 }}>{sm.label}</span>
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: 'var(--gold)', textAlign: 'right' }}>{fmtUSD(order.escrow_amount)}</div>
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
          </div>
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
                  <button onClick={() => { setDisputeOrderId(order.id); setActiveSection('disputes') }} style={btn({ border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)' })}>Raise Dispute</button>
                  {releasingId === order.id && releaseStatus && <div style={{ width: '100%', fontSize: '11px', color: 'var(--accent-amber)', marginTop: '4px', fontFamily: 'DM Mono, monospace' }}>{releaseStatus}</div>}
                  {releaseError && releasingId === null && <div style={{ width: '100%', fontSize: '11px', color: 'var(--accent-red)', marginTop: '4px' }}>{releaseError}</div>}
                </>
              )
            })()}
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
          orderId={chatOrder.id}
          orderLabel={chatOrder.label}
          onClose={() => setChatOrder(null)}
        />
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
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>{profile?.rep_score?.toFixed(2) ?? '—'}</div>
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
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)' }}>Welcome back, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{profile?.username || 'Collector'}</em></div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{tierLabel} Buyer · {historyOrders.length} purchases · Member since {fmtDate(profile?.joined_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href="/marketplace" style={{ textDecoration: 'none' }}>
                    <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Marketplace</button>
                  </Link>
                </div>
              </div>

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
                          <button onClick={() => setActiveSection('disputes')} style={{ background: 'transparent', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '10px 20px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Something is Wrong — Dispute</button>
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
                  { label: 'Buyer Rating',  val: profile?.rep_score?.toFixed(2) ?? '—', sub: `${disputes.length} disputes`,         color: 'var(--teal)' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, lineHeight: 1, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontFamily: 'DM Mono, monospace' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Active Orders Preview */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Orders</em></div>
                {activeOrders.length > 2 && <button onClick={() => setActiveSection('active')} style={{ fontSize: '11px', color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>View all →</button>}
              </div>
              {dataLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>Loading orders…</div>
              ) : activeOrders.length === 0 ? (
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🃏</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '6px' }}>No active orders</div>
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
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Active <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Purchases</em></div>
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
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Auto-Release <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Window</em></div>
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
                              <span style={{ color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : 'var(--text-primary)', fontFamily: row.gold ? 'Cormorant Garamond, serif' : 'inherit', fontSize: row.gold ? '17px' : '13px', fontWeight: 500 }}>{row.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleRelease(order)} disabled={releasingId === order.id} style={{ background: 'var(--accent-green)', border: 'none', color: '#fff', padding: '14px 28px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: releasingId === order.id ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: releasingId === order.id ? 0.6 : 1 }}>
                          {releasingId === order.id ? 'Releasing…' : '✓ Release Funds Early — Everything is Good'}
                        </button>
                        <button onClick={() => setActiveSection('disputes')} style={{ background: 'transparent', border: '1.5px solid rgba(200,75,60,0.4)', color: 'var(--accent-red)', padding: '14px 28px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>⚠ Something is Wrong — Raise Dispute</button>
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
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Watchlist</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'DM Mono, monospace' }}>Price alerts coming in Phase 3</div>
                </div>
                <Link href="/marketplace" style={{ textDecoration: 'none' }}>
                  <button style={btn({ background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', fontWeight: 600 })}>Browse Cards</button>
                </Link>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>♡</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Watchlist coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>Save cards, get price drop alerts, and track market movement. Available at public launch.</div>
              </div>
            </div>
          )}

          {/* OFFERS — Phase 3 */}
          {activeSection === 'offers' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>My <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Offers</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Offer system coming in Phase 3</div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>◆</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Make Offers coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>Counter-offer and negotiation tools are planned for public launch.</div>
              </div>
            </div>
          )}

          {/* PURCHASE HISTORY */}
          {activeSection === 'history' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}>Purchase <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>History</em></div>
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
                        {['Card', 'Grade', 'Paid', 'Date'].map((h, i) => (
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
                                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{order.listing?.card_name || '—'}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '1px' }}>{order.listing?.set || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {order.listing?.grade ? (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 9px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', color: 'var(--gold)', fontWeight: 500 }}>{order.listing.grader} {order.listing.grade}</span>
                            ) : <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Raw</span>}
                          </td>
                          <td style={{ padding: '13px 16px', fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', fontWeight: 600, color: 'var(--gold)' }}>{fmtUSD(order.escrow_amount)}</td>
                          <td style={{ padding: '13px 16px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{fmtDate(order.released_at)}</td>
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
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)' }}><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Notifications</em></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>Email notifications active — in-app alerts coming in Phase 3</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>◉</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>In-app notifications coming in Phase 3</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>You're receiving order updates by email. Real-time alerts will be added at public launch.</div>
              </div>
            </div>
          )}

          {/* DISPUTES */}
          {activeSection === 'disputes' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '6px' }}>Raise a <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Dispute</em></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'DM Mono, monospace' }}>Only open a dispute if there is a genuine issue with your order</div>

              {/* Existing disputes */}
              {disputes.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '12px' }}>Your Disputes</div>
                  {disputes.map((d) => (
                    <div key={d.id} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '14px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: 'var(--text-primary)' }}>{d.order?.listing?.card_name || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>{d.reason} · Opened {fmtDate(d.created_at)}</div>
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: d.outcome ? 'rgba(76,175,124,0.1)' : 'rgba(232,168,56,0.1)', border: `1px solid ${d.outcome ? 'rgba(76,175,124,0.3)' : 'rgba(232,168,56,0.3)'}`, color: d.outcome ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 500 }}>{d.outcome ? d.outcome : 'Under Review'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* New dispute form — only if there's an eligible order */}
              {inspectionOrders.length > 0 ? (
                <div style={{ background: 'rgba(200,75,60,0.05)', border: '1.5px solid rgba(200,75,60,0.25)', borderRadius: '12px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚠</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Open Dispute</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inspectionOrders.length} order{inspectionOrders.length > 1 ? 's' : ''} in inspection window</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {['You submit your dispute with photos and description', 'A $25 dispute bond is deducted — returned if you win', 'Seller has 48hrs to respond with their evidence', 'Chase Hollow reviews both sides within 72hrs', 'Win: full refund + bond returned. Lose: funds release to seller, forfeit $25 bond'].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(200,75,60,0.1)', border: '1px solid rgba(200,75,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-red)', flexShrink: 0, fontWeight: 500 }}>{i + 1}</div>
                        {step}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.6, marginBottom: '20px' }}>⚠ Only raise a dispute if there is a genuine problem. False disputes result in losing your $25 bond and a negative mark on your buyer reputation.</div>
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
                <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>No orders currently eligible for dispute. Orders can be disputed during the 72-hour inspection window after delivery.</div>
              )}
            </div>
          )}

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
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>
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
            { label: 'Buyer tier',  val: profile?.tier ? profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1) : 'New' },
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
