-- Migration 034: Optional auth thresholds
-- Auth is now buyer's choice on every card.
-- auth_default_threshold: price at/above which physical auth is pre-selected (buyer can change)
-- auth_required_threshold: price at/above which physical auth is mandatory (cannot be removed)

ALTER TABLE tier_config
  ADD COLUMN IF NOT EXISTS auth_default_threshold  numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS auth_required_threshold numeric NOT NULL DEFAULT 5000;

UPDATE tier_config
  SET auth_default_threshold  = 1000,
      auth_required_threshold = 5000
  WHERE id = 1;
