'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ethers } from 'ethers'
import { useWalletConnection } from '@/app/components/ConnectWallet'
import { supabase } from '@/lib/supabase'
import { ESCROW_ADDRESS, USDC_ADDRESS, USDC_ABI, ESCROW_ABI, calcSellerBond } from '@/lib/escrow'

// useSearchParams() requires a Suspense boundary in Next.js App Router
export default function CheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  )
}

function Checkout() {
  const [theme, setTheme] = useState('dark')
  const [step, setStep] = useState(1)
  const [ack1, setAck1] = useState(false)
  const [ack2, setAck2] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signingStatus, setSigningStatus] = useState('Waiting for wallet confirmation...')
  const [alreadyAcknowledged, setAlreadyAcknowledged] = useState(false)
  const [listing, setListing] = useState(null)
  const [listingLoading, setListingLoading] = useState(true)

  // Blockchain state
  const [usdcBalance, setUsdcBalance]       = useState(null)
  const [shippingFee, setShippingFee]       = useState(null)
  const [labelACost, setLabelACost]         = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [txHash, setTxHash]                 = useState(null)
  const [supabaseOrderId, setSupabaseOrderId] = useState(null)
  const [checkoutError, setCheckoutError]   = useState(null)

  // Buyer address state
  const [buyerAddress, setBuyerAddress]     = useState(null)
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressEditing, setAddressEditing] = useState(false)
  const [addressSaving, setAddressSaving]   = useState(false)
  const [addressError, setAddressError]     = useState(null)
  const [addressForm, setAddressForm]       = useState({ street1: '', city: '', state: '', zip: '', country: 'US' })

  const { walletAddress, wallet, connect } = useWalletConnection()
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listing_id')

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    const ack = localStorage.getItem('ch-buyer-ack') === 'true'
    setAlreadyAcknowledged(ack)
    if (ack) { setAck1(true); setAck2(true) }
  }, [])

  useEffect(() => {
    if (!listingId) { setListingLoading(false); return }
    Promise.all([
      supabase.from('listings').select(`*, seller:seller_id (id, username, full_name, seller_tier, rep_score, wallet_address)`).eq('id', listingId).eq('status', 'active').single(),
      supabase.auth.getUser(),
    ]).then(([{ data }, { data: { user } }]) => {
      if (data && user && data.seller_id === user.id) {
        window.location.href = '/seller-dashboard'
        return
      }
      setListing(data)
      setListingLoading(false)
    })
  }, [listingId])

  // Step 2: load buyer address + USDC balance + shipping estimate in parallel
  useEffect(() => {
    if (step !== 2 || !wallet || !listingId || !listing) return
    setBalanceLoading(true)
    setAddressLoading(true)
    setCheckoutError(null)

    async function fetchStep2Data() {
      // Load buyer address from profile
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from('users')
          .select('street1, city, state, zip, country, full_name')
          .eq('id', user.id)
          .single()
        if (profile) {
          setBuyerAddress(profile)
          setAddressForm({
            street1: profile.street1 || '',
            city:    profile.city    || '',
            state:   profile.state   || '',
            zip:     profile.zip     || '',
            country: profile.country || 'US',
          })
          if (!profile.street1 || !profile.city || !profile.zip) setAddressEditing(true)
        } else {
          setAddressEditing(true)
        }
      } catch {
        setAddressEditing(true)
      }
      setAddressLoading(false)

      // USDC balance on Base
      try {
        const eip1193 = await wallet.getEthereumProvider()
        const chainHex = '0x' + (parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453')).toString(16)
        await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] }).catch(() => {})
        const provider = new ethers.BrowserProvider(eip1193)
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
        const bal = await usdcContract.balanceOf(walletAddress)
        setUsdcBalance(bal)
      } catch {
        setUsdcBalance(null)
      }

      // Shipping estimate
      await doFetchShipping()

      setBalanceLoading(false)
    }

    fetchStep2Data()
  }, [step, wallet, listingId, listing, walletAddress])

  async function doFetchShipping() {
    try {
      const res = await fetch('/api/checkout/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })
      const est = await res.json()
      setShippingFee(est.shipping_fee ?? 8)
      setLabelACost(est.label_a_cost ?? 0)
    } catch {
      setShippingFee(8)
      setLabelACost(listing?.price > 300 ? 12 : 0)
    }
  }

  async function saveAddress() {
    if (!addressForm.street1 || !addressForm.city || !addressForm.zip) return
    setAddressSaving(true)
    setAddressError(null)
    try {
      // Validate with Shippo before saving — catch ambiguous addresses at entry time
      const vRes = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street1: addressForm.street1.trim(),
          city:    addressForm.city.trim(),
          state:   addressForm.state.trim(),
          zip:     addressForm.zip.trim(),
          country: addressForm.country || 'US',
        }),
      })
      const vData = await vRes.json()
      if (!vData.valid && vData.messages?.length) {
        // Block save and surface the carrier's exact message
        setAddressError(vData.messages.join(' · '))
        setAddressSaving(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('users').update({
        street1: addressForm.street1.trim(),
        city:    addressForm.city.trim(),
        state:   addressForm.state.trim(),
        zip:     addressForm.zip.trim(),
        country: addressForm.country || 'US',
      }).eq('id', user.id)
      const updated = { ...buyerAddress, ...addressForm }
      setBuyerAddress(updated)
      setAddressEditing(false)
      // Re-fetch shipping with updated address
      setBalanceLoading(true)
      await doFetchShipping()
      setBalanceLoading(false)
    } catch (err) {
      console.error('Failed to save address', err)
    }
    setAddressSaving(false)
  }

  // Derived price data
  const cardPrice     = listing?.price ?? 0
  const authTier      = cardPrice <= 300 ? 'remote' : 'physical'
  const authFee       = authTier === 'remote' ? 10 : 25
  const salesTax      = 0  // TaxJar deferred to ~$50k GMV
  const platformFee   = parseFloat((cardPrice * 0.03).toFixed(2))
  const creatorFee    = parseFloat((cardPrice * 0.005).toFixed(2))
  const labelACostVal = labelACost ?? (cardPrice > 300 ? 12 : 0)
  const shippingFeeVal = shippingFee ?? 8
  const sellerPayout  = parseFloat((cardPrice - platformFee - creatorFee - labelACostVal).toFixed(2))
  // Tier 2 (physical): both Label A and Label B are funded through escrow so the Safe can pay for both.
  // Label A is already deducted from sellerPayout; adding it to shippingFee here ensures it reaches the Safe.
  const shippingFeeForDisplay = authTier === 'physical' ? labelACostVal + shippingFeeVal : shippingFeeVal
  const escrowTotal   = parseFloat((sellerPayout + platformFee + creatorFee + authFee + shippingFeeForDisplay + salesTax).toFixed(2))
  const total         = escrowTotal.toFixed(2)

  // Display total — clean until shipping is known
  const shippingKnown = shippingFee !== null && !balanceLoading
  const displayTotal  = shippingKnown
    ? escrowTotal.toFixed(2)
    : parseFloat(cardPrice + authFee).toFixed(2)

  const sellerName = listing?.seller?.username || '—'
  const sellerTier = listing?.seller?.tier || 'new'
  const sellerRep  = listing?.seller?.rep_score
  const usdcBalanceFormatted = usdcBalance !== null
    ? parseFloat(ethers.formatUnits(usdcBalance, 6)).toFixed(2)
    : null
  const hasSufficientBalance = usdcBalance !== null
    ? usdcBalance >= ethers.parseUnits(displayTotal, 6)
    : true

  const addressConfirmed = !addressEditing && !addressLoading &&
    buyerAddress?.street1 && buyerAddress?.city && buyerAddress?.zip

  const canContinueStep2 = addressConfirmed && !balanceLoading && hasSufficientBalance

  const goToStep = (n) => { setStep(n); window.scrollTo(0, 0) }

  const handleSign = async () => {
    setSigning(true)
    setCheckoutError(null)

    try {
      if (!wallet) throw new Error('No wallet connected')
      if (!listing?.seller?.wallet_address) throw new Error('Seller wallet address not found')

      setSigningStatus('Connecting to wallet...')
      const eip1193 = await wallet.getEthereumProvider()

      const chainHex = '0x' + (parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453')).toString(16)
      try {
        await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] })
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          const isTestnet = chainHex === '0x' + (84532).toString(16)
          await eip1193.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainHex,
              chainName: isTestnet ? 'Base Sepolia' : 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: [isTestnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org'],
              blockExplorerUrls: [isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org'],
            }],
          })
        } else {
          throw new Error('Please switch your wallet to the Base network to continue.')
        }
      }

      const provider = new ethers.BrowserProvider(eip1193)
      const signer = await provider.getSigner()

      const u = (n) => ethers.parseUnits(parseFloat(n).toFixed(6), 6)
      const onchainOrderId = ethers.hexlify(ethers.randomBytes(32))

      const cardPriceU    = u(cardPrice)
      const platformFeeU  = cardPriceU * 300n / 10000n
      const creatorFeeU   = cardPriceU * 50n / 10000n
      const labelACostU   = u(labelACostVal)
      const authFeeU      = u(authFee)
      const shippingFeeU  = u(shippingFeeVal)
      const salesTaxU     = u(salesTax)
      // Tier 2: shippingFee sent to contract = Label A + Label B so the Safe receives both.
      // Label A is already deducted from sellerPayout; this ensures it reaches the Safe on release.
      const shippingFeeForContractU = authTier === 'physical' ? labelACostU + shippingFeeU : shippingFeeU
      const sellerPayoutU = cardPriceU - platformFeeU - creatorFeeU - labelACostU
      const escrowAmountU = sellerPayoutU + platformFeeU + creatorFeeU + authFeeU + shippingFeeForContractU + salesTaxU
      const sellerBondUSD = calcSellerBond(cardPrice, sellerTier)
      const sellerBondU   = u(sellerBondUSD)

      setSigningStatus('Step 1 of 2 — Approve USDC spend · confirm in wallet...')
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer)
      const approveTx = await usdcContract.approve(ESCROW_ADDRESS, escrowAmountU)
      setSigningStatus('Approval submitted — waiting for confirmation...')
      await approveTx.wait()

      // Verify allowance is actually set — Sepolia RPC can lag a block behind
      let allowanceConfirmed = false
      for (let i = 0; i < 5; i++) {
        const allowance = await usdcContract.allowance(walletAddress, ESCROW_ADDRESS)
        if (allowance >= escrowAmountU) { allowanceConfirmed = true; break }
        await new Promise(r => setTimeout(r, 1000))
      }
      if (!allowanceConfirmed) throw new Error('USDC approval did not confirm. Please try again.')

      // Resolve creator wallet from attribution cookie (server-side read, never blocks checkout)
      let creatorWallet = ethers.ZeroAddress
      try {
        const cwRes = await fetch('/api/referral/creator-wallet')
        const cwData = await cwRes.json()
        if (cwData.wallet && ethers.isAddress(cwData.wallet)) {
          creatorWallet = cwData.wallet
        }
      } catch { /* no-op — falls back to ZeroAddress */ }

      setSigningStatus('Step 2 of 2 — Lock USDC in escrow · confirm in wallet...')
      const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
      const fundTx = await escrowContract.fundOrder(
        onchainOrderId,
        listing.seller.wallet_address,
        creatorWallet,
        escrowAmountU,
        sellerBondU,
        platformFeeU,
        creatorFeeU,
        authFeeU,
        shippingFeeForContractU,
        salesTaxU,
        sellerPayoutU,
      )
      setSigningStatus('Transaction submitted — waiting for block confirmation...')
      await fundTx.wait()
      setSigningStatus('Confirmed on Base ✓')

      const { data: { user: buyer } } = await supabase.auth.getUser()
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          listing_id:       listingId,
          buyer_id:         buyer?.id,
          seller_id:        listing?.seller_id,
          auth_tier:        authTier,
          escrow_amount:    parseFloat(ethers.formatUnits(escrowAmountU, 6)),
          platform_fee:     parseFloat(ethers.formatUnits(platformFeeU, 6)),
          creator_fee:      parseFloat(ethers.formatUnits(creatorFeeU, 6)),
          auth_fee:         authFee,
          bond_amount:      sellerBondUSD,
          shipping_cost:    shippingFeeVal,
          sales_tax:        salesTax,
          declared_value:   cardPrice,
          onchain_order_id: onchainOrderId,
          escrow_tx_hash:   fundTx.hash,
          status:           'awaiting_shipment',
          ship_deadline:    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (orderError) throw new Error('Failed to record order: ' + orderError.message)

      await supabase.from('listings').update({ status: 'sold' }).eq('id', listingId)
      fetch('/api/referral/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, sale_amount: cardPrice }),
      }).catch(() => {})

      setTxHash(fundTx.hash)
      setSupabaseOrderId(order.id)
      setSigning(false)
      goToStep(4)

    } catch (err) {
      console.error('[checkout/handleSign]', err)
      const msg = err?.info?.error?.message || err?.message || 'Transaction failed'
      setCheckoutError(msg)
      setSigning(false)
    }
  }

  const handleAck = (which, val) => {
    if (which === 1) setAck1(val)
    if (which === 2) setAck2(val)
    if ((which === 1 ? val : ack1) && (which === 2 ? val : ack2)) {
      localStorage.setItem('ch-buyer-ack', 'true')
      setAlreadyAcknowledged(true)
    }
  }

  const progressSteps = ['Connect', 'Shipping', 'Review & Sign', 'Complete']

  const btn = (extra = {}) => ({
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)', padding: '12px 24px', fontSize: '13px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    cursor: 'pointer', borderRadius: '10px', ...extra
  })

  const inputStyle = {
    width: '100%', background: 'var(--bg-3)', border: '1.5px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)',
    fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
  }

  if (!listingLoading && listingId && !listing) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: 'var(--text-primary)' }}>Listing not found</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>This listing may have sold or been removed.</div>
        <Link href="/marketplace" style={{ color: 'var(--teal)', fontSize: '14px' }}>← Back to marketplace</Link>
      </div>
    )
  }

  if (!listingLoading && listing && !listing.seller?.wallet_address) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: 'var(--text-primary)' }}>Purchase Unavailable</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '420px', lineHeight: 1.7 }}>
          This seller hasn't connected a wallet to their account yet. They need to connect a wallet before they can receive payment.
          <br /><br />
          Check back soon — or <Link href="/customer-support" style={{ color: 'var(--teal)', textDecoration: 'none' }}>contact support</Link> if this listing has been available for a while.
        </div>
        <Link href="/marketplace" style={{ color: 'var(--teal)', fontSize: '14px' }}>← Back to marketplace</Link>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', width: '100%' }}>

      {/* SIGNING OVERLAY */}
      {signing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '20px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--teal-bg)', border: '2px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>🔑</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, marginBottom: '8px', color: 'var(--text-primary)' }}>Sign in Wallet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>Your wallet is asking you to approve the USDC transfer into escrow. Review the details carefully before signing.</div>
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '20px', fontFamily: 'DM Mono, monospace', fontSize: '11px', lineHeight: 2, textAlign: 'left' }}>
              {[
                { label: 'Action', val: 'Lock USDC in Escrow' },
                { label: 'Amount', val: `$${total} USDC`, gold: true },
                { label: 'Contract', val: `${ESCROW_ADDRESS?.slice(0,6)}...${ESCROW_ADDRESS?.slice(-4)} ✓ Verified`, green: true },
                { label: 'Network', val: 'Base (Ethereum L2)' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ color: r.gold ? 'var(--gold)' : r.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: r.gold ? 600 : 400 }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{signingStatus}</div>
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      <div style={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 90, background: 'var(--bg-2)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', padding: '14px 0' }}>
          {progressSteps.map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < progressSteps.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 600, flexShrink: 0, background: done ? 'var(--accent-green)' : active ? 'var(--teal)' : 'var(--bg-4)', color: done || active ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', border: done || active ? 'none' : '1.5px solid var(--border)', transition: 'all 0.3s' }}>{done ? '✓' : n}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: done ? 'var(--accent-green)' : active ? 'var(--teal)' : 'var(--text-muted)', maxWidth: active ? '90px' : '0px', overflow: 'hidden', whiteSpace: 'nowrap', transition: 'max-width 0.3s' }}>{label}</div>
                </div>
                {i < progressSteps.length - 1 && <div style={{ flex: 1, height: '1px', background: done ? 'var(--accent-green)' : 'var(--border)', margin: '0 12px', transition: 'background 0.3s' }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <style>{`
        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; padding: 110px 1rem 40px !important; width: 100% !important; }
          .checkout-sidebar { position: relative !important; top: auto !important; }
        }
      `}</style>
      <div className="checkout-grid" style={{ maxWidth: '1100px', margin: '0 auto', padding: '120px 1.5rem 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '28px', alignItems: 'flex-start' }}>

        {/* STEPS */}
        <div>

          {/* STEP 1 — CONNECT WALLET */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Connect Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Wallet</em></div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>Your USDC lives in your wallet. Connect it to lock funds into escrow — the only movement of money in this transaction.</p>

              {walletAddress ? (
                <div style={{ background: 'rgba(76,175,124,0.06)', border: '1.5px solid rgba(76,175,124,0.35)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(76,175,124,0.1)', border: '1px solid rgba(76,175,124,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>✓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-green)', fontWeight: 500 }}>Wallet Connected</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} · Base Network</div>
                  </div>
                  <button onClick={connect} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-tertiary)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    Switch Wallet
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <button onClick={connect} style={{ width: '100%', background: 'var(--gold)', color: '#0A0A0B', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    Connect Wallet
                  </button>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '10px' }}>
                    MetaMask · Phantom · Coinbase · WalletConnect · Embedded wallet
                  </p>
                </div>
              )}

              <div style={{ background: 'rgba(232,168,56,0.08)', border: '1.5px solid rgba(232,168,56,0.35)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠</span>
                <div><strong style={{ color: 'var(--accent-amber)' }}>Base Network Required</strong> — Chase Hollow only accepts USDC on the Base network (Ethereum L2). When your wallet asks to connect, approve the Base network. Need USDC on Base? <a href="/#wallets" style={{ color: 'var(--teal)', textDecoration: 'none' }}>See our guide →</a></div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link href={listingId ? `/listing/${listingId}` : '/marketplace'} style={{ ...btn(), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← Back to Listing</Link>
                <button onClick={() => goToStep(2)} disabled={!walletAddress} style={{ ...btn({ background: walletAddress ? 'var(--teal)' : 'var(--bg-4)', border: 'none', color: walletAddress ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', fontWeight: 600, opacity: walletAddress ? 1 : 0.5, cursor: walletAddress ? 'pointer' : 'not-allowed' }) }}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 2 — SHIPPING ADDRESS + USDC BALANCE */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Confirm <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Shipping Address</em></div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>We'll ship your card here. Confirm it's correct before we calculate your final shipping cost.</p>

              {/* ADDRESS CARD */}
              <div style={{ background: 'var(--bg-2)', border: `1.5px solid ${addressConfirmed ? 'rgba(76,175,124,0.4)' : 'var(--border)'}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: addressConfirmed ? 'var(--accent-green)' : 'var(--text-muted)', marginBottom: '14px', fontWeight: 500 }}>
                  {addressLoading ? 'Loading address…' : addressConfirmed ? '✓ Delivery Address' : 'Enter Delivery Address'}
                </div>

                {addressLoading ? (
                  <div style={{ height: '60px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Loading your saved address…
                  </div>
                ) : addressEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      placeholder="Street address (include apt/unit if applicable)"
                      value={addressForm.street1}
                      onChange={e => { setAddressForm({ ...addressForm, street1: e.target.value }); setAddressError(null) }}
                      style={inputStyle}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input
                        placeholder="City"
                        value={addressForm.city}
                        onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        placeholder="State (e.g. TX)"
                        value={addressForm.state}
                        onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input
                        placeholder="ZIP code"
                        value={addressForm.zip}
                        onChange={e => setAddressForm({ ...addressForm, zip: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        placeholder="Country"
                        value={addressForm.country}
                        onChange={e => setAddressForm({ ...addressForm, country: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    {addressError && (
                      <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.35)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-red)', lineHeight: 1.6 }}>
                        Address issue: {addressError}<br />
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Try adding a unit/apt number, or check the street name spelling and directional (N/S/E/W).</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      {buyerAddress?.street1 && (
                        <button onClick={() => { setAddressEditing(false); setAddressError(null) }} style={btn({ padding: '10px 18px', fontSize: '12px' })}>Cancel</button>
                      )}
                      <button
                        onClick={saveAddress}
                        disabled={!addressForm.street1 || !addressForm.city || !addressForm.zip || addressSaving}
                        style={btn({
                          background: (addressForm.street1 && addressForm.city && addressForm.zip && !addressSaving) ? 'var(--teal)' : 'var(--bg-4)',
                          border: 'none',
                          color: (addressForm.street1 && addressForm.city && addressForm.zip && !addressSaving) ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)',
                          fontWeight: 600,
                          opacity: (addressForm.street1 && addressForm.city && addressForm.zip && !addressSaving) ? 1 : 0.5,
                          cursor: (addressForm.street1 && addressForm.city && addressForm.zip && !addressSaving) ? 'pointer' : 'not-allowed',
                          padding: '10px 18px', fontSize: '12px', flex: 1,
                        })}
                      >
                        {addressSaving ? 'Saving…' : 'Save & Calculate Shipping'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.8 }}>
                      <div>{buyerAddress?.street1}</div>
                      <div>{buyerAddress?.city}{buyerAddress?.state ? `, ${buyerAddress.state}` : ''} {buyerAddress?.zip}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{buyerAddress?.country || 'US'}</div>
                    </div>
                    <button
                      onClick={() => setAddressEditing(true)}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '6px 14px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* USDC BALANCE CARD — shown once address is confirmed and shipping is loading/loaded */}
              {!addressLoading && !addressEditing && (
                <div style={{ background: hasSufficientBalance ? 'rgba(76,175,124,0.04)' : 'rgba(200,75,60,0.04)', border: `1.5px solid ${hasSufficientBalance ? 'rgba(76,175,124,0.4)' : 'rgba(200,75,60,0.4)'}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: hasSufficientBalance ? 'rgba(76,175,124,0.1)' : 'rgba(200,75,60,0.1)', border: `1px solid ${hasSufficientBalance ? 'rgba(76,175,124,0.3)' : 'rgba(200,75,60,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      {balanceLoading ? '…' : hasSufficientBalance ? '✓' : '✗'}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: hasSufficientBalance ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>
                        {balanceLoading ? 'Checking balance…' : hasSufficientBalance ? 'Sufficient Balance Detected' : 'Insufficient USDC Balance'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: '2px' }}>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)} · Base Network</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '40px', fontWeight: 300, lineHeight: 1, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {balanceLoading ? '…' : usdcBalanceFormatted !== null ? `$${parseFloat(usdcBalanceFormatted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: '14px' }}>USDC available on Base</div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { label: 'Card price', val: `$${cardPrice.toLocaleString()}` },
                      { label: `Auth fee (${authTier === 'remote' ? 'Remote Photo' : 'Physical'})`, val: `$${authFee}` },
                      { label: 'Shipping & insurance', val: balanceLoading ? 'Calculating…' : shippingKnown ? `~$${shippingFeeVal.toFixed(2)}` : 'Est. at checkout' },
                      { label: shippingKnown ? 'Total to lock in escrow' : 'Subtotal (excl. shipping)', val: `$${displayTotal} USDC`, total: true },
                      { label: 'Remaining after purchase', val: usdcBalanceFormatted !== null ? `$${Math.max(0, parseFloat(usdcBalanceFormatted) - parseFloat(displayTotal)).toFixed(2)} USDC` : '—', green: true },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: row.total ? '6px' : '0', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0' }}>
                        <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: row.total ? 'var(--accent-green)' : row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: row.total ? 600 : 400 }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasSufficientBalance && usdcBalanceFormatted !== null && (
                <div style={{ background: 'rgba(200,75,60,0.06)', border: '1px solid rgba(200,75,60,0.3)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--accent-red)', marginBottom: '16px', lineHeight: 1.6 }}>
                  You need ${displayTotal} USDC on Base to complete this purchase. <a href="/#wallets" style={{ color: 'var(--teal)', textDecoration: 'none' }}>How to get USDC on Base →</a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => goToStep(1)} style={btn()}>← Back</button>
                <button
                  onClick={() => goToStep(3)}
                  disabled={!canContinueStep2}
                  style={btn({ background: canContinueStep2 ? 'var(--teal)' : 'var(--bg-4)', border: 'none', color: canContinueStep2 ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', fontWeight: 600, opacity: canContinueStep2 ? 1 : 0.5, cursor: canContinueStep2 ? 'pointer' : 'not-allowed' })}
                >
                  {balanceLoading ? 'Calculating…' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — REVIEW & SIGN */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: '6px', color: 'var(--text-primary)' }}>Review <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>&amp; Sign</em></div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>Everything about this transaction. Review carefully — the blockchain signature is irreversible.</p>

              {/* Sections */}
              {[
                {
                  title: 'Delivery Address',
                  extra: (
                    <button onClick={() => goToStep(2)} style={{ background: 'transparent', border: 'none', color: 'var(--teal)', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', padding: 0 }}>Edit →</button>
                  ),
                  rows: [
                    { label: 'Ship to', val: `${buyerAddress?.street1 || '—'}, ${buyerAddress?.city || ''}${buyerAddress?.state ? `, ${buyerAddress.state}` : ''} ${buyerAddress?.zip || ''}`.trim() },
                    { label: 'Country', val: buyerAddress?.country || 'US' },
                  ]
                },
                {
                  title: 'Card Details',
                  rows: [
                    { label: 'Card', val: listing ? `${listing.card_name}${listing.set ? ` · ${listing.set}` : ''}` : '—' },
                    { label: 'Grade', val: listing?.grade ? `${listing.grader} ${listing.grade}${listing.cert_number ? ` · Cert #${listing.cert_number}` : ''}` : 'Raw' },
                    { label: 'Seller', val: listing ? `${sellerName} · ${sellerTier.charAt(0).toUpperCase() + sellerTier.slice(1)}${sellerRep ? ` · ${sellerRep.toFixed(2)}★` : ''}` : '—', teal: true },
                    { label: 'Authentication', val: '✓ Yes — verified before delivery', green: true },
                  ]
                },
                {
                  title: 'Payment Breakdown',
                  rows: [
                    { label: 'Card price', val: `$${cardPrice.toLocaleString()}`, gold: true },
                    { label: `Auth fee (${authTier === 'remote' ? 'Remote Photo' : 'Physical'})`, val: `$${authFee}` },
                    { label: 'Shipping & insurance', val: `~$${shippingFeeVal.toFixed(2)}` },
                    { label: 'Total locked in escrow', val: `$${total} USDC`, gold: true, total: true },
                  ]
                },
                {
                  title: 'Delivery & Protection',
                  rows: [
                    { label: 'Auth type', val: authTier === 'remote' ? 'Remote Photo Auth' : 'Physical Auth at Chase Hollow' },
                    { label: 'Seller deadline', val: '48hrs (1 extension available)' },
                    { label: 'If seller misses deadline', val: 'Auto-refund · 100% USDC returned', green: true },
                    { label: authTier === 'remote' ? 'Photo review' : 'Auth window', val: authTier === 'remote' ? 'Reviewed in transit (same day)' : '24–48hrs at Chase Hollow HQ' },
                    { label: 'Auto-release after delivery', val: '72hrs · No action needed' },
                  ]
                }
              ].map((section, si) => (
                <div key={si} style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>{section.title}</div>
                    {section.extra}
                  </div>
                  {section.rows.map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: row.total ? '10px 0 0' : '8px 0', borderBottom: row.total ? 'none' : '0.5px solid var(--border)', borderTop: row.total ? '0.5px solid var(--border)' : 'none', marginTop: row.total ? '4px' : '0', fontSize: '13px' }}>
                      <span style={{ color: row.total ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.total ? 600 : 400 }}>{row.label}</span>
                      <span style={{ fontWeight: 500, color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontFamily: row.total ? 'Cormorant Garamond, serif' : 'inherit', fontSize: row.total ? '20px' : '13px' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Acknowledgment — first time only */}
              {!alreadyAcknowledged && (
                <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '14px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>One-Time Acknowledgment — Never Asked Again</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <input type="checkbox" checked={ack1} onChange={e => handleAck(1, e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--teal)', flexShrink: 0, cursor: 'pointer' }} />
                      <span>I have reviewed all listing photos and understand what I am purchasing — the card name, set, grade, and condition as shown.</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <input type="checkbox" checked={ack2} onChange={e => handleAck(2, e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--teal)', flexShrink: 0, cursor: 'pointer' }} />
                      <span>I understand Chase Hollow verifies the card received matches this listing. The grade is certified by <strong style={{ color: 'var(--text-primary)' }}>PSA, BGS, or CGC</strong> — whose certification I accept as the standard of authenticity.</span>
                    </label>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid var(--teal-border)', lineHeight: 1.6 }}>✓ This acknowledgment is saved — you will not be asked again on future purchases.</div>
                </div>
              )}

              {/* What you're signing */}
              <div style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px', fontWeight: 500 }}>What You're Signing</div>
                {[
                  { label: 'Action', val: 'Lock USDC in escrow smart contract', green: true },
                  { label: 'Amount', val: `$${total} USDC`, gold: true },
                  { label: 'Contract', val: `${ESCROW_ADDRESS?.slice(0,6)}...${ESCROW_ADDRESS?.slice(-4)} · Verified ✓`, teal: true },
                  { label: 'Network', val: 'Base (Ethereum L2)' },
                  { label: 'Gas fee', val: '~$0.04 ETH' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: i < 4 ? '0.5px solid var(--teal-border)' : 'none' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontWeight: 500, color: row.gold ? 'var(--gold)' : row.teal ? 'var(--teal)' : row.green ? 'var(--accent-green)' : 'var(--text-primary)', fontFamily: row.gold ? 'Cormorant Garamond, serif' : 'inherit', fontSize: row.gold ? '20px' : '13px' }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Escrow explainer */}
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    'Funds go to escrow — not to us, not to the seller yet',
                    'Auto-refund if seller misses 48hr shipping deadline',
                    authTier === 'remote' ? 'Card photo-authenticated by staff during transit' : 'Card physically authenticated by experts before it reaches you',
                    '72hr inspection window after delivery — dispute if needed',
                    'Transaction recorded permanently on Base blockchain',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✓</span>{item}
                    </div>
                  ))}
                </div>
              </div>

              {checkoutError && (
                <div style={{ background: 'rgba(200,75,60,0.08)', border: '1px solid rgba(200,75,60,0.35)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--accent-red)', marginBottom: '14px', lineHeight: 1.6 }}>
                  Transaction failed — {checkoutError}
                </div>
              )}

              <button
                onClick={handleSign}
                disabled={!alreadyAcknowledged && (!ack1 || !ack2)}
                style={{ width: '100%', background: (alreadyAcknowledged || (ack1 && ack2)) ? 'var(--teal)' : 'var(--bg-4)', border: 'none', color: (alreadyAcknowledged || (ack1 && ack2)) ? (theme === 'dark' ? '#0A0A0B' : '#fff') : 'var(--text-muted)', padding: '18px', fontSize: '16px', fontWeight: 700, borderRadius: '12px', cursor: (alreadyAcknowledged || (ack1 && ack2)) ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px', opacity: (alreadyAcknowledged || (ack1 && ack2)) ? 1 : 0.5 }}
              >
                🔒 Sign &amp; Lock ${total} USDC in Escrow
              </button>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px', lineHeight: 1.6 }}>Your wallet will open for signature. Gas fee (~$0.04 ETH) paid separately from escrow amount.</div>
              <button onClick={() => goToStep(2)} style={btn()}>← Back</button>
            </div>
          )}

          {/* STEP 4 — SUCCESS */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(76,175,124,0.12)', border: '2px solid rgba(76,175,124,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px' }}>✓</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '44px', fontWeight: 300, marginBottom: '8px', color: 'var(--text-primary)' }}>You're <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Protected</em></div>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 28px' }}>
                ${total} USDC is locked in escrow. {sellerName} has been notified and has 48 hours to ship. You'll receive updates at every step.
              </p>

              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', fontFamily: 'DM Mono, monospace', fontSize: '11px', textAlign: 'left' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>Transaction Hash · On-Chain Confirmation</div>
                <div style={{ color: 'var(--accent-green)', wordBreak: 'break-all', lineHeight: 1.6 }}>{txHash || '—'}</div>
                {txHash && (
                  <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', fontSize: '10px', marginTop: '4px', display: 'block', textDecoration: 'none' }}>View on Basescan →</a>
                )}
              </div>

              {/* Order tracker */}
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, marginBottom: '4px', color: 'var(--text-primary)' }}>Order <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>#{supabaseOrderId?.slice(-6).toUpperCase() || '—'}</em></div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '20px' }}>Live tracking · Updates automatically</div>
                {[
                  { title: 'Escrow Funded', desc: `$${total} USDC locked in smart contract on Base. Transaction confirmed.`, done: true, active: false },
                  { title: 'Awaiting Seller Photos & Shipment', desc: `${sellerName} has been notified. They have 48hrs to${authTier === 'remote' ? ' upload 3 photos and' : ''} ship${authTier === 'physical' ? ' to our authentication center' : ' directly to your address'}.`, done: false, active: true, time: '⏱ Ship deadline: 48hrs from now' },
                  { title: authTier === 'remote' ? 'In Transit · Photo Review' : 'In Transit to Auth Center', desc: authTier === 'remote' ? 'Card en route to you. Staff reviews photos in transit.' : 'Card en route to Chase Hollow authentication center.', done: false, active: false },
                  { title: 'Authentication', desc: 'Expert verifies grade, condition, and cert number match listing exactly.', done: false, active: false },
                  { title: 'Shipped to You', desc: `Card${authTier === 'physical' ? ' ships from auth center' : ' already en route'} to ${buyerAddress?.city ? `${buyerAddress.city}, ${buyerAddress.state}` : 'your address'}.`, done: false, active: false },
                  { title: 'Delivered · Auto-Release', desc: 'Delivery confirmed. 72hr window opens. USDC auto-releases to seller at window close unless you dispute.', done: false, active: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', position: 'relative', paddingBottom: i < 5 ? '18px' : '0' }}>
                    {i < 5 && <div style={{ position: 'absolute', left: '13px', top: '28px', bottom: '0', width: '1.5px', background: s.done ? 'var(--accent-green)' : 'var(--border)' }} />}
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${s.done ? 'var(--accent-green)' : s.active ? 'var(--accent-amber)' : 'var(--border)'}`, background: s.done ? 'var(--accent-green)' : s.active ? 'var(--accent-amber)' : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, fontSize: '11px', color: s.done || s.active ? '#fff' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{s.done ? '✓' : i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: s.done || s.active ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: '2px' }}>{s.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                      {s.time && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent-amber)', marginTop: '3px' }}>{s.time}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/buyer-dashboard" style={{ padding: '13px 28px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'var(--teal)', border: 'none', color: theme === 'dark' ? '#0A0A0B' : '#fff', textDecoration: 'none' }}>View in Dashboard</a>
                <a href="/marketplace" style={{ padding: '13px 28px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>Continue Browsing</a>
              </div>
            </div>
          )}

        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div className="checkout-sidebar" style={{ position: 'sticky', top: '144px' }}>
          <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '52px', height: '72px', borderRadius: '6px', background: 'var(--bg-4)', border: '2px solid var(--border)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {listing?.photos?.[0] ? <img src={listing.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
              </div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', lineHeight: 1.2, marginBottom: '3px', color: 'var(--text-primary)' }}>{listingLoading ? '…' : listing?.card_name || 'Listing not found'}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {listing?.game}{listing?.set ? ` · ${listing.set}` : ''}<br />
                  {listing?.grade ? `${listing.grader} ${listing.grade}${listing.cert_number ? ` · Cert #${listing.cert_number}` : ''}` : listing ? 'Raw' : ''}<br />
                  {listing?.card_number ? `#${listing.card_number}` : ''}
                </div>
                {listing?.seller && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--teal-bg)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--teal)', fontWeight: 600 }}>{sellerName.slice(0, 2).toUpperCase()}</div>
                    {sellerName} · {sellerTier.charAt(0).toUpperCase() + sellerTier.slice(1)}{sellerRep ? ` · ${sellerRep.toFixed(2)}★` : ''}
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              {[
                { label: 'Card price', val: `$${cardPrice}` },
                { label: `Auth fee (${authTier === 'remote' ? 'Remote Photo' : 'Physical'})`, val: `$${authFee}` },
                { label: 'Shipping & insurance', val: shippingKnown ? `~$${shippingFeeVal.toFixed(2)}` : 'Est. at checkout' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-primary)' }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{shippingKnown ? 'Total to lock in escrow' : 'Subtotal (excl. shipping)'}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 600, color: 'var(--gold)' }}>${displayTotal}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text-muted)' }}>{shippingKnown ? 'incl. shipping · USDC · Base' : '+ est. shipping · USDC · Base'}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🔒', text: 'Escrow protected — not held by us' },
                { icon: '✓', text: authTier === 'remote' ? 'Photo authenticated in transit' : 'Human authenticated before delivery' },
                { icon: '↩', text: 'Auto-refund if seller misses 48hr deadline (1 extension allowed)' },
                { icon: '⏱', text: '72hr inspection window after delivery' },
                { icon: '⬡', text: 'Permanent on-chain record on Base' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '13px', flexShrink: 0 }}>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

    </div>
  )
}
