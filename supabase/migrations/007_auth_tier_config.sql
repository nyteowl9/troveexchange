-- ============================================================
-- MIGRATION 007 — Auth Tier Thresholds in tier_config
-- ============================================================
-- Adds auth tier price thresholds and fee amounts to the
-- existing tier_config singleton row so they're admin-editable
-- without code changes.

alter table public.tier_config
  add column if not exists remote_auth_max_value   integer not null default 300,   -- cards $1–$300 → Tier 1 remote
  add column if not exists physical_auth_max_value integer not null default 50000, -- cards $301–$50k → Tier 2 physical
  add column if not exists remote_auth_fee         integer not null default 10,    -- buyer pays (USDC, whole dollars)
  add column if not exists physical_auth_fee       integer not null default 25;    -- buyer pays (USDC, whole dollars)
-- Note: values stored as whole dollar amounts (no decimals).
-- Checkout multiplies by 1e6 for USDC 6-decimal precision.
