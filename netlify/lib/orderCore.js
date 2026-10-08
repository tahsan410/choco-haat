// Framework-free handlers for the Netlify Functions, so they can be unit-tested with fakes.
import { validateOrderInput, normalizePhone, ORDER_NUMBER_RE, publicOrder } from '../../shared/orderLogic.js';

export { publicOrder };

const CODE_TO_STATUS = {
  OUT_OF_STOCK: 409,
  PRODUCT_UNAVAILABLE: 409,
  MIN_ORDER: 422,
  COUPON_INVALID: 422,
  RATE_LIMIT: 429,
  INVALID: 400,
};

export async function createOrderCore({ input, db, sheets, userId = null, log = console }) {
  // Honeypot: real users never fill this hidden field.
  if (input && typeof input === 'object' && input.website) {
    return { status: 400, body: { ok: false, code: 'INVALID', message: 'Could not process this order.' } };
  }

  const v = validateOrderInput(input, { requireUuidIds: true });
  if (!v.ok) {
    return { status: 400, body: { ok: false, code: 'VALIDATION', message: 'Please check the highlighted fields.', errors: v.errors } };
  }
  const c = v.value;

  // The browser only supplies product IDs + quantities. Prices/stock are read inside the database.
  const payload = {
    name: c.name, phone: c.phone, email: c.email, address: c.address,
    division: c.division, district: c.district, upazila: c.upazila, note: c.note,
    payment_method: c.paymentMethod, coupon_code: c.couponCode,
    items: c.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
  };

  let result;
  try {
    result = await db.placeOrder(payload);
  } catch (e) {
    log.error('[create-order] database error:', e?.message);
    return { status: 500, body: { ok: false, code: 'SERVER', message: 'We could not place your order right now. Please try again in a moment.' } };
  }

  if (!result?.ok) {
    return {
      status: CODE_TO_STATUS[result?.code] || 400,
      body: { ok: false, code: result?.code || 'INVALID', message: result?.message || 'Could not place the order.', productId: result?.product_id, available: result?.available },
    };
  }

  const { order, items } = result;

  // Logged-in customer → remember the order in their account (best-effort; the order is already saved).
  if (userId) {
    try { await db.setOrderUser(order.id, userId); } catch (e) { log.error('[create-order] could not link order to account:', e?.message); }
  }

  // Google Sheets is best-effort: the order is already safely stored in the database.
  let synced = false;
  let syncError = null;
  try {
    if (!sheets?.enabled) throw new Error('Google Sheets is not configured on the server.');
    await sheets.appendOrder(order, items);
    synced = true;
  } catch (e) {
    syncError = String(e?.message || e).slice(0, 500);
    log.error('[create-order] Google Sheets sync failed for', order.order_number, '-', syncError);
  }
  try {
    await db.markSheet(order.id, { synced, error: syncError });
  } catch (e) {
    log.error('[create-order] could not record sync status:', e?.message);
  }

  return { status: 201, body: { ok: true, order: publicOrder(order, items), sheetSynced: synced } };
}

export async function trackOrderCore({ input, db, log = console }) {
  const notFound = { status: 404, body: { ok: false, message: 'We could not find an order with that Order ID and phone number.' } };
  const orderNumber = String(input?.orderNumber || '').trim().toUpperCase();
  const phone = normalizePhone(input?.phone);
  if (!ORDER_NUMBER_RE.test(orderNumber) || !phone) return notFound;
  try {
    const found = await db.findOrderByNumber(orderNumber);
    // Same answer for "no such order" and "wrong phone" so IDs cannot be probed.
    if (!found || normalizePhone(found.order.phone) !== phone) return notFound;
    return { status: 200, body: { ok: true, order: publicOrder(found.order, found.items) } };
  } catch (e) {
    log.error('[track-order] error:', e?.message);
    return { status: 500, body: { ok: false, message: 'Something went wrong. Please try again.' } };
  }
}

/**
 * A logged-in customer adds a past (guest) order to their account by proving they know BOTH the
 * Order ID and the phone number used. Same answer for "no such order" and "wrong phone".
 */
export async function claimOrderCore({ input, userId, db, log = console }) {
  const notFound = { status: 404, body: { ok: false, message: 'We could not find an order with that Order ID and phone number.' } };
  if (!userId) return { status: 401, body: { ok: false, message: 'Please sign in first.' } };
  const orderNumber = String(input?.orderNumber || '').trim().toUpperCase();
  const phone = normalizePhone(input?.phone);
  if (!ORDER_NUMBER_RE.test(orderNumber) || !phone) return notFound;
  try {
    const found = await db.findOrderByNumber(orderNumber);
    if (!found || normalizePhone(found.order.phone) !== phone) return notFound;
    if (found.order.user_id && found.order.user_id !== userId) return notFound; // belongs to someone else
    if (!found.order.user_id) await db.setOrderUser(found.order.id, userId);
    return { status: 200, body: { ok: true, order: publicOrder(found.order, found.items) } };
  } catch (e) {
    log.error('[claim-order] error:', e?.message);
    return { status: 500, body: { ok: false, message: 'Something went wrong. Please try again.' } };
  }
}

export async function sheetSyncCore({ input, db, sheets, log = console }) {
  if (!sheets?.enabled) {
    return { status: 503, body: { ok: false, message: 'Google Sheets is not configured on the server.' } };
  }
  const action = input?.action;

  const syncOne = async ({ order, items }) => {
    try {
      await sheets.appendOrder(order, items);
      await db.markSheet(order.id, { synced: true, error: null });
      return true;
    } catch (e) {
      log.error('[sheet-sync] failed for', order.order_number, '-', e?.message);
      await db.markSheet(order.id, { synced: false, error: String(e?.message || e) }).catch(() => {});
      return false;
    }
  };

  try {
    if (action === 'retryAll') {
      const pending = await db.listUnsynced(50);
      let ok = 0;
      for (const p of pending) if (await syncOne(p)) ok += 1;
      return { status: 200, body: { ok: true, attempted: pending.length, synced: ok, failed: pending.length - ok } };
    }
    if (action === 'retry' || action === 'updateStatus') {
      const found = await db.findOrderById(String(input.orderId || ''));
      if (!found) return { status: 404, body: { ok: false, message: 'Order not found.' } };
      if (action === 'retry') {
        const ok = await syncOne(found);
        return { status: ok ? 200 : 502, body: { ok, message: ok ? 'Synced to Google Sheets.' : 'Sync failed. See the error on the order.' } };
      }
      // updateStatus
      try {
        const updated = await sheets.updateStatus(found.order.order_number, found.order.status);
        if (!updated) await sheets.appendOrder(found.order, found.items);
        await db.markSheet(found.order.id, { synced: true, error: null });
        return { status: 200, body: { ok: true } };
      } catch (e) {
        await db.markSheet(found.order.id, { synced: false, error: String(e?.message || e) }).catch(() => {});
        return { status: 502, body: { ok: false, message: 'Order saved, but the Google Sheet could not be updated.' } };
      }
    }
    return { status: 400, body: { ok: false, message: 'Unknown action.' } };
  } catch (e) {
    log.error('[sheet-sync] error:', e?.message);
    return { status: 500, body: { ok: false, message: 'Something went wrong.' } };
  }
}