-- ============================================================
-- Chase Hollow — Full Database Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('buyer', 'seller', 'authenticator', 'staff', 'owner');
create type seller_tier as enum ('new', 'trusted', 'pro', 'elite');
create type listing_type as enum ('graded', 'raw', 'pack', 'box', 'case', 'lot');
create type listing_status as enum ('active', 'paused', 'expired', 'sold');
create type auth_tier as enum ('remote', 'physical', 'trust');

create type order_status as enum (
  'pending_escrow',       -- buyer initiated, escrow not yet confirmed
  'awaiting_shipment',    -- escrow confirmed, seller must ship within 48hrs
  'in_transit',           -- carrier scan confirmed
  'auth_review',          -- physical tier: card at auth center
  'auth_passed',          -- auth passed, continuing to buyer
  'auth_failed',          -- auth failed, refund issued
  'delivered',            -- carrier confirms delivery
  'inspection_window',    -- 72hr buyer inspection open
  'released',             -- funds released to seller
  'disputed',             -- buyer raised dispute
  'refunded',             -- full refund issued
  'cancelled'             -- order cancelled before shipment
);

create type inspection_decision as enum ('pending', 'pass', 'fail');
create type dispute_outcome as enum ('pending', 'buyer_wins', 'seller_wins');
create type creator_status as enum ('pending', 'approved', 'rejected', 'suspended');

-- ============================================================
-- USERS
-- Extends Supabase auth.users — auto-created on signup via trigger
-- ============================================================

