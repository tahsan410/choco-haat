// Demo / development backend: everything lives in the browser's localStorage.
// It mirrors the production rules (validation, server-side pricing, stock, coupons, order numbers)
// using the SAME shared logic, so the whole shop and admin can be tried without any setup.
// Never use it for real customers – data is local to one browser.
import { ApiError } from './errors.js';
import { DEFAULT_SETTINGS } from '../../shared/constants.js';
import { DEMO_CATEGORIES, DEMO_PRODUCTS, demoProductRow } from '../../shared/demoCatalog.js';
import { validateOrderInput, priceOrder, dhakaDateKey, formatOrderNumber, normalizePhone, ORDER_NUMBER_RE, publicOrder } from '../../shared/orderLogic.js';

const KEY = 'chocohaat.demo.v1';
const SESSION_KEY = 'chocohaat.demo.session';
const CUSTOMER_KEY = 'chocohaat.demo.customer';

const memory = new Map();
const store = {
  get(k) { try { return globalThis.localStorage?.getItem(k) ?? memory.get(k) ?? null; } catch { return memory.get(k) ?? null; } },
  set(k, v) { memory.set(k, v); try { globalThis.localStorage?.setItem(k, v); } catch { /* memory copy is used */ } },
  del(k) { try { globalThis.localStorage?.removeItem(k); } catch { /* ignore */ } memory.delete(k); },
};
const session = {
  get() { try { return globalThis.sessionStorage?.getItem(SESSION_KEY) ?? memory.get(SESSION_KEY) ?? null; } catch { return memory.get(SESSION_KEY) ?? null; } },
  set(v) { try { globalThis.sessionStorage?.setItem(SESSION_KEY, v); } catch { /* ignore */ } memory.set(SESSION_KEY, v); },
  del() { try { globalThis.sessionStorage?.removeItem(SESSION_KEY); } catch { /* ignore */ } memory.delete(SESSION_KEY); },
};

const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
const nowIso = () => new Date().toISOString();
const clone = (v) => JSON.parse(JSON.stringify(v));

function seed() {
  const created = Date.now();
  const categories = DEMO_CATEGORIES.map((c, i) => ({ id: `cat-${c.slug}`, name: c.name, slug: c.slug, sort_order: i + 1, is_active: true, created_at: nowIso() }));
  const products = DEMO_PRODUCTS.map((raw, i) => {
    const p = demoProductRow(raw);
    const { category, featured, ...rest } = p;
    return { ...rest, id: `p-${p.slug}`, category_id: `cat-${category}`, is_featured: featured, is_active: true, low_stock_threshold: 5, image_url: null, images: [], created_at: new Date(created - i * 3600_000).toISOString(), updated_at: nowIso() };
  });
  return { categories, products, orders: [], coupons: [], settings: { ...DEFAULT_SETTINGS }, counters: {}, adminAuth: null, customers: [] };
}

let state = null;
function load() {
  if (state) return state;
  try { state = JSON.parse(store.get(KEY) || 'null'); } catch { state = null; }
  if (!state) { state = seed(); save(); }
  return state;
}
function save() {
  try { store.set(KEY, JSON.stringify(state)); } catch { /* storage full */ }
}
/** Test helper. */
export function _resetDemoState() { state = null; store.del(KEY); store.del(CUSTOMER_KEY); session.del(); }

async function sha256(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const requireAdmin = () => { if (!session.get()) throw new ApiError('Please sign in again.', { code: 'AUTH' }); };

const currentCustomerId = () => store.get(CUSTOMER_KEY) || null;
const customerView = (c) => ({ id: c.id, email: c.email, name: c.name || '' });
const customerOrderView = (o) => ({
  order_number: o.order_number, status: o.status, created_at: o.created_at, customer_name: o.customer_name, phone: o.phone,
  address: o.address, upazila: o.upazila, district: o.district, division: o.division, payment_method: o.payment_method, payment_trx_id: o.payment_trx_id || null,
  subtotal: o.subtotal, delivery_charge: o.delivery_charge, discount: o.discount || 0, total: o.total,
  items: o.items.map((i) => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price, line_total: i.line_total })),
});
const requireCustomer = () => {
  const id = currentCustomerId();
  const c = id && (load().customers || []).find((x) => x.id === id);
  if (!c) throw new ApiError('Please sign in again.', { code: 'AUTH' });
  return c;
};
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const withItems = (o) => ({ ...o, items: o.items.map((i) => ({ ...i })) });

