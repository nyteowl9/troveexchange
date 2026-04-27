'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SECTIONS = [
  { id: 'acceptance',       title: '1. Acceptance of Terms' },
  { id: 'eligibility',      title: '2. Eligibility' },
  { id: 'accounts',         title: '3. Accounts' },
  { id: 'platform',         title: '4. Platform Overview' },
  { id: 'listings',         title: '5. Listings and Sales' },
  { id: 'escrow',           title: '6. Escrow and Payments' },
  { id: 'authentication',   title: '7. Authentication Services' },
  { id: 'bond',             title: '8. Seller Bond' },
  { id: 'shipping',         title: '9. Shipping' },
  { id: 'disputes',         title: '10. Disputes' },
  { id: 'fees',             title: '11. Fees' },
  { id: 'creators',         title: '12. Creator Affiliate Program' },
  { id: 'prohibited',       title: '13. Prohibited Conduct' },
  { id: 'intellectual',     title: '14. Intellectual Property' },
  { id: 'disclaimers',      title: '15. Disclaimers' },
  { id: 'liability',        title: '16. Limitation of Liability' },
  { id: 'indemnification',  title: '17. Indemnification' },
  { id: 'termination',      title: '18. Termination' },
  { id: 'changes',          title: '19. Changes to Terms' },
  { id: 'governing',        title: '20. Governing Law' },
  { id: 'contact',          title: '21. Contact' },
]

