
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 255),
  phone text check (char_length(phone) <= 30),
  message text not null check (char_length(message) between 1 and 2000),
  kind text not null default 'contact' check (kind in ('contact','newsletter')),
  created_at timestamptz not null default now()
);
grant insert on public.contact_messages to anon, authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create policy "anyone can send" on public.contact_messages for insert to anon, authenticated with check (true);
