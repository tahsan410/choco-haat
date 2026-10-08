// POST /.netlify/functions/claim-order   { orderNumber, phone }   (signed-in customers only)
// Adds an earlier guest order to the customer's account. Needs BOTH Order ID and phone to match.
import { json, readJson, clientIp, adminSupabase, supabaseDb, bearer } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { claimOrderCore } from '../lib/orderCore.js';

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' }, { allow: 'POST' });

  const limit = rateLimit(`claim:${clientIp(req, context)}`, 15, 10 * 60 * 1000);
  if (!limit.allowed) return json(429, { ok: false, message: 'Too many attempts. Please try again in a few minutes.' }, { 'retry-after': String(limit.retryAfter) });

  const body = await readJson(req, 2048);
  if (!body.ok) return json(400, { ok: false, message: 'Invalid request.' });

  const client = adminSupabase();
  if (!client) return json(503, { ok: false, message: 'This feature is temporarily unavailable.' });
  const db = supabaseDb(client);

  let userId = null;
  try { userId = await db.userIdFromToken(bearer(req)); } catch { userId = null; }
  const { status, body: out } = await claimOrderCore({ input: body.data, userId, db });
  return json(status, out);
};
