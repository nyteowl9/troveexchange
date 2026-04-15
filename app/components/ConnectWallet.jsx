'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

export function useWalletConnection() {
  const { ready, authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const { user, refreshProfile } = useAuth()

  // Sync wallet address to Supabase when it changes
  useEffect(() => {
    async function syncWallet() {
      if (!user || !wallets?.length) return
      const address = wallets[0].address
      await supabase
        .from('users')
        .update({ wallet_address: address })
        .eq('id', user.id)
      await refreshProfile()
    }
    syncWallet()
  }, [wallets, user])

  const walletAddress = wallets?.[0]?.address ?? null

  async function disconnect() {
    // Disconnect just the wallet — don't log out of Privy entirely
    if (wallets?.[0]) {
      await wallets[0].disconnect()
    }
  }

  return {
    ready,
    authenticated,
    walletAddress,
    wallet: wallets?.[0] ?? null,
    connect: login,
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
