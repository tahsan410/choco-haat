// Minimal Google Sheets client (service account) – no heavy SDK, just fetch + node:crypto.
import crypto from 'node:crypto';
import { SHEET_HEADERS } from '../../shared/constants.js';
import { orderToSheetRow } from '../../shared/orderLogic.js';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export function sheetsConfig(env = process.env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = env.GOOGLE_PRIVATE_KEY;
  const sheetId = env.GOOGLE_SHEET_ID;
  if (!email || !key || !sheetId) return null;
  key = key.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  return { email, key, sheetId, tab: env.GOOGLE_SHEET_TAB || 'Orders' };
}

export const disabledSheets = {
  enabled: false,
  async appendOrder() { throw new Error('Google Sheets is not configured on the server.'); },
  async updateStatus() { throw new Error('Google Sheets is not configured on the server.'); },
};

export function createSheetsClient(cfg, fetchFn = fetch) {
  let token = { value: null, exp: 0 };
  let tabReady = false;
  const range = (a1) => `'${cfg.tab.replace(/'/g, "''")}'!${a1}`;

  async function accessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (token.value && token.exp - 60 > now) return token.value;
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(JSON.stringify({ iss: cfg.email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
    const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(cfg.key);
    const assertion = `${header}.${claim}.${b64url(signature)}`;
    const res = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) throw new Error(`Google auth failed (${res.status}): ${data.error_description || data.error || 'unknown error'}`);
    token = { value: data.access_token, exp: now + (data.expires_in || 3600) };
    return token.value;
  }

  async function call(path, { method = 'GET', body } = {}) {
    const res = await fetchFn(`${API}/${cfg.sheetId}${path}`, {
      method,
      headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Google Sheets API ${res.status}: ${data?.error?.message || 'request failed'}`);
    return data;
  }

  async function ensureTab() {
    if (tabReady) return;
    const meta = await call('?fields=sheets.properties.title');
    const exists = (meta.sheets || []).some((s) => s.properties?.title === cfg.tab);
    if (!exists) await call(':batchUpdate', { method: 'POST', body: { requests: [{ addSheet: { properties: { title: cfg.tab } } }] } });
    const head = await call(`/values/${encodeURIComponent(range('A1:M1'))}`);
    if (!head.values || !head.values.length) {
      await call(`/values/${encodeURIComponent(range('A1:M1'))}?valueInputOption=RAW`, { method: 'PUT', body: { values: [SHEET_HEADERS] } });
    }
    tabReady = true;
  }

  async function findRow(orderNumber) {
    const data = await call(`/values/${encodeURIComponent(range('A:A'))}`);
    const idx = (data.values || []).findIndex((r) => r[0] === orderNumber);
    return idx === -1 ? null : idx + 1; // 1-based row number
  }

  return {
    enabled: true,
    /** Idempotent: if the order is already in the sheet, its row is refreshed instead of duplicated. */
    async appendOrder(order, items) {
      await ensureTab();
      const row = orderToSheetRow(order, items);
      const existing = await findRow(order.order_number);
      if (existing) {
        await call(`/values/${encodeURIComponent(range(`A${existing}:M${existing}`))}?valueInputOption=USER_ENTERED`, { method: 'PUT', body: { values: [row] } });
        return;
      }
      await call(`/values/${encodeURIComponent(range('A:M'))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', body: { values: [row] } });
    },
    /** Returns false when the order has no row yet. */
    async updateStatus(orderNumber, status) {
      await ensureTab();
      const rowNo = await findRow(orderNumber);
      if (!rowNo) return false;
      await call(`/values/${encodeURIComponent(range(`M${rowNo}`))}?valueInputOption=RAW`, { method: 'PUT', body: { values: [[status]] } });
      return true;
    },
  };
}

export function getSheets(env = process.env, fetchFn = fetch) {
  const cfg = sheetsConfig(env);
  return cfg ? createSheetsClient(cfg, fetchFn) : disabledSheets;
}
