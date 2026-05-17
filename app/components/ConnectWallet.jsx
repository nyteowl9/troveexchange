'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useEffect, useRef } from 'react'

export function useWalletConnection() {
  const { ready, authenticated, login, linkWallet } = usePrivy()
  const { wallets } = useWallets()
  const { user, profile, refreshProfile } = useAuth()

  const linkingRef = useRef(false)  // true while user is in the connect modal

  // The payment wallet = what's saved in Supabase. This is the source of truth.
  // Live Privy session wallets are only used for signing transactions.
  const savedWalletAddress = profile?.wallet_address ?? null

  // After user links a wallet, detect the new external wallet and save it.
  useEffect(() => {
    if (!linkingRef.current) return
    if (!user || !wallets?.length) return
    const external = wallets.find(w => w.walletClientType !== 'privy')
    if (!external) return
    if (external.address?.toLowerCase() === savedWalletAddress?.toLowerCase()) return
    // New external wallet detected — save it
    linkingRef.current = false
    supabase.from('users').update({ wallet_address: external.address }).eq('id', user.id)
      .then(() => refreshProfile())
  }, [wallets])

  // For signing (checkout): prefer wallet matching saved address, else any external
  const signingWallet =
    wallets?.find(w => w.address?.toLowerCase() === savedWalletAddress?.toLowerCase()) ??
    wallets?.find(w => w.walletClientType !== 'privy') ??
    wallets?.[0] ??
    null

  async function connect() {
    linkingRef.current = true
    if (!authenticated) {
      await login()
    } else {
      await linkWallet()
    }
  }

  async function disconnect() {
    if (signingWallet) await signingWallet.disconnect()
    if (user) {
      await supabase.from('users').update({ wallet_address: null }).eq('id', user.id)
      await refreshProfile()
    }
  }

  return {
    ready,
    authenticated,
    walletAddress: savedWalletAddress,  // Supabase truth — used for display + checkout
    wallet: signingWallet,              // live Privy wallet — used for signing only
    connect,
    disconnect,
  }
}

export default function ConnectWalletButton({ label = 'Connect Wallet', style = {} }) {
  const { ready, walletAddress, wallet, connect } = useWalletConnection()
  if (!ready) return null

  const liveAddress = wallet?.address?.toLowerCase() ?? null
  const isLive = liveAddress && liveAddress === walletAddress?.toLowerCase()

  // Saved + live wallet matches → connected chip (no click needed)
  if (walletAddress && isLive) {
    return (
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', ...style }}>
        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
      </div>
    )
  }

  // Saved but disconnected → Reconnect button
  if (walletAddress) {
    return (
      <button onClick={connect} title={`Saved: ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)} (not currently connected)`} style={{ background: 'var(--accent-amber)', color: '#0A0A0B', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', ...style }}>
        Reconnect Wallet
      </button>
    )
  }

  // No saved wallet → Connect
  return (
    <button onClick={connect} style={{ background: 'var(--gold)', color: '#0A0A0B', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', ...style }}>
      {label}
    </button>
  )
}
