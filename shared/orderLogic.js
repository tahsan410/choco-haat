// Pure order logic shared by the storefront (price previews), the demo backend and Netlify Functions.
// The Postgres function `place_order` (supabase/schema.sql) mirrors the pricing rules below and is the
// source of truth in production. NOTHING here trusts prices coming from the browser.

import { BD_LOCATIONS, LIMITS, PAYMENT_METHODS, SHEET_HEADERS } from './constants.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

export const isUuid = (v) => UUID_RE.test(String(v || ''));

/** Returns the local 11-digit number (01XXXXXXXXX) or null when invalid. */
export function normalizePhone(raw) {
  const s = String(raw ?? '').replace(/[\s-]/g, '');
  if (!PHONE_RE.test(s)) return null;
  return s.replace(/^\+?88/, '');
}

/** Strips control chars + angle brackets, collapses whitespace and trims. */
export function cleanText(value, max = 200) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate the raw JSON the browser sends. The browser only sends product IDs + quantities.
 * Returns { ok, errors, value }.
 */
export function validateOrderInput(raw, { requireUuidIds = false } = {}) {
  const errors = {};
  const r = raw && typeof raw === 'object' ? raw : {};

  const name = cleanText(r.name, LIMITS.name);
  if (name.length < 2) errors.name = 'Please enter your full name.';

  const phone = normalizePhone(r.phone);
  if (!phone) errors.phone = 'Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).';

  const email = cleanText(r.email, LIMITS.email);
  if (email && !EMAIL_RE.test(email)) errors.email = 'This email address looks invalid.';

  const address = cleanText(r.address, LIMITS.address);
  if (address.length < 6) errors.address = 'Please enter your full delivery address.';

  const division = cleanText(r.division, 40);
  const district = cleanText(r.district, 40);
  if (!division || !BD_LOCATIONS[division]) errors.division = 'Select your division.';
  else if (!district || !BD_LOCATIONS[division].includes(district)) errors.district = 'Select your district.';

  const upazila = cleanText(r.upazila, LIMITS.upazila);
  if (upazila.length < 2) errors.upazila = 'Enter your upazila / area.';

  const note = cleanText(r.note, LIMITS.note);

  const paymentMethod = String(r.paymentMethod || '');
  const method = PAYMENT_METHODS.find((m) => m.id === paymentMethod && m.enabled);
  if (!method) errors.paymentMethod = 'Select a payment method.';

  // bKash / Nagad: the customer sends money first, then tells us the number they paid from + the Transaction ID.
  let paymentSender = '';
  let paymentTrxId = '';
  if (method?.mobile) {
    paymentSender = normalizePhone(r.paymentSender) || '';
    if (!paymentSender) errors.paymentSender = `Enter the ${method.label} number you paid from (01XXXXXXXXX).`;
    paymentTrxId = String(r.paymentTrxId ?? '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9]{6,20}$/.test(paymentTrxId)) errors.paymentTrxId = 'Enter the Transaction ID from your payment message (letters and numbers, 6–20 characters).';
  }

  const couponCode = cleanText(r.couponCode, LIMITS.coupon).toUpperCase();

  // Items → merge duplicate product IDs
  const items = [];
  if (!Array.isArray(r.items) || r.items.length === 0) errors.items = 'Your cart is empty.';
  else if (r.items.length > LIMITS.maxLines) errors.items = 'Too many different products in one order.';
  else {
    const merged = new Map();
    for (const it of r.items) {
      const id = String(it?.productId ?? '');
      const qty = Number(it?.quantity);
      const idOk = requireUuidIds ? isUuid(id) : SAFE_ID_RE.test(id);
      if (!idOk || !Number.isInteger(qty) || qty < 1 || qty > LIMITS.maxQtyPerLine) {
        errors.items = 'One of the cart items is invalid. Please review your cart.';
        break;
      }
      merged.set(id, (merged.get(id) || 0) + qty);
    }
    if (!errors.items) {
      for (const [productId, quantity] of merged) {
        if (quantity > LIMITS.maxQtyPerLine) { errors.items = 'Quantity too large for one product.'; break; }
        items.push({ productId, quantity });
      }
    }
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    value: ok ? { name, phone, email, address, division, district, upazila, note, paymentMethod, paymentSender, paymentTrxId, couponCode, items } : null,
  };
}

/** Delivery charge from settings. Used for the live preview and by the demo backend. */
export function computeDelivery(settings, district, subtotal) {
  const s = settings || {};
  const threshold = Number(s.free_delivery_threshold) || 0;
  if (threshold > 0 && subtotal >= threshold) return 0;
  const inside = String(s.inside_city_district || '').trim().toLowerCase();
  const isInside = inside && String(district || '').trim().toLowerCase() === inside;
  return Number(isInside ? s.inside_city_charge : s.outside_city_charge) || 0;
}

/** Coupon rules. Returns { ok, discount, reason }. */
export function evaluateCoupon(coupon, subtotal, now = new Date()) {
  if (!coupon) return { ok: false, discount: 0, reason: 'This coupon code is not valid.' };
  if (!coupon.is_active) return { ok: false, discount: 0, reason: 'This coupon is no longer active.' };
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return { ok: false, discount: 0, reason: 'This coupon has expired.' };
  if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    return { ok: false, discount: 0, reason: 'This coupon has reached its usage limit.' };
  }
  if (Number(coupon.min_order) > subtotal) {
    return { ok: false, discount: 0, reason: `Spend at least ৳${Number(coupon.min_order)} to use this coupon.` };
  }
  let discount = coupon.type === 'percent' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  discount = Math.max(0, Math.min(Math.round(discount), subtotal));
  return { ok: true, discount, reason: '' };
}

