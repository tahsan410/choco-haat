import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import ProductImage from './ProductImage.jsx';
import { formatTaka } from '../../lib/format.js';
import { searchProducts } from '../../lib/search.js';

export default function SearchBox({ autoFocus = false, onDone, className = '' }) {
  const { products } = useCatalog();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const navigate = useNavigate();
  const results = useMemo(() => (q.trim() ? searchProducts(products, q).slice(0, 5) : []), [q, products]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
    setOpen(false); setQ(''); onDone?.();
  };
  const go = (slug) => { navigate(`/product/${slug}`); setOpen(false); setQ(''); onDone?.(); };

  return (
    <div ref={box} className={`relative ${className}`}>
      <form onSubmit={submit} role="search">
        <label htmlFor="site-search" className="sr-only">Search chocolates</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" aria-hidden />
        <input
          id="site-search" autoFocus={autoFocus} value={q} autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search KitKat, Kinder, Ferrero…"
          className="h-11 w-full rounded-full border border-cocoa-200 bg-white pl-10 pr-9 text-sm text-cocoa-900 placeholder:text-cocoa-400 focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200"
        />
        {q && <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-cocoa-400 hover:text-cocoa-700" aria-label="Clear search"><X className="h-4 w-4" /></button>}
      </form>
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-cocoa-100 bg-white shadow-lift">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-cocoa-500">No chocolates match “{q}”.</p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p.id}>
                  <button onClick={() => go(p.slug)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-cream">
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream-100"><ProductImage product={p} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-cocoa-900">{p.name}</span><span className="block text-xs text-cocoa-500">{p.brand}</span></span>
                    <span className="text-sm font-semibold text-cocoa-800">{formatTaka(p.price)}</span>
                  </button>
                </li>
              ))}
              <li><button onClick={submit} className="w-full border-t border-cocoa-100 px-4 py-2.5 text-left text-sm font-semibold text-caramel-700 hover:bg-cream">See all results</button></li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
