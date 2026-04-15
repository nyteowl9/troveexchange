-- ============================================================
-- MIGRATION 005 — Reviews, Seller Tiers, Tier Config
-- ============================================================

-- ── 1. tier_config (singleton admin-editable row) ──────────
create table if not exists public.tier_config (
  id                          integer primary key default 1 check (id = 1),

  -- Sales thresholds
  trusted_min_sales           integer not null default 10,
  pro_min_sales               integer not null default 100,
  elite_min_sales             integer not null default 500,
  legend_min_sales            integer not null default 2500,

  -- Elite / Legend eligibility gates
  elite_max_dispute_rate      numeric(6,4) not null default 0.02,   -- 2%
  elite_min_account_age_days  integer not null default 365,
  elite_no_dispute_loss_days  integer not null default 90,

  -- Trust Tier auth unlock ('elite' | 'legend')
  trust_tier_unlocks_at       text not null default 'elite'
    check (trust_tier_unlocks_at in ('elite', 'legend')),

  updated_at                  timestamptz default now()
);

-- Seed the one config row
insert into public.tier_config (id) values (1)
  on conflict (id) do nothing;

-- ── 2. reviews ─────────────────────────────────────────────
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  reviewer_id   uuid not null references public.users(id) on delete cascade,
  reviewed_id   uuid not null references public.users(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('buyer', 'seller')),
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  flagged       boolean not null default false,
  created_at    timestamptz not null default now(),

  -- One review per order per role
  unique (order_id, reviewer_role)
);

create index if not exists idx_reviews_reviewed_id on public.reviews(reviewed_id);
create index if not exists idx_reviews_order_id    on public.reviews(order_id);

-- ── 3. users — new columns ─────────────────────────────────

-- Seller stats
alter table public.users
  add column if not exists total_sales          integer not null default 0,
  add column if not exists seller_tier          text    not null default 'new'
    check (seller_tier in ('new', 'trusted', 'pro', 'elite', 'legend')),
  add column if not exists seller_rep_score     numeric(3,2),
  add column if not exists seller_review_count  integer not null default 0,
  add column if not exists dispute_losses       integer not null default 0,
  add column if not exists last_dispute_loss_at timestamptz;

-- Buyer stats
alter table public.users
  add column if not exists buyer_rep_score      numeric(3,2),
  add column if not exists buyer_review_count   integer not null default 0;

-- ── 4. recalculate_user_tier() ─────────────────────────────
-- Call this whenever total_sales or dispute_losses changes.
-- Reads tier_config row 1 for all thresholds.
create or replace function public.recalculate_user_tier(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_sales            integer;
  v_dispute_losses   integer;
  v_joined_at        timestamptz;
  v_account_days     integer;
  v_last_loss_at     timestamptz;
  v_days_since_loss  integer;
  v_new_tier         text;
  cfg                record;
begin
  select * into cfg from public.tier_config where id = 1;

  select total_sales, dispute_losses, joined_at, last_dispute_loss_at
    into v_sales, v_dispute_losses, v_joined_at, v_last_loss_at
    from public.users
   where id = p_user_id;

  v_account_days    := extract(epoch from (now() - v_joined_at)) / 86400;
  v_days_since_loss := case
    when v_last_loss_at is null then 9999
    else extract(epoch from (now() - v_last_loss_at)) / 86400
  end;

  -- Determine tier (highest first)
  if v_sales >= cfg.legend_min_sales then
    -- Legend requires same gates as elite
    if v_account_days >= cfg.elite_min_account_age_days
       and v_days_since_loss >= cfg.elite_no_dispute_loss_days
       and (v_sales = 0 or (v_dispute_losses::numeric / v_sales) <= cfg.elite_max_dispute_rate)
    then
      v_new_tier := 'legend';
    else
      v_new_tier := 'elite'; -- sales threshold met but gates not yet
    end if;

  elsif v_sales >= cfg.elite_min_sales then
    if v_account_days >= cfg.elite_min_account_age_days
       and v_days_since_loss >= cfg.elite_no_dispute_loss_days
       and (v_sales = 0 or (v_dispute_losses::numeric / v_sales) <= cfg.elite_max_dispute_rate)
    then
      v_new_tier := 'elite';
    else
      v_new_tier := 'pro'; -- sales threshold met but gates not yet
    end if;

  elsif v_sales >= cfg.pro_min_sales then
    v_new_tier := 'pro';

  elsif v_sales >= cfg.trusted_min_sales then
    v_new_tier := 'trusted';

  else
    v_new_tier := 'new';
  end if;

  update public.users set seller_tier = v_new_tier where id = p_user_id;
end;
$$;

-- ── 5. update_review_scores() ──────────────────────────────
-- Recalculates rep scores for a user after a new review is inserted.
create or replace function public.update_review_scores(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_seller_avg   numeric(3,2);
  v_seller_cnt   integer;
  v_buyer_avg    numeric(3,2);
  v_buyer_cnt    integer;
begin
  -- Seller score: reviews where this user was reviewed as the seller
  select round(avg(rating)::numeric, 2), count(*)
    into v_seller_avg, v_seller_cnt
    from public.reviews
   where reviewed_id = p_user_id
     and reviewer_role = 'buyer'
     and flagged = false;

  -- Buyer score: reviews where this user was reviewed as the buyer
  select round(avg(rating)::numeric, 2), count(*)
    into v_buyer_avg, v_buyer_cnt
    from public.reviews
   where reviewed_id = p_user_id
     and reviewer_role = 'seller'
     and flagged = false;

  update public.users
     set seller_rep_score    = v_seller_avg,
         seller_review_count = coalesce(v_seller_cnt, 0),
         buyer_rep_score     = v_buyer_avg,
         buyer_review_count  = coalesce(v_buyer_cnt, 0)
   where id = p_user_id;
end;
$$;

-- ── 6. RLS ─────────────────────────────────────────────────

-- tier_config: read by anyone, write by service_role only
alter table public.tier_config enable row level security;
create policy "tier_config_read_all"  on public.tier_config for select using (true);
create policy "tier_config_write_service" on public.tier_config for all using (auth.role() = 'service_role');

-- reviews: public read, insert via service_role (API validates)
alter table public.reviews enable row level security;
create policy "reviews_read_all"         on public.reviews for select using (true);
create policy "reviews_insert_service"   on public.reviews for insert with check (auth.role() = 'service_role');
create policy "reviews_update_service"   on public.reviews for update using (auth.role() = 'service_role');
