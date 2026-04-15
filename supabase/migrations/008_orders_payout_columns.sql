-- ============================================================
-- MIGRATION 008 — Orders: seller_payout + split shipping costs
-- ============================================================
-- Adds seller_payout (mirrors on-chain value, never re-calculated)
-- and splits shipping_cost into label_a_cost + label_b_cost
-- for Tier 2 orders where costs are borne by different parties.

alter table public.orders
  -- Exact seller payout — stored at order creation, mirrors contract sellerPayout
  add column if not exists seller_payout   numeric(12,2),

  -- Tier 2 shipping split
  -- label_a_cost: seller → auth center (deducted from seller payout)
  -- label_b_cost: auth center → buyer  (paid by buyer, = shipping_cost for display)
  add column if not exists label_a_cost    numeric(12,2),
  add column if not exists label_b_cost    numeric(12,2);

-- Note: existing shipping_cost column remains for Tier 1 (single label, buyer pays).
-- For Tier 2: label_a_cost + label_b_cost replace shipping_cost in calculations.
-- Checkout wiring should populate all three appropriately.
