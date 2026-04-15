-- ============================================================
-- MIGRATION 011 — Add missing order_status enum values
-- ============================================================
-- Migrations 009 and 010 used a check-constraint approach to add
-- new order statuses. The status column is actually a PostgreSQL
-- ENUM type (order_status), so ALTER TYPE is required instead.
-- The DO $$ ... check constraint block in both migrations was a
-- no-op (no constraint named orders_status_check exists).
--
-- This migration adds all new values introduced by 009 and 010,
-- then retries the partial index that failed in 010.

alter type order_status add value if not exists 'auth_failed';
alter type order_status add value if not exists 'awaiting_return';
alter type order_status add value if not exists 'return_received';
alter type order_status add value if not exists 'return_verified';
alter type order_status add value if not exists 'wrong_card_received';

-- Run migration 012 separately after this commits.
