-- Migration 028: Separate buyer and seller strike tracking

-- Add role column to strikes so buyer and seller strikes are counted independently
ALTER TABLE strikes ADD COLUMN IF NOT EXISTS strike_role text NOT NULL DEFAULT 'seller';

-- Add buyer_strike_count to users (separate from strike_count which is seller-only)
ALTER TABLE users ADD COLUMN IF NOT EXISTS buyer_strike_count integer NOT NULL DEFAULT 0;

-- Backfill: all existing strikes are seller strikes
UPDATE strikes SET strike_role = 'seller' WHERE strike_role = 'seller' OR strike_role IS NULL;

-- Index for efficient buyer strike lookups
CREATE INDEX IF NOT EXISTS strikes_user_role_idx ON strikes (user_id, strike_role);
