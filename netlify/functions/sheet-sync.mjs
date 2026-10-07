// POST /.netlify/functions/sheet-sync   (admins only)
// { action: 'retry', orderId } | { action: 'retryAll' } | { action: 'updateStatus', orderId }
import { json, readJson, clientIp, adminSupabase, supabaseDb } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { getSheets } from '../lib/sheets.js';
import { sheetSyncCore } from '../lib/orderCore.js';

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' }, { allow: 'POST' });

  const limit = rateLimit(`sync:${clientIp(req, context)}`, 120, 10 * 60 * 1000);
  if (!limit.allowed) return json(429, { ok: false, message: 'Too many requests.' });

  const client = adminSupabase();
  if (!client) return json(503, { ok: false, message: 'Server is not configured.' });
  const db = supabaseDb(client);

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!(await db.verifyAdmin(token))) return json(401, { ok: false, message: 'Not authorised.' });

  const body = await readJson(req, 2048);
  if (!body.ok) return json(400, { ok: false, message: 'Invalid request.' });

  const { status, body: out } = await sheetSyncCore({ input: body.data, db, sheets: getSheets() });
  return json(status, out);
};
