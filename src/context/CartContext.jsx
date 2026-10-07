import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useCatalog } from './CatalogContext.jsx';
import { computeDelivery } from '../../shared/orderLogic.js';
import { clamp } from '../lib/format.js';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = 'chocohaat.cart.v1';
const MAX_QTY = 50;

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && typeof i.productId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0) : [];
  } catch { return []; }
}

export function CartProvider({ children }) {
  const { byId, settings, loading } = useCatalog();
  const [items, setItems] = useState(readStored); // [{ productId, quantity }]  – prices are NEVER stored here
  const [bump, setBump] = useState(0);
  const [district, setDistrict] = useState('');
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode */ }
  }, [items]);

  // Keep the cart in sync with the live catalogue: drop removed products, clamp to current stock.
  useEffect(() => {
    if (loading || byId.size === 0) return;
    setItems((cur) => {
      const next = cur
        .filter((i) => byId.has(i.productId))
        .map((i) => ({ ...i, quantity: Math.min(i.quantity, Math.max(0, byId.get(i.productId).stock), MAX_QTY) }))
        .filter((i) => i.quantity > 0);
      return next.length === cur.length && next.every((n, idx) => n.quantity === cur[idx].quantity) ? cur : next;
    });
  }, [byId, loading]);

  const add = useCallback((productId, qty = 1) => {
    const p = byId.get(productId);
    if (!p || p.stock <= 0) return { ok: false, reason: 'out_of_stock' };
    let result = { ok: true };
    setItems((cur) => {
      const existing = cur.find((i) => i.productId === productId);
      const max = Math.min(p.stock, MAX_QTY);
      const wanted = (existing?.quantity || 0) + qty;
      if (wanted > max) result = { ok: true, capped: true, max };
      const quantity = clamp(wanted, 1, max);
      return existing ? cur.map((i) => (i.productId === productId ? { ...i, quantity } : i)) : [...cur, { productId, quantity }];
    });
    setBump((b) => b + 1);
    return result;
  }, [byId]);

  const setQty = useCallback((productId, qty) => {
    const p = byId.get(productId);
    const max = Math.min(p?.stock ?? MAX_QTY, MAX_QTY);
    setItems((cur) => cur.map((i) => (i.productId === productId ? { ...i, quantity: clamp(qty, 1, max) } : i)));
  }, [byId]);

  const remove = useCallback((productId) => setItems((cur) => cur.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => { setItems([]); setCoupon(''); }, []);

  const value = useMemo(() => {
    const lines = items.map((i) => ({ ...i, product: byId.get(i.productId) })).filter((l) => l.product);
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
    // Preview only – the server recalculates everything from the database when the order is placed.
    const delivery = lines.length ? computeDelivery(settings, district, subtotal) : 0;
    const minOrder = Number(settings.min_order_amount) || 0;
    return {
      lines, count, subtotal, delivery, total: subtotal + delivery, bump, district, setDistrict, coupon, setCoupon,
      minOrder, belowMinimum: minOrder > 0 && subtotal < minOrder,
      freeThreshold: Number(settings.free_delivery_threshold) || 0,
      add, setQty, remove, clear,
    };
  }, [items, byId, settings, district, bump, coupon, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
