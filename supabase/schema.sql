-- ============================================================================
--  Choco Haat – Supabase / Postgres schema
--  Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
--  It is idempotent where practical (safe to re-run during development).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  brand              text not null default '',
  category_id        uuid references public.categories (id) on delete set null,
  short_description  text not null default '',
  description        text not null default '',
  ingredients        text not null default '',
  storage_info       text not null default '',
  authenticity_info  text not null default '',
  price              numeric(10,2) not null check (price >= 0),
  comparison_price   numeric(10,2) check (comparison_price is null or comparison_price >= 0),
  show_comparison    boolean not null default false,   -- admin decides whether the market price is shown
  cost_price         numeric(10,2) not null default 0 check (cost_price >= 0),
  stock              int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5,
  weight             text not null default '',
  country_of_origin  text not null default '',
  expiry_info        text not null default '',
  image_url          text,
  images             text[] not null default '{}',
  is_featured        boolean not null default false,
  is_active          boolean not null default true,
  is_demo            boolean not null default false,   -- seed/demo rows, removable from Admin → Products
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx   on public.products (is_active);

create table if not exists public.coupons (
  code         text primary key,
  type         text not null check (type in ('percent','fixed')),
  value        numeric(10,2) not null check (value > 0),
  min_order    numeric(10,2) not null default 0,
  expires_at   timestamptz,
  usage_limit  int,
  used_count   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,                 -- CHOC-YYYYMMDD-0001
  customer_name    text not null,
  phone            text not null,
  email            text,
  address          text not null,
  division         text not null,
  district         text not null,
  upazila          text not null,
  delivery_note    text,
  subtotal         numeric(12,2) not null,
  delivery_charge  numeric(10,2) not null default 0,
  discount         numeric(10,2) not null default 0,
  total            numeric(12,2) not null,
  coupon_code      text,
  payment_method   text not null default 'COD',
  payment_sender   text,   -- bKash / Nagad number the customer paid from
  payment_trx_id   text,   -- bKash / Nagad Transaction ID (verify in your bKash/Nagad app)
  status           text not null default 'Pending'
                   check (status in ('Pending','Confirmed','Processing','Shipped','Delivered','Cancelled')),
  is_archived      boolean not null default false,
  sheet_synced     boolean not null default false,
  sheet_sync_error text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx   on public.orders (phone);
create index if not exists orders_status_idx  on public.orders (status);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,  -- keep history if product is deleted
  product_name  text not null,
  unit_price    numeric(10,2) not null,
  unit_cost     numeric(10,2) not null default 0,
  quantity      int not null check (quantity > 0),
  line_total    numeric(12,2) not null
);
create index if not exists order_items_order_idx   on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.order_counters (
  day_key    text primary key,       -- YYYYMMDD (Asia/Dhaka)
  last_value int  not null default 0
);

-- Reviews: structure is ready; only approved rows are public. Connect a real review form later.
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references public.products (id) on delete cascade,
  customer_name text not null,
  rating        int not null check (rating between 1 and 5),
  comment       text not null default '',
  is_approved   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Keep stock correct when an order is cancelled / re-opened.
create or replace function public.orders_status_stock()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'Cancelled' and old.status <> 'Cancelled' then
    update public.products p
       set stock = p.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id = p.id;
  elsif old.status = 'Cancelled' and new.status <> 'Cancelled' then
    if exists (
      select 1 from public.order_items oi
        join public.products p on p.id = oi.product_id
       where oi.order_id = new.id and p.stock < oi.quantity
    ) then
      raise exception 'Not enough stock to re-open this cancelled order';
    end if;
    update public.products p
       set stock = p.stock - oi.quantity
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end $$;

drop trigger if exists orders_status_stock_trg on public.orders;
create trigger orders_status_stock_trg before update of status on public.orders
  for each row execute function public.orders_status_stock();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- place_order(): the ONLY way an order is created.