function restoreStock(order) {
  for (const i of order.items) {
    const p = state.products.find((x) => x.id === i.product_id);
    if (p) p.stock += i.quantity;
  }
}
function reserveStock(order) {
  for (const i of order.items) {
    const p = state.products.find((x) => x.id === i.product_id);
    if (p && p.stock < i.quantity) throw new ApiError('Not enough stock to re-open this cancelled order.', { code: 'STOCK' });
  }
  for (const i of order.items) {
    const p = state.products.find((x) => x.id === i.product_id);
    if (p) p.stock -= i.quantity;
  }
}

export const demoApi = {
  mode: 'demo',

  // ───────────── Public ─────────────
  async getCatalog() {
    const s = load();
    return {
      categories: clone(s.categories.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order)),
      products: clone(s.products.filter((p) => p.is_active).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))),
      settings: { ...DEFAULT_SETTINGS, ...s.settings },
    };
  },
  async getBestSellers(limit = 8) {
    const s = load();
    const totals = new Map();
    for (const o of s.orders) {
      if (o.status === 'Cancelled') continue;
      for (const i of o.items) if (i.product_id) totals.set(i.product_id, (totals.get(i.product_id) || 0) + i.quantity);
    }
    return [...totals].map(([product_id, qty_sold]) => ({ product_id, qty_sold })).sort((a, b) => b.qty_sold - a.qty_sold).slice(0, limit);
  },
  async getReviews() { return []; },

  async createOrder(input) {
    const s = load();
    const v = validateOrderInput(input);
    if (!v.ok) throw new ApiError('Please check the highlighted fields.', { code: 'VALIDATION', errors: v.errors, status: 400 });
    const c = v.value;

    const hourAgo = Date.now() - 3600_000;
    if (s.orders.filter((o) => o.phone === c.phone && new Date(o.created_at).getTime() > hourAgo).length >= 5) {
      throw new ApiError('Too many orders from this phone number. Please try again later.', { code: 'RATE_LIMIT', status: 429 });
    }

    const lines = c.items.map((i) => ({ product: s.products.find((p) => p.id === i.productId), quantity: i.quantity }));
    const coupon = c.couponCode ? s.coupons.find((x) => x.code === c.couponCode) || null : null;
    if (c.couponCode && !coupon) throw new ApiError('This coupon code is not valid.', { code: 'COUPON_INVALID', status: 422 });
    const priced = priceOrder({ lines, settings: s.settings, district: c.district, coupon });
    if (!priced.ok) throw new ApiError(priced.message, { code: priced.code, status: 409, data: { productId: priced.productId, available: priced.available } });

    const day = dhakaDateKey();
    s.counters[day] = (s.counters[day] || 0) + 1;
    const id = uid();
    const order = {
      id, order_number: formatOrderNumber(day, s.counters[day]),
      customer_name: c.name, phone: c.phone, email: c.email || null, address: c.address,
      division: c.division, district: c.district, upazila: c.upazila, delivery_note: c.note || null,
      subtotal: priced.subtotal, delivery_charge: priced.deliveryCharge, discount: priced.discount, total: priced.total,
      coupon_code: coupon ? coupon.code : null, payment_method: c.paymentMethod, payment_sender: c.paymentSender || null, payment_trx_id: c.paymentTrxId || null, status: 'Pending', is_archived: false,
      user_id: currentCustomerId(),
      sheet_synced: false, sheet_sync_error: 'Demo mode – Google Sheets sync is disabled.',
      created_at: nowIso(), updated_at: nowIso(),
      items: priced.items.map((i) => ({ id: uid(), order_id: id, ...i })),
    };
    for (const i of priced.items) s.products.find((p) => p.id === i.product_id).stock -= i.quantity;
    if (coupon) coupon.used_count += 1;
    s.orders.unshift(order);
    save();
    return { order: publicOrder(order, order.items), sheetSynced: false };
  },

  async trackOrder({ orderNumber, phone }) {
    const s = load();
    const num = String(orderNumber || '').trim().toUpperCase();
    const ph = normalizePhone(phone);
    const fail = () => new ApiError('We could not find an order with that Order ID and phone number.', { code: 'NOT_FOUND', status: 404 });
    if (!ORDER_NUMBER_RE.test(num) || !ph) throw fail();
    const o = s.orders.find((x) => x.order_number === num);
    if (!o || o.phone !== ph) throw fail();
    return publicOrder(o, o.items);
  },

  // ───────────── Customer accounts (demo) ─────────────
  async customerSession() {
    const id = currentCustomerId();
    const c = id && (load().customers || []).find((x) => x.id === id);
    return c ? customerView(c) : null;
  },
  async customerSignUp({ email, password, name }) {
    const s = load();
    s.customers = s.customers || [];
    const mail = String(email || '').trim().toLowerCase();
    if (!EMAIL_OK.test(mail)) throw new ApiError('Enter a valid email address.', { code: 'AUTH' });
    if (String(password || '').length < 6) throw new ApiError('Choose a stronger password (at least 6 characters).', { code: 'AUTH' });
    if (s.customers.some((c) => c.email === mail)) throw new ApiError('An account with this email already exists. Please sign in.', { code: 'AUTH' });
    const salt = uid();
    const c = { id: uid(), email: mail, name: String(name || '').trim().slice(0, 80), salt, hash: await sha256(salt + password), profile: null };
    s.customers.push(c);
    store.set(CUSTOMER_KEY, c.id);
    save();
    return { user: customerView(c), needsConfirmation: false };
  },
  async customerSignIn(email, password) {
    const s = load();
    const mail = String(email || '').trim().toLowerCase();
    const c = (s.customers || []).find((x) => x.email === mail);
    if (!c || c.hash !== (await sha256(c.salt + password))) throw new ApiError('Incorrect email or password.', { code: 'AUTH' });
    store.set(CUSTOMER_KEY, c.id);
    return customerView(c);
  },
  async customerSignOut() { store.del(CUSTOMER_KEY); },
  async customerResetPassword() { throw new ApiError('Password reset by email is not available in demo mode.', { code: 'AUTH' }); },
  async customerUpdatePassword() { throw new ApiError('Not available in demo mode.', { code: 'AUTH' }); },
  async customerGetProfile() {
    const id = currentCustomerId();
    const c = id && (load().customers || []).find((x) => x.id === id);
    return c ? c.profile : null;
  },
  async customerSaveProfile(profile) {
    const c = requireCustomer();
    c.profile = {
      full_name: profile.name || null, phone: profile.phone || null, address: profile.address || null,
      division: profile.division || null, district: profile.district || null, upazila: profile.upazila || null,
    };
    save();
    return c.profile;
  },
  async customerOrders() {
    const c = requireCustomer();
    return clone(load().orders.filter((o) => o.user_id === c.id).map(customerOrderView));
  },
  async customerClaimOrder({ orderNumber, phone }) {
    const c = requireCustomer();
    const num = String(orderNumber || '').trim().toUpperCase();
    const ph = normalizePhone(phone);
    const fail = () => new ApiError('We could not find an order with that Order ID and phone number.', { code: 'NOT_FOUND', status: 404 });
    if (!ORDER_NUMBER_RE.test(num) || !ph) throw fail();
    const o = load().orders.find((x) => x.order_number === num);
    if (!o || o.phone !== ph || (o.user_id && o.user_id !== c.id)) throw fail();
    o.user_id = c.id;
    save();
    return publicOrder(o, o.items);
  },

  // ───────────── Admin auth (demo) ─────────────
  /** First visit: there is no admin yet, so the login screen asks the user to create the demo admin. */
  async adminNeedsSetup() { return !load().adminAuth; },
  async adminSession() { const email = session.get(); return email ? { email } : null; },
  async adminSignIn(email, password, { create = false } = {}) {
    const s = load();
    const mail = String(email || '').trim().toLowerCase();
    if (!s.adminAuth) {
      if (!create) throw new ApiError('Create your demo admin account first.', { code: 'SETUP' });
      if (String(password).length < 6) throw new ApiError('Use at least 6 characters.', { code: 'AUTH' });
      const salt = uid();
      s.adminAuth = { email: mail, salt, hash: await sha256(salt + password) };
      save();
    } else if (s.adminAuth.email !== mail || s.adminAuth.hash !== (await sha256(s.adminAuth.salt + password))) {
      throw new ApiError('Incorrect email or password.', { code: 'AUTH' });
    }
    session.set(mail);
    return { email: mail };
  },
  async adminSignOut() { session.del(); },

  // ───────────── Admin data ─────────────
  async adminListOrders() { requireAdmin(); return clone(load().orders); },
  async adminUpdateOrderStatus(id, status) {
    requireAdmin();
    const s = load();
    const o = s.orders.find((x) => x.id === id);
    if (!o) throw new ApiError('Order not found.', { code: 'NOT_FOUND' });
    if (o.status === status) return withItems(o);
    if (status === 'Cancelled') restoreStock(o);
    else if (o.status === 'Cancelled') reserveStock(o);
    o.status = status;
    o.updated_at = nowIso();
    save();
    return withItems(o);
  },
  async adminSetArchived(id, archived) {
    requireAdmin();
    const o = load().orders.find((x) => x.id === id);
    if (o) { o.is_archived = archived; save(); }
  },
  async adminDeleteOrder(id) {
    requireAdmin();
    const s = load();
    s.orders = s.orders.filter((o) => o.id !== id);
    save();
  },
  async adminListProducts() { requireAdmin(); return clone(load().products); },
  async adminSaveProduct(product) {
    requireAdmin();
    const s = load();
    const row = { ...product };
    if (s.products.some((p) => p.slug === row.slug && p.id !== row.id)) throw new ApiError('Another product already uses this URL slug.', { code: 'DUPLICATE' });
    if (row.id) {
      const idx = s.products.findIndex((p) => p.id === row.id);
      if (idx === -1) throw new ApiError('Product not found.', { code: 'NOT_FOUND' });
      s.products[idx] = { ...s.products[idx], ...row, updated_at: nowIso() };
      save();
      return clone(s.products[idx]);
    }
    const created = { ...row, id: uid(), is_demo: false, created_at: nowIso(), updated_at: nowIso() };
    s.products.unshift(created);
    save();
    return clone(created);
  },
  async adminDeleteProduct(id) {
    requireAdmin();
    const s = load();
    s.products = s.products.filter((p) => p.id !== id);
    for (const o of s.orders) for (const i of o.items) if (i.product_id === id) i.product_id = null;
    save();
  },
  async adminAdjustStock(id, delta) {
    requireAdmin();
    const p = load().products.find((x) => x.id === id);
    if (!p) throw new ApiError('Product not found.', { code: 'NOT_FOUND' });
    p.stock = Math.max(0, p.stock + delta);
    p.updated_at = nowIso();
    save();
    return p.stock;
  },
  async adminRemoveDemoProducts() {
    requireAdmin();
    const s = load();
    const ids = new Set(s.products.filter((p) => p.is_demo).map((p) => p.id));
    s.products = s.products.filter((p) => !p.is_demo);
    for (const o of s.orders) for (const i of o.items) if (ids.has(i.product_id)) i.product_id = null;
    save();
    return ids.size;
  },
  async adminListCategories() { requireAdmin(); return clone(load().categories.sort((a, b) => a.sort_order - b.sort_order)); },
  async adminSaveCategory(cat) {
    requireAdmin();
    const s = load();
    if (s.categories.some((c) => c.slug === cat.slug && c.id !== cat.id)) throw new ApiError('Another category already uses this slug.', { code: 'DUPLICATE' });
    if (cat.id) {
      const idx = s.categories.findIndex((c) => c.id === cat.id);
      s.categories[idx] = { ...s.categories[idx], ...cat };
      save();
      return clone(s.categories[idx]);
    }
    const created = { ...cat, id: uid(), created_at: nowIso() };
    s.categories.push(created);
    save();
    return clone(created);
  },
  async adminDeleteCategory(id) {
    requireAdmin();
    const s = load();
    s.categories = s.categories.filter((c) => c.id !== id);
    for (const p of s.products) if (p.category_id === id) p.category_id = null;
    save();
  },
  async adminSaveSettings(settings) { requireAdmin(); const s = load(); s.settings = { ...settings }; save(); return clone(s.settings); },
  async adminListCoupons() { requireAdmin(); return clone(load().coupons); },
  async adminSaveCoupon(c) {
    requireAdmin();
    const s = load();
    const code = String(c.code).trim().toUpperCase();
    const idx = s.coupons.findIndex((x) => x.code === code);
    const row = { used_count: 0, ...(idx >= 0 ? s.coupons[idx] : {}), ...c, code, created_at: idx >= 0 ? s.coupons[idx].created_at : nowIso() };
    if (idx >= 0) s.coupons[idx] = row; else s.coupons.unshift(row);
    save();
    return clone(row);
  },
  async adminDeleteCoupon(code) { requireAdmin(); const s = load(); s.coupons = s.coupons.filter((c) => c.code !== code); save(); },
  async adminUploadImage(file) {
    // Demo only: shrink the image and keep it as a data URL inside localStorage.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new ApiError('Could not read this image.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new ApiError('This file is not a valid image.'));
        img.onload = () => {
          const max = 640;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },
  async adminSheetSync() {
    throw new ApiError('Google Sheets sync is available only in production mode (Supabase + Netlify Functions).', { code: 'DEMO' });
  },
  async adminListReviews() { return []; },

  /** Demo tools: generate ~25 sample orders spread over the last 3 weeks so dashboards have something to show. */
  async adminSeedSampleOrders(count = 25) {
    requireAdmin();
    const s = load();
    const names = ['Rafi Ahmed', 'Nusrat Jahan', 'Tanvir Hasan', 'Sadia Islam', 'Mahin Chowdhury', 'Farhana Akter', 'Imran Hossain', 'Tasnim Rahman'];
    const places = [['Sylhet', 'Sylhet'], ['Dhaka', 'Dhaka'], ['Chattogram', 'Chattogram'], ['Rajshahi', 'Rajshahi'], ['Khulna', 'Khulna']];
    const statuses = ['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Processing', 'Confirmed', 'Pending', 'Cancelled'];
    const active = s.products.filter((p) => p.is_active);
    if (!active.length) throw new ApiError('Add some products first.');
    for (let n = 0; n < count; n++) {
      const when = new Date(Date.now() - Math.random() * 21 * 86400000);
      const picks = [...active].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
      const items = picks.map((p) => {
        const quantity = 1 + Math.floor(Math.random() * 3);
        return { id: uid(), product_id: p.id, product_name: p.name, unit_price: p.price, unit_cost: p.cost_price, quantity, line_total: p.price * quantity };
      });
      const subtotal = items.reduce((a, i) => a + i.line_total, 0);
      const [division, district] = places[Math.floor(Math.random() * places.length)];
      const delivery = String(district).toLowerCase() === String(s.settings.inside_city_district).toLowerCase() ? s.settings.inside_city_charge : s.settings.outside_city_charge;
      const day = dhakaDateKey(when);
      s.counters[day] = (s.counters[day] || 0) + 1;
      const id = uid();
      s.orders.push({
        id, order_number: formatOrderNumber(day, s.counters[day]), customer_name: names[n % names.length],
        phone: `017${String(10000000 + Math.floor(Math.random() * 89999999))}`, email: null, address: 'Sample address, Demo Road', division, district, upazila: 'Sadar',
        delivery_note: null, subtotal, delivery_charge: delivery, discount: 0, total: subtotal + delivery, coupon_code: null,
        payment_method: 'BKASH', payment_sender: '01711000000', payment_trx_id: 'DEMO' + Math.random().toString(36).slice(2, 8).toUpperCase(), status: statuses[Math.floor(Math.random() * statuses.length)], is_archived: false,
        sheet_synced: false, sheet_sync_error: 'Demo mode', created_at: when.toISOString(), updated_at: when.toISOString(),
        items: items.map((i) => ({ ...i, order_id: id })),
      });
    }
    s.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    save();
    return count;
  },
};
