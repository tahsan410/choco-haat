// Production backend: Supabase (Postgres + Auth + Storage) and Netlify Functions.
import { supabase } from '../lib/supabase.js';
import { ApiError } from './errors.js';
import { DEFAULT_SETTINGS } from '../../shared/constants.js';

const FN = '/.netlify/functions';
const num = (v) => (v === null || v === undefined ? v : Number(v));

const normProduct = (p) => ({
  ...p,
  price: num(p.price),
  comparison_price: num(p.comparison_price),
  cost_price: num(p.cost_price),
  stock: Number(p.stock),
  images: p.images || [],
});
const normOrder = ({ order_items, ...o }) => ({
  ...o,
  subtotal: num(o.subtotal), delivery_charge: num(o.delivery_charge), discount: num(o.discount), total: num(o.total),
  items: (order_items || []).map((i) => ({ ...i, unit_price: num(i.unit_price), unit_cost: num(i.unit_cost), line_total: num(i.line_total) })),
});

const check = (res) => {
  if (res.error) throw new ApiError(res.error.message, { code: res.error.code || 'DB' });
  return res.data;
};

async function callFunction(name, body, token) {
  let res;
  try {
    res = await fetch(`${FN}/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Network problem. Please check your internet connection and try again.', { code: 'NETWORK' });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    if (res.status === 404 && !data) {
      throw new ApiError('The order service is not available here. Run the site with `netlify dev` or deploy it to Netlify.', { code: 'NO_FUNCTION', status: 404 });
    }
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', { code: data?.code || 'ERROR', errors: data?.errors, status: res.status, data });
  }
  return data;
}

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export const supabaseApi = {
  mode: 'supabase',

  // ───────────── Public ─────────────
  async getCatalog() {
    const [cats, prods, set] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order').order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('settings').select('value').eq('key', 'store').maybeSingle(),
    ]);
    return {
      categories: check(cats),
      products: check(prods).map(normProduct),
      settings: { ...DEFAULT_SETTINGS, ...(check(set)?.value || {}) },
    };
  },
  async getBestSellers(limit = 8) {
    const { data, error } = await supabase.rpc('get_best_sellers', { max_rows: limit });
    return error ? [] : data.map((r) => ({ product_id: r.product_id, qty_sold: Number(r.qty_sold) }));
  },
  async getReviews() {
    const { data, error } = await supabase.from('reviews').select('*').eq('is_approved', true).order('created_at', { ascending: false }).limit(6);
    return error ? [] : data;
  },
  async createOrder(input) {
    const data = await callFunction('create-order', input);
    return { order: data.order, sheetSynced: data.sheetSynced };
  },
  async trackOrder(input) {
    const data = await callFunction('track-order', input);
    return data.order;
  },

  // ───────────── Admin auth ─────────────
  async adminSession() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    return row ? { email: user.email } : null;
  },
  async adminSignIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new ApiError('Incorrect email or password.', { code: 'AUTH' });
    const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (!row) {
      await supabase.auth.signOut();
      throw new ApiError('This account does not have admin access.', { code: 'FORBIDDEN' });
    }
    return { email: data.user.email };
  },
  async adminSignOut() {
    await supabase.auth.signOut();
  },

  // ───────────── Admin data (protected by RLS: public.is_admin()) ─────────────
  async adminListOrders() {
    const rows = check(await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(5000));
    return rows.map(normOrder);
  },
  async adminUpdateOrderStatus(id, status) {
    const row = check(await supabase.from('orders').update({ status }).eq('id', id).select('*, order_items(*)').single());
    return normOrder(row);
  },
  async adminSetArchived(id, archived) {
    check(await supabase.from('orders').update({ is_archived: archived }).eq('id', id).select('id').single());
  },
  async adminDeleteOrder(id) {
    check(await supabase.from('orders').delete().eq('id', id).select('id'));
  },
  async adminListProducts() {
    return check(await supabase.from('products').select('*').order('created_at', { ascending: false })).map(normProduct);
  },
  async adminSaveProduct(product) {
    const { id, created_at, updated_at, ...fields } = product;
    const row = id
      ? check(await supabase.from('products').update(fields).eq('id', id).select('*').single())
      : check(await supabase.from('products').insert(fields).select('*').single());
    return normProduct(row);
  },
  async adminDeleteProduct(id) {
    check(await supabase.from('products').delete().eq('id', id).select('id'));
  },
  async adminAdjustStock(id, delta) {
    return check(await supabase.rpc('adjust_stock', { p_id: id, delta }));
  },
  async adminRemoveDemoProducts() {
    const rows = check(await supabase.from('products').delete().eq('is_demo', true).select('id'));
    return rows.length;
  },
  async adminListCategories() {
    return check(await supabase.from('categories').select('*').order('sort_order').order('name'));
  },
  async adminSaveCategory(cat) {
    const { id, created_at, ...fields } = cat;
    return id
      ? check(await supabase.from('categories').update(fields).eq('id', id).select('*').single())
      : check(await supabase.from('categories').insert(fields).select('*').single());
  },
  async adminDeleteCategory(id) {
    check(await supabase.from('categories').delete().eq('id', id).select('id'));
  },
  async adminSaveSettings(settings) {
    check(await supabase.from('settings').upsert({ key: 'store', value: settings, updated_at: new Date().toISOString() }));
    return settings;
  },
  async adminListCoupons() {
    return check(await supabase.from('coupons').select('*').order('created_at', { ascending: false }));
  },
  async adminSaveCoupon(c) {
    const row = { ...c, code: String(c.code).trim().toUpperCase() };
    delete row.created_at;
    return check(await supabase.from('coupons').upsert(row).select('*').single());
  },
  async adminDeleteCoupon(code) {
    check(await supabase.from('coupons').delete().eq('code', code).select('code'));
  },
  async adminUploadImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (error) throw new ApiError(`Image upload failed: ${error.message}`);
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  },
  /** action: 'retry' | 'retryAll' | 'updateStatus' – handled server-side with Google credentials. */
  async adminSheetSync(action, orderId) {
    return callFunction('sheet-sync', { action, orderId }, await accessToken());
  },
  async adminListReviews() {
    return check(await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(200));
  },
};
