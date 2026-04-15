-- ============================================================
-- MIGRATION 006 — Messaging + Dispute Void for Tier
-- ============================================================

-- ── 1. disputes — void flag ─────────────────────────────────
alter table public.disputes
  add column if not exists voided_for_tier  boolean not null default false,
  add column if not exists void_reason      text;

-- ── 2. messages ─────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  sender_id   uuid not null references public.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_messages_order_id   on public.messages(order_id);
create index if not exists idx_messages_sender_id  on public.messages(sender_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

-- ── 3. RLS for messages ─────────────────────────────────────
alter table public.messages enable row level security;

-- Only the buyer or seller on the order can read messages
create policy "messages_read_parties" on public.messages
  for select using (
    auth.uid() in (
      select buyer_id  from public.orders where id = order_id
      union
      select seller_id from public.orders where id = order_id
    )
    or auth.uid() in (
      select id from public.users where role in ('owner', 'staff')
    )
  );

-- Only parties can send messages
create policy "messages_insert_parties" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and auth.uid() in (
      select buyer_id  from public.orders where id = order_id
      union
      select seller_id from public.orders where id = order_id
    )
  );

-- Mark read: only the recipient (non-sender party) can update read_at
create policy "messages_mark_read" on public.messages
  for update using (
    auth.uid() != sender_id
    and auth.uid() in (
      select buyer_id  from public.orders where id = order_id
      union
      select seller_id from public.orders where id = order_id
    )
  );

-- ── 4. increment_total_sales_and_recalculate() ─────────────
-- Atomic: bump total_sales then recalculate tier. Called on escrow release.
create or replace function public.increment_total_sales_and_recalculate(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.users
     set total_sales = total_sales + 1
   where id = p_user_id;

  perform public.recalculate_user_tier(p_user_id);
end;
$$;

-- ── 5. Update recalculate_user_tier to query disputes live ──
-- Replaces the version from migration 005 — now counts non-voided losses
-- from the disputes table instead of the cached dispute_losses column.
create or replace function public.recalculate_user_tier(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_sales            integer;
  v_joined_at        timestamptz;
  v_account_days     integer;
  v_last_loss_at     timestamptz;
  v_days_since_loss  integer;
  v_dispute_losses   integer;
  v_new_tier         text;
  cfg                record;
begin
  select * into cfg from public.tier_config where id = 1;

  select total_sales, joined_at
    into v_sales, v_joined_at
    from public.users
   where id = p_user_id;

  -- Count only non-voided dispute losses for this seller
  select count(*) into v_dispute_losses
    from public.disputes d
    join public.orders o on o.id = d.order_id
   where o.seller_id = p_user_id
     and d.outcome = 'buyer_wins'
     and d.voided_for_tier = false;

  -- Also update the cached column so admin UI is accurate
  update public.users
     set dispute_losses = v_dispute_losses
   where id = p_user_id;

  -- Most recent non-voided loss date
  select max(d.created_at) into v_last_loss_at
    from public.disputes d
    join public.orders o on o.id = d.order_id
   where o.seller_id = p_user_id
     and d.outcome = 'buyer_wins'
     and d.voided_for_tier = false;

  v_account_days    := extract(epoch from (now() - v_joined_at)) / 86400;
  v_days_since_loss := case
    when v_last_loss_at is null then 9999
    else extract(epoch from (now() - v_last_loss_at)) / 86400
  end;

  -- Determine tier (highest first)
  if v_sales >= cfg.legend_min_sales then
    if v_account_days >= cfg.elite_min_account_age_days
       and v_days_since_loss >= cfg.elite_no_dispute_loss_days
       and (v_sales = 0 or (v_dispute_losses::numeric / v_sales) <= cfg.elite_max_dispute_rate)
    then
      v_new_tier := 'legend';
    else
      v_new_tier := 'elite';
    end if;

  elsif v_sales >= cfg.elite_min_sales then
    if v_account_days >= cfg.elite_min_account_age_days
       and v_days_since_loss >= cfg.elite_no_dispute_loss_days
       and (v_sales = 0 or (v_dispute_losses::numeric / v_sales) <= cfg.elite_max_dispute_rate)
    then
      v_new_tier := 'elite';
    else
      v_new_tier := 'pro';
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