--   * Called by the Netlify Function with the service-role key (never by browsers).
--   * Locks product rows, re-reads real prices + stock, prices the order, applies coupon,
--     generates the order number, writes order + items, reduces stock – all in one transaction.
--   * Returns jsonb { ok, code, message, order, items }.
-- ----------------------------------------------------------------------------
create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  st            jsonb;
  r             record;
  p             public.products%rowtype;
  c             public.coupons%rowtype;
  v_phone       text := payload->>'phone';
  v_district    text := payload->>'district';
  v_code        text := nullif(upper(trim(coalesce(payload->>'coupon_code',''))), '');
  v_subtotal    numeric := 0;
  v_discount    numeric := 0;
  v_delivery    numeric := 0;
  v_total       numeric;
  v_method      text;
  v_inside      text;
  v_in_charge   numeric;
  v_out_charge  numeric;
  v_free        numeric;
  v_min         numeric;
  v_day         text;
  v_seq         int;
  v_number      text;
  v_order       public.orders%rowtype;
  v_lines       jsonb := '[]'::jsonb;
  v_items_out   jsonb;
begin
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') = 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID', 'message', 'Your cart is empty.');
  end if;

  -- Basic anti-abuse: max 5 orders per phone per hour.
  if (select count(*) from public.orders where phone = v_phone and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMIT',
      'message', 'Too many orders from this phone number. Please try again later or contact us.');
  end if;

  select value into st from public.settings where key = 'store';
  st := coalesce(st, '{}'::jsonb);
  v_inside     := lower(trim(coalesce(st->>'inside_city_district', '')));
  v_in_charge  := coalesce((st->>'inside_city_charge')::numeric, 0);
  v_out_charge := coalesce((st->>'outside_city_charge')::numeric, 0);
  v_free       := coalesce((st->>'free_delivery_threshold')::numeric, 0);
  v_min        := coalesce((st->>'min_order_amount')::numeric, 0);

  -- Lock + price each product (ordered by id → consistent lock order, no deadlocks).
  for r in
    select x.product_id, sum(x.quantity)::int as quantity
      from jsonb_to_recordset(payload->'items') as x(product_id uuid, quantity int)
     group by x.product_id
     order by x.product_id
  loop
    select * into p from public.products where id = r.product_id for update;
    if not found or not p.is_active then
      return jsonb_build_object('ok', false, 'code', 'PRODUCT_UNAVAILABLE',
        'message', 'A product in your cart is no longer available.');
    end if;
    if r.quantity < 1 or r.quantity > 50 then
      return jsonb_build_object('ok', false, 'code', 'INVALID', 'message', 'Invalid quantity.');
    end if;
    if p.stock < r.quantity then
      return jsonb_build_object('ok', false, 'code', 'OUT_OF_STOCK',
        'message', case when p.stock = 0 then p.name || ' is out of stock.'
                        else 'Only ' || p.stock || ' of ' || p.name || ' left in stock.' end,
        'product_id', p.id, 'available', p.stock);
    end if;
    v_subtotal := v_subtotal + p.price * r.quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id', p.id, 'name', p.name, 'price', p.price, 'cost', p.cost_price, 'quantity', r.quantity);
  end loop;

  if v_min > 0 and v_subtotal < v_min then
    return jsonb_build_object('ok', false, 'code', 'MIN_ORDER',
      'message', 'The minimum order amount is ৳' || round(v_min)::text || '.');
  end if;

  -- Coupon (optional)
  if v_code is not null then
    select * into c from public.coupons where code = v_code for update;
    if not found or not c.is_active
       or (c.expires_at is not null and c.expires_at < now())
       or (c.usage_limit is not null and c.used_count >= c.usage_limit) then
      return jsonb_build_object('ok', false, 'code', 'COUPON_INVALID', 'message', 'This coupon code is not valid.');
    end if;
    if c.min_order > v_subtotal then
      return jsonb_build_object('ok', false, 'code', 'COUPON_INVALID',
        'message', 'Spend at least ৳' || round(c.min_order)::text || ' to use this coupon.');
    end if;
    v_discount := case when c.type = 'percent' then round(v_subtotal * c.value / 100) else c.value end;
    v_discount := greatest(0, least(v_discount, v_subtotal));
  end if;

  -- Delivery
  if v_free > 0 and v_subtotal >= v_free then
    v_delivery := 0;
  elsif v_inside <> '' and lower(trim(coalesce(v_district, ''))) = v_inside then
    v_delivery := v_in_charge;
  else
    v_delivery := v_out_charge;
  end if;

  v_total := v_subtotal - v_discount + v_delivery;

  -- Cash on Delivery: the delivery fee must be paid in advance (bKash / Nagad); only the product price is cash.
  v_method := coalesce(nullif(payload->>'payment_method', ''), 'COD');
  if v_delivery > 0 and v_method = 'COD' then
    return jsonb_build_object('ok', false, 'code', 'PAYMENT_REQUIRED',
      'message', 'For Cash on Delivery, the delivery fee of ৳' || round(v_delivery)::text || ' must be paid in advance by bKash or Nagad.');
  end if;
  if v_delivery > 0 and v_method in ('COD_BKASH', 'COD_NAGAD') and nullif(payload->>'payment_trx_id', '') is null then
    return jsonb_build_object('ok', false, 'code', 'PAYMENT_REQUIRED', 'message', 'Please enter the Transaction ID of your delivery fee payment.');
  end if;

  -- Order number: CHOC-YYYYMMDD-0001 (day in Asia/Dhaka)
  v_day := to_char(now() at time zone 'Asia/Dhaka', 'YYYYMMDD');
  insert into public.order_counters (day_key, last_value) values (v_day, 1)
  on conflict (day_key) do update set last_value = public.order_counters.last_value + 1
  returning last_value into v_seq;
  v_number := 'CHOC-' || v_day || '-' || lpad(v_seq::text, 4, '0');

  insert into public.orders (
    order_number, customer_name, phone, email, address, division, district, upazila, delivery_note,
    subtotal, delivery_charge, discount, total, coupon_code, payment_method, payment_sender, payment_trx_id, status
  ) values (
    v_number,
    payload->>'name', v_phone, nullif(payload->>'email', ''), payload->>'address',
    payload->>'division', v_district, payload->>'upazila', nullif(payload->>'note', ''),
    v_subtotal, v_delivery, v_discount, v_total, v_code,
    v_method,
    nullif(payload->>'payment_sender', ''), nullif(upper(payload->>'payment_trx_id'), ''), 'Pending'
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, unit_price, unit_cost, quantity, line_total)
  select v_order.id, (l->>'product_id')::uuid, l->>'name', (l->>'price')::numeric, (l->>'cost')::numeric,
         (l->>'quantity')::int, (l->>'price')::numeric * (l->>'quantity')::int
    from jsonb_array_elements(v_lines) l;

  update public.products pr
     set stock = pr.stock - (l->>'quantity')::int
    from jsonb_array_elements(v_lines) l
   where pr.id = (l->>'product_id')::uuid;

  if v_code is not null then
    update public.coupons set used_count = used_count + 1 where code = v_code;
  end if;

  select coalesce(jsonb_agg(to_jsonb(oi) order by oi.product_name), '[]'::jsonb)
    into v_items_out from public.order_items oi where oi.order_id = v_order.id;

  return jsonb_build_object('ok', true, 'order', to_jsonb(v_order), 'items', v_items_out);
