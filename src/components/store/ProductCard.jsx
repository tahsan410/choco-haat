import { Link } from 'react-router-dom';
import { Eye, ShoppingBag } from 'lucide-react';
import ProductImage from './ProductImage.jsx';
import { PriceBlock, StockBadge } from './PriceBlock.jsx';
import { discountInfo } from '../../lib/format.js';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';

export function useAddToCart() {
  const cart = useCart();
  const toast = useToast();
  return (product, qty = 1) => {
    const res = cart.add(product.id, qty);
    if (!res.ok) toast.error(`${product.name} is out of stock.`);
    else if (res.capped) toast.info(`Only ${res.max} available – cart updated.`);
    else toast.success('Added to cart');
    return res;
  };
}

export default function ProductCard({ product, onQuickView }) {
  const addToCart = useAddToCart();
  const { catById, settings } = useCatalog();
  const d = discountInfo(product);
  const out = product.stock <= 0;
  const category = catById.get(product.category_id);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-cocoa-100 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-cocoa-200 hover:shadow-lift">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-cream-100" aria-label={`View ${product.name}`}>
        <ProductImage product={product} className={`transition duration-500 group-hover:scale-[1.04] ${out ? 'opacity-50 grayscale' : ''}`} sizes="(min-width:1024px) 25vw, 50vw" />
        {d && !out && <span className="absolute left-2.5 top-2.5 rounded-full bg-caramel-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">−{d.percent}%</span>}
        {out && <span className="absolute inset-0 grid place-items-center"><span className="rounded-full bg-cocoa-900/85 px-4 py-1.5 text-sm font-semibold text-cream">Sold out</span></span>}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-xs font-medium text-cocoa-500">{product.brand}{category && product.brand !== category.name ? ` · ${category.name}` : ''}</p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] font-display text-[17px] font-semibold leading-tight text-cocoa-900">
          <Link to={`/product/${product.slug}`} className="hover:text-caramel-700 focus-visible:outline-none focus-visible:underline">{product.name}</Link>
        </h3>
        {product.short_description && <p className="mt-1 line-clamp-2 hidden text-[13px] leading-snug text-cocoa-600 sm:block">{product.short_description}</p>}
        <div className="mt-2"><StockBadge product={product} fallbackThreshold={settings.low_stock_threshold} /></div>
        <div className="mt-3"><PriceBlock product={product} /></div>

        <div className="mt-4 flex gap-2 pt-1 sm:mt-auto">
          <button
            onClick={() => addToCart(product)}
            disabled={out}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-cocoa-800 px-3 text-sm font-semibold text-cream transition hover:bg-caramel-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-600 focus-visible:ring-offset-2 active:scale-[.98] disabled:cursor-not-allowed disabled:bg-cocoa-200 disabled:text-cocoa-500 disabled:hover:bg-cocoa-200"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden /> {out ? 'Unavailable' : 'Add to Cart'}
          </button>
          <button onClick={() => onQuickView?.(product)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-cocoa-200 px-3 text-sm font-semibold text-cocoa-700 transition hover:border-cocoa-400 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-600 focus-visible:ring-offset-2" aria-label={`Quick view ${product.name}`}>
            <Eye className="h-4 w-4" aria-hidden /><span className="hidden xl:inline">Quick View</span>
          </button>
        </div>
      </div>
    </article>
  );
}
