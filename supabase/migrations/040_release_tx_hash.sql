-- 040: Add release_tx_hash to orders
--
-- CLAUDE.md schema reference listed release_tx_hash as a column, but no
-- migration actually created it. Several routes (orders/release,
-- admin/escrow-action) try to UPDATE this column and silently fail with
-- 'column does not exist' errors.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS release_tx_hash text;
