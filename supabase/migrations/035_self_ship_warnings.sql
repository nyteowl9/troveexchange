-- Track whether day-7 and day-12 delivery warning emails have been sent
-- for self-ship orders that have not confirmed delivery

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS self_ship_warned_7d_at  timestamptz,
  ADD COLUMN IF NOT EXISTS self_ship_warned_12d_at timestamptz;
