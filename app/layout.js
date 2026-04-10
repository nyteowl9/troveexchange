import { Inter } from 'next/font/google'
import Nav from './components/Nav'
import Footer from './components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Chase Hollow — Blockchain TCG Marketplace',
  description: 'The first blockchain-secured trading card marketplace. Every card authenticated. Every USDC protected by smart contract on Base.',
  keywords: 'pokemon cards, mtg, magic the gathering, trading cards, graded cards, PSA, BGS, blockchain, USDC, Base',
  openGraph: {
    title: 'Chase Hollow — Blockchain TCG Marketplace',
    description: 'Buy and sell graded cards with escrow protection on Base.',
    url: 'https://chasehollow.com',
    siteName: 'Chase Hollow',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <Nav />
        <main>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}