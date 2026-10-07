// Business analytics computed from the order database (Admin → Dashboard / Analytics).
// Cancelled orders are never counted as revenue.
import { dayKey } from './format.js';

const isValid = (o) => o.status !== 'Cancelled';

export function computeAnalytics(orders, products = [], now = new Date()) {
  const valid = orders.filter(isValid);
  const todayKey = dayKey(now.toISOString());
  const dayMs = 86400000;
  const weekAgo = now.getTime() - 7 * dayMs;
  const monthAgo = now.getTime() - 30 * dayMs;

  const sum = (list) => list.reduce((s, o) => s + Number(o.total), 0);
  const revenue = sum(valid);
  const byStatus = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

  const itemsSold = valid.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + i.quantity, 0), 0);

  // Product performance table (orders / quantity / revenue)
  const perProduct = new Map();
  const perCategory = new Map();
  const productById = new Map(products.map((p) => [p.id, p]));
  for (const o of valid) {
    const seen = new Set();
    for (const i of o.items || []) {
      const key = i.product_id || `name:${i.product_name}`;
      const row = perProduct.get(key) || { key, productId: i.product_id, name: i.product_name, orders: 0, quantity: 0, revenue: 0, profit: 0 };
      if (!seen.has(key)) { row.orders += 1; seen.add(key); }
      row.quantity += i.quantity;
      row.revenue += Number(i.line_total);
      row.profit += (Number(i.unit_price) - Number(i.unit_cost || 0)) * i.quantity;
      perProduct.set(key, row);
      const cat = productById.get(i.product_id)?.category_id;
      if (cat) perCategory.set(cat, (perCategory.get(cat) || 0) + i.quantity);
    }
  }
  const topProducts = [...perProduct.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  let bestCategoryId = null;
  let bestCatQty = 0;
  for (const [id, q] of perCategory) if (q > bestCatQty) { bestCategoryId = id; bestCatQty = q; }

  // Revenue by day (last 30 days, zero-filled, Dhaka time)
  const revenueByDay = [];
  const dayRevenue = new Map();
  for (const o of valid) dayRevenue.set(dayKey(o.created_at), (dayRevenue.get(dayKey(o.created_at)) || 0) + Number(o.total));
  for (let d = 29; d >= 0; d--) {
    const key = dayKey(new Date(now.getTime() - d * dayMs).toISOString());
    revenueByDay.push({ date: key, value: dayRevenue.get(key) || 0 });
  }

  return {
    totalOrders: orders.length,
    pendingOrders: byStatus.Pending || 0,
    deliveredOrders: byStatus.Delivered || 0,
    cancelledOrders: byStatus.Cancelled || 0,
    inFlightOrders: (byStatus.Confirmed || 0) + (byStatus.Processing || 0) + (byStatus.Shipped || 0),
    revenue,
    deliveredRevenue: sum(valid.filter((o) => o.status === 'Delivered')),
    averageOrderValue: valid.length ? revenue / valid.length : 0,
    itemsSold,
    salesToday: sum(valid.filter((o) => dayKey(o.created_at) === todayKey)),
    salesWeek: sum(valid.filter((o) => new Date(o.created_at).getTime() >= weekAgo)),
    salesMonth: sum(valid.filter((o) => new Date(o.created_at).getTime() >= monthAgo)),
    byStatus,
    topProducts,
    bestSellingProduct: topProducts[0] || null,
    bestCategoryId,
    revenueByDay,
    totalProducts: products.length,
  };
}

/** Customers are derived from orders (grouped by phone number). */
export function deriveCustomers(orders) {
  const map = new Map();
  for (const o of orders) {
    const c = map.get(o.phone) || { phone: o.phone, name: o.customer_name, email: o.email, district: o.district, orders: 0, spent: 0, lastOrder: o.created_at };
    c.orders += 1;
    if (o.status !== 'Cancelled') c.spent += Number(o.total);
    if (new Date(o.created_at) > new Date(c.lastOrder)) { c.lastOrder = o.created_at; c.name = o.customer_name; c.district = o.district; c.email = o.email || c.email; }
    map.set(o.phone, c);
  }
  return [...map.values()].sort((a, b) => b.spent - a.spent);
}

export function buildNotifications(orders, products, now = Date.now(), failedSyncs = 0) {
  const list = [];
  const pending = orders.filter((o) => o.status === 'Pending' && !o.is_archived);
  const newOnes = orders.filter((o) => now - new Date(o.created_at).getTime() < 24 * 3600 * 1000);
  if (newOnes.length) list.push({ id: 'new', tone: 'blue', text: `${newOnes.length} new order${newOnes.length > 1 ? 's' : ''} in the last 24 hours`, to: '/admin/orders' });
  if (pending.length) list.push({ id: 'pending', tone: 'amber', text: `${pending.length} pending order${pending.length > 1 ? 's' : ''} waiting for confirmation`, to: '/admin/orders?status=Pending' });
  if (failedSyncs) list.push({ id: 'sync', tone: 'red', text: `${failedSyncs} order${failedSyncs > 1 ? 's' : ''} not synced to Google Sheets`, to: '/admin/settings' });
  for (const p of products.filter((p) => p.is_active)) {
    const threshold = Number(p.low_stock_threshold) || 5;
    if (p.stock <= 0) list.push({ id: `out-${p.id}`, tone: 'red', text: `Out of stock: ${p.name}`, to: '/admin/products' });
    else if (p.stock <= threshold) list.push({ id: `low-${p.id}`, tone: 'amber', text: `Low stock: ${p.name} (${p.stock} left)`, to: '/admin/products' });
  }
  const delivered = orders.filter((o) => o.status === 'Delivered').sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
  if (delivered) list.push({ id: `del-${delivered.id}`, tone: 'green', text: `Order #${delivered.order_number} delivered`, to: `/admin/orders/${delivered.id}` });
  return list;
}
