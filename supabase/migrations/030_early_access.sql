-- Early access waitlist
create table public.early_access (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- No RLS needed — only written via service role (API route)
-- Owner can query directly from Supabase dashboard
