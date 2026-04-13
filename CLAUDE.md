# Chase Hollow — Claude Code Briefing

## Project Identity
- **Product:** Blockchain-secured TCG marketplace
- **Domain:** chasehollow.com
- **GitHub:** github.com/nyteowl9/troveexchange
- **Local:** C:\Users\pdwat\Desktop\troveexchange
- **Deploy:** Vercel (auto-deploys on push to main)
- **Git terminal:** CMD only (not PowerShell)

---

## Stack
```
Frontend:    Next.js 16 · Tailwind · app/ directory
Database:    Supabase (PostgreSQL + Auth + Realtime + Storage)
Blockchain:  Base L2 (Ethereum L2) · Solidity · Hardhat
RPC:         Alchemy
Wallets:     WalletConnect · Privy (embedded wallets)
Shipping:    EasyPost (FedEx carrier · labels · webhooks)
Tax:         TaxJar (sales tax by zip)
Email:       Resend (transactional)
Treasury:    Safe multisig (4-wallet structure)
Auth firm:   External (engaged)
```

## Design System
```
Primary gold:   #C9A84C  (--gold, --teal in dark mode)
Teal light:     #0D6E6E  (--teal in light mode)
Backgrounds:    #0A0A0B / #111114 / #18181C / #222228
Text:           #F0EDE6 / #B8B4AC / #6C6A66
Green:          #4CAF7C   Red: #C84B3C
Blue:           #3C7DC8   Amber: #E8A838
Border:         #2A2A32
Fonts:          Cormorant Garamond (headings) · DM Sans (body) · DM Mono (labels/mono)
Theme:          Dark default · Light toggle · stored in localStorage as 'ch-theme'
```

---

## All Pages — Built & Live

| Route | File | Notes |
|-------|------|-------|
| / | app/page.js | Homepage |
| /marketplace | app/marketplace/page.js | Card grid + filters |
| /listing/[id] | app/listing/[id]/page.js | Listing detail + buy |
| /checkout | app/checkout/page.js | 5-step escrow flow |
| /buyer-dashboard | app/buyer-dashboard/page.js | |
| /seller-dashboard | app/seller-dashboard/page.js | |
| /authenticator | app/authenticator/page.js | Staff portal |
| /dispute-resolution | app/dispute-resolution/page.js | Staff portal |
| /customer-support | app/customer-support/page.js | Staff portal |
| /admin | app/admin/page.js | Owner only |
| /profile | app/profile/page.js | Public profile |
| /creators | app/creators/page.js | Affiliate application |
| /creator-dashboard | app/creator-dashboard/page.js | Affiliate portal |

## Shared Components
```
app/components/Nav.jsx     Smart nav — full/portal/checkout variants
                           CSS classes for mobile (.nav-desktop, .nav-hamburger)
app/components/Footer.jsx  Hidden on dashboards/portals/checkout
app/layout.js              Imports Nav + Footer
app/globals.css            CSS variables + mobile responsive rules
```

---

## Business Logic — All Locked

### Fee Structure
```
Platform fee:     3.5% total (3% Chase Hollow + 0.5% creator affiliate)
                  Deducted from seller settlement — NEVER shown to buyer
Buyer pays:       Card price + auth fee + shipping & insurance + sales tax
Seller receives:  Listing price - 3.5% - shipping cost
Buyer protection fee: NONE (removed — seller bond covers disputes)
```

### Two-Tier Authentication Model

**Tier 1 — Remote Photo Auth ($1–$300)**
```
Auth fee:     $10 (buyer pays)
Shipping:     1 label — seller ships DIRECT to buyer
              Cheapest carrier rate + 15% handling (one line item)
Photos:       3 required — front, back, card in sealed package
              Must upload BEFORE or AT TIME of label scan
Timing:       48hrs to upload photos + get carrier scan
              1 extension allowed (48hrs) — buyer notified
              Weekend rule: deadline on Sat/Sun → auto-extends to Mon 11:59pm
Auth:         Staff reviews photos IN TRANSIT (async, no delay)
              PASS → card continues to buyer
              FAIL → buyer notified, 72hr dispute window
```

**Tier 2 — Physical Auth ($301–$50,000)**
```
Auth fee:     $25 (buyer pays)
Shipping:     Label A: seller → Chase Hollow auth center
              Label B: auth center → buyer
              Both Chase Hollow EasyPost labels
              Declared value = sale price (automatic)
Timing:       48hrs to ship (Label A) — same extension rules
Auth:         Physical inspection at auth center
              Graded: photo match, grade label, cert DB verify,
                      slab integrity, holo sticker
              Raw: condition match, no undisclosed damage
              6 photos taken by staff, stored in Supabase Storage
              PASS → Label B generated → ships to buyer
              FAIL → full refund + strike
Window:       72hr buyer inspection after delivery (both tiers)
```

**Phase 2 — Trust Tier (future)**
```
Eligible:     Elite sellers (500+ sales, 0 disputes lost, 0 strikes, 12mo+)
Auth:         Photo auth only (same 3 photos) — never zero auth
```

