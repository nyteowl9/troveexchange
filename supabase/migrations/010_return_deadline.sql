-- ============================================================
-- MIGRATION 010 — Dispute Return Deadline + Wrong Card Flow
-- ============================================================
-- return_deadline_at: set when order enters awaiting_return (+5 days)
-- return_warning_2_sent / return_warning_4_sent: email flags for cron
-- wrong_card_flag: authenticator flagged returned card as wrong
-- wrong_card_at: timestamp when wrong card was flagged
-- wrong_card_notes: authenticator notes on wrong card
-- Status additions: wrong_card_received

alter table public.orders
  add column if not exists return_deadline_at      timestamptz,
  add column if not exists return_warning_2_sent   boolean not null default false,
  add column if not exists return_warning_4_sent   boolean not null default false,
  add column if not exists wrong_card_flag         boolean not null default false,
  add column if not exists wrong_card_at           timestamptz,
  add column if not exists wrong_card_notes        text;

-- Add wrong_card_received to status constraint (alongside statuses from migration 009)
do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'orders_status_check'
  ) then
    alter table public.orders drop constraint orders_status_check;
    alter table public.orders add constraint orders_status_check check (status in (
      'pending',
      'awaiting_shipment',
      'in_transit',
      'auth_review',
      'auth_passed',
      'auth_failed',
      'inspection_window',
      'disputed',
      'awaiting_return',      -- owner decided buyer wins, Label C generated
      'return_received',      -- Label C delivered to destination (auth center T2, seller T1)
      'return_verified',      -- T2: auth center inspected return + generated Label D
      'wrong_card_received',  -- auth center received wrong card from buyer
      'released',
      'refunded',
      'cancelled'
    ));
  end if;
end $$;

-- Index created in migration 012 (after enum values are committed in 011)
