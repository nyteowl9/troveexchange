-- ============================================================
-- MIGRATION 012 — Return deadline partial index
-- ============================================================
-- Must run AFTER migration 011 is committed.
-- PostgreSQL requires new enum values to be committed before
-- they can be used in an index WHERE clause.

create index if not exists idx_orders_return_deadline
  on public.orders (return_deadline_at);
