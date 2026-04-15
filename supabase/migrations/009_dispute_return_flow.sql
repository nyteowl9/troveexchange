-- ============================================================
-- MIGRATION 009 — Dispute Return Shipping Flow + Bond Floor
-- ============================================================
-- 1. Adds min_bond_floor_usd to tier_config (flat $USD added on
--    top of bond% — covers worst-case Labels B + C + D exposure)
--    Bond formula: bond = min_bond_floor_usd + (price × bond%)
--
-- 2. Adds Label C/D columns to orders (return shipping chain)
--    Label C: buyer → auth center  (buyer ships card back)
--    Label D: auth center → seller (after auth center verifies return)
--
-- 3. Extends order status enum for dispute return flow states
--
-- 4. Adds owner_decision + resolved_at to disputes table

-- ── tier_config: bond floor ───────────────────────────────────
alter table public.tier_config
  add column if not exists min_bond_floor_usd integer not null default 20;
-- Formula at checkout:
--   sellerBond = min_bond_floor_usd + round(price × bondBps / 10000)
-- Default $20 floor covers worst-case return shipping:
--   Label B (auth→buyer, ~$15) + Label C (buyer→auth, ~$10) + Label D (auth→seller, ~$10)
--   New seller on $400 card: $20 + (400 × 400/10000) = $20 + $16 = $36 ✓
--   Elite seller on $400 card: $20 + (400 × 100/10000) = $20 + $4 = $24 (slight risk, acceptable)

-- ── orders: return label columns ─────────────────────────────
alter table public.orders
  add column if not exists label_c_url   text,   -- buyer → auth center (return)
  add column if not exists label_d_url   text,   -- auth center → seller (final return)
  add column if not exists tracking_c    text,
  add column if not exists tracking_d    text;

-- ── orders: return flow status values ────────────────────────
-- Extend the status check constraint if one exists.
-- If the column is a plain text field this is a no-op guard.
do $$
begin
  -- Add awaiting_return status support.
  -- If status is constrained via a named check, drop and recreate.
  -- If unconstrained text, nothing to do.
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'orders_status_check'
  ) then
    alter table public.orders
      drop constraint orders_status_check;
    alter table public.orders
      add constraint orders_status_check check (status in (
        'pending',
        'awaiting_shipment',
        'in_transit',
        'auth_review',
        'auth_passed',
        'auth_failed',
        'inspection_window',
        'disputed',
        'awaiting_return',   -- owner decided buyer wins, Label C generated
        'return_received',   -- Label C delivered to auth center
        'return_verified',   -- auth center inspected return, Label D generated
        'released',
        'refunded',
        'cancelled'
      ));
  end if;
end $$;

-- ── orders: on-chain order ID ────────────────────────────────
-- The bytes32 passed to fundOrder on-chain. Must be stored at checkout
-- so the webhook can call resolveDispute(onchain_order_id, ...) later.
alter table public.orders
  add column if not exists onchain_order_id text;   -- hex bytes32, e.g. "0xabc123..."

-- ── disputes: owner_decision + resolved_at ───────────────────
alter table public.disputes
  add column if not exists owner_decision  text check (owner_decision in ('buyer_wins', 'seller_wins')),
  add column if not exists resolved_at     timestamptz,
  add column if not exists onchain_tx_hash text;   -- hash of the on-chain resolveDispute tx
-- Note: outcome column already exists. owner_decision is set immediately
-- when owner makes their call. outcome is set after on-chain execution.
-- For seller wins: both happen simultaneously.
-- For buyer wins: owner_decision is set first; outcome is set when Label D delivers.
