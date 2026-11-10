
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Delivery zones
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, fee numeric not null default 0, min_order numeric not null default 0,
  free_threshold numeric, eta text not null default '45–60 min', active boolean not null default true, sort int not null default 0
);
grant select on public.delivery_zones to anon, authenticated;
grant all on public.delivery_zones to service_role;
alter table public.delivery_zones enable row level security;
create policy "zones public read" on public.delivery_zones for select to anon, authenticated using (true);

-- Store settings
create table public.store_settings (
  id int primary key default 1 check (id = 1),
  kitchen_open time not null default '10:00', kitchen_close time not null default '22:00',
  scheduled_enabled boolean not null default true,
  announcement text not null default 'Free delivery on orders above KES 5,000 · Utawala · Kasarani · Riruta · Embakasi East'
);
grant select on public.store_settings to anon, authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "settings public read" on public.store_settings for select to anon, authenticated using (true);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null, description text not null default '',
  section text not null check (section in ('butchery','kitchen','shop')),
  category text not null, image_key text not null default 'beef',
  price numeric not null, promo_price numeric, unit text not null default 'piece',
  sell_type text not null default 'unit' check (sell_type in ('weight','unit')),
  min_qty numeric not null default 1, step numeric not null default 1,
  stock numeric not null default 0, available boolean not null default true,
  featured boolean not null default false, bestseller boolean not null default false,
  prep_options text[] not null default '{}', customisations jsonb not null default '[]',
  serving_info text, prep_minutes int, sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (true);

-- Discount codes (no direct read)
create table public.discount_codes (
  code text primary key, kind text not null check (kind in ('percent','fixed')), value numeric not null,
  min_order numeric not null default 0, active boolean not null default true
);
grant all on public.discount_codes to service_role;
alter table public.discount_codes enable row level security;

-- Addresses
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, label text not null default 'Home', zone_id uuid references public.delivery_zones(id),
  street text not null, notes text, created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Orders
create sequence public.order_number_seq start 10001;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('MW' || nextval('public.order_number_seq')),
  user_id uuid not null,
  status text not null default 'placed' check (status in ('placed','confirmed','preparing','ready','out_for_delivery','delivered','collected','cancelled')),
  fulfilment text not null check (fulfilment in ('delivery','collection')),
  scheduled_for timestamptz,
  contact_name text not null, contact_phone text not null, contact_email text,
  zone_id uuid references public.delivery_zones(id), address text, delivery_notes text,
  subtotal numeric not null, discount numeric not null default 0, discount_code text,
  delivery_fee numeric not null default 0, total numeric not null,
  payment_method text not null check (payment_method in ('mpesa','card','cash')),
  payment_status text not null default 'pending' check (payment_status in ('pending','awaiting_payment','paid','failed','cancelled','refunded')),
  mpesa_phone text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (auth.uid() = user_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id), name text not null, unit text not null,
  qty numeric not null, unit_price numeric not null, line_total numeric not null,
  options jsonb not null default '{}'
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null, note text, created_at timestamptz not null default now()
);
grant select on public.order_events to authenticated;
grant all on public.order_events to service_role;
alter table public.order_events enable row level security;
create policy "own order events" on public.order_events for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null, amount numeric not null, status text not null default 'pending',
  reference text unique, created_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "own payments" on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Order status events trigger
create or replace function public.log_order_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status) values (new.id, new.status);
  end if;
  new.updated_at := now();
  return new;
end $$;
create or replace function public.log_order_status_after() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status) values (new.id, new.status);
  end if;
  return null;
end $$;
drop function public.log_order_status();
create trigger orders_status_log after insert or update on public.orders for each row execute function public.log_order_status_after();

-- Discount check
create or replace function public.check_discount(_code text, _subtotal numeric) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare d record;
begin
  select * into d from public.discount_codes where upper(code) = upper(trim(_code)) and active;
  if not found then raise exception 'Invalid discount code'; end if;
  if _subtotal < d.min_order then raise exception 'This code needs a minimum order of KES %', d.min_order; end if;
  if d.kind = 'percent' then return round(_subtotal * d.value / 100); end if;
  return least(d.value, _subtotal);
