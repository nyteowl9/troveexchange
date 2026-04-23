# ChaseHollowEscrow — Security Audit Brief

**Version:** v1.2  
**Network:** Base L2 (EVM-equivalent)  
**Token:** USDC (ERC-20, 6 decimals)  
**Solidity:** ^0.8.24  
**OpenZeppelin:** Ownable2Step, Pausable, ReentrancyGuard, SafeERC20  
**Testnet:** Base Sepolia — `0x43E2d4656c0990cbF05f69802b75857728913748` (verified)  
**Tests:** 139/139 passing (Hardhat)

---

## What This Contract Does

ChaseHollowEscrow is a USDC escrow contract for a TCG (trading card game) marketplace on Base. Buyers lock USDC when purchasing a card. Funds are held until the card is authenticated and delivered, then released to the seller. The contract handles the full lifecycle: funding, seller bond, delivery confirmation, inspection window, early release, auto-release, disputes, auth failures, and cancellations.

Cards are authenticated by Chase Hollow staff before or during delivery. The contract enforces all financial flows — no off-chain system can move funds without a corresponding on-chain call.

---

## Roles

| Role | Who | What they can do |
|------|-----|-----------------|
| **Owner** | Gnosis Safe (4-of-4 multisig) | Add/remove operators and dispute resolvers, set fees, pause, emergency sweep (when paused), ownerRemoveGuardian (tiebreaker only) |
| **Operator** | Vercel hot wallet | `markDelivered`, `releaseEscrow` (auto-release cron), `cancelOrder`, `refundBuyer` (auth fail), batch variants |
| **DisputeResolver** | Vercel hot wallet | `resolveDispute`, `batchResolveDisputes`. Owner also passes this check as fallback. |
| **Guardian** | Air-gapped key(s) | Propose/execute/cancel `feeRecipient` changes (72hr timelock). Propose/execute/cancel guardian membership changes (72hr timelock). Completely isolated from owner Safe. |
| **Buyer** | End user (wallet) | `fundOrder`, `releaseEscrow` (early), `openDispute` |
| **Seller** | End user (wallet) | `confirmOrder` (post bond) |

---

## Order Lifecycle

```
fundOrder()          → AwaitingConfirmation   (buyer locks USDC)
confirmOrder()       → Active                 (seller posts bond)
markDelivered()      → Delivered              (72hr inspection window starts)
  ├── releaseEscrow() [buyer early or cron]   → Released
  └── openDispute()  [buyer, within window]   → Disputed
        └── resolveDispute(buyerWins)          → RefundedToBuyer
            resolveDispute(!buyerWins)         → Released (via _distribute)

cancelOrder()        → Cancelled              (before delivery, operator/owner)
refundBuyer()        → RefundedToBuyer        (auth fail, operator/owner)
```

---

## Fee Distribution on Release

All amounts are USDC (6 decimals). Enforced by `fundOrder` sum check:

```
escrowAmount = sellerPayout + platformFee + creatorFee + authFee + shippingFee + salesTax
```

On `_distribute` (happy path or seller-wins dispute):
- `sellerPayout` → seller
- `platformFee + authFee + shippingFee + salesTax` → feeRecipient (Safe treasury)
- `creatorFee` → creator wallet, or feeRecipient if no creator
- `sellerBond` → returned to seller

On `resolveDispute(buyerWins=true)`:
- `escrowAmount - shippingFee` → buyer (shipping non-refundable)
- `shippingFee + sellerBond` → feeRecipient (covers return label costs)

---

## Key Security Properties

### Fee Enforcement
`fundOrder` validates that `platformFee` and `creatorFee` meet the minimum BPS on-chain:
```solidity
uint256 cardValue = escrowAmount - authFee - shippingFee - salesTax;
require(platformFee >= cardValue * platformFeeBps / 10000, "Platform fee below minimum");
require(creatorFee  >= cardValue * creatorFeeBps  / 10000, "Creator fee below minimum");
```
No one can bypass platform fees by calling the contract directly with underpriced values.

### Guardian Isolation
The `feeRecipient` (treasury) is controlled exclusively by guardian(s), not the owner Safe. A fully compromised owner Safe cannot redirect fee payments. Specific properties:

- Owner **cannot** call `proposeFeeRecipient`, `executeFeeRecipientChange`, or any guardian management function
- Owner **cannot** add a guardian (`ownerRemoveGuardian` removes only — surviving guardian adds replacement)
- Guardian changes have a 72hr timelock during which either guardian can cancel
- At least one guardian must always exist (enforced in removal functions)
- `ownerRemoveGuardian` is a deadlock tiebreaker only — it cannot bypass the timelock, and it cannot add

