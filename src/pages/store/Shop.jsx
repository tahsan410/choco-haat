import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SearchX } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import ProductGrid from '../../components/store/ProductGrid.jsx';
import { ProductGridSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback.jsx';
import Button from '../../components/ui/Button.jsx';
import { Checkbox } from '../../components/ui/Field.jsx';
import { searchProducts } from '../../lib/search.js';
import { discountInfo } from '../../lib/format.js';
import { usePageMeta } from '../../lib/seo.js';

const SORTS = {
  featured: 'Featured first',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  discount: 'Biggest discount',
};

export default function Shop() {
  const { loading, error, refresh, products, categories, catBySlug, settings } = useCatalog();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const categorySlug = params.get('category') || '';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'featured';
  const inStock = params.get('stock') === '1';

  const category = catBySlug.get(categorySlug);
  usePageMeta({
    title: `${category ? `${category.name} chocolates` : 'Shop chocolates online'} | ${settings.store_name}`,
    description: `Browse ${category ? category.name : 'imported'} chocolates at affordable prices in Bangladesh. Cash on delivery across the country.`,
  });

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    let res = q ? searchProducts(products, q) : [...products];
    if (category) res = res.filter((p) => p.category_id === category.id);
    if (inStock) res = res.filter((p) => p.stock > 0);
    const byStockLast = (a, b) => Number(b.stock > 0) - Number(a.stock > 0);
    if (sort === 'price-asc') res.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') res.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') res.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'discount') res.sort((a, b) => (discountInfo(b)?.percent || 0) - (discountInfo(a)?.percent || 0));
    else if (!q) res.sort((a, b) => byStockLast(a, b) || Number(b.is_featured) - Number(a.is_featured));
    return res;
  }, [products, q, category, inStock, sort]);

  const hasFilters = q || categorySlug || inStock;

  return (
    <div className="container-x py-8 sm:py-10">
      <h1 className="h-page">{category ? category.name : 'All chocolates'}</h1>
      <p className="mt-1 text-cocoa-600">{loading ? 'Loading…' : `${list.length} product${list.length === 1 ? '' : 's'}`}{q && <> for “{q}”</>}</p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="relative">
          <label htmlFor="shop-search" className="sr-only">Search products</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" aria-hidden />
          <input id="shop-search" value={q} onChange={(e) => set('q', e.target.value)} placeholder="Search by name or brand…" autoComplete="off"
            className="h-12 w-full rounded-full border border-cocoa-200 bg-white pl-11 pr-10 text-[15px] placeholder:text-cocoa-400 focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200" />
          {q && <button onClick={() => set('q', '')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-cocoa-400 hover:text-cocoa-700" aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {[{ slug: '', name: 'All Chocolates' }, ...categories].map((c) => {
              const active = (c.slug || '') === categorySlug;
              return (
                <button key={c.slug || 'all'} onClick={() => set('category', c.slug)} aria-pressed={active}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${active ? 'border-cocoa-800 bg-cocoa-800 text-cream' : 'border-cocoa-200 bg-white text-cocoa-700 hover:border-cocoa-400'}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label="In stock only" checked={inStock} onChange={(e) => set('stock', e.target.checked ? '1' : '')} />
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-cocoa-600">Sort</label>
            <select id="sort" value={sort} onChange={(e) => set('sort', e.target.value === 'featured' ? '' : e.target.value)} className="h-10 rounded-full border border-cocoa-200 bg-white px-4 text-sm focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {error ? <ErrorState message={error} onRetry={refresh} />
          : loading ? <ProductGridSkeleton count={8} />
          : list.length === 0 ? (
            <EmptyState icon={SearchX} title="No products found." action={hasFilters ? <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Clear filters</Button> : null}>
              {hasFilters ? 'Try a different search or remove a filter.' : 'The shop is being stocked – please check back soon.'}
            </EmptyState>
          ) : <ProductGrid products={list} />}
      </div>
    </div>
  );
}
