import { createClient } from '@supabase/supabase-js';

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function clientIp(req, context) {
  return context?.ip || req.headers.get('x-nf-client-connection-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

/** Reads JSON with a hard size cap (default 32 KB). Returns { ok, data } */
export async function readJson(req, maxBytes = 32 * 1024) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > maxBytes) return { ok: false };
  try {
    const text = await req.text();
    if (text.length > maxBytes) return { ok: false };
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** Server-side Supabase client using the SERVICE ROLE key. Never import this in browser code. */
export function adminSupabase(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Adapter used by the core functions (so they can be unit-tested with a fake). */
export function supabaseDb(client) {
  return {
    async placeOrder(payload) {
      const { data, error } = await client.rpc('place_order', { payload });
      if (error) throw new Error(error.message);
      return data;
    },
    async markSheet(orderId, { synced, error }) {
      const { error: e } = await client
        .from('orders')
        .update({ sheet_synced: synced, sheet_sync_error: error ? String(error).slice(0, 500) : null })
        .eq('id', orderId);
      if (e) throw new Error(e.message);
    },
    async findOrderByNumber(orderNumber) {
      const { data, error } = await client.from('orders').select('*, order_items(*)').eq('order_number', orderNumber).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const { order_items, ...order } = data;
      return { order, items: order_items || [] };
    },
    async findOrderById(id) {
      const { data, error } = await client.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const { order_items, ...order } = data;
      return { order, items: order_items || [] };
    },
    async listUnsynced(limit = 50) {
      const { data, error } = await client
        .from('orders').select('*, order_items(*)').eq('sheet_synced', false)
        .order('created_at', { ascending: true }).limit(limit);
      if (error) throw new Error(error.message);
      return (data || []).map(({ order_items, ...order }) => ({ order, items: order_items || [] }));
    },
    async verifyAdmin(token) {
      if (!token) return false;
      const { data: userData, error } = await client.auth.getUser(token);
      if (error || !userData?.user) return false;
      const { data } = await client.from('admins').select('user_id').eq('user_id', userData.user.id).maybeSingle();
      return Boolean(data);
    },
  };
}