### Transaction Flow
```
1. Buyer funds escrow (USDC locked in smart contract on Base)
2. Seller notified — 48hrs to ship (+ upload photos if Tier 1)
3. Miss deadline → auto-refund 100% USDC + Strike 1
4. Auth (photo review in transit OR physical at center)
5. PASS → card ships/continues to buyer
   FAIL → full refund + seller notified
6. Delivery → 72hr inspection window opens
7. Buyer can dispute OR release early
8. Auto-release at T+72hrs if no dispute
9. Seller receives: listing price - 3.5% - shipping
10. Bond returned within 5–7 business days
```

### Bond System
```
New Seller:   4% bond per transaction
Trusted:      3% (10–99 sales)
Pro:          2% (100–499 sales)
Elite:        1% (500+ sales)
Strike 2:     Bond jumps to 4% regardless of tier

Posted:       When buyer purchases (not at listing time)
Returns:      5–7 business days after settlement
Forfeited:    If seller loses dispute
```

### Strike System
```
New seller first offense:  Warning only
Strike 1:                  7-day suspension
Strike 2:                  30-day suspension + bond → 4%
Strike 3:                  Permanent ban
Trigger:                   No carrier scan by T+48hrs (automatic)
Appeal:                    7 days · owner reviews · 48hr decision
```

### Listing Rules
```
Minimum price:    $1 (no minimum)
Maximum price:    $50,000 at launch
Duration:         90 days · one-click renewal
Warnings:         Day 75, 85, 97
Expires:          Day 90 (pauses) → Day 100 (removed)
Goes live:        Immediately on publish
Wallet:           Only required at transaction time
Types:            Graded · Raw · Pack · Box · Case · Lot
```

### Creator Affiliate Program
```
Commission:   0.5% of referred sale (flat)
Attribution:  30-day cookie · last click wins
Self-referral: Blocked
Payout:       Monthly USDC · $50 minimum threshold
Applications: Open · manual approval
Pages:        /creators (apply) · /creator-dashboard (stats)
```

### Dispute Resolution
```
Staff:    Reviews evidence · recommends outcome (never executes)
Owner:    Executes final decision (cannot be delegated)
Buyer wins:   Full refund · seller bond forfeited · Strike 1
Seller wins:  Escrow releases · buyer bond forfeited
```

### Multisig Governance (Safe on Base)
```
W1: Hot operational wallet
W2: Warm hardware co-signer (TBD)
W3: Cold backup (TBD)
W4: Dead man's switch — lawyer escrow, activates after 90 days inactivity

L1: Any admin action
L2: W1 only
L3 standard: 2-of-4
L3 treasury:  3-of-4
L4 critical:  4-of-4 (emergency pause, upgrade, large withdrawal)
```

---

## Smart Contract Parameters (Changeable — No Redeployment)
```solidity
platformFeeBps       = 350    // 3.5% · cap 1000
creatorFeeBps        = 50     // 0.5% · cap 200
sellerShipDeadline   = 48hrs  // cap 168hrs
buyerInspectWindow   = 72hrs  // cap 168hrs
maxListingValue      = 50000  // USDC
listingTier          = 0|1|2  // 0=remote, 1=physical, 2=trust(Phase2)
remoteAuthFee        = 10     // USDC
physicalAuthFee      = 25     // USDC
```

---

## Phase Status

### Phase 1 — Frontend ✅ COMPLETE
```
✓ All 13 pages built
✓ Shared Nav/Footer components
✓ Mobile responsive pass
✓ Two-tier auth model in UI
✓ Cloudflare set up (DDoS, WAF, CDN)
✓ Live at chasehollow.com
```