end $$;

-- Only the server (service_role) may place orders.
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;

-- Atomic stock adjust for admins (+/- delta).
create or replace function public.adjust_stock(p_id uuid, delta int)
returns int
language plpgsql security definer
set search_path = public
as $$
declare v_stock int;
begin
  if not public.is_admin() then raise exception 'Not authorised'; end if;
  update public.products set stock = greatest(0, stock + delta) where id = p_id returning stock into v_stock;
  return v_stock;
end $$;
revoke all on function public.adjust_stock(uuid, int) from public, anon;
grant execute on function public.adjust_stock(uuid, int) to authenticated;

-- Public "best sellers" (aggregate only – no customer data leaves the database).
create or replace function public.get_best_sellers(max_rows int default 8)
returns table (product_id uuid, qty_sold bigint)
language sql stable security definer
set search_path = public
as $$
  select oi.product_id, sum(oi.quantity)::bigint as qty_sold
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where oi.product_id is not null and o.status <> 'Cancelled'
   group by oi.product_id
   order by qty_sold desc
   limit greatest(1, least(max_rows, 24));
$$;
grant execute on function public.get_best_sellers(int) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.admins         enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.coupons        enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.settings       enable row level security;
alter table public.order_counters enable row level security;
alter table public.reviews        enable row level security;

