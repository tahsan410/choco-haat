import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createOrderCore, trackOrderCore, sheetSyncCore, publicOrder } from '../netlify/lib/orderCore.js';
import { createSheetsClient, sheetsConfig } from '../netlify/lib/sheets.js';
import { rateLimit, _resetRateLimit } from '../netlify/lib/rateLimit.js';
import { SHEET_HEADERS } from '../shared/constants.js';

const silent = { error() {}, warn() {}, log() {} };
const UUID = '3f2b8c1e-6a4d-4f6b-8c0e-1a2b3c4d5e6f';
const input = (o = {}) => ({
  name: 'Tahsan', phone: '01712345678', address: 'House 12, Road 3', division: 'Sylhet', district: 'Sylhet',
  upazila: 'Sadar', paymentMethod: 'COD', items: [{ productId: UUID, quantity: 2 }], ...o,
});
const orderRow = { id: 'o1', order_number: 'CHOC-20261006-0001', status: 'Pending', created_at: '2026-10-06T03:00:00Z', customer_name: 'Tahsan', phone: '01712345678', email: null, address: 'House 12, Road 3', upazila: 'Sadar', district: 'Sylhet', division: 'Sylhet', payment_method: 'COD', subtotal: 200, delivery_charge: 60, discount: 0, total: 260 };
const itemRows = [{ product_name: 'KitKat', quantity: 2, unit_price: 100, line_total: 200 }];

const fakeDb = (over = {}) => {
  const calls = { place: [], mark: [] };
  return {
    calls,
    placeOrder: async (p) => { calls.place.push(p); return { ok: true, order: orderRow, items: itemRows }; },
    markSheet: async (id, s) => { calls.mark.push([id, s]); },
    findOrderByNumber: async (n) => (n === orderRow.order_number ? { order: orderRow, items: itemRows } : null),
    findOrderById: async (id) => (id === 'o1' ? { order: orderRow, items: itemRows } : null),
    listUnsynced: async () => [{ order: orderRow, items: itemRows }],
    ...over,
  };
};
const okSheets = () => { const rows = []; return { rows, enabled: true, appendOrder: async (o) => { rows.push(o.order_number); }, updateStatus: async () => true }; };

test('create-order: never forwards a browser-supplied price to the database', async () => {
  const db = fakeDb();
  const res = await createOrderCore({ input: { ...input(), price: 1, total: 1, items: [{ productId: UUID, quantity: 2, price: 1, unit_price: 1 }] }, db, sheets: okSheets(), log: silent });
  assert.equal(res.status, 201);
  const sent = JSON.stringify(db.calls.place[0]);
  assert.ok(!/"price"|"total"|unit_price/.test(sent), 'payload must only contain ids + quantities');
  assert.deepEqual(db.calls.place[0].items, [{ product_id: UUID, quantity: 2 }]);
});

test('create-order success appends to Google Sheets and flags synced', async () => {
  const db = fakeDb(); const sheets = okSheets();
  const res = await createOrderCore({ input: input(), db, sheets, log: silent });
  assert.equal(res.status, 201); assert.equal(res.body.sheetSynced, true);
  assert.deepEqual(sheets.rows, ['CHOC-20261006-0001']);
  assert.deepEqual(db.calls.mark[0], ['o1', { synced: true, error: null }]);
  assert.equal(res.body.order.order_number, 'CHOC-20261006-0001');
});

test('create-order: Google Sheets failure does NOT lose the order and is logged for retry', async () => {
  const db = fakeDb();
  const sheets = { enabled: true, appendOrder: async () => { throw new Error('quota exceeded'); } };
  const res = await createOrderCore({ input: input(), db, sheets, log: silent });
  assert.equal(res.status, 201); assert.equal(res.body.ok, true); assert.equal(res.body.sheetSynced, false);
  assert.equal(db.calls.mark[0][1].synced, false);
  assert.match(db.calls.mark[0][1].error, /quota exceeded/);
});

test('create-order: sheets not configured still saves the order', async () => {
  const db = fakeDb();
  const res = await createOrderCore({ input: input(), db, sheets: { enabled: false }, log: silent });
  assert.equal(res.status, 201); assert.equal(res.body.sheetSynced, false);
  assert.match(db.calls.mark[0][1].error, /not configured/);
});

