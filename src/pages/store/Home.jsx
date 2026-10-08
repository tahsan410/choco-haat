import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, PackageSearch, Star } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import ProductGrid from '../../components/store/ProductGrid.jsx';
import TrustBar from '../../components/store/TrustBar.jsx';
import HeroArt from '../../components/store/HeroArt.jsx';
import HeroSlideshow from '../../components/store/HeroSlideshow.jsx';
import { ProductGridSkeleton, ErrorState } from '../../components/ui/Feedback.jsx';
import Button, { buttonClasses } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { usePageMeta } from '../../lib/seo.js';
import { api } from '../../services/api.js';

function Section({ id, title, subtitle, action, children }) {
  return (
    <section id={id} className="section scroll-mt-24">
      <div className="container-x">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-cocoa-900 sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1 max-w-xl text-[15px] text-cocoa-600">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

const PLACEHOLDER_REVIEWS = [
  { id: 'd1', customer_name: 'Sample customer', rating: 5, comment: 'Placeholder review text – real customer reviews will appear here once you connect the reviews table.' },
  { id: 'd2', customer_name: 'Sample customer', rating: 5, comment: 'Placeholder review text – approve real reviews in the database and they replace this demo content.' },
  { id: 'd3', customer_name: 'Sample customer', rating: 4, comment: 'Placeholder review text – this card is clearly marked as demo content and is hidden in production.' },
];

function Reviews() {
  const [reviews, setReviews] = useState(null);
  useEffect(() => { api.getReviews().then(setReviews).catch(() => setReviews([])); }, []);
  if (reviews === null) return null;
  const showDemo = reviews.length === 0 && (import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_MODE === 'true');
  const list = reviews.length ? reviews : showDemo ? PLACEHOLDER_REVIEWS : [];
  if (!list.length) return null;
  return (
    <Section title="What customers say" subtitle={showDemo ? 'Demo content – replaced automatically by approved customer reviews.' : undefined}>
      <div className="grid gap-4 md:grid-cols-3">
        {list.slice(0, 3).map((r) => (
          <figure key={r.id} className="card flex flex-col p-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5 text-caramel-500" aria-label={`${r.rating} out of 5 stars`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-current' : 'text-cocoa-200'}`} aria-hidden />)}</div>
              {showDemo && <Badge tone="amber">Demo</Badge>}
            </div>
            <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-cocoa-700">{r.comment}</blockquote>
            <figcaption className="mt-4 text-sm font-semibold text-cocoa-900">{r.customer_name}</figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export default function Home() {
  const { loading, error, refresh, products, categories, featured, bestSellerProducts, newArrivals, settings } = useCatalog();
  usePageMeta({
    title: `Buy Chocolate Online in Bangladesh | ${settings.store_name}`,
    description: 'Buy imported chocolate online in Bangladesh – KitKat, Kinder, Ferrero, Toblerone, Lindt and more at affordable prices, delivered to your door. Pay with bKash or Nagad.',
    path: '/',
  });

  const countByCat = new Map();
  for (const p of products) countByCat.set(p.category_id, (countByCat.get(p.category_id) || 0) + 1);
  const featuredList = (featured.length ? featured : products).slice(0, 8);
  // Hero slideshow: products marked "Featured on homepage" that have a photo (falls back to any product photos).
  const withPhoto = (list) => list.filter((p) => p.image_url);
  const slides = (withPhoto(featured).length ? withPhoto(featured) : withPhoto(products)).slice(0, 10);

  return (
    <>
      {/* Hero */}
      <section className="container-x pt-4 sm:pt-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-cocoa-800 text-cream">
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-caramel-600/25 blur-3xl" aria-hidden />
          <div className="relative grid items-center gap-6 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-14 lg:py-16">
            <div>
              <h1 className="font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.25rem]">
                Premium Chocolates. <span className="text-caramel-300">Better Prices.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-cocoa-100 sm:text-lg">
                Discover your favorite chocolates at prices you&apos;ll love — delivered to your doorstep across Bangladesh.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button to="/shop" size="lg" className="!bg-caramel-300 !text-cocoa-900 hover:!bg-caramel-200">Shop Now <ArrowRight className="h-4 w-4" /></Button>
                <a href="#explore" className={buttonClasses({ variant: 'ghost', size: 'lg', className: '!text-cream ring-1 ring-inset ring-white/25 hover:!bg-white/10' })}>Explore Chocolates</a>
              </div>
            </div>
            {loading ? <div className="mx-auto aspect-square w-full max-w-md animate-pulse rounded-[1.75rem] bg-white/10 lg:ml-auto lg:max-w-[30rem]" aria-hidden /> : slides.length ? <HeroSlideshow products={slides} className="mx-auto max-w-md lg:ml-auto lg:max-w-[30rem]" /> : <HeroArt className="mx-auto w-full max-w-md lg:max-w-none" />}
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-cocoa-100 bg-white px-5 py-4 shadow-soft"><TrustBar compact /></div>
      </section>

      {/* Categories */}
      <Section id="explore" title="Explore by brand" subtitle="Pick a favourite or browse the whole range.">
        {loading ? (
          <div className="flex flex-wrap gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 w-36 animate-pulse rounded-2xl bg-cocoa-100/70" />)}</div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <li>
              <Link to="/shop" className="flex h-full min-h-[4.5rem] flex-col justify-center rounded-2xl bg-cocoa-800 px-4 py-3 text-cream transition hover:bg-cocoa-700">
                <span className="font-display text-lg font-semibold">All Chocolates</span><span className="text-xs text-cocoa-200">{products.length} products</span>
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/shop?category=${c.slug}`} className="flex h-full min-h-[4.5rem] flex-col justify-center rounded-2xl border border-cocoa-100 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-caramel-400 hover:shadow-soft">
                  <span className="font-display text-lg font-semibold text-cocoa-900">{c.name}</span><span className="text-xs text-cocoa-500">{countByCat.get(c.id) || 0} products</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {error && <div className="container-x"><ErrorState message={error} onRetry={refresh} /></div>}

      <Section title="Featured chocolates" subtitle="Hand-picked favourites." action={<Link to="/shop" className="text-sm font-semibold text-caramel-700 hover:underline">View all</Link>}>
        {loading ? <ProductGridSkeleton /> : featuredList.length ? <ProductGrid products={featuredList} /> : <p className="rounded-2xl border border-dashed border-cocoa-200 p-10 text-center text-cocoa-500">No products yet. Add your first chocolate from the admin dashboard.</p>}
      </Section>

      {bestSellerProducts.length > 0 && (
        <div className="bg-cream-100/70">
          <Section title="Best sellers" subtitle="What other customers order the most.">
            <ProductGrid products={bestSellerProducts.slice(0, 4)} />
          </Section>
        </div>
      )}

      {newArrivals.length > 0 && (
        <Section title="New arrivals" subtitle="Freshly added to the shelf." action={<Link to="/shop?sort=newest" className="text-sm font-semibold text-caramel-700 hover:underline">See all new</Link>}>
          <ProductGrid products={newArrivals.slice(0, 4)} />
        </Section>
      )}

      <Section title="Why choose us?">
        <div className="card p-6 sm:p-8"><TrustBar /></div>
      </Section>

      <Reviews />

      <section className="container-x pb-6">
        <div className="grid gap-4 rounded-3xl bg-caramel-100 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl font-semibold text-cocoa-900 sm:text-3xl">Already ordered?</h2>
            <p className="mt-1 text-cocoa-700">Track your order with your Order ID and phone number. Need help? We&apos;re a message away.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to="/track-order" variant="dark"><PackageSearch className="h-4 w-4" /> Track order</Button>
            <Button to="/contact" variant="secondary"><MessageCircle className="h-4 w-4" /> Contact us</Button>
          </div>
        </div>
      </section>
    </>
  );
}
