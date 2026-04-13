-- ============================================================
-- CREATOR PAYOUTS
-- Records each monthly payout batch entry per creator.
-- Owner executes the actual USDC transfer; this is the paper trail.
-- ============================================================

create table public.creator_payouts (
  id                uuid primary key default uuid_generate_v4(),
  creator_id        uuid references public.creators(id) not null,
  amount            numeric(10,2) not null,
  wallet_address    text,
  conversion_count  int not null default 0,
  status            text not null default 'pending', -- pending | sent
  paid_at           timestamptz not null default now()
);

-- Unique constraint on order_id for referral_conversions (prevents double attribution)
alter table public.referral_conversions
  add constraint referral_conversions_order_id_key unique (order_id);

-- Indexes
create index idx_creator_payouts_creator_id on public.creator_payouts(creator_id);
create index idx_creator_payouts_status on public.creator_payouts(status);

-- RLS
alter table public.creator_payouts enable row level security;

create policy "Creators can read own payouts"
  on public.creator_payouts for select
  using (
    public.is_staff_or_owner()
    or exists (
      select 1 from public.creators
      where creators.id = creator_payouts.creator_id
        and creators.user_id = auth.uid()
    )
  );

create policy "Staff/owner can manage payouts"
  on public.creator_payouts for all
  using (public.is_staff_or_owner())
  with check (public.is_staff_or_owner());