test('create-order: validation, honeypot, stock and server errors', async () => {
  const db = fakeDb();
  let r = await createOrderCore({ input: input({ phone: '123' }), db, sheets: okSheets(), log: silent });
  assert.equal(r.status, 400); assert.ok(r.body.errors.phone); assert.equal(db.calls.place.length, 0);
  r = await createOrderCore({ input: input({ website: 'http://spam' }), db, sheets: okSheets(), log: silent });
  assert.equal(r.status, 400); assert.equal(db.calls.place.length, 0);
  r = await createOrderCore({ input: input(), db: fakeDb({ placeOrder: async () => ({ ok: false, code: 'OUT_OF_STOCK', message: 'KitKat is out of stock.', product_id: UUID, available: 0 }) }), sheets: okSheets(), log: silent });
  assert.equal(r.status, 409); assert.equal(r.body.productId, UUID);
  r = await createOrderCore({ input: input(), db: fakeDb({ placeOrder: async () => { throw new Error('connection refused to db.internal:5432'); } }), sheets: okSheets(), log: silent });
  assert.equal(r.status, 500); assert.ok(!/db\.internal/.test(JSON.stringify(r.body)), 'internal errors must not leak');
});

test('track-order requires BOTH order id and matching phone', async () => {
  const db = fakeDb();
  const ok = await trackOrderCore({ input: { orderNumber: 'choc-20261006-0001', phone: '+8801712345678' }, db, log: silent });
  assert.equal(ok.status, 200); assert.equal(ok.body.order.items[0].product_name, 'KitKat');
  const wrongPhone = await trackOrderCore({ input: { orderNumber: 'CHOC-20261006-0001', phone: '01898765432' }, db, log: silent });
  const wrongId = await trackOrderCore({ input: { orderNumber: 'CHOC-20261006-0009', phone: '01712345678' }, db, log: silent });
  assert.equal(wrongPhone.status, 404); assert.equal(wrongId.status, 404);
  assert.deepEqual(wrongPhone.body, wrongId.body); // indistinguishable
  assert.equal((await trackOrderCore({ input: { orderNumber: "x' or 1=1", phone: '01712345678' }, db, log: silent })).status, 404);
});

test('public order omits internal fields', () => {
  const pub = publicOrder({ ...orderRow, id: 'secret', sheet_sync_error: 'boom', coupon_code: 'X' }, itemRows);
  assert.ok(!('id' in pub) && !('sheet_sync_error' in pub));
});

test('sheet-sync: retry, retryAll and updateStatus', async () => {
  const db = fakeDb(); const sheets = okSheets();
  assert.equal((await sheetSyncCore({ input: { action: 'retry', orderId: 'o1' }, db, sheets, log: silent })).status, 200);
  assert.deepEqual(db.calls.mark.at(-1), ['o1', { synced: true, error: null }]);
  const all = await sheetSyncCore({ input: { action: 'retryAll' }, db, sheets, log: silent });
  assert.equal(all.body.synced, 1);
  assert.equal((await sheetSyncCore({ input: { action: 'updateStatus', orderId: 'o1' }, db, sheets, log: silent })).status, 200);
  assert.equal((await sheetSyncCore({ input: { action: 'retry', orderId: 'nope' }, db, sheets, log: silent })).status, 404);
  assert.equal((await sheetSyncCore({ input: { action: 'x' }, db, sheets, log: silent })).status, 400);
  assert.equal((await sheetSyncCore({ input: { action: 'retry', orderId: 'o1' }, db, sheets: { enabled: false }, log: silent })).status, 503);
  const failing = { enabled: true, appendOrder: async () => { throw new Error('nope'); } };
  assert.equal((await sheetSyncCore({ input: { action: 'retry', orderId: 'o1' }, db, sheets: failing, log: silent })).status, 502);
});