end $$;
grant execute on function public.check_discount(text, numeric) to anon, authenticated;

-- Place order: re-validates prices, availability, stock, zone and discount server-side
create or replace function public.place_order(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); it jsonb; pr record; z record; s record;
  q numeric; unit_p numeric; addon jsonb; addon_total numeric; sel_addons jsonb;
  subtotal numeric := 0; disc numeric := 0; fee numeric := 0; oid uuid;
  lines jsonb := '[]'; fulfil text := p->>'fulfilment'; pm text := p->>'payment_method';
  has_kitchen boolean := false; sched timestamptz := nullif(p->>'scheduled_for','')::timestamptz;
begin
  if uid is null then raise exception 'Please sign in to place an order'; end if;
  if jsonb_array_length(coalesce(p->'items','[]')) = 0 then raise exception 'Your cart is empty'; end if;
  if coalesce(trim(p->'contact'->>'name'),'') = '' or coalesce(trim(p->'contact'->>'phone'),'') = '' then raise exception 'Name and phone are required'; end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    select * into pr from public.products where id = (it->>'product_id')::uuid for update;
    if not found then raise exception 'A product in your cart no longer exists'; end if;
    if not pr.available then raise exception '% is currently unavailable', pr.name; end if;
    q := (it->>'qty')::numeric;
    if q is null or q < pr.min_qty then raise exception 'Minimum quantity for % is %', pr.name, pr.min_qty; end if;
    if pr.stock < q then raise exception 'Only % % of % left in stock', pr.stock, pr.unit, pr.name; end if;
    if pr.section = 'kitchen' then has_kitchen := true; end if;
    addon_total := 0; sel_addons := '[]';
    for addon in select * from jsonb_array_elements(pr.customisations) loop
      if coalesce(it->'addons','[]') ? (addon->>'name') then
        addon_total := addon_total + coalesce((addon->>'price')::numeric,0);
        sel_addons := sel_addons || jsonb_build_array(addon->>'name');
      end if;
    end loop;
    if coalesce(it->>'prep','') <> '' and not (it->>'prep' = any(pr.prep_options)) then raise exception 'Invalid preparation for %', pr.name; end if;
    unit_p := coalesce(pr.promo_price, pr.price) + addon_total;
    subtotal := subtotal + round(unit_p * q);
    lines := lines || jsonb_build_array(jsonb_build_object('product_id', pr.id, 'name', pr.name, 'unit', pr.unit, 'qty', q,
      'unit_price', unit_p, 'line_total', round(unit_p*q),
      'options', jsonb_build_object('prep', nullif(it->>'prep',''), 'addons', sel_addons, 'notes', nullif(it->>'notes',''))));
    update public.products set stock = stock - q where id = pr.id;
  end loop;

  if has_kitchen and sched is null then
    select * into s from public.store_settings where id = 1;
    if found and not ((now() at time zone 'Africa/Nairobi')::time between s.kitchen_open and s.kitchen_close) then
      raise exception 'Our Kitchen is closed right now (open % – %). Please schedule your order.', to_char(s.kitchen_open,'HH24:MI'), to_char(s.kitchen_close,'HH24:MI');
    end if;
  end if;
  if sched is not null and sched < now() then raise exception 'Scheduled time must be in the future'; end if;

  if coalesce(p->>'discount_code','') <> '' then disc := public.check_discount(p->>'discount_code', subtotal); end if;

  if fulfil = 'delivery' then
    select * into z from public.delivery_zones where id = nullif(p->>'zone_id','')::uuid;
    if not found or not z.active then raise exception 'Sorry, we do not deliver to that area yet'; end if;
    if coalesce(trim(p->>'address'),'') = '' then raise exception 'Delivery address is required'; end if;
    if subtotal - disc < z.min_order then raise exception 'Minimum order for % is KES %', z.name, z.min_order; end if;
    fee := case when z.free_threshold is not null and subtotal - disc >= z.free_threshold then 0 else z.fee end;
  elsif fulfil <> 'collection' then raise exception 'Choose delivery or collection'; end if;
  if pm not in ('mpesa','card','cash') then raise exception 'Choose a payment method'; end if;

  insert into public.orders (user_id, fulfilment, scheduled_for, contact_name, contact_phone, contact_email, zone_id, address, delivery_notes,
    subtotal, discount, discount_code, delivery_fee, total, payment_method, payment_status, mpesa_phone)
  values (uid, fulfil, sched, p->'contact'->>'name', p->'contact'->>'phone', p->'contact'->>'email',
    case when fulfil='delivery' then z.id end, case when fulfil='delivery' then p->>'address' end, nullif(p->>'delivery_notes',''),
    subtotal, disc, nullif(upper(p->>'discount_code'),''), fee, subtotal - disc + fee, pm,
    case when pm = 'cash' then 'pending' else 'awaiting_payment' end, nullif(p->>'mpesa_phone',''))
  returning id into oid;

  insert into public.order_items (order_id, product_id, name, unit, qty, unit_price, line_total, options)
  select oid, (l->>'product_id')::uuid, l->>'name', l->>'unit', (l->>'qty')::numeric, (l->>'unit_price')::numeric, (l->>'line_total')::numeric, l->'options'
  from jsonb_array_elements(lines) l;

  insert into public.payments (order_id, method, amount, status) values (oid, pm, subtotal - disc + fee, 'pending');
  return oid;
