-- Customer accounts (email + password). Safe to run more than once.
-- Run this in Supabase → SQL Editor if you already ran schema.sql before this feature existed.

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
        'payment_method', o.payment_method, 'subtotal', o.subtotal,
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
