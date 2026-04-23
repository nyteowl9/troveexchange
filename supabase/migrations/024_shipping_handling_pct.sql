alter table public.tier_config
  add column if not exists shipping_handling_pct integer not null default 15;

update public.tier_config set
  shipping_handling_pct = coalesce(shipping_handling_pct, 15)
where id = 1;
