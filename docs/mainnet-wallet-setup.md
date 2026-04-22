# Chase Hollow — Mainnet Wallet Setup

Last updated: April 2026

---

## The Structure at a Glance

```
Contract Owner = Gnosis Safe address
                       │
          ┌────────────┼────────────┐────────────┐
         S1            S2           S3            S4
    (Your hot)   (Hardware)    (Cold)       (Lawyer)
    2-of-4 required for most Safe actions

Operator wallet      → Vercel (hot, marks orders delivered)
Dispute Resolver     → Vercel (hot, executes resolveDispute)
Guardian 1           → Air-gapped (controls fee recipient)
Guardian 2           → Separate secure key (can replace G1 if compromised)
Fee Recipient        → Safe address (treasury — receives all fees)
```

---

## Wallet Reference

### Gnosis Safe

The Safe is the **owner** of the ChaseHollowEscrow contract.
It is a single address (e.g. `0xSafe...`) with 4 signers.
The Safe itself holds no private key — it executes transactions only when M-of-4 signers approve.

**Signing threshold:**
- Standard ops (add operator, fee changes): 2-of-4
- Treasury withdrawal: 3-of-4
- Emergency pause / upgrade / large withdrawal: 4-of-4

| Signer | Role | Wallet Type | Who Holds It |
|--------|------|-------------|-------------|
| **S1** | Hot co-signer | MetaMask or software | You (daily use) |
| **S2** | Warm co-signer | Hardware wallet (Ledger/Trezor) | You (kept accessible) |
| **S3** | Cold backup | Hardware wallet, offline | You (stored securely) |
| **S4** | Dead man's switch | Any wallet | Lawyer or trusted party — activates if you're unreachable for 90 days |

**What the Safe (Owner) can do in the contract:**
- Add / remove Operators
- Add / remove Dispute Resolvers
- Set platform fee bps (platform + creator)
- Set buyer inspection window, seller ship deadline, seller confirm window
- Set max order value
- Pause / unpause the contract
- Emergency sweep of stuck funds (only when paused)
- **Cannot** touch Guardians or feeRecipient — those are fully isolated

---

### Hot Wallets (Go in Vercel)

These are the only two private keys that ever enter Vercel.
Create fresh wallets for mainnet — never reuse testnet keys.

| Wallet | Vercel Env Var | What It Does |
|--------|---------------|--------------|
| **Operator** | `OPERATOR_PRIVATE_KEY` | Calls `markDelivered` (Shippo webhook), `releaseEscrow` (cron auto-release), `refundBuyer` (auth fail), `cancelOrder` |
| **Dispute Resolver** | `DISPUTE_RESOLVER_PRIVATE_KEY` | Calls `resolveDispute` when owner executes a dispute decision in the portal |

**Both wallets need a small ETH balance on Base for gas (~0.01 ETH each to start).**
Registered on-chain via Safe → `addOperator(address)` and `addDisputeResolver(address)` before going live.

---

### Guardian Wallets (Never in Vercel)

Guardians are completely isolated from the Safe/owner — the owner cannot add, remove, or replace guardians.
Only a guardian can manage other guardians. This closes the "owner rotates guardian first" attack.

You deploy with **Guardian 1**. After deployment, Guardian 1 calls `addGuardian(guardian2Address)` on-chain to register Guardian 2.

| Guardian | Role | Who Holds It |
|----------|------|-------------|
| **G1** | Primary guardian | You — air-gapped hardware wallet or offline key |
| **G2** | Backup guardian | Separate secure key — can replace G1 if G1 is compromised |

**What Guardians can do (either one acting alone):**
- `proposeFeeRecipient(address)` — propose a new fee recipient address (starts **72hr timelock**)
- `executeFeeRecipientChange()` — execute the change after 72hrs
- `cancelFeeRecipientChange()` — cancel a pending proposal
- `proposeGuardianChange(address, bool)` — propose adding or removing a guardian (starts **72hr timelock**)
- `executeGuardianChange()` — execute the guardian change after 72hrs
- `cancelGuardianChange()` — cancel a pending guardian change

**What Guardians cannot do:**
- Pause the contract (owner only)
- Move funds
- Add/remove operators or dispute resolvers