end $$;
revoke execute on function public.place_order(jsonb) from anon, public;
grant execute on function public.place_order(jsonb) to authenticated;

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_events;

-- Seed
insert into public.store_settings (id) values (1);
insert into public.delivery_zones (name, fee, min_order, free_threshold, eta, sort) values
 ('Utawala', 200, 1000, 5000, '30–45 min', 1),
 ('Embakasi East', 250, 1000, 5000, '40–55 min', 2),
 ('Kasarani', 350, 1500, 6000, '50–70 min', 3),
 ('Riruta', 400, 1500, 6000, '60–80 min', 4);
insert into public.discount_codes (code, kind, value, min_order) values ('KARIBU10','percent',10,1500), ('NYAMA200','fixed',200,2000);

insert into public.products (slug,name,description,section,category,image_key,price,promo_price,unit,sell_type,min_qty,step,stock,featured,bestseller,prep_options,sort) values
('beef-steak','Beef Steak (Ribeye)','Well-marbled ribeye, cut fresh daily from grass-fed Kenyan cattle.','butchery','Beef','beef',950,null,'kg','weight',0.5,0.25,40,true,true,'{Whole,Sliced,Cubed,Minced}',1),
('beef-on-bone','Beef on the Bone','Classic stewing beef with bone for rich, slow-cooked flavour.','butchery','Beef','beef',750,null,'kg','weight',0.5,0.25,80,false,true,'{Whole,Cubed,"Stew cut"}',2),
('beef-mince','Lean Beef Mince','Freshly minced lean beef, perfect for burgers and bolognese.','butchery','Beef','beef',800,720,'kg','weight',0.25,0.25,30,true,false,'{Minced}',3),
('goat-meat','Goat Meat (Mbuzi)','Tender local goat — the heart of every proper nyama choma.','butchery','Goat & Lamb','beef',900,null,'kg','weight',0.5,0.25,50,true,true,'{Whole,Cubed,"Choma cut"}',4),
('lamb-chops','Lamb Chops','Juicy rack-cut lamb chops, trimmed and ready for the grill.','butchery','Goat & Lamb','beef',1400,1250,'kg','weight',0.5,0.25,15,false,false,'{Whole,"Frenched"}',5),
('pork-chops','Pork Chops','Thick-cut bone-in pork chops from trusted local farms.','butchery','Pork','pork',850,null,'kg','weight',0.5,0.25,25,false,true,'{Whole,Sliced}',6),
('pork-belly','Pork Belly','Rich, layered pork belly for roasting or crispy choma.','butchery','Pork','pork',900,null,'kg','weight',0.5,0.25,20,false,false,'{Whole,Cubed,Strips}',7),
('kienyeji-chicken','Kienyeji Chicken (Whole)','Free-range indigenous chicken, cleaned and dressed.','butchery','Kienyeji Chicken','chicken',1300,1150,'piece','unit',1,1,30,true,true,'{Whole,"Cut into 8","Cut into 4"}',8),
('tilapia','Fresh Tilapia','Whole lake tilapia, scaled and gutted on request.','butchery','Fish','fish',650,null,'kg','weight',0.5,0.5,25,false,false,'{Whole,"Scaled & gutted",Filleted}',9),
('passion-juice','Passion Fruit Juice','Freshly pressed passion juice, no added sugar.','shop','Drinks','drinks',200,null,'bottle','unit',1,1,100,false,true,'{}',10),
('soda-pack','Soft Drinks 6-Pack','Assorted 500ml sodas, chilled.','shop','Drinks','drinks',480,420,'pack','unit',1,1,60,false,false,'{}',11),
('spring-water','Spring Water 1L','Natural still spring water.','shop','Drinks','drinks',100,null,'bottle','unit',1,1,200,false,false,'{}',12);

