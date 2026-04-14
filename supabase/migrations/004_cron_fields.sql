-- ============================================================
-- CRON JOB SUPPORT FIELDS
-- Idempotency flags for automation jobs so crons never double-fire
-- ============================================================

-- Orders: track when strike was auto-applied (prevents re-processing missed shipments)
alter table public.orders
  add column if not exists strike_applied_at timestamptz,
  add column if not exists bond_returned_at  timestamptz,
  add column if not exists ship_reminder_sent boolean not null default false;

-- Listings: track which warning emails have been sent
alter table public.listings
  add column if not exists warning_75_sent boolean not null default false,
  add column if not exists warning_85_sent boolean not null default false,
  add column if not exists warning_97_sent boolean not null default false;

-- Indexes to make cron queries fast (partial indexes on null = unprocessed)
create index if not exists idx_orders_strike_pending
  on public.orders(ship_deadline)
  where strike_applied_at is null and status = 'awaiting_shipment';

create index if not exists idx_orders_bond_pending
  on public.orders(released_at)
  where bond_returned_at is null and status = 'released';

create index if not exists idx_orders_reminder_pending
  on public.orders(ship_deadline)
  where ship_reminder_sent = false and status = 'awaiting_shipment';
