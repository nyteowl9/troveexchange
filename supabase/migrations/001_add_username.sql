alter table public.users
  add column username text unique,
  add column full_name text;

create index idx_users_username on public.users(username);
