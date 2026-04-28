-- Add 'none' to the auth_tier enum for buyer-skipped authentication
alter type auth_tier add value if not exists 'none';

alter table public.tier_config
  add column if not exists optional_auth_enabled   boolean not null default false,
  add column if not exists optional_auth_max_price integer not null default 300;

-- Backfill existing singleton row (ALTER TABLE default only applies to new rows)
update public.tier_config set
  optional_auth_enabled   = coalesce(optional_auth_enabled,   false),
  optional_auth_max_price = coalesce(optional_auth_max_price, 300)
where id = 1;