create table public.users (
  id               uuid references auth.users(id) on delete cascade primary key,
  email            text unique not null,
  wallet_address   text unique,
  role             user_role not null default 'buyer',
  tier             seller_tier not null default 'new',
  strike_count     int not null default 0,
  rep_score        numeric(5,2) not null default 0,
  joined_at        timestamptz not null default now(),
  suspended_until  timestamptz,
  banned           boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- Auto-create user profile on Supabase Auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- LISTINGS
-- ============================================================

create table public.listings (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     uuid references public.users(id) on delete cascade not null,
  game          text not null,
  set           text,
  card_name     text not null,
  card_number   text,
  grade         numeric(4,1),          -- null if raw
  grader        text,                  -- PSA, BGS, CGC, etc.
  cert_number   text,
  condition     text,                  -- raw cards
  listing_type  listing_type not null,
  price         numeric(10,2) not null check (price >= 1 and price <= 50000),
  auth_tier     auth_tier not null,
  photos        text[] not null default '{}',
  status        listing_status not null default 'active',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '90 days'),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- ORDERS
-- ============================================================

create table public.orders (
  id               uuid primary key default uuid_generate_v4(),
  listing_id       uuid references public.listings(id) not null,
  buyer_id         uuid references public.users(id) not null,
  seller_id        uuid references public.users(id) not null,
  auth_tier        auth_tier not null,

  -- Financials
  escrow_amount    numeric(10,2) not null,   -- total buyer paid
  escrow_tx_hash   text,                      -- Base L2 tx hash
  platform_fee     numeric(10,2) not null,    -- 3% of sale price
  creator_fee      numeric(10,2) not null default 0,  -- 0.5% if referred
  auth_fee         numeric(10,2) not null,    -- $10 or $25
  bond_amount      numeric(10,2) not null,    -- seller bond posted
  shipping_cost    numeric(10,2),
  sales_tax        numeric(10,2),
  declared_value   numeric(10,2) not null,    -- = listing price

  -- Shipping
  label_a_url      text,   -- Tier 1: seller→buyer  |  Tier 2: seller→auth center
  label_b_url      text,   -- Tier 2 only: auth center→buyer
  tracking_a       text,
  tracking_b       text,

  -- Status & Timestamps
  status           order_status not null default 'pending_escrow',
  ship_deadline    timestamptz,          -- T+48hrs from escrow confirm
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  auto_release_at  timestamptz,          -- T+72hrs from delivery
  released_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- AUTH INSPECTIONS
-- ============================================================

create table public.auth_inspections (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid references public.orders(id) not null,
  authenticator_id  uuid references public.users(id),
  type              auth_tier not null,
  checklist         jsonb not null default '{}',
  -- Remote checklist: { front: bool, back: bool, sealed_package: bool }
  -- Physical checklist: { photo_match: bool, grade_label: bool, cert_db: bool, slab_integrity: bool, holo_sticker: bool }
  photos            text[] not null default '{}',
  decision          inspection_decision not null default 'pending',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- DISPUTES
-- ============================================================

create table public.disputes (
  id                    uuid primary key default uuid_generate_v4(),
  order_id              uuid references public.orders(id) not null,
  raised_by             uuid references public.users(id) not null,
  reason                text not null,
  buyer_evidence        text[] not null default '{}',
  seller_evidence       text[] not null default '{}',
  auth_photos           text[] not null default '{}',
  staff_recommendation  text,
  owner_decision        text,
  outcome               dispute_outcome not null default 'pending',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- STRIKES
-- ============================================================

create table public.strikes (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) not null,
  order_id        uuid references public.orders(id),
  strike_number   int not null,       -- 1, 2, or 3
  reason          text not null,
  action_taken    text not null,      -- 'warning', '7_day_suspension', '30_day_suspension', 'permanent_ban'
  appealed        boolean not null default false,
  appeal_outcome  text,               -- 'upheld', 'overturned'
  created_at      timestamptz not null default now()
);

-- ============================================================
-- CREATORS (Affiliate Program)
-- ============================================================

create table public.creators (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.users(id) on delete cascade not null,
  handle         text not null,
  platform       text not null,        -- youtube, twitch, tiktok, etc.
  channel_url    text not null,
  wallet_address text not null,
  ref_code       text unique not null,
  status         creator_status not null default 'pending',
  approved_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- REFERRAL CONVERSIONS
-- ============================================================

create table public.referral_conversions (
  id          uuid primary key default uuid_generate_v4(),
  creator_id  uuid references public.creators(id) not null,
  order_id    uuid references public.orders(id) not null,
  sale_amount numeric(10,2) not null,
  commission  numeric(10,2) not null,
  paid        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_users
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger set_updated_at_listings
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger set_updated_at_auth_inspections
  before update on public.auth_inspections
  for each row execute function public.set_updated_at();

create trigger set_updated_at_disputes
  before update on public.disputes
  for each row execute function public.set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_listings_seller_id on public.listings(seller_id);
create index idx_listings_status on public.listings(status);
create index idx_listings_game on public.listings(game);
create index idx_listings_auth_tier on public.listings(auth_tier);
create index idx_listings_expires_at on public.listings(expires_at);

create index idx_orders_buyer_id on public.orders(buyer_id);
create index idx_orders_seller_id on public.orders(seller_id);
create index idx_orders_listing_id on public.orders(listing_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_auto_release_at on public.orders(auto_release_at);
create index idx_orders_ship_deadline on public.orders(ship_deadline);

create index idx_strikes_user_id on public.strikes(user_id);
create index idx_referral_conversions_creator_id on public.referral_conversions(creator_id);
create index idx_referral_conversions_paid on public.referral_conversions(paid);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.auth_inspections enable row level security;
alter table public.disputes enable row level security;
alter table public.strikes enable row level security;
alter table public.creators enable row level security;
alter table public.referral_conversions enable row level security;

-- Helper: get current user's role
create or replace function public.current_user_role()
returns user_role language sql security definer stable as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper: is staff or owner
create or replace function public.is_staff_or_owner()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('staff', 'owner')
  );
$$;

-- USERS policies
create policy "Users can read own profile"
  on public.users for select
  using (id = auth.uid() or public.is_staff_or_owner());

create policy "Public profiles are readable"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  using (id = auth.uid());

-- LISTINGS policies
create policy "Anyone can read active listings"
  on public.listings for select
  using (status = 'active' or seller_id = auth.uid() or public.is_staff_or_owner());

create policy "Sellers can create listings"
  on public.listings for insert
  with check (seller_id = auth.uid());

create policy "Sellers can update own listings"
  on public.listings for update
  using (seller_id = auth.uid() or public.is_staff_or_owner());

create policy "Sellers can delete own listings"
  on public.listings for delete
  using (seller_id = auth.uid() or public.is_staff_or_owner());

-- ORDERS policies
create policy "Buyers and sellers can read own orders"
  on public.orders for select
  using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or public.is_staff_or_owner()
  );

create policy "Buyers can create orders"
  on public.orders for insert
  with check (buyer_id = auth.uid());

create policy "Staff and owner can update orders"
  on public.orders for update
  using (public.is_staff_or_owner());

-- AUTH INSPECTIONS policies
create policy "Authenticators can read assigned inspections"
  on public.auth_inspections for select
  using (
    authenticator_id = auth.uid()
    or public.is_staff_or_owner()
    or exists (
      select 1 from public.orders
      where orders.id = auth_inspections.order_id
        and (orders.buyer_id = auth.uid() or orders.seller_id = auth.uid())
    )
  );

create policy "Authenticators can create inspections"
  on public.auth_inspections for insert
  with check (
    authenticator_id = auth.uid()
    or public.is_staff_or_owner()
  );

create policy "Authenticators can update own inspections"
  on public.auth_inspections for update
  using (authenticator_id = auth.uid() or public.is_staff_or_owner());

-- DISPUTES policies
create policy "Order parties can read disputes"
  on public.disputes for select
  using (
    raised_by = auth.uid()
    or public.is_staff_or_owner()
    or exists (
      select 1 from public.orders
      where orders.id = disputes.order_id
        and (orders.buyer_id = auth.uid() or orders.seller_id = auth.uid())
    )
  );

create policy "Buyers can create disputes"
  on public.disputes for insert
  with check (raised_by = auth.uid());

create policy "Staff can update disputes"
  on public.disputes for update
  using (public.is_staff_or_owner());

-- STRIKES policies
create policy "Users can read own strikes"
  on public.strikes for select
  using (user_id = auth.uid() or public.is_staff_or_owner());

create policy "Staff can create strikes"
  on public.strikes for insert
  with check (public.is_staff_or_owner());

-- CREATORS policies
create policy "Anyone can read approved creators"
  on public.creators for select
  using (status = 'approved' or user_id = auth.uid() or public.is_staff_or_owner());

create policy "Users can apply as creator"
  on public.creators for insert
  with check (user_id = auth.uid());

create policy "Creators can update own record"
  on public.creators for update
  using (user_id = auth.uid() or public.is_staff_or_owner());

-- REFERRAL CONVERSIONS policies
create policy "Creators can read own conversions"
  on public.referral_conversions for select
  using (
    public.is_staff_or_owner()
    or exists (
      select 1 from public.creators
      where creators.id = referral_conversions.creator_id
        and creators.user_id = auth.uid()
    )
  );

create policy "System can create conversions"
  on public.referral_conversions for insert
  with check (public.is_staff_or_owner());
