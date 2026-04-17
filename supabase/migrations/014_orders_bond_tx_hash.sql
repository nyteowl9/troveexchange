-- ============================================================
-- MIGRATION 014 — Add bond_tx_hash to orders
-- ============================================================
-- Tracks whether the seller has posted their bond on-chain.
-- NULL = bond not yet posted.
-- Set to the confirmOrder() tx hash once the seller signs.

alter table public.orders
  add column if not exists bond_tx_hash text;
