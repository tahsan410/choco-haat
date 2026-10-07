import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone, validateOrderInput, priceOrder, computeDelivery, evaluateCoupon,
  orderToSheetRow, formatOrderNumber, dhakaDateKey, safeCell, ORDER_NUMBER_RE,
} from '../shared/orderLogic.js';
import { SHEET_HEADERS, DEFAULT_SETTINGS, BD_LOCATIONS } from '../shared/constants.js';

const UUID_A = '3f2b8c1e-6a4d-4f6b-8c0e-1a2b3c4d5e6f';
const UUID_B = '9a1d2c3b-4e5f-4a6b-9c7d-8e9f0a1b2c3d';

const goodInput = (over = {}) => ({
  name: 'Tahsan Ovi', phone: '+8801712345678', email: 'a@b.co', address: 'House 12, Road 3, Zindabazar',
  division: 'Sylhet', district: 'Sylhet', upazila: 'Sylhet Sadar', note: '', paymentMethod: 'COD',
  items: [{ productId: UUID_A, quantity: 2 }], ...over,
});

test('Bangladesh phone numbers are normalised and validated', () => {
  assert.equal(normalizePhone('01712345678'), '01712345678');
  assert.equal(normalizePhone('+8801712345678'), '01712345678');
  assert.equal(normalizePhone('880 1712-345678'), '01712345678');
  assert.equal(normalizePhone('01212345678'), null); // 012 is not a mobile operator prefix
  assert.equal(normalizePhone('1712345678'), null);
  assert.equal(normalizePhone('0171234567'), null);
  assert.equal(normalizePhone(''), null);
});

test('validateOrderInput accepts a good order and merges duplicate items', () => {
  const r = validateOrderInput(goodInput({ items: [{ productId: UUID_A, quantity: 1 }, { productId: UUID_A, quantity: 2 }, { productId: UUID_B, quantity: 1 }] }), { requireUuidIds: true });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.items, [{ productId: UUID_A, quantity: 3 }, { productId: UUID_B, quantity: 1 }]);
  assert.equal(r.value.phone, '01712345678');
});

test('validateOrderInput rejects bad data with friendly field errors', () => {
  const r = validateOrderInput({ name: 'x', phone: '123', address: 'a', items: [] });
  assert.equal(r.ok, false);
  for (const k of ['name', 'phone', 'address', 'division', 'upazila', 'items']) assert.ok(r.errors[k], `missing error for ${k}`);
  assert.equal(validateOrderInput(goodInput({ district: 'Dhaka' })).errors.district !== undefined, true); // Dhaka is not in Sylhet division
  assert.equal(validateOrderInput(goodInput({ items: [{ productId: UUID_A, quantity: 0 }] })).ok, false);
  assert.equal(validateOrderInput(goodInput({ items: [{ productId: UUID_A, quantity: 1.5 }] })).ok, false);
  assert.equal(validateOrderInput(goodInput({ items: [{ productId: 'not-a-uuid', quantity: 1 }] }), { requireUuidIds: true }).ok, false);
  assert.equal(validateOrderInput(goodInput({ email: 'nope' })).ok, false);
  assert.equal(validateOrderInput(goodInput({ paymentMethod: 'BITCOIN' })).ok, false);
});

test('text is sanitised (no angle brackets, collapsed whitespace)', () => {
  const r = validateOrderInput(goodInput({ name: '  <b>Ovi</b>\n\n  Tahsan ' }));
  assert.equal(r.value.name, 'bOvi/b Tahsan');
});

test('all 64 districts are present', () => {
  assert.equal(Object.values(BD_LOCATIONS).flat().length, 64);
});

const product = (over = {}) => ({ id: UUID_A, name: 'KitKat', price: 100, cost_price: 70, stock: 10, is_active: true, ...over });

test('priceOrder uses authoritative prices and computes delivery', () => {
  const r = priceOrder({ lines: [{ product: product(), quantity: 3 }], settings: DEFAULT_SETTINGS, district: 'Sylhet' });
  assert.equal(r.ok, true);
  assert.equal(r.subtotal, 300);
  assert.equal(r.deliveryCharge, 60);
  assert.equal(r.total, 360);
  const out = priceOrder({ lines: [{ product: product(), quantity: 3 }], settings: DEFAULT_SETTINGS, district: 'Dhaka' });
  assert.equal(out.deliveryCharge, 100);
});

