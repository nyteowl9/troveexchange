-- MIGRATION 021 — Seller return review flow (Tier 1 disputes)
-- When a buyer ships the card back to the seller directly (Tier 1 / remote auth),
-- the seller gets a review window instead of an immediate on-chain refund.

-- New order statuses
alter type order_status add value if not exists 'return_received_seller';
alter type order_status add value if not exists 'return_disputed_seller';

-- Column on disputes for seller's return dispute evidence + notes
alter table public.disputes
  add column if not exists seller_return_evidence text[] default '{}';

alter table public.disputes
  add column if not exists seller_return_notes text;

-- Deadline by which seller must confirm or dispute the return (72hrs after Label C delivery)
alter table public.orders
  add column if not exists return_review_deadline_at timestamptz;
