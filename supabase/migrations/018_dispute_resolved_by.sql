-- MIGRATION 018 — Track which user executed each dispute decision
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