### Reentrancy
All state-mutating functions use `nonReentrant`. Status is updated before any external USDC transfer calls in every path.

### Pause Coverage
`whenNotPaused` applied to `fundOrder` and `confirmOrder` (new funds entering). Existing orders can still be released/resolved while paused. `sweepStuckFunds` is only callable when paused — forces an explicit pause decision before emergency drain.

### Order ID Collision
`fundOrder` reverts if `orders[orderId].buyer != address(0)`. Order IDs are 32-byte values generated client-side with `ethers.randomBytes(32)` — collision probability is negligible.

### Inspection Window
`openDispute` requires `block.timestamp < order.autoReleaseAt` — strictly before the window closes. Once `releaseEscrow` executes (status → Released), the order is terminal.

---

## Areas We Want Specifically Reviewed

1. **Guardian / feeRecipient isolation** — Is it truly impossible for a compromised owner Safe to redirect feeRecipient? Are there any indirect attack paths?

2. **`ownerRemoveGuardian` tiebreaker** — Does this introduce any new attack vector? Can owner use it to effectively take control of guardian slot by repeatedly removing guardians until only a colluding one remains?

3. **Fee validation arithmetic** — Any rounding or truncation edge cases in the BPS check that allow fee bypass? Integer division floors in `cardValue * feeBps / 10000` — can a caller craft amounts to pass the check with effectively 0 fees?

4. **`_distribute` internal function** — Called from `releaseEscrow`, `batchReleaseEscrow`, `resolveDispute` (seller wins), and `batchResolveDisputes`. Confirm no paths reach `_distribute` with incorrect status or double-execution.

5. **`sweepStuckFunds`** — Is the pause-gate sufficient? What happens to in-flight order funds if swept — can they be double-counted or re-released?

6. **Batch functions** — Silent skip pattern (continue on invalid orders rather than revert). Is this the right behavior? Can it be exploited?

7. **`sellerConfirmWindow` expiry check** — Only checked in `confirmOrder`. Operator calls `cancelOrder` after expiry. Is there a window where a seller can front-run `cancelOrder` with a `confirmOrder` after expiry?

8. **`releaseEscrow` authorization** — Two paths: buyer (any time after Delivered) or operator/owner (after autoReleaseAt). No check that `autoReleaseAt > 0` for operator path — is this an issue given it's always set in `markDelivered`?

---

## What Is NOT In Scope

- The Next.js application layer (off-chain)
- Supabase database / Row Level Security
- MockUSDC (testnet only — mainnet uses `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- Shippo / Resend / Alchemy integrations
- Gnosis Safe configuration (out of scope — standard Safe)

---

## Known Design Decisions (not bugs)

- **Shipping is non-refundable on buyer-wins dispute.** Labels A and B were already purchased and used. The forfeited shipping + bond funds Label C and D for the return chain.
- **Creator fee goes to feeRecipient if `creator == address(0)`** — no creator attribution on that order.
- **Operator can `markDelivered` without checking `deliveredAt`** — not relevant since status gates it. `markDelivered` can only run once per order (requires `Active` status).
- **`batchResolveDisputes` silently skips non-Disputed orders** — intentional. Allows staff to submit a batch without needing to pre-filter.
- **`sellerBond` in `Order` struct is set to 0 at creation, updated in `confirmOrder`** — the value stored is the actual bond posted, not the required amount (that's `sellerBondRequired`).

---

## Test Suite

139 Hardhat tests covering:
- Full happy path (Tier 1 and Tier 2)
- All dispute outcomes (buyer wins, seller wins)
- Auth fail / refundBuyer
- Cancel (AwaitingConfirmation and Active)
- Batch operations (markDelivered, release, refund, cancel, resolveDisputes)
- Fee enforcement (BPS validation, sum check)
- Guardian system (add, remove, timelock, cancel, deadlock tiebreaker)
- Fee recipient change (propose, execute, cancel, timelock)
- Pause / unpause / sweepStuckFunds
- Operator / dispute resolver management
- All revert conditions

Run with:
```
npx hardhat test
```

---

## Repo Access

GitHub: github.com/nyteowl9/troveexchange  
Contract: `contracts/ChaseHollowEscrow.sol`  
Tests: `test/ChaseHollowEscrow.js`  
Deploy script: `scripts/deploy.js`  
Hardhat config: `hardhat.config.js`

Testnet deployment (Base Sepolia, verified on BaseScan):  
`0x43E2d4656c0990cbF05f69802b75857728913748`

---

## Contact

Brandon — nyteowl9@gmail.com