**Guardian compromise scenario:**
If G1 is compromised: G2 calls `proposeGuardianChange(oldG1, false)`, waits 72hrs, executes removal. Then proposes to add a new G1.
If G1 and G2 are deadlocked (each cancelling the other's proposals): Owner calls `ownerRemoveGuardian(compromisedGuardian)` — this is the tiebreaker. Owner can remove but **cannot add** — the surviving guardian still controls who gets added.
If both are compromised: Owner calls `pause()` to freeze the 72hr timelock window, then coordinates off-chain to recover.

**Owner's limited guardian power (Option 2 tiebreaker):**
- `ownerRemoveGuardian(address)` — Safe can remove a guardian to break a deadlock
- Safe **cannot add** a guardian — adding remains guardian-only, so owner cannot install their own choice

---

### Fee Recipient

Not a signing key — just an **address** that receives all platform fees on settlement.

On mainnet this should be a **separate Safe** (treasury multisig), not a plain wallet.
It can be the same Safe as the owner Safe, or a separate one for cleaner accounting.

Set during contract deployment as a constructor parameter.
Can only be changed by a guardian (with 48hr timelock).

---

## Full Vercel Environment Variables (Mainnet)

```
# Addresses (not secret — public)
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_ESCROW_ADDRESS=<mainnet deployed address>
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# RPC
ALCHEMY_RPC_URL=<Alchemy Base mainnet URL>

# Hot wallet private keys — the only keys in Vercel
OPERATOR_PRIVATE_KEY=<Operator wallet private key>
DISPUTE_RESOLVER_PRIVATE_KEY=<Dispute Resolver wallet private key>

# All other existing env vars (Supabase, Shippo, Resend, Privy etc.) unchanged
```

**NEVER add to Vercel:**
- Any Safe signer key (S1, S2, S3, S4)
- Guardian keys (G1, G2)
- Fee recipient key

---

## Staff Roles (Supabase)

Set via Supabase dashboard → Table Editor → `users` → `role` column.
Or via /admin → Users.

| Role | Portal Access | What They Can Do |
|------|--------------|-----------------|
| **`owner`** | /admin, /dispute-resolution, /customer-support, /authenticator | Full access — execute dispute decisions, manage users, manage tiers, platform settings, remove strikes, void disputes, creator payouts, view all orders/escrow |
| **`dispute_resolver`** | /dispute-resolution | View dispute queue, **execute** `resolveDispute` on-chain (same power as owner for disputes only). Cannot access /admin or manage users. |
| **`staff`** | /dispute-resolution, /customer-support | View dispute queue, **recommend** outcomes (never execute), customer support, view auth inspections |
| **`authenticator`** | /authenticator | Physical inspection queue, upload 6 inspection photos, pass/fail cards, generate Label B (auth passed), flag wrong card returns |

**Role hierarchy for sensitive actions:**

| Action | Who Can Do It |
|--------|--------------|
| Execute dispute decision | `owner`, `dispute_resolver` |
| Recommend dispute outcome | `staff`, `owner` |
| View dispute queue | `staff`, `owner`, `dispute_resolver` |
| Auth inspections (pass/fail) | `authenticator`, `staff`, `owner` |
| Wrong card flag | `authenticator`, `staff`, `owner` |
| Admin panel | `owner` only |
| Remove user strike | `owner` only |
| Void dispute for tier calc | `owner` only |
| Creator payout | `owner` only |
| Platform settings | `owner` only |

---

## Pre-Launch Checklist

- [ ] Create Operator wallet (fresh) — fund with ~0.01 ETH on Base
- [ ] Create Dispute Resolver wallet (fresh) — fund with ~0.01 ETH on Base
- [ ] Create S1, S2, S3, S4 wallets
- [ ] Deploy Gnosis Safe with S1–S4, set threshold to 2-of-4
- [ ] Create Guardian 1 wallet (air-gapped)
- [ ] Create Guardian 2 wallet (separate secure key)
- [ ] Deploy ChaseHollowEscrow to Base mainnet with Safe address as owner and G1 as guardian
- [ ] From Safe: call `addOperator(operatorAddress)`
- [ ] From Safe: call `addDisputeResolver(disputeResolverAddress)`
- [ ] From G1: call `addGuardian(g2Address)` on deployed contract
- [ ] Verify contract on BaseScan
- [ ] Add `OPERATOR_PRIVATE_KEY` and `DISPUTE_RESOLVER_PRIVATE_KEY` to Vercel
- [ ] Update `NEXT_PUBLIC_ESCROW_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `ALCHEMY_RPC_URL` in Vercel
- [ ] Upgrade Vercel to Pro (15-min cron for escrow-release)
- [ ] Re-enable email confirmation in Supabase
- [ ] Publish Google OAuth consent screen (Testing → Production)
