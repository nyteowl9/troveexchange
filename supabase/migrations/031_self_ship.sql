-- Self-ship: allow sellers to use their own labels for low-value orders

-- Track how the order was shipped
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ship_method text DEFAULT 'shippo';
-- 'shippo'              → normal Chase Hollow generated label
-- 'self_ship'           → seller shipped with their own tracked label
-- 'self_ship_untracked' → seller shipped with no tracking (buyer assumes risk on delivery)

-- Store the carrier name for self-shipped orders (USPS, UPS, FedEx, etc.)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS self_ship_carrier text;

-- Admin-configurable thresholds (stored in tier_config singleton)
ALTER TABLE public.tier_config
  ADD COLUMN IF NOT EXISTS self_ship_max_value numeric NOT NULL DEFAULT 25;
-- Listing price at or below this → seller may self-ship. Set to 0 to disable.

ALTER TABLE public.tier_config
  ADD COLUMN IF NOT EXISTS self_ship_release_days integer NOT NULL DEFAULT 14;
-- Days after self-ship date before escrow auto-releases (no delivery webhook available)
