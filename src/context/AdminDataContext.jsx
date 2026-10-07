import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from './ToastContext.jsx';
import { useCatalog } from './CatalogContext.jsx';

const Ctx = createContext(null);
export const useAdminData = () => useContext(Ctx);

export function AdminDataProvider({ children }) {
  const toast = useToast();
  const { refresh: refreshStorefront } = useCatalog();
  const [state, setState] = useState({ loading: true, error: null, orders: [], products: [], categories: [], coupons: [] });
  const lastCount = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [orders, products, categories, coupons] = await Promise.all([api.adminListOrders(), api.adminListProducts(), api.adminListCategories(), api.adminListCoupons()]);
      if (silent && lastCount.current != null && orders.length > lastCount.current) {
        const n = orders.length - lastCount.current;
        toast.info(`New order received${n > 1 ? `s (${n})` : ''}`);
      }
      lastCount.current = orders.length;
      setState({ loading: false, error: null, orders, products, categories, coupons });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: silent ? s.error : e.message || 'Could not load data.' }));
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(() => load({ silent: true }), 60_000);
    const onFocus = () => load({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const actions = useMemo(() => {
    const patchOrder = (updated) => setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)) }));
    const syncSheet = async (action, id) => {
      if (api.mode !== 'supabase') return;
      try { await api.adminSheetSync(action, id); setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, sheet_synced: true, sheet_sync_error: null } : o)) })); }
      catch (e) { toast.error(`Order updated, but Google Sheets could not be updated: ${e.message}`); load({ silent: true }); }
    };
    return {
      reload: load,
      async updateOrderStatus(id, status) {
        const updated = await api.adminUpdateOrderStatus(id, status);
        patchOrder(updated);
        // stock may have changed (cancel / re-open) → refresh products too
        api.adminListProducts().then((products) => setState((s) => ({ ...s, products }))).catch(() => {});
        syncSheet('updateStatus', id);
        return updated;
      },
      async setArchived(id, archived) { await api.adminSetArchived(id, archived); patchOrder({ id, is_archived: archived }); },
      async deleteOrder(id) { await api.adminDeleteOrder(id); setState((s) => ({ ...s, orders: s.orders.filter((o) => o.id !== id) })); },
      async saveProduct(p) {
        const saved = await api.adminSaveProduct(p);
        setState((s) => ({ ...s, products: s.products.some((x) => x.id === saved.id) ? s.products.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...s.products] }));
        refreshStorefront();
        return saved;
      },
      async deleteProduct(id) { await api.adminDeleteProduct(id); setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })); refreshStorefront(); },
      async adjustStock(id, delta) {
        const stock = await api.adminAdjustStock(id, delta);
        setState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, stock } : p)) }));
        refreshStorefront();
        return stock;
      },
      async removeDemoProducts() { const n = await api.adminRemoveDemoProducts(); await load({ silent: true }); refreshStorefront(); return n; },
      async saveCategory(c) {
        const saved = await api.adminSaveCategory(c);
        setState((s) => ({ ...s, categories: (s.categories.some((x) => x.id === saved.id) ? s.categories.map((x) => (x.id === saved.id ? saved : x)) : [...s.categories, saved]).sort((a, b) => a.sort_order - b.sort_order) }));
        refreshStorefront();
        return saved;
      },
      async deleteCategory(id) { await api.adminDeleteCategory(id); setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id), products: s.products.map((p) => (p.category_id === id ? { ...p, category_id: null } : p)) })); refreshStorefront(); },
      async saveCoupon(c) {
        const saved = await api.adminSaveCoupon(c);
        setState((s) => ({ ...s, coupons: s.coupons.some((x) => x.code === saved.code) ? s.coupons.map((x) => (x.code === saved.code ? saved : x)) : [saved, ...s.coupons] }));
        return saved;
      },
      async deleteCoupon(code) { await api.adminDeleteCoupon(code); setState((s) => ({ ...s, coupons: s.coupons.filter((c) => c.code !== code) })); },
      async retrySync(id) { const r = await api.adminSheetSync('retry', id); await load({ silent: true }); return r; },
      async retryAllSync() { const r = await api.adminSheetSync('retryAll'); await load({ silent: true }); return r; },
      async seedSamples(n) { const c = await api.adminSeedSampleOrders(n); await load({ silent: true }); return c; },
    };
  }, [load, toast, refreshStorefront]);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
