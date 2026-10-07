// POST /.netlify/functions/track-order   { orderNumber, phone }
// Both values must match, so customers can never browse other people's orders.
import { json, readJson, clientIp, adminSupabase, supabaseDb } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { trackOrderCore } from '../lib/orderCore.js';

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' }, { allow: 'POST' });

  const limit = rateLimit(`track:${clientIp(req, context)}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) return json(429, { ok: false, message: 'Too many lookups. Please try again in a few minutes.' }, { 'retry-after': String(limit.retryAfter) });

  const body = await readJson(req, 2048);
  if (!body.ok) return json(400, { ok: false, message: 'Invalid request.' });

  const client = adminSupabase();
  if (!client) return json(503, { ok: false, message: 'Order tracking is temporarily unavailable.' });

  const { status, body: out } = await trackOrderCore({ input: body.data, db: supabaseDb(client) });
  return json(status, out);
};