test('Google Sheets client: JWT auth, header creation, append and idempotent update', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const env = { GOOGLE_SERVICE_ACCOUNT_EMAIL: 'svc@proj.iam.gserviceaccount.com', GOOGLE_PRIVATE_KEY: `"${privateKey.replace(/\n/g, '\\n')}"`, GOOGLE_SHEET_ID: 'SHEET1', GOOGLE_SHEET_TAB: 'Orders' };
  const cfg = sheetsConfig(env);
  assert.ok(cfg.key.includes('BEGIN PRIVATE KEY') && cfg.key.includes('\n'));
  assert.equal(sheetsConfig({}), null);

  const store = { tabs: [], values: [] }; const seen = [];
  const fetchFn = async (url, opts = {}) => {
    const u = String(url); seen.push(`${opts.method || 'GET'} ${decodeURIComponent(u).replace('https://sheets.googleapis.com/v4/spreadsheets/SHEET1', '')}`);
    const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
    if (u.startsWith('https://oauth2.googleapis.com/token')) {
      const assertion = new URLSearchParams(opts.body).get('assertion');
      const [h, c] = assertion.split('.').slice(0, 2).map((p) => JSON.parse(Buffer.from(p, 'base64url').toString()));
      assert.equal(h.alg, 'RS256'); assert.equal(c.iss, env.GOOGLE_SERVICE_ACCOUNT_EMAIL); assert.match(c.scope, /spreadsheets/);
      return reply({ access_token: 'tok', expires_in: 3600 });
    }
    assert.equal(opts.headers.authorization, 'Bearer tok');
    if (u.includes('?fields=sheets.properties.title')) return reply({ sheets: store.tabs.map((t) => ({ properties: { title: t } })) });
    if (u.endsWith(':batchUpdate')) { store.tabs.push(JSON.parse(opts.body).requests[0].addSheet.properties.title); return reply({}); }
    const d = decodeURIComponent(u);
    if (opts.method === 'PUT' && d.includes("!A1:M1")) { store.values[0] = JSON.parse(opts.body).values[0]; return reply({}); }
    if ((opts.method || 'GET') === 'GET' && d.includes("!A1:M1")) return reply(store.values[0] ? { values: [store.values[0]] } : {});
    if ((opts.method || 'GET') === 'GET' && d.includes("!A:A")) return reply({ values: store.values.map((r) => [r[0]]) });
    if (opts.method === 'POST' && d.includes(':append')) { store.values.push(JSON.parse(opts.body).values[0]); return reply({}); }
    if (opts.method === 'PUT') {
      const m = d.match(/!([A-M])(\d+)(?::M\d+)?\?/); const rowNo = Number(m[2]) - 1; const body = JSON.parse(opts.body).values;
      if (m[1] === 'M') store.values[rowNo][12] = body[0][0]; else store.values[rowNo] = body[0];
      return reply({});
    }
    return reply({ error: { message: `unexpected ${opts.method} ${d}` } }, 400);
  };

  const sheets = createSheetsClient(cfg, fetchFn);
  const order = { ...orderRow };
  await sheets.appendOrder(order, itemRows);
  assert.deepEqual(store.tabs, ['Orders']);
  assert.deepEqual(store.values[0], SHEET_HEADERS);
  assert.equal(store.values.length, 2);
  assert.equal(store.values[1][0], 'CHOC-20261006-0001'); assert.equal(store.values[1][12], 'Pending');

  await sheets.appendOrder(order, itemRows); // retry must not duplicate
  assert.equal(store.values.length, 2);

  assert.equal(await sheets.updateStatus('CHOC-20261006-0001', 'Shipped'), true);
  assert.equal(store.values[1][12], 'Shipped');
  assert.equal(await sheets.updateStatus('CHOC-DOES-NOT-EXIST', 'Shipped'), false);
});

test('rate limiter blocks after the limit and recovers after the window', () => {
  _resetRateLimit();
  for (let i = 0; i < 3; i++) assert.equal(rateLimit('k', 3, 1000, 1000 + i).allowed, true);
  assert.equal(rateLimit('k', 3, 1000, 1500).allowed, false);
  assert.equal(rateLimit('other', 3, 1000, 1500).allowed, true);
  assert.equal(rateLimit('k', 3, 1000, 2500).allowed, true);
});
