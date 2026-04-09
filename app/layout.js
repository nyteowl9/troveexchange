import './globals.css'

export const metadata = {
  title: 'Chase Hollow — Blockchain TCG Marketplace',
  description: 'Where rare cards meet trustless trade. Every card authenticated. Every transaction on-chain. We charge 3%.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}