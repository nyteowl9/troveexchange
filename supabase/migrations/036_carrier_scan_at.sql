-- Record when the first carrier scan fires for a self-ship order.
-- Used to detect fraudulent "I shipped it" claims with no real carrier activity.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier_scanned_at      timestamptz,
  ADD COLUMN IF NOT EXISTS self_ship_no_scan_warned_at timestamptz;
