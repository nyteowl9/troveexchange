-- MIGRATION 019 — Strike auto-clear threshold
-- After this many clean sales since last strike, oldest strike is automatically removed.
-- Configurable in admin → Platform Settings without redeployment.
ALTER TABLE public.tier_config
  ADD COLUMN IF NOT EXISTS strike_auto_clear_sales integer NOT NULL DEFAULT 100;