export default function TermsOfService() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('ch-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ch-theme', next)
  }

  const h2 = { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', margin: '40px 0 12px', paddingBottom: '8px', borderBottom: '0.5px solid var(--border)' }
  const p  = { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 14px' }
  const ul = { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, paddingLeft: '20px', margin: '0 0 14px' }
  const strong = { color: 'var(--text-primary)', fontWeight: 600 }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(24px)', borderBottom: '0.5px solid var(--border)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <Link href="/" style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '20px', height: '20px', background: 'var(--gold)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          CHASE HOLLOW
        </Link>
        <button onClick={toggleTheme} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </nav>

      <div style={{ display: 'flex', paddingTop: '56px', maxWidth: '1100px', margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* TOC — desktop sticky sidebar */}
        <aside style={{ display: 'none', width: '220px', flexShrink: 0, position: 'sticky', top: '76px', height: 'fit-content', marginRight: '48px', paddingTop: '40px' }} className="toc-sidebar">
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500 }}>Contents</div>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none', padding: '3px 0', lineHeight: 1.5, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--teal)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >{s.title}</a>
          ))}
        </aside>

        <style>{`@media (min-width: 900px) { .toc-sidebar { display: block !important; } }`}</style>

        {/* BODY */}
        <div style={{ flex: 1, maxWidth: '720px' }}>
          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px', fontWeight: 500 }}>Legal</div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '42px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 16px' }}>
              Terms of <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Service</em>
            </h1>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Effective Date: <span style={{ color: 'var(--text-secondary)' }}>[DATE — TO BE CONFIRMED]</span></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>Chase Hollow LLC · Idaho</div>
            </div>
          </div>

          <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '32px' }}>
            <p style={{ ...p, margin: 0, fontSize: '13px' }}>
              Please read these Terms of Service carefully before using the Chase Hollow platform. By accessing or using Chase Hollow, you agree to be bound by these Terms. If you do not agree, do not use the platform.
            </p>
          </div>

          {/* 1. ACCEPTANCE */}
          <section id="acceptance">
            <h2 style={h2}>1. Acceptance of Terms</h2>
            <p style={p}>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Chase Hollow LLC, an Idaho limited liability company ("Chase Hollow," "we," "us," or "our"), governing your access to and use of the Chase Hollow marketplace platform, including all associated services, features, content, and applications (collectively, the "Platform").</p>
            <p style={p}>By creating an account, accessing the Platform, or completing any transaction, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.</p>
          </section>

          {/* 2. ELIGIBILITY */}
          <section id="eligibility">
            <h2 style={h2}>2. Eligibility</h2>
            <p style={p}>You must be at least <strong style={strong}>18 years of age</strong> to use the Platform. By using Chase Hollow, you represent and warrant that:</p>
            <ul style={ul}>
              <li>You are at least 18 years old;</li>
              <li>You have the legal capacity to enter into a binding contract;</li>
              <li>You are not prohibited from using the Platform under applicable law;</li>
              <li>You have not been previously banned or suspended from the Platform;</li>
              <li>Your use of the Platform does not violate any applicable laws or regulations in your jurisdiction.</li>
            </ul>
            <p style={p}>Chase Hollow reserves the right to refuse service, terminate accounts, or cancel transactions at its sole discretion, including if we believe a user is under 18 or is misrepresenting their eligibility.</p>
          </section>

          {/* 3. ACCOUNTS */}
          <section id="accounts">
            <h2 style={h2}>3. Accounts</h2>
            <p style={p}>To access most features of the Platform, you must register for an account. When creating an account, you agree to provide accurate, current, and complete information. You are responsible for:</p>
            <ul style={ul}>
              <li>Maintaining the confidentiality of your account credentials;</li>
              <li>All activity that occurs under your account;</li>
              <li>Notifying us immediately of any unauthorized use of your account at <strong style={strong}>support@chasehollow.com</strong>.</li>
            </ul>
            <p style={p}>You may link a cryptocurrency wallet to your account for the purpose of completing transactions. You are solely responsible for the security of your wallet and any private keys associated with it. Chase Hollow does not custody private keys and cannot recover lost wallet access.</p>
            <p style={p}>You may not create multiple accounts, transfer your account to another person, or use another person's account without authorization.</p>
          </section>

          {/* 4. PLATFORM OVERVIEW */}
          <section id="platform">
            <h2 style={h2}>4. Platform Overview</h2>
            <p style={p}>Chase Hollow is a peer-to-peer marketplace for trading card game ("TCG") collectibles, including Pokémon, Magic: The Gathering, One Piece, and other trading card products. The Platform facilitates transactions between buyers and sellers using USDC stablecoin on the Base blockchain network (an Ethereum Layer 2 network).</p>
            <p style={p}>Chase Hollow acts as a neutral facilitator and authentication service provider. We do not take title to any items listed on the Platform. Chase Hollow is not a party to the underlying transaction between buyer and seller except as an escrow agent and authentication provider as described herein.</p>
            <p style={p}>All transactions are denominated in and settled in USDC. Chase Hollow does not support fiat currency payments or other cryptocurrencies.</p>
          </section>

          {/* 5. LISTINGS */}
          <section id="listings">
            <h2 style={h2}>5. Listings and Sales</h2>
            <p style={p}><strong style={strong}>Creating Listings.</strong> Sellers may list TCG items for sale on the Platform. By creating a listing, you represent and warrant that:</p>
            <ul style={ul}>
              <li>You are the legal owner of the item and have the right to sell it;</li>
              <li>All listing information is accurate and complete, including card name, set, grade, condition, and photos;</li>
              <li>The item is authentic and matches its description;</li>
              <li>The item is not counterfeit, stolen, or otherwise prohibited;</li>
              <li>You will fulfill the sale if a buyer completes checkout.</li>
            </ul>
            <p style={p}><strong style={strong}>Listing Rules.</strong> Listings are subject to the following rules:</p>
            <ul style={ul}>
              <li>Minimum listing price: $1.00 USD (in USDC equivalent);</li>
              <li>Maximum listing price: $50,000 USD at launch;</li>
              <li>Listings expire after 90 days from publication. Sellers will receive expiry warnings at days 75, 85, and 90;</li>
              <li>Listings go live immediately upon publication;</li>
              <li>Authentication tier (remote or physical) is determined automatically by listing price.</li>
            </ul>
            <p style={p}><strong style={strong}>Prohibited Items.</strong> You may not list counterfeit cards, items you do not own, items with misleading descriptions, altered cards presented as unaltered, or any item whose sale is prohibited by applicable law.</p>
            <p style={p}><strong style={strong}>Shipping.</strong> All shipping labels are generated exclusively by Chase Hollow. Sellers may not use their own shipping labels. Chase Hollow-generated labels include appropriate insurance coverage based on the declared value of the item.</p>
          </section>

          {/* 6. ESCROW */}
          <section id="escrow">
            <h2 style={h2}>6. Escrow and Payments</h2>
            <p style={p}><strong style={strong}>Escrow Mechanism.</strong> All buyer payments are held in a non-custodial smart contract escrow on the Base blockchain ("Escrow Contract"). Funds are locked at the time of purchase and released only upon successful completion of the transaction as defined in these Terms or by the dispute resolution process.</p>
            <p style={p}><strong style={strong}>Buyer Obligations.</strong> Buyers must fund the Escrow Contract with the full purchase amount, including authentication fee, shipping costs, and applicable taxes, in USDC before a transaction is confirmed. By funding escrow, buyers agree to the terms of the transaction as presented at checkout.</p>
            <p style={p}><strong style={strong}>Seller Settlement.</strong> Upon successful release of escrow, sellers receive the listing price less platform fees and outbound shipping costs. Settlement is transferred directly to the seller's connected wallet address on Base.</p>
            <p style={p}><strong style={strong}>Inspection Window.</strong> Buyers have <strong style={strong}>72 hours</strong> following confirmed delivery to inspect the item and initiate a dispute if the item does not match its listing. If no dispute is raised within this window, escrow is automatically released to the seller.</p>
            <p style={p}><strong style={strong}>Crypto Risk Acknowledgment.</strong> You acknowledge that blockchain transactions are irreversible and that Chase Hollow cannot reverse confirmed on-chain transactions. You are responsible for providing accurate wallet addresses. USDC values may fluctuate relative to other currencies.</p>
          </section>

          {/* 7. AUTHENTICATION */}
          <section id="authentication">
            <h2 style={h2}>7. Authentication Services</h2>
            <p style={p}>Chase Hollow provides card authentication services for every transaction. Authentication is mandatory and cannot be waived. Two tiers of authentication are offered:</p>
            <p style={p}><strong style={strong}>Tier 1 — Remote Photo Authentication ($1–$300).</strong> For items priced at or below $300, sellers are required to submit three (3) high-quality photographs (front, back, and card in sealed package) before or at the time of the first carrier scan. Chase Hollow staff review photos while the card is in transit. Authentication fee: $10 USDC (paid by buyer).</p>
            <ul style={ul}>
              <li>Sellers have 48 hours from escrow funding to obtain a carrier scan. One 48-hour extension may be requested.</li>
              <li>If authentication fails, the buyer is notified and the card is returned to the seller at seller's expense. A full refund is issued to the buyer upon confirmed return delivery.</li>
            </ul>
            <p style={p}><strong style={strong}>Tier 2 — Physical Authentication ($301–$50,000).</strong> For items priced above $300, the seller ships the card directly to the Chase Hollow authentication center. Chase Hollow staff physically inspect the card and, upon passing, ship the card to the buyer. Authentication fee: $25 USDC (paid by buyer).</p>
            <ul style={ul}>
              <li>If authentication fails, the buyer receives a full refund immediately. The card is returned to the seller.</li>
              <li>Chase Hollow is not liable for damage to items while in transit to or from the authentication center, provided appropriate shipping insurance was purchased. Insurance is included automatically based on declared value.</li>
            </ul>
            <p style={p}><strong style={strong}>Authentication Decisions.</strong> Authentication outcomes are determined by Chase Hollow staff in their sole discretion based on established criteria including photo match, grade label verification, certification database lookup, slab integrity, and condition assessment. Authentication decisions are final except as provided in the dispute process.</p>
            <p style={p}><strong style={strong}>No Authentication Guarantee.</strong> While Chase Hollow takes reasonable care in its authentication process, Chase Hollow does not guarantee the authenticity of any item and shall not be liable for authentication errors made in good faith.</p>
          </section>

          {/* 8. BOND */}
          <section id="bond">
            <h2 style={h2}>8. Seller Bond</h2>
            <p style={p}>To participate as a seller on Chase Hollow, sellers are required to post a performance bond ("Bond") for each transaction. The Bond is held in the Escrow Contract alongside buyer funds and serves as collateral against seller default or misconduct.</p>
            <p style={p}><strong style={strong}>Bond Rates by Seller Tier:</strong></p>
            <ul style={ul}>
              <li>New Seller (0–9 sales): 4%</li>
              <li>Trusted (10–99 sales): 3%</li>
              <li>Pro (100–499 sales): 2%</li>
              <li>Elite (500–2,499 sales): 1%</li>
              <li>Legend (2,500+ sales): 1%</li>
              <li>Strike 2 or above: 4% regardless of tier</li>
            </ul>
            <p style={p}>The Bond is calculated as a percentage of the listing price and must be deposited in USDC at the time a buyer initiates checkout.</p>
            <p style={p}><strong style={strong}>Bond Return.</strong> Upon successful completion of a transaction, the Bond is returned to the seller's wallet within 5–7 business days.</p>
            <p style={p}><strong style={strong}>Bond Forfeiture.</strong> The Bond is forfeited to Chase Hollow if the seller loses a dispute, fails to ship within the required deadline, or is found to have submitted an inauthentic item. Forfeited bonds are not refundable.</p>
          </section>

          {/* 9. SHIPPING */}
          <section id="shipping">
            <h2 style={h2}>9. Shipping</h2>
            <p style={p}>Chase Hollow generates all shipping labels for transactions on the Platform. Sellers may not use their own labels. By accepting a sale, sellers agree to use only Chase Hollow-provided labels and to ship items using the carrier and service specified.</p>
            <p style={p}>Sellers are responsible for adequate packaging to protect the item during transit. Chase Hollow is not responsible for damage caused by inadequate packaging by the seller.</p>
            <p style={p}>Shipping costs, including a handling fee, are calculated at checkout and paid by the buyer. Declared value insurance is included automatically based on the transaction value.</p>
            <p style={p}><strong style={strong}>Shipping Deadline.</strong> Sellers must obtain a carrier scan within 48 hours of being notified of a sale. Failure to ship within this deadline will result in an automatic refund to the buyer and a strike against the seller's account. One 48-hour extension may be requested in limited circumstances.</p>
          </section>

          {/* 10. DISPUTES */}
          <section id="disputes">
            <h2 style={h2}>10. Disputes</h2>
            <p style={p}><strong style={strong}>Buyer Disputes.</strong> Buyers may initiate a dispute within 72 hours of confirmed delivery if the item received materially differs from the listing description, or if authentication has failed. To initiate a dispute, buyers must provide a written description and supporting photographic evidence through the Buyer Dashboard.</p>
            <p style={p}><strong style={strong}>Dispute Process.</strong> Upon a dispute being raised:</p>
            <ul style={ul}>
              <li>Escrow funds are frozen for the duration of the dispute;</li>
              <li>The seller has 48 hours to submit a response and evidence;</li>
              <li>Chase Hollow staff review all evidence and submit a recommendation to the platform owner;</li>
              <li>The platform owner makes a final, binding decision.</li>
            </ul>
            <p style={p}><strong style={strong}>Outcomes.</strong></p>
            <ul style={ul}>
              <li><em>Buyer wins:</em> Full USDC refund to buyer; seller Bond forfeited; Strike 1 applied to seller.</li>
              <li><em>Seller wins:</em> Escrow released to seller; buyer Bond forfeited (if applicable).</li>
            </ul>
            <p style={p}>Dispute decisions are executed automatically on-chain by the Escrow Contract and are final. Chase Hollow is not liable for the outcome of any dispute except in cases of demonstrated bad faith or gross negligence by Chase Hollow staff.</p>
            <p style={p}><strong style={strong}>Fraudulent Disputes.</strong> Submitting false or fabricated evidence in a dispute is prohibited and may result in account termination and legal action.</p>
          </section>

          {/* 11. FEES */}
          <section id="fees">
            <h2 style={h2}>11. Fees</h2>
            <p style={p}>The following fees apply to transactions on the Platform:</p>
            <ul style={ul}>
              <li><strong style={strong}>Platform Fee:</strong> 3.5% of the listing price, deducted from seller settlement (3% to Chase Hollow + 0.5% to the referring creator, if applicable). This fee is never charged to buyers.</li>
              <li><strong style={strong}>Authentication Fee:</strong> $10 USDC (Tier 1 / Remote) or $25 USDC (Tier 2 / Physical), paid by the buyer at checkout.</li>
              <li><strong style={strong}>Shipping:</strong> Actual carrier cost plus a 15% handling fee, paid by the buyer at checkout.</li>
              <li><strong style={strong}>Seller Bond:</strong> A performance bond (see Section 8), posted by the seller and returned upon successful transaction completion.</li>
            </ul>
            <p style={p}>All fees are denominated in USDC. Chase Hollow reserves the right to modify its fee structure upon reasonable notice to users.</p>
          </section>

          {/* 12. CREATORS */}
          <section id="creators">
            <h2 style={h2}>12. Creator Affiliate Program</h2>
            <p style={p}>Chase Hollow operates a creator affiliate program that allows approved content creators to earn commissions on referred sales. By participating in the program, creators agree to the following:</p>
            <ul style={ul}>
              <li>Commission rate: 0.5% of the referred sale price (paid from the platform fee; no additional cost to buyer or seller);</li>
              <li>Attribution: 30-day cookie, last-click attribution;</li>
              <li>Self-referrals are prohibited;</li>
              <li>Minimum payout threshold: $50 USDC, paid monthly;</li>
              <li>Chase Hollow may modify, suspend, or terminate the affiliate program at any time.</li>
            </ul>
            <p style={p}>Creators are responsible for complying with all applicable disclosure requirements (e.g., FTC guidelines in the United States) when promoting Chase Hollow.</p>
          </section>

          {/* 13. PROHIBITED CONDUCT */}
          <section id="prohibited">
            <h2 style={h2}>13. Prohibited Conduct</h2>
            <p style={p}>You agree not to engage in any of the following:</p>
            <ul style={ul}>
              <li>Listing, selling, or attempting to sell counterfeit, stolen, or fraudulent items;</li>
              <li>Misrepresenting the condition, authenticity, grade, or ownership of any item;</li>
              <li>Manipulating, circumventing, or attempting to exploit the escrow system or smart contract;</li>
              <li>Submitting false evidence or making fraudulent claims in disputes;</li>
              <li>Creating multiple accounts to circumvent suspensions or bans;</li>
              <li>Harassing, threatening, or abusing other users or Chase Hollow staff;</li>
              <li>Attempting to conduct transactions outside of the Platform to avoid fees or protections;</li>
              <li>Using the Platform for money laundering, fraud, or any other illegal activity;</li>
              <li>Reverse engineering, scraping, or interfering with the Platform's infrastructure;</li>
              <li>Violating any applicable law or regulation.</li>
            </ul>
            <p style={p}>Violations of this section may result in immediate account termination, forfeiture of funds, and referral to law enforcement.</p>
          </section>

          {/* 14. INTELLECTUAL PROPERTY */}
          <section id="intellectual">
            <h2 style={h2}>14. Intellectual Property</h2>
            <p style={p}>The Chase Hollow Platform, including its design, software, trademarks, and content, is owned by Chase Hollow LLC and protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works from Chase Hollow's content without express written permission.</p>
            <p style={p}>By uploading photos or other content to the Platform, you grant Chase Hollow a non-exclusive, royalty-free, worldwide license to use, display, and store that content for the purpose of operating the Platform. You retain ownership of your content.</p>
            <p style={p}>Card names, game brands, and related trademarks are the property of their respective owners. Chase Hollow is not affiliated with, endorsed by, or sponsored by any TCG publisher.</p>
          </section>

          {/* 15. DISCLAIMERS */}
          <section id="disclaimers">
            <h2 style={h2}>15. Disclaimers</h2>
            <p style={p}><strong style={strong}>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</strong></p>
            <p style={p}>Chase Hollow does not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components. Chase Hollow does not guarantee the accuracy of any listing, the authenticity of any item, or the conduct of any user.</p>
            <p style={p}>Blockchain transactions carry inherent risks including smart contract vulnerabilities, network congestion, and loss of access to wallet credentials. You use the Platform at your own risk.</p>
          </section>

          {/* 16. LIMITATION OF LIABILITY */}
          <section id="liability">
            <h2 style={h2}>16. Limitation of Liability</h2>
            <p style={p}><strong style={strong}>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CHASE HOLLOW LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM.</strong></p>
            <p style={p}>Chase Hollow's total aggregate liability for any claims arising out of or relating to these Terms or the Platform shall not exceed the greater of (a) the total fees paid by you to Chase Hollow in the twelve (12) months preceding the claim, or (b) $100 USD.</p>
            <p style={p}>Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities, so some of the above limitations may not apply to you.</p>
          </section>

          {/* 17. INDEMNIFICATION */}
          <section id="indemnification">
            <h2 style={h2}>17. Indemnification</h2>
            <p style={p}>You agree to indemnify, defend, and hold harmless Chase Hollow LLC, its members, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with:</p>
            <ul style={ul}>
              <li>Your access to or use of the Platform;</li>
              <li>Your violation of these Terms;</li>
              <li>Your listing, sale, or purchase of any item;</li>
              <li>Any infringement by you of any intellectual property or other rights of any person or entity.</li>
            </ul>
          </section>

          {/* 18. TERMINATION */}
          <section id="termination">
            <h2 style={h2}>18. Termination</h2>
            <p style={p}>Chase Hollow may suspend or terminate your account and access to the Platform at any time, with or without notice, for violation of these Terms or for any other reason at Chase Hollow's sole discretion.</p>
            <p style={p}>You may close your account at any time by contacting support@chasehollow.com. Closing your account does not cancel any pending transactions or relieve you of obligations arising from completed transactions.</p>
            <p style={p}>Upon termination, all licenses granted under these Terms immediately terminate. Provisions of these Terms that by their nature should survive termination (including Sections 15, 16, 17, and 20) shall survive.</p>
          </section>

          {/* 19. CHANGES */}
          <section id="changes">
            <h2 style={h2}>19. Changes to Terms</h2>
            <p style={p}>Chase Hollow reserves the right to modify these Terms at any time. When we make material changes, we will notify you by email and/or by posting a notice on the Platform. Your continued use of the Platform after the effective date of the revised Terms constitutes your acceptance of the changes.</p>
            <p style={p}>We encourage you to review these Terms periodically. The most current version will always be available at chasehollow.com/tos.</p>
          </section>

          {/* 20. GOVERNING LAW */}
          <section id="governing">
            <h2 style={h2}>20. Governing Law and Jurisdiction</h2>
            <p style={p}>These Terms shall be governed by and construed in accordance with the laws of the State of Idaho, without regard to its conflict of law provisions.</p>
            <p style={p}>Any legal action or proceeding arising out of or relating to these Terms or the Platform shall be brought exclusively in the state or federal courts located in the State of Idaho, and you hereby consent to the personal jurisdiction of such courts.</p>
          </section>

          {/* 21. CONTACT */}
          <section id="contact">
            <h2 style={h2}>21. Contact</h2>
            <p style={p}>If you have questions or concerns regarding these Terms, please contact us:</p>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px', marginBottom: '14px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div><strong style={{ ...strong, fontSize: '12px' }}>Chase Hollow LLC</strong></div>
                <div>State of Idaho</div>
                <div>Email: <a href="mailto:support@chasehollow.com" style={{ color: 'var(--teal)', textDecoration: 'none' }}>support@chasehollow.com</a></div>
                <div>Website: <a href="https://chasehollow.com" style={{ color: 'var(--teal)', textDecoration: 'none' }}>chasehollow.com</a></div>
              </div>
            </div>
            <p style={{ ...p, fontSize: '13px', color: 'var(--text-muted)' }}>
              For support issues, please use our <Link href="/support" style={{ color: 'var(--teal)', textDecoration: 'none' }}>contact form</Link> for the fastest response.
            </p>
          </section>

          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '40px', paddingTop: '24px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.65 }}>
            © Chase Hollow LLC · All rights reserved · Effective [DATE — TO BE CONFIRMED]
          </div>
        </div>
      </div>
    </div>
  )
}
