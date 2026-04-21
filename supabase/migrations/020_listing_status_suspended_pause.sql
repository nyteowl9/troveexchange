-- MIGRATION 020 — Add suspended_pause to listing_status enum
-- Used when a seller is suspended — their active listings are paused automatically
-- and restored when the suspension expires (via cron/listing-expiry).
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'suspended_pause';