insert into public.products (slug,name,description,section,category,image_key,price,promo_price,unit,sell_type,stock,featured,bestseller,customisations,serving_info,prep_minutes,sort) values
('goat-choma','Goat Nyama Choma','Slow-roasted goat over charcoal, served with kachumbari.','kitchen','Nyama Choma','hero',1100,null,'portion','unit',100,true,true,'[{"name":"Ugali","price":100},{"name":"Extra kachumbari","price":80},{"name":"Mukimo","price":150}]','500g · serves 1–2',35,20),
('beef-choma','Beef Nyama Choma','Charcoal-grilled beef, seasoned simply with salt.','kitchen','Nyama Choma','hero',950,850,'portion','unit',100,false,false,'[{"name":"Ugali","price":100},{"name":"Chips","price":200}]','500g · serves 1–2',30,21),
('grilled-chicken','Grilled Kienyeji Chicken','Half kienyeji chicken, marinated in garlic, lemon and herbs.','kitchen','Grilled Chicken','chicken',850,null,'portion','unit',100,true,true,'[{"name":"Chips","price":200},{"name":"Pilipili sauce","price":0},{"name":"Garlic sauce","price":50}]','Half chicken · serves 1',30,22),
('mwanainchi-burger','Mwanainchi Beef Burger','200g house-ground beef, cheddar, crispy bacon, brioche bun.','kitchen','Burgers','burger',750,null,'portion','unit',100,true,true,'[{"name":"Extra patty","price":250},{"name":"Extra cheese","price":80},{"name":"Add chips","price":150}]','1 burger',20,23),
('masala-chips','Masala Chips','Hand-cut chips tossed in our signature masala.','kitchen','Chips','burger',300,null,'portion','unit',100,false,true,'[{"name":"Large portion","price":150},{"name":"Cheese","price":100}]','Regular portion',12,24),
('family-platter','Mwanainchi Family Platter','Nyama choma, grilled chicken, ugali, chips and kachumbari.','kitchen','Food Platters','platter',3200,2900,'portion','unit',50,true,true,'[{"name":"Extra ugali","price":100},{"name":"Extra chips","price":200}]','Serves 4',45,25),
('grilled-tilapia','Grilled Tilapia','Whole tilapia, chili-lime grilled, with ugali and greens.','kitchen','Other Meals','fish',950,null,'portion','unit',60,false,false,'[{"name":"Swap ugali for chips","price":50}]','1 whole fish',30,26),
('kitchen-juice','Fresh Passion Juice (Glass)','Freshly pressed, served chilled.','kitchen','Drinks','drinks',180,null,'portion','unit',200,false,false,'[]','400ml glass',5,27);
