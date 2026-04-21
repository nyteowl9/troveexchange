-- MIGRATION 015 — Add notes column to disputes
alter table public.disputes
  add column if not exists notes text;