/**
 * Price an order from AUTHORITATIVE product rows.
 * lines: [{ product: {id,name,price,cost_price,stock,is_active}, quantity }]
 * Returns { ok:false, code, message } or { ok:true, items, subtotal, deliveryCharge, discount, total }.
 */
export function priceOrder({ lines, settings, district, coupon = null, now = new Date() }) {
  let subtotal = 0;
  const items = [];
  for (const { product, quantity } of lines) {
    if (!product || !product.is_active) {
      return { ok: false, code: 'PRODUCT_UNAVAILABLE', message: 'A product in your cart is no longer available.' };
    }
    if (Number(product.stock) < quantity) {
      const left = Math.max(0, Number(product.stock));
      return {
        ok: false,
        code: 'OUT_OF_STOCK',
        message: left === 0 ? `${product.name} is out of stock.` : `Only ${left} of ${product.name} left in stock.`,
        productId: product.id,
        available: left,
      };
    }
    const unit = Number(product.price);
    const lineTotal = unit * quantity;
    subtotal += lineTotal;
    items.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: unit,
      unit_cost: Number(product.cost_price) || 0,
      quantity,
      line_total: lineTotal,
    });
  }

  const min = Number(settings?.min_order_amount) || 0;
  if (min > 0 && subtotal < min) {
    return { ok: false, code: 'MIN_ORDER', message: `The minimum order amount is ৳${min}.` };
  }

  let discount = 0;
  if (coupon) {
    const res = evaluateCoupon(coupon, subtotal, now);
    if (!res.ok) return { ok: false, code: 'COUPON_INVALID', message: res.reason };
    discount = res.discount;
  }

  const deliveryCharge = computeDelivery(settings, district, subtotal);
  const total = subtotal - discount + deliveryCharge;
  return { ok: true, items, subtotal, deliveryCharge, discount, total };
}

/** YYYYMMDD in Asia/Dhaka. */
export function dhakaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
  return parts.replaceAll('-', '');
}

export function formatOrderNumber(dayKey, seq) {
  return `CHOC-${dayKey}-${String(seq).padStart(4, '0')}`;
}

export const ORDER_NUMBER_RE = /^CHOC-\d{8}-\d{4,}$/;

/** Google Sheets cells that start with = + - @ can be executed as formulas – neutralise them. */
export function safeCell(v) {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

export function formatSheetDate(iso) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date}, ${time}`;
}

/** One Google Sheets row (same order as SHEET_HEADERS). */
export function orderToSheetRow(order, items) {
  const fullAddress = [order.address, order.upazila, order.district, order.division].filter(Boolean).join(', ');
  const row = [
    order.order_number,
    formatSheetDate(order.created_at),
    order.customer_name,
    order.phone,
    order.email || '',
    fullAddress,
    items.map((i) => `${i.product_name} x${i.quantity}`).join(', '),
    items.map((i) => i.quantity).join(','),
    Number(order.subtotal),
    Number(order.delivery_charge),
    Number(order.total),
    order.payment_method,
    order.status,
    order.payment_sender || '',
    order.payment_trx_id || '',
  ];
  if (row.length !== SHEET_HEADERS.length) throw new Error('Sheet row/header mismatch');
  return row.map((c) => (typeof c === 'number' ? c : safeCell(c)));
}

/** Fields a customer is allowed to see about their own order (no internal ids / sync data). */
export function publicOrder(order, items) {
  return {
    order_number: order.order_number,
    status: order.status,
    created_at: order.created_at,
    customer_name: order.customer_name,
    phone: order.phone,
    address: order.address,
    upazila: order.upazila,
    district: order.district,
    division: order.division,
    payment_method: order.payment_method,
    payment_trx_id: order.payment_trx_id || null,
    subtotal: Number(order.subtotal),
    delivery_charge: Number(order.delivery_charge),
    discount: Number(order.discount || 0),
    total: Number(order.total),
    items: items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      line_total: Number(i.line_total),
    })),
  };
}
