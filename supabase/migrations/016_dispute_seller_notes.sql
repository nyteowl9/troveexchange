-- MIGRATION 016 — Add seller_notes column to disputes
alter table public.disputes
  add column if not exists seller_notes text;
