-- 004: Cash on Delivery with the delivery fee paid in advance (bKash / Nagad). Safe to run more than once.
-- Requires 003_mobile_payments.sql to have been run first.
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

revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;
