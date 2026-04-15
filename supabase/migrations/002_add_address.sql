alter table public.users
  add column street1 text,
  add column street2 text,
  add column city text,
  add column state text,
  add column zip text,
  add column country text not null default 'US';

