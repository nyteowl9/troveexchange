-- Free shipping toggle on listings + updated tier thresholds
-- Sellers under the no-auth threshold can offer free shipping (self-ship)
-- or charge the buyer shipping (Chase Hollow generates the label)

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false;

-- New default thresholds for the revised tier structure:
--   $0–$99.99  → no auth, no bond (seller chooses: self-ship or buyer-pays-shipping)
--   $100–$300  → Tier 1 remote photo auth ($10)
--   $301+      → Tier 2 physical auth ($25)
-- Optional auth waiver raised to $500.
UPDATE public.tier_config SET
  self_ship_max_value     = 100,
  optional_auth_max_price = 500
WHERE id = 1;
