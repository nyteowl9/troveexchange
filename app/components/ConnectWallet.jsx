'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

export function useWalletConnection() {
  const { ready, authenticated, login, linkWallet } = usePrivy()
  const { wallets } = useWallets()
  const { user, refreshProfile } = useAuth()

  // Only sync EXTERNAL wallets (MetaMask, Coinbase, etc.) — never Privy embedded wallets
  const externalWallet = wallets?.find(w => w.walletClientType !== 'privy') ?? null
  const walletAddress = externalWallet?.address ?? null

  useEffect(() => {
    async function syncWallet() {
      if (!user || !externalWallet) return
      await supabase
        .from('users')
        .update({ wallet_address: externalWallet.address })
        .eq('id', user.id)
      await refreshProfile()
    }
    syncWallet()
  }, [externalWallet?.address, user?.id])

  async function connectExternal() {
    // linkWallet opens the "connect a wallet" modal without re-authenticating
    await linkWallet()
  }

  async function disconnect() {
    if (externalWallet) {
      await externalWallet.disconnect()
      // Clear from Supabase
      if (user) {
        await supabase.from('users').update({ wallet_address: null }).eq('id', user.id)
        await refreshProfile()
      }
    }
  }

  return {
    ready,
    authenticated,
    walletAddress,
    wallet: externalWallet,
    connect: connectExternal,
    disconnect,
  }
}

// Button component — use wherever wallet connection is needed
export default function ConnectWalletButton({ label = 'Connect Wallet', style = {} }) {
  const { ready, walletAddress, connect } = useWalletConnection()

  if (!ready) return null

  if (walletAddress) {
    return (
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', ...style }}>
        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      style={{ background: 'var(--gold)', color: '#0A0A0B', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', ...style }}
    >
      {label}
    </button>
  )
}