-- admins: a signed-in user may only see their own row (used to check "am I an admin?").
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins for select to authenticated using (user_id = auth.uid());

-- categories
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (is_active or public.is_admin());
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- products (customers see only active products)
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (is_active or public.is_admin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- settings (non-secret store configuration is public so the cart can preview delivery)
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select using (true);
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- coupons / orders / order_items: admins only (customers go through Netlify Functions)
drop policy if exists coupons_admin_all on public.coupons;
create policy coupons_admin_all on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- order_counters: no policies → nobody except the service role / security-definer functions.

-- reviews
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (is_approved or public.is_admin());
drop policy if exists reviews_admin_write on public.reviews;
create policy reviews_admin_write on public.reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Storage bucket for product images (public read, admin write)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write" on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ----------------------------------------------------------------------------
-- Default store settings (editable from Admin → Settings)
-- ----------------------------------------------------------------------------
insert into public.settings (key, value) values ('store', jsonb_build_object(
  'store_name', 'Choco Haat',
  'tagline', 'Premium chocolates. Better prices.',
  'contact_phone', '01700-000000',
  'contact_email', 'hello@example.com',
  'whatsapp_number', '',
  'address_line', 'Bangladesh',
  'inside_city_district', 'Sylhet',
  'inside_city_charge', 60,
  'outside_city_charge', 100,
  'free_delivery_threshold', 0,
  'min_order_amount', 0,
  'low_stock_threshold', 5
)) on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Customer accounts (also available as supabase/migrations/002_customer_accounts.sql)
-- ----------------------------------------------------------------------------

-- 1) Link orders to a customer account (guest orders keep user_id = null)
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- 2) Saved delivery details (each customer can only see / edit their own row)
create table if not exists public.customer_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  address    text,
  division   text,
  district   text,
  upazila    text,
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;

drop policy if exists customer_profiles_own on public.customer_profiles;
create policy customer_profiles_own on public.customer_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) "My orders": a SECURITY DEFINER function that returns ONLY customer-safe fields
--    (no cost prices, no internal sync info). Customers get no direct access to the orders table.
create or replace function public.get_my_orders()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(x.o order by x.created_at desc), '[]'::jsonb)
  from (
    select o.created_at,
      jsonb_build_object(
        'order_number', o.order_number, 'status', o.status, 'created_at', o.created_at,
        'customer_name', o.customer_name, 'phone', o.phone, 'address', o.address,
        'upazila', o.upazila, 'district', o.district, 'division', o.division,
        'payment_method', o.payment_method, 'payment_trx_id', o.payment_trx_id, 'subtotal', o.subtotal,
        'delivery_charge', o.delivery_charge, 'discount', o.discount, 'total', o.total,
        'items', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'product_id', i.product_id, 'product_name', i.product_name, 'quantity', i.quantity,
            'unit_price', i.unit_price, 'line_total', i.line_total) order by i.product_name), '[]'::jsonb)
          from public.order_items i where i.order_id = o.id)
      ) as o
    from public.orders o
    where auth.uid() is not null and o.user_id = auth.uid()
    order by o.created_at desc
    limit 200
  ) x;
$$;
revoke all on function public.get_my_orders() from public, anon;
grant execute on function public.get_my_orders() to authenticated;
