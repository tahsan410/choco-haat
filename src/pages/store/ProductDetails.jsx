import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Zap, BadgeCheck, Truck } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useAddToCart } from '../../components/store/ProductCard.jsx';
import ProductImage from '../../components/store/ProductImage.jsx';
import ProductGrid from '../../components/store/ProductGrid.jsx';
import QuantityStepper from '../../components/store/QuantityStepper.jsx';
import { PriceBlock, StockBadge } from '../../components/store/PriceBlock.jsx';
import Button from '../../components/ui/Button.jsx';
import { Skeleton, EmptyState } from '../../components/ui/Feedback.jsx';
import { productGallery } from '../../lib/productArt.js';
import { usePageMeta, siteUrl } from '../../lib/seo.js';
import { formatTaka } from '../../lib/format.js';
import { PackageX } from 'lucide-react';

const DETAIL_ROWS = [
  ['weight', 'Weight'],
  ['country_of_origin', 'Country of origin'],
  ['expiry_info', 'Expiry information'],
  ['storage_info', 'Storage'],
];

export default function ProductDetails() {
  const { slug } = useParams();
  const { loading, bySlug, catById, products, settings } = useCatalog();
  const product = bySlug.get(slug);
  const navigate = useNavigate();
  const cart = useCart();
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);

  useEffect(() => { setQty(1); setActive(0); }, [slug]);

  const gallery = product ? productGallery(product) : [];
  const category = product ? catById.get(product.category_id) : null;
  const out = product ? product.stock <= 0 : false;
  const related = product ? products.filter((p) => p.id !== product.id && p.category_id === product.category_id && p.category_id).slice(0, 4) : [];

  usePageMeta({
    title: product ? `${product.name} – ${product.brand} | ${settings.store_name}` : `Product | ${settings.store_name}`,
    description: product ? `${product.short_description || product.description}`.slice(0, 155) || `Buy ${product.name} online in Bangladesh.` : 'Chocolate product',
    image: gallery[0]?.startsWith('http') ? gallery[0] : undefined,
    path: product ? `/product/${product.slug}` : undefined,
    jsonLd: product && {
      '@context': 'https://schema.org', '@type': 'Product', name: product.name, brand: { '@type': 'Brand', name: product.brand },
      description: product.description || product.short_description, image: gallery.filter((g) => g.startsWith('http')),
      offers: { '@type': 'Offer', priceCurrency: 'BDT', price: product.price, availability: out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: siteUrl ? `${siteUrl}/product/${product.slug}` : undefined },
    },
  });

  if (loading) {
    return <div className="container-x grid gap-8 py-10 md:grid-cols-2"><Skeleton className="aspect-square" /><div className="space-y-4"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-12 w-1/3" /><Skeleton className="h-24 w-full" /></div></div>;
  }
  if (!product) {
    return <div className="container-x py-10"><EmptyState icon={PackageX} title="Product not found" action={<Button to="/shop">Back to shop</Button>}>This chocolate may have been removed or is not available any more.</EmptyState></div>;
  }

  const inCart = cart.lines.find((l) => l.productId === product.id)?.quantity || 0;
  const max = Math.min(product.stock, 50);
  const details = DETAIL_ROWS.filter(([k]) => product[k]);

  return (
    <div className="container-x py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-cocoa-500">
        <Link to="/" className="hover:text-cocoa-800">Home</Link><ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to="/shop" className="hover:text-cocoa-800">Shop</Link>
        {category && <><ChevronRight className="h-3.5 w-3.5" aria-hidden /><Link to={`/shop?category=${category.slug}`} className="hover:text-cocoa-800">{category.name}</Link></>}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden /><span className="text-cocoa-800" aria-current="page">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-cocoa-100 bg-cream-100">
            <ProductImage product={product} src={gallery[active]} eager className={out ? 'opacity-60 grayscale' : ''} />
          </div>
          {gallery.length > 1 && (
            <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1" aria-label="Product images">
              {gallery.map((g, i) => (
                <li key={g}><button onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active} className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-cream-100 ${i === active ? 'border-caramel-600' : 'border-transparent hover:border-cocoa-200'}`}><ProductImage product={product} src={g} /></button></li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-cocoa-500">{product.brand}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight text-cocoa-900 sm:text-4xl">{product.name}</h1>
          <div className="mt-4"><StockBadge product={product} fallbackThreshold={settings.low_stock_threshold} /></div>
          <div className="mt-5"><PriceBlock product={product} size="detail" /></div>
          {product.short_description && <p className="mt-5 text-[17px] leading-relaxed text-cocoa-700">{product.short_description}</p>}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {!out && <QuantityStepper value={qty} onChange={setQty} max={max} />}
            <Button size="lg" onClick={() => addToCart(product, qty)} disabled={out} className="flex-1 sm:flex-none"><ShoppingBag className="h-5 w-5" /> {out ? 'Out of stock' : 'Add to Cart'}</Button>
            <Button size="lg" variant="dark" disabled={out} onClick={() => { cart.add(product.id, qty); navigate('/checkout'); }} className="flex-1 sm:flex-none"><Zap className="h-5 w-5" /> Buy Now</Button>
          </div>
          {inCart > 0 && <p className="mt-3 text-sm text-cocoa-600">{inCart} in your cart · <Link to="/cart" className="font-semibold text-caramel-700 hover:underline">View cart</Link></p>}

          <ul className="mt-7 grid gap-3 rounded-2xl bg-white p-4 text-sm text-cocoa-700 ring-1 ring-cocoa-100 sm:grid-cols-2">
            <li className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-caramel-600" aria-hidden />Delivery from {formatTaka(settings.inside_city_charge)} · cash on delivery</li>
            <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-caramel-600" aria-hidden />Sealed original packaging</li>
          </ul>

          <div className="mt-8 space-y-6 border-t border-cocoa-100 pt-6">
            {product.description && <section><h2 className="font-display text-xl font-semibold">Description</h2><p className="mt-2 whitespace-pre-line leading-relaxed text-cocoa-700">{product.description}</p></section>}
            {product.ingredients && <section><h2 className="font-display text-xl font-semibold">Ingredients</h2><p className="mt-2 leading-relaxed text-cocoa-700">{product.ingredients}</p></section>}
            {details.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-semibold">Product details</h2>
                <dl className="mt-2 divide-y divide-cocoa-100 rounded-2xl border border-cocoa-100 bg-white">
                  {details.map(([k, label]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-3 text-sm sm:grid-cols-[11rem_1fr]"><dt className="font-medium text-cocoa-500">{label}</dt><dd className="text-cocoa-800">{product[k]}</dd></div>)}
                </dl>
              </section>
            )}
            {product.authenticity_info && <section><h2 className="font-display text-xl font-semibold">Authenticity</h2><p className="mt-2 leading-relaxed text-cocoa-700">{product.authenticity_info}</p></section>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16"><h2 className="mb-6 font-display text-2xl font-semibold">You may also like</h2><ProductGrid products={related} /></section>
      )}
    </div>
  );
}
