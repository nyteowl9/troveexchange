'use client'

import { PrivyProvider } from '@privy-io/react-auth'

const IS_TESTNET = process.env.NEXT_PUBLIC_CHAIN_ID === '84532'

const BASE_MAINNET = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
    public:  { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
}

const BASE_SEPOLIA = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public:  { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan (Sepolia)', url: 'https://sepolia.basescan.org' },
  },
}

const ACTIVE_CHAIN = IS_TESTNET ? BASE_SEPOLIA : BASE_MAINNET

export function AppPrivyProvider({ children }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#C9A84C',
          logo: undefined,
          walletList: ['metamask', 'phantom', 'coinbase_wallet', 'rainbow', 'backpack', 'wallet_connect'],
        },
        walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        defaultChain: ACTIVE_CHAIN,
        supportedChains: [ACTIVE_CHAIN],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
