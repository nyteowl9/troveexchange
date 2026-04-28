alter table public.users
  add column username text unique,
  add column full_name text;

create index idx_users_username on public.users(username);
curl -H "Authorization: Bearer <CRON_SECRET=e1802f48fdb6d312c5cb86e7cdc2a6233ce70d7881b94b2344e2de9d16843eb4
>" http://localhost:3000/api/cron/escrow-release
