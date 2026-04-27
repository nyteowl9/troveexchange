-- Support tickets (public contact form → staff portal)
create table support_tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,
  name          text not null,
  email         text not null,
  order_id      uuid references orders(id) on delete set null,
  category      text not null default 'general',
  subject       text not null,
  status        text not null default 'open'
                check (status in ('open','pending','resolved','escalated')),
  priority      text not null default 'normal'
                check (priority in ('normal','high')),
  assigned_to   uuid references users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table support_ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references support_tickets(id) on delete cascade,
  from_staff boolean not null default false,
  staff_id   uuid references users(id) on delete set null,
  message    text not null,
  created_at timestamptz not null default now()
);

create index on support_tickets (status, created_at desc);
create index on support_ticket_messages (ticket_id, created_at asc);

alter table support_tickets        enable row level security;
alter table support_ticket_messages enable row level security;

-- Staff/owner full access
create policy "Staff read tickets"   on support_tickets for select
  using (exists (select 1 from users where id = auth.uid() and role in ('staff','owner')));
create policy "Staff update tickets" on support_tickets for update
  using (exists (select 1 from users where id = auth.uid() and role in ('staff','owner')));

create policy "Staff read messages"   on support_ticket_messages for select
  using (exists (select 1 from users where id = auth.uid() and role in ('staff','owner')));
create policy "Staff insert messages" on support_ticket_messages for insert
  with check (exists (select 1 from users where id = auth.uid() and role in ('staff','owner')));