test('priceOrder blocks out-of-stock, inactive and below-minimum orders', () => {
  const s = priceOrder({ lines: [{ product: product({ stock: 2 }), quantity: 3 }], settings: DEFAULT_SETTINGS, district: 'Sylhet' });
  assert.equal(s.ok, false); assert.equal(s.code, 'OUT_OF_STOCK'); assert.equal(s.available, 2);
  assert.equal(priceOrder({ lines: [{ product: product({ stock: 0 }), quantity: 1 }], settings: DEFAULT_SETTINGS, district: 'x' }).message, 'KitKat is out of stock.');
  assert.equal(priceOrder({ lines: [{ product: product({ is_active: false }), quantity: 1 }], settings: DEFAULT_SETTINGS, district: 'x' }).code, 'PRODUCT_UNAVAILABLE');
  assert.equal(priceOrder({ lines: [{ product: null, quantity: 1 }], settings: DEFAULT_SETTINGS, district: 'x' }).code, 'PRODUCT_UNAVAILABLE');
  const min = priceOrder({ lines: [{ product: product(), quantity: 1 }], settings: { ...DEFAULT_SETTINGS, min_order_amount: 500 }, district: 'Sylhet' });
  assert.equal(min.code, 'MIN_ORDER');
});

test('free delivery threshold and settings-driven charges', () => {
  const settings = { ...DEFAULT_SETTINGS, free_delivery_threshold: 1000, inside_city_charge: 40, outside_city_charge: 150 };
  assert.equal(computeDelivery(settings, 'Sylhet', 999), 40);
  assert.equal(computeDelivery(settings, 'sylhet ', 999), 40);
  assert.equal(computeDelivery(settings, 'Khulna', 999), 150);
  assert.equal(computeDelivery(settings, 'Khulna', 1000), 0);
});

test('coupons: percent, fixed, min order, expiry, usage limit', () => {
  const base = { code: 'X', type: 'percent', value: 10, min_order: 0, expires_at: null, usage_limit: null, used_count: 0, is_active: true };
  assert.equal(evaluateCoupon(base, 500).discount, 50);
  assert.equal(evaluateCoupon({ ...base, type: 'fixed', value: 700 }, 500).discount, 500); // never more than subtotal
  assert.equal(evaluateCoupon({ ...base, min_order: 1000 }, 500).ok, false);
  assert.equal(evaluateCoupon({ ...base, expires_at: '2020-01-01' }, 500).ok, false);
  assert.equal(evaluateCoupon({ ...base, usage_limit: 5, used_count: 5 }, 500).ok, false);
  assert.equal(evaluateCoupon({ ...base, is_active: false }, 500).ok, false);
  assert.equal(evaluateCoupon(null, 500).ok, false);
  const r = priceOrder({ lines: [{ product: product(), quantity: 5 }], settings: DEFAULT_SETTINGS, district: 'Sylhet', coupon: base });
  assert.equal(r.discount, 50); assert.equal(r.total, 500 - 50 + 60);
});

test('order numbers follow CHOC-YYYYMMDD-0001 in Dhaka time', () => {
  assert.equal(formatOrderNumber('20261006', 1), 'CHOC-20261006-0001');
  assert.equal(formatOrderNumber('20261006', 12345), 'CHOC-20261006-12345');
  assert.ok(ORDER_NUMBER_RE.test('CHOC-20261006-0001'));
  // 2026-10-05T19:00Z is already 01:00 on the 6th in Dhaka (UTC+6)
  assert.equal(dhakaDateKey(new Date('2026-10-05T19:00:00Z')), '20261006');
  assert.equal(dhakaDateKey(new Date('2026-10-05T17:59:00Z')), '20261005');
});

test('sheet row matches the header and neutralises spreadsheet formulas', () => {
  const order = { order_number: 'CHOC-20261006-0001', created_at: '2026-10-06T03:27:00Z', customer_name: '=HYPERLINK("x")', phone: '01712345678', email: '', address: 'House 1', upazila: 'Sadar', district: 'Sylhet', division: 'Sylhet', subtotal: 1500, delivery_charge: 80, total: 1580, payment_method: 'COD', status: 'Pending' };
  const items = [{ product_name: 'KitKat', quantity: 2 }, { product_name: 'Kinder', quantity: 1 }];
  const row = orderToSheetRow(order, items);
  assert.equal(row.length, SHEET_HEADERS.length);
  assert.equal(row[0], 'CHOC-20261006-0001');
  assert.equal(row[1], '06 Oct 2026, 09:27');
  assert.equal(row[2], `'=HYPERLINK("x")`);
  assert.equal(row[6], 'KitKat x2, Kinder x1');
  assert.equal(row[7], '2,1');
  assert.deepEqual(row.slice(8, 11), [1500, 80, 1580]);
  assert.equal(safeCell('+880'), "'+880");
  assert.equal(safeCell('Normal'), 'Normal');
});
