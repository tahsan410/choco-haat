import test from 'node:test';
import assert from 'node:assert/strict';
import { demoApi, _resetDemoState } from '../src/services/demoApi.js';
import { computeAnalytics, deriveCustomers, buildNotifications } from '../src/lib/analytics.js';

const form = (items, over = {}) => ({
  name: 'Tahsan Ovi', phone: '01712345678', email: '', address: 'House 12, Road 3, Zindabazar', division: 'Sylhet',
  district: 'Sylhet', upazila: 'Sylhet Sadar', note: '', paymentMethod: 'COD', items, ...over,
});

test('customer + admin end-to-end on the demo backend', async () => {
  _resetDemoState();
  const { products, settings } = await demoApi.getCatalog();
  assert.ok(products.length >= 10);
  const kit = products.find((p) => p.slug === 'kitkat-2-finger');
  const startStock = kit.stock;

  // price manipulation attempt: extra price fields are ignored, total is computed server-side
  const res = await demoApi.createOrder(form([{ productId: kit.id, quantity: 3, price: 1 }], { total: 1 }));
  assert.match(res.order.order_number, /^CHOC-\d{8}-0001$/);
  assert.equal(res.order.subtotal, kit.price * 3);
  assert.equal(res.order.delivery_charge, settings.inside_city_charge);
  assert.equal(res.order.total, kit.price * 3 + settings.inside_city_charge);
  assert.equal(res.order.status, 'Pending');

  // stock reduced; cannot over-order
  assert.equal((await demoApi.getCatalog()).products.find((p) => p.id === kit.id).stock, startStock - 3);
  const low = products.find((p) => p.stock > 0 && p.stock < 10);
  await assert.rejects(demoApi.createOrder(form([{ productId: low.id, quantity: low.stock + 1 }])), (e) => e.code === 'OUT_OF_STOCK');
  await assert.rejects(demoApi.createOrder(form([{ productId: kit.id, quantity: 51 }])), (e) => e.code === 'VALIDATION');
  const out = products.find((p) => p.stock === 0);
  await assert.rejects(demoApi.createOrder(form([{ productId: out.id, quantity: 1 }])), (e) => e.code === 'OUT_OF_STOCK');
  await assert.rejects(demoApi.createOrder(form([{ productId: kit.id, quantity: 1 }], { phone: '123' })), (e) => e.code === 'VALIDATION' && Boolean(e.errors.phone));

  // second order → sequential number
  const res2 = await demoApi.createOrder(form([{ productId: products[2].id, quantity: 1 }], { district: 'Dhaka', division: 'Dhaka' }));
  assert.match(res2.order.order_number, /-0002$/);
  assert.equal(res2.order.delivery_charge, settings.outside_city_charge);

  // tracking needs id + phone
  assert.equal((await demoApi.trackOrder({ orderNumber: res.order.order_number, phone: '+8801712345678' })).total, res.order.total);
  await assert.rejects(demoApi.trackOrder({ orderNumber: res.order.order_number, phone: '01999999999' }), (e) => e.code === 'NOT_FOUND');

  // admin is protected
  await assert.rejects(demoApi.adminListOrders(), (e) => e.code === 'AUTH');
  assert.equal(await demoApi.adminNeedsSetup(), true);
  await demoApi.adminSignIn('admin@shop.test', 'secret1', { create: true });
  await demoApi.adminSignOut();
  await assert.rejects(demoApi.adminSignIn('admin@shop.test', 'wrong'), (e) => e.code === 'AUTH');
  await demoApi.adminSignIn('admin@shop.test', 'secret1');

  const orders = await demoApi.adminListOrders();
  assert.equal(orders.length, 2);

  // status changes + cancel restores stock, reopen re-reserves
  const o1 = orders.find((o) => o.order_number === res.order.order_number);
  for (const s of ['Confirmed', 'Processing', 'Shipped', 'Delivered']) assert.equal((await demoApi.adminUpdateOrderStatus(o1.id, s)).status, s);
  const stockBefore = (await demoApi.adminListProducts()).find((p) => p.id === kit.id).stock;
  await demoApi.adminUpdateOrderStatus(o1.id, 'Cancelled');
  assert.equal((await demoApi.adminListProducts()).find((p) => p.id === kit.id).stock, stockBefore + 3);
  await demoApi.adminUpdateOrderStatus(o1.id, 'Pending');
  assert.equal((await demoApi.adminListProducts()).find((p) => p.id === kit.id).stock, stockBefore);

  // analytics: cancelled never counts as revenue
  let a = computeAnalytics(await demoApi.adminListOrders(), await demoApi.adminListProducts());
  assert.equal(a.totalOrders, 2); assert.equal(a.revenue, res.order.total + res2.order.total);
  await demoApi.adminUpdateOrderStatus(o1.id, 'Cancelled');
  a = computeAnalytics(await demoApi.adminListOrders(), await demoApi.adminListProducts());
  assert.equal(a.revenue, res2.order.total); assert.equal(a.cancelledOrders, 1);
  assert.equal(a.topProducts[0].quantity, 1);
  assert.equal(deriveCustomers(await demoApi.adminListOrders()).length, 1);

  // archive / delete orders
  await demoApi.adminSetArchived(o1.id, true);
  assert.equal((await demoApi.adminListOrders()).find((o) => o.id === o1.id).is_archived, true);
  await demoApi.adminDeleteOrder(o1.id);
  assert.equal((await demoApi.adminListOrders()).length, 1);

  // product CRUD + stock adjust + low stock notification
  const created = await demoApi.adminSaveProduct({ slug: 'test-bar', name: 'Test Bar', brand: 'Test', category_id: null, price: 100, comparison_price: null, show_comparison: false, cost_price: 60, stock: 4, low_stock_threshold: 5, is_active: true, is_featured: false, images: [], short_description: '', description: '' });
  assert.equal(created.is_demo, false);
  assert.equal(await demoApi.adminAdjustStock(created.id, -10), 0); // never negative
  assert.equal(await demoApi.adminAdjustStock(created.id, 4), 4);
  await demoApi.adminSaveProduct({ ...created, price: 120 });
  assert.equal((await demoApi.adminListProducts()).find((p) => p.id === created.id).price, 120);
  await assert.rejects(demoApi.adminSaveProduct({ ...created, id: undefined, slug: 'test-bar' }), (e) => e.code === 'DUPLICATE');
  assert.ok(buildNotifications(await demoApi.adminListOrders(), await demoApi.adminListProducts()).some((n) => /Low stock: Test Bar/.test(n.text)));
  await demoApi.adminDeleteProduct(created.id);
  assert.ok(!(await demoApi.adminListProducts()).some((p) => p.id === created.id));

  // settings drive delivery; coupons work
  await demoApi.adminSaveSettings({ ...settings, inside_city_charge: 40, free_delivery_threshold: 500 });
  const r3 = await demoApi.createOrder(form([{ productId: products[4].id, quantity: 1 }]));
  assert.equal(r3.order.delivery_charge, 0);
  await demoApi.adminSaveCoupon({ code: 'sweet10', type: 'percent', value: 10, min_order: 0, usage_limit: 1, is_active: true });
  const r4 = await demoApi.createOrder(form([{ productId: products[0].id, quantity: 2 }], { couponCode: 'sweet10' }));
  assert.equal(r4.order.discount, Math.round(products[0].price * 2 * 0.1));
  await assert.rejects(demoApi.createOrder(form([{ productId: products[0].id, quantity: 1 }], { couponCode: 'SWEET10' })), (e) => e.code === 'COUPON_INVALID');

  // demo products can be removed, orders keep their history
  const removed = await demoApi.adminRemoveDemoProducts();
  assert.ok(removed >= 10);
  assert.equal((await demoApi.getCatalog()).products.length, 0);
  assert.ok((await demoApi.adminListOrders()).every((o) => o.items.every((i) => i.product_name)));
});

test('sample orders generator feeds analytics', async () => {
  _resetDemoState();
  await demoApi.adminSignIn('a@b.co', 'secret1', { create: true });
  await demoApi.adminSeedSampleOrders(30);
  const a = computeAnalytics(await demoApi.adminListOrders(), await demoApi.adminListProducts());
  assert.equal(a.totalOrders, 30);
  assert.equal(a.revenueByDay.length, 30);
  assert.ok(a.topProducts.length > 0 && a.topProducts[0].quantity >= a.topProducts.at(-1).quantity);
  assert.ok(a.salesMonth >= a.salesWeek && a.salesWeek >= a.salesToday);
});
