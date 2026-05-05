# Chase Hollow — Claude Code Briefing

## Project Identity
- **Product:** Blockchain-secured TCG marketplace
- **Domain:** chasehollow.com
- **GitHub:** github.com/nyteowl9/troveexchange
- **Local:** C:\Users\pdwat\Desktop\troveexchange
- **Deploy:** Vercel (auto-deploys on push to main)
- **Git terminal:** CMD only (not PowerShell)
- **Social:** @chasehollowtcg on X

---

## Stack
```
Frontend:    Next.js 16 · Tailwind · app/ directory
Database:    Supabase (PostgreSQL + Auth + Realtime + Storage)
Blockchain:  Base L2 (Ethereum L2) · Solidity · Hardhat
RPC:         Alchemy
Wallets:     WalletConnect · Privy (embedded wallets)
Shipping:    Shippo (multi-carrier · labels · webhooks)
Tax:         TaxJar (deferred until ~$50k GMV)
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
| /coming-soon | app/coming-soon/page.js | Pre-launch landing page — active redirect |
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

## Coming-Soon Redirect (Active)
```
middleware.js redirects all traffic → /coming-soon
Exceptions: /api/* routes, requests with ch-bypass cookie

Owner bypass: visit /api/preview?secret=<PREVIEW_SECRET>
  Sets 30-day ch-bypass cookie → full site access
  Add ?clear=1 to remove cookie
  PREVIEW_SECRET env var set in Vercel

To disable redirect: remove the coming-soon block in middleware.js
Countdown target: 2026-05-21 (set in app/coming-soon/page.js LAUNCH_DATE)
```

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

### Authentication Tiers

**No-Auth Zone ($0–$99) — auth_tier = 'none', no bond**
```
Seller choice per listing (free_shipping boolean on listings table):
  free_shipping = true  → Seller self-ships with own label at own expense
                          Buyer pays nothing for shipping
                          "FREE SHIPPING" badge shown on marketplace
  free_shipping = false → Chase Hollow generates Shippo label
                          Buyer pays shipping cost at checkout
Auth:     None — no photo review required
Bond:     None — escrow + strike system is sufficient accountability
Photos:   Pre-ship evidence photos still uploaded (for dispute protection)
Window:   72hr buyer inspection after delivery
Threshold: self_ship_max_value in tier_config (default $100, admin-editable)
```

**Tier 1 — Remote Photo Auth ($100–$300) — auth_tier = 'remote'**
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

**Tier 2 — Physical Auth ($301–$50,000) — auth_tier = 'physical'**
```
Auth fee:     $25 (buyer pays)
Shipping:     Label A: seller → Chase Hollow auth center
              Label B: auth center → buyer
              Both Chase Hollow Shippo labels
              Declared value = sale price (automatic)
Auth center:  4091 North Ammon Road, Idaho Falls ID 83401
              (home address — update when permanent location confirmed)
Timing:       48hrs to ship (Label A) — same extension rules
Auth:         Physical inspection at auth center
              Graded: photo match, grade label, cert DB verify,
                      slab integrity, holo sticker
              Raw: condition match, no undisclosed damage
              6 photos taken by staff, stored in Supabase Storage (auth-photos private bucket)
              PASS → Label B generated → ships to buyer
              FAIL → full refund + strike
Window:       72hr buyer inspection after delivery (both tiers)
```

**Phase 2 — Trust Tier (future)**
```
Eligible:     Elite sellers by default (configurable to Legend in admin)
              Thresholds stored in Supabase tier_config table (no redeployment)
Criteria:     500+ sales (Elite) OR 2,500+ sales (Legend)
              Dispute loss rate < 2% of completed orders
              No dispute loss in last 90 days
              Account age ≥ 365 days
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

### Dispute Flow (Buyer Wins)
```
1. Buyer opens dispute → evidence submitted
2. Seller has 48hr window to submit counter-evidence + photos
3. Staff reviews all evidence (listing photos, pre-ship photos, buyer/seller evidence)
4. Staff submits recommendation (never executes)
5. Owner executes → Label C generated (buyer → seller return)
6. Buyer ships card back within 5 days
7. Label C delivered → order = return_received_seller
8. Seller inspects return (72hr window):
   - Correct card → confirm-return → on-chain resolveDispute(true) → buyer refunded
   - Wrong card → dispute-return (photos + notes) → back to staff review → owner executes immediately
```

### Bond System
```
New Seller:   4% bond per transaction
Trusted:      3% (10–99 sales)
Pro:          2% (100–499 sales)
Elite:        1% (500–2,499 sales)
Legend:       1% (2,500+ sales)
Strike 2:     Bond jumps to 4% regardless of tier

Posted:       When buyer purchases (not at listing time)
Returns:      5–7 business days after settlement
Forfeited:    If seller loses dispute
```

### Strike System
```
New seller first offense:  Warning only (strike_number = 0)
Strike 1:                  7-day suspension
Strike 2:                  30-day suspension + bond → 4%
Strike 3:                  Permanent ban
Trigger:                   No carrier scan by T+48hrs (automatic via cron)
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
          Uses DISPUTE_RESOLVER_PRIVATE_KEY (not OWNER_PRIVATE_KEY)
Buyer wins:   Label C → return → on-chain resolveDispute(true) → refund
Seller wins:  on-chain resolveDispute(false) → escrow releases to seller
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

NOTE: Hot wallet (OPERATOR_PRIVATE_KEY) and W1 Safe multisig are intentionally
separate and must NEVER be the same wallet.
Guardian address: 0x14721FdF...78B3 (set in contract)
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

### Phase 2 — Backend ✅ COMPLETE (April 2026)
```
✓ Supabase schema — all tables, RLS, storage buckets
✓ Role-based middleware (owner/staff/authenticator/dispute_resolver)
✓ Privy wallet integration (Base mainnet locked)
✓ Shippo shipping (labels A/B/C/D, webhooks, signature thresholds)
✓ Resend email (all transactional emails)
✓ Cron jobs: strike-check (hourly), listing-expiry (daily), auto-release (hourly), bond-return (daily)
✓ Full dispute flow (evidence, staff rec, owner execute, return chain)
✓ Creator attribution (?ref= cookie, conversion tracking, monthly payout)
✓ Admin panel (orders, disputes, users, strikes, listings, platform settings)
✓ Coming-soon landing page + email waitlist capture
✓ Preview bypass system (PREVIEW_SECRET env var)

All Phase 2 flows tested end-to-end (April 2026):
  ✓ Tier 1 full flow (list → buy → ship → auth → deliver → release)
  ✓ Tier 2 full flow (list → buy → ship → auth center → deliver → release)
  ✓ Auto-release cron
  ✓ Listing expiry cron (Day 90 pause, Day 100 remove)
  ✓ Strike-check cron (warning, Strike 1, Strike 2, Strike 3)
  ✓ Auth fail Tier 1 (Label C return → seller confirm → refund)
  ✓ Full dispute flow (buyer opens → staff rec → owner execute → Label C → seller confirm)
  ✓ Return dispute (seller claims wrong card → photos → admin override)
```

### Phase 3 — Blockchain (CURRENT)
```
✓ Solidity contract v1.2 — ChaseHollowEscrow
✓ Deployed to Base Sepolia testnet
✓ External audit fixes applied (contract v1.2)
✓ End-to-end tested on testnet (real USDC, real labels, real transactions)
✓ Self-ship flow: seller label choice (own vs CH), Shippo tracking registration,
    buyer confirm-receipt button, fraud detection (Day 3/7/12 warnings)
✓ Free_shipping payout fix: label cost encoded as shippingFee in fundOrder so
    on-chain sellerPayout is correctly reduced (no contract change needed)
✓ Seller CH label confirmation modal with full payout breakdown
✓ All address objects include phone fallback (fixes Shippo validation errors)
✓ 0-bond orders: always call confirmOrder on-chain (was silently skipped)
✓ Self-ship escrow-release cron: markDelivered → inspection_window → releaseEscrow
✓ Migrations 035, 036, 037 applied May 2026

□ Deploy contract to Base mainnet
□ Safe multisig setup (W2/W3/W4 holders TBD)
□ Flip 3 Vercel env vars to mainnet values:
    NEXT_PUBLIC_CHAIN_ID=8453
    NEXT_PUBLIC_ESCROW_ADDRESS=<mainnet deployed address>
    NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
□ Remove coming-soon redirect from middleware.js
□ Upgrade Vercel to Pro (hobby = daily crons only; need hourly)
□ Beta seller onboarding (invite-only)
□ Public launch
```

---

## Supabase Schema Reference
```sql
users (id, email, wallet_address, role, strike_count, buyer_strike_count,
       joined_at, suspended_until, banned,
       seller_tier [new|trusted|pro|elite|legend], total_sales,
       seller_rep_score, seller_review_count,
       buyer_rep_score, buyer_review_count,
       dispute_losses, last_dispute_loss_at,
       full_name, username, street1, street2, city, state, zip, country)

listings (id, seller_id, game, set, card_name, card_number,
          grade, grader, cert_number, condition, listing_type,
          price, auth_tier, photos[], status, expires_at,
          expiry_warned_75, expiry_warned_85, expiry_warned_97)

orders (id, listing_id, buyer_id, seller_id, auth_tier,
        escrow_amount, escrow_tx_hash, onchain_order_id,
        platform_fee, creator_fee, auth_fee,
        label_a_url, label_b_url, label_c_url, label_d_url,
        tracking_a, tracking_b, tracking_c, tracking_d,
        declared_value, shipping_cost, sales_tax,
        ship_deadline, ship_reminder_sent, strike_applied_at,
        bond_tx_hash, bond_amount, bond_returned_at,
        ship_method [shippo|self_ship|self_ship_untracked],
        self_ship_carrier,
        carrier_scanned_at,
        self_ship_no_scan_warned_at,
        self_ship_warned_7d_at,
        self_ship_warned_12d_at,
        release_tx_hash,
        status, shipped_at, delivered_at, auto_release_at, released_at,
        return_deadline_at, return_review_deadline_at)

auth_inspections (id, order_id, authenticator_id,
                  type, checklist, photos[], decision, notes, created_at)
-- decision: pending | pass | fail | waived
-- waived = buyer waived auth (auth_tier='none'), photos are seller pre-ship evidence

disputes (id, order_id, raised_by, reason,
          buyer_evidence[], seller_evidence[], seller_notes,
          seller_return_evidence[], seller_return_notes,
          seller_evidence_deadline,
          staff_recommendation, owner_decision, outcome,
          resolved_by, resolved_at, onchain_tx_hash, notes)

strikes (id, user_id, order_id, strike_number,
         strike_role [seller|buyer], reason, action_taken,
         appealed, appeal_notes, appeal_outcome)
-- strike_number=0 for warnings

creators (id, user_id, handle, platform, channel_url,
          wallet_address, ref_code, status, approved_at)

referral_conversions (id, creator_id, order_id,
                      sale_amount, commission, paid)

reviews (id, order_id, reviewer_id, reviewed_id,
         reviewer_role [buyer|seller], rating 1-5, comment,
         flagged, created_at)

tier_config (singleton — admin editable via /admin → Platform Settings)
  trusted_min_sales, pro_min_sales, elite_min_sales, legend_min_sales
  elite_max_dispute_rate, elite_min_account_age_days, elite_no_dispute_loss_days
  trust_tier_unlocks_at [elite|legend]
  self_ship_max_value, self_ship_release_days
  staff_alert_email  -- receives Day-3 no-carrier-scan alerts (migrations 035-037 applied May 2026)

early_access (id, email unique, created_at)
-- Waitlist signups from /coming-soon page
```

---

## Cron Jobs (Vercel)
```
/api/cron/strike-check     hourly  — 24hr ship reminders + auto-strike missed deadlines
/api/cron/listing-expiry   daily   — Day 75/85/90/97/100 warnings + pause + remove
/api/cron/auto-release     hourly  — Release escrow T+72hrs after delivery
/api/cron/bond-return      daily   — Return seller bonds T+5 days after settlement

NOTE: Vercel Hobby plan = daily crons only.
Upgrade to Pro before launch to restore hourly schedule.
All routes protected by Authorization: Bearer <CRON_SECRET> header.
```

## Shippo Label Chain
```
Label A: seller → auth center (Tier 2) OR seller → buyer (Tier 1)
Label B: auth center → buyer (Tier 2 only)
Label C: buyer → seller (dispute return Tier 1) OR buyer → auth center (Tier 2)
Label D: auth center → seller (Tier 2 dispute return only)

Webhooks: track_updated TRANSIT → in_transit
          track_updated DELIVERED → next status per label type
```

---

## Email Notifications (Resend)
```
Buyer:   Purchase confirmed · Seller shipped · Auth passed/failed ·
         Card delivered · Funds released · Dispute opened/resolved ·
         Auth fail return label

Seller:  Sale — ship within 48hrs · 24hr reminder ·
         Auth passed/failed · Funds released ·
         Dispute opened · Strike applied · Bond returned ·
         Return received for review
```

---

## Environment Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Blockchain (testnet values for local dev — swap for mainnet on launch)
ALCHEMY_RPC_URL=
NEXT_PUBLIC_CHAIN_ID=84532            # 84532=Sepolia testnet · 8453=mainnet
NEXT_PUBLIC_ESCROW_ADDRESS=           # ChaseHollowEscrow deployed address
NEXT_PUBLIC_USDC_ADDRESS=             # MockUSDC on testnet · 0x833589f...on mainnet
OPERATOR_PRIVATE_KEY=                 # Hot wallet — added as operator on contract
DISPUTE_RESOLVER_PRIVATE_KEY=         # Separate key for resolveDispute calls

# Shipping
SHIPPO_API_KEY=
SHIPPO_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Wallets
NEXT_PUBLIC_PRIVY_APP_ID=
WALLETCONNECT_PROJECT_ID=

# Automation
CRON_SECRET=                          # Bearer token for cron route protection

# Preview bypass
PREVIEW_SECRET=                       # Set in Vercel — bypasses coming-soon redirect
                                      # Visit /api/preview?secret=<value> to set cookie

# Deferred
TAXJAR_API_KEY=                       # Not active — deferred until ~$50k GMV
```

---

## Pre-Launch Checklist
```
✅ Terms of Service — lawyer approved April 2026
✅ Supabase email confirmation — re-enabled April 2026
✅ Google OAuth — published to production April 2026
✅ Shippo auth center address — 4091 North Ammon Road, Idaho Falls ID 83401
✅ Contract v1.2 audit fixes applied
✅ All Phase 2 flows tested end-to-end

□ Wyoming LLC + registered agent (~$50-100/yr)
  → Add registered agent address to ToS contact section once formed
□ Commercial inland marine insurance (~$200-400/mo)
  → REQUIRED before accepting any physical card at auth center
□ Safe multisig W2/W3/W4 wallet holders confirmed
□ Deploy contract to Base mainnet
□ Flip 3 Vercel env vars to mainnet values
□ Upgrade Vercel to Pro (hourly crons)
□ Update ToS [DATE] placeholder once LLC formed
□ TaxJar — deferred until ~$50k GMV
```

---

## Key Decisions — Never Change Without Review
- Auth is NEVER optional — every card photo or physically authenticated
- Never use the word "guarantee" — use "authenticate" or "verified"
- Platform fee never shown to buyer
- Buyer protection fee: NONE (seller bond covers disputes)
- Bond is collateral, not a fee — always shown separately
- Max listing $50,000 at launch
- USDC on Base only — no other tokens/chains
- Chase Hollow generates ALL labels (no seller labels Phase 1)
- Wallet connection deferred until transaction time
- Listings go live immediately — no wallet needed to list
- DISPUTE_RESOLVER_PRIVATE_KEY ≠ OWNER_PRIVATE_KEY — never mix these
- Hot wallet (OPERATOR_PRIVATE_KEY) ≠ W1 Safe multisig — intentionally separate
