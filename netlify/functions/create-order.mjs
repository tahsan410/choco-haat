// POST /.netlify/functions/create-order
// Validates → prices from the database (never from the browser) → stores → appends to Google Sheets.
import { json, readJson, clientIp, adminSupabase, supabaseDb } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { getSheets } from '../lib/sheets.js';
import { createOrderCore } from '../lib/orderCore.js';

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' }, { allow: 'POST' });

  const ip = clientIp(req, context);
  const limit = rateLimit(`order:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json(429, { ok: false, code: 'RATE_LIMIT', message: 'Too many attempts. Please wait a few minutes and try again.' }, { 'retry-after': String(limit.retryAfter) });
  }

  const body = await readJson(req);
  if (!body.ok) return json(400, { ok: false, code: 'INVALID', message: 'Invalid request.' });

  const client = adminSupabase();
  if (!client) {
    console.error('[create-order] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured');
    return json(503, { ok: false, code: 'SERVER', message: 'Ordering is temporarily unavailable. Please contact us to place your order.' });
  }

  const { status, body: out } = await createOrderCore({ input: body.data, db: supabaseDb(client), sheets: getSheets() });
  return json(status, out);
};
