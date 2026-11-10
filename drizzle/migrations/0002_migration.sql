
create type public.app_role as enum ('admin', 'staff', 'rider', 'customer');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, app_role) to authenticated;

-- Designated owner email becomes admin once their email is confirmed
create or replace function public.grant_owner_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'miketeq7@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_admin after insert or update of email_confirmed_at on auth.users
  for each row execute function public.grant_owner_admin();

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = 'miketeq7@gmail.com' and email_confirmed_at is not null
on conflict do nothing;

-- Admin access
grant update on public.orders to authenticated;
create policy "admin read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "admin read items" on public.order_items for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin read events" on public.order_events for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin read payments" on public.payments for select to authenticated using (public.has_role(auth.uid(), 'admin'));
grant update on public.products to authenticated;
create policy "admin update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Cash payments: when admin marks cash paid, sync payment record
create or replace function public.sync_cash_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status is distinct from old.payment_status then
    if new.payment_method <> 'cash' and new.payment_status = 'paid' then
      raise exception 'Electronic payments can only be confirmed by the payment provider';
    end if;
    update public.payments set status = new.payment_status where order_id = new.id;
  end if;
  return new;
end $$;
create trigger orders_payment_sync before update on public.orders for each row execute function public.sync_cash_payment();
