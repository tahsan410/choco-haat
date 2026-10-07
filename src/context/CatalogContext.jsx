import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { DEFAULT_SETTINGS } from '../../shared/constants.js';

const CatalogContext = createContext(null);
export const useCatalog = () => useContext(CatalogContext);

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null, categories: [], products: [], settings: DEFAULT_SETTINGS, bestSellers: [] });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [catalog, best] = await Promise.all([api.getCatalog(), api.getBestSellers(8).catch(() => [])]);
      setState({ loading: false, error: null, ...catalog, bestSellers: best });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Could not load products.' }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => {
    const byId = new Map(state.products.map((p) => [p.id, p]));
    const bySlug = new Map(state.products.map((p) => [p.slug, p]));
    const catById = new Map(state.categories.map((c) => [c.id, c]));
    const catBySlug = new Map(state.categories.map((c) => [c.slug, c]));
    const sold = new Map(state.bestSellers.map((b) => [b.product_id, b.qty_sold]));
    const bestSellers = state.bestSellers.map((b) => byId.get(b.product_id)).filter(Boolean);
    const newest = [...state.products].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { ...state, byId, bySlug, catById, catBySlug, sold, bestSellerProducts: bestSellers, newArrivals: newest.slice(0, 8), featured: state.products.filter((p) => p.is_featured), refresh: load };
  }, [state, load]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