### Phase 2 — Backend (CURRENT)
```
Priority order:

1. SUPABASE SETUP ✅ COMPLETE
   ✓ PostgreSQL schema (users, listings, orders, auth_inspections,
     disputes, strikes, creators, referral_conversions)
   ✓ username + full_name columns added (migration 001)
   ✓ Supabase Auth (email + wallet linking)
   ✓ Row Level Security policies
   ✓ Supabase Storage (listing-photos public, auth-photos private)
   □ Realtime subscriptions (order status updates — Phase 2 later)

2. NEXT.JS MIDDLEWARE ✅ COMPLETE
   ✓ Role-based route protection (proxy.js)
   ✓ /authenticator  → role: authenticator
   ✓ /admin          → role: owner
   ✓ /dispute-*      → role: staff | owner
   ✓ /customer-*     → role: staff | owner
   ✓ Unauthorized    → redirect to /

3. WALLETCONNECT / PRIVY ✅ COMPLETE
   ✓ Privy SDK installed + PrivyProvider configured
   ✓ Base mainnet locked as default + only chain
   ✓ Embedded wallets auto-created for non-crypto users
   ✓ External wallets: MetaMask, Coinbase, WalletConnect, Phantom
   ✓ Wallet address synced to Supabase on connect
   ✓ ConnectWalletButton component (app/components/ConnectWallet.jsx)
   ✓ Wallet connection deferred to transaction time (not signup)

4. SHIPPING INTEGRATION ✅ COMPLETE (Shippo — replaced EasyPost)
   ✓ Shippo SDK installed
   ✓ Rate calculation API (cheapest carrier + 15% handling)
   ✓ Label generation API (Label A + Label B, declared value insurance)
   ✓ Webhook handler (carrier scan → in_transit, delivery → inspection_window)
   ✓ Webhook registered at chasehollow.com/api/webhooks/shippo
   ✓ User address fields added (migration 002)
   ⚠ Auth center address is placeholder in lib/shippo.js — update before launch

5. TAXJAR ← NEXT
   □ Label generation (Tier 1: 1 label, Tier 2: Label A + Label B)
   □ Declared value insurance (automatic, = sale price)
   □ Webhooks → carrier scan triggers 48hr deadline check
   □ Webhook → delivery scan triggers 72hr inspection window
   □ Dynamic shipping calc (buyer zip → real FedEx rate + 15% handling)
   □ Shipsurance addon for $50k–$100k (Phase 2 add-on)

5. TAXJAR
   □ Sales tax calculation by buyer zip code
   □ Called at checkout Step 2 (after address confirmed)

6. RESEND EMAIL
   □ All transactional notifications (see email list below)

7. CREATOR ATTRIBUTION
   □ 30-day cookie on ?ref= parameter
   □ Conversion tracking on purchase
   □ Monthly payout batch (1st-7th of month)

8. AUTOMATION
   □ Strike auto-apply (EasyPost webhook → T+48hr miss)
   □ Listing expiry jobs (Day 75/85/90/97/100)
   □ Bond return automation (T+7 days after settlement)
   □ Auto-release escrow (T+72hrs after delivery)

## Auth & Wallet Notes
- Email confirmation OFF in Supabase (re-enable before launch)
- Google OAuth: needs Google Cloud credentials (Privy dashboard ready)
- Privy wallet order: MetaMask, Phantom, Coinbase, Rainbow, Backpack, WalletConnect
- MetaMask does not support programmatic disconnect (by design)
- Checkout Step 1 uses real Privy connection — "Switch Wallet" re-opens modal
```

### Phase 3 — Blockchain
```
□ Solidity contract (escrow, auto-release, dispute, creator payout)
□ Hardhat → Base Sepolia testnet
□ External audit (firm engaged)
□ Safe multisig setup (W1/W2/W3/W4)
□ Mainnet deployment
□ Beta seller onboarding (invite-only)
□ Public launch
```

---

## Supabase Schema Reference
```sql
users (id, email, wallet_address, role, tier, strike_count,
       rep_score, joined_at, suspended_until, banned)

listings (id, seller_id, game, set, card_name, card_number,
          grade, grader, cert_number, condition, listing_type,
          price, auth_tier, photos[], status, expires_at)

orders (id, listing_id, buyer_id, seller_id, auth_tier,
        escrow_amount, escrow_tx_hash, platform_fee, creator_fee,
        auth_fee, label_a_url, label_b_url, tracking_a, tracking_b,
        declared_value, shipping_cost, sales_tax,
        status, shipped_at, delivered_at, auto_release_at, released_at)

auth_inspections (id, order_id, authenticator_id,
                  type, checklist, photos[], decision, notes, timestamp)

disputes (id, order_id, raised_by, reason,
          buyer_evidence[], seller_evidence[], auth_photos[],
          staff_recommendation, owner_decision, outcome)

strikes (id, user_id, order_id, strike_number,
         reason, action_taken, appealed, appeal_outcome)

creators (id, user_id, handle, platform, channel_url,
          wallet_address, ref_code, status, approved_at)

referral_conversions (id, creator_id, order_id,
                      sale_amount, commission, paid)
```

---

## Email Notifications (Resend)
```
Buyer:   Purchase confirmed · Seller shipped · Auth passed/failed ·
         Card delivered · Funds released · Dispute opened/resolved

Seller:  Sale — ship within 48hrs · 24hr reminder ·
         Auth passed/failed · Funds released ·
         Dispute opened · Strike applied · Bond returned
```

---

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EASYPOST_API_KEY=
TAXJAR_API_KEY=
RESEND_API_KEY=
ALCHEMY_RPC_URL=
WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CHAIN_ID=8453
```

---

## Pre-Launch Business Requirements
```
⚠ REQUIRED BEFORE ACCEPTING ANY CARD:
  □ Commercial inland marine insurance policy
    (covers cards physically at auth center)
    Estimated: $200–400/month

□ Terms of Service (lawyer)
□ Business entity formation (LLC/Corp)
□ EasyPost account + API key
□ Safe multisig wallet holders (W2, W3, W4 — TBD)
□ External audit passing (firm engaged)
```

---

## Key Decisions — Never Change Without Review
- Auth is NEVER optional — every card photo or physically authenticated
- Platform fee never shown to buyer
- Buyer protection fee: NONE (seller bond covers disputes)
- Bond is collateral, not a fee — always shown separately
- Max listing $50,000 at launch
- USDC on Base only — no other tokens/chains
- Chase Hollow generates ALL labels (no seller labels Phase 1)
- Wallet connection deferred until transaction time
- Listings go live immediately — no wallet needed to list
