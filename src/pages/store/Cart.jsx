import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import ProductImage from '../../components/store/ProductImage.jsx';
import QuantityStepper from '../../components/store/QuantityStepper.jsx';
import Button from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/Feedback.jsx';
import { formatTaka } from '../../lib/format.js';
import { usePageMeta } from '../../lib/seo.js';

export function OrderSummary({ cart, settings, showDeliveryChoice = false }) {
  const inside = String(settings.inside_city_district || '').toLowerCase();
  const isInside = inside && cart.district.toLowerCase() === inside;
  return (
    <div className="space-y-3 text-[15px]">
      <div className="flex justify-between"><span className="text-cocoa-600">Subtotal ({cart.count} item{cart.count === 1 ? '' : 's'})</span><span className="font-medium">{formatTaka(cart.subtotal)}</span></div>
      {showDeliveryChoice && (
        <div>
          <label htmlFor="area" className="mb-1 block text-sm text-cocoa-600">Delivery area</label>
          <select id="area" value={isInside ? 'inside' : 'outside'} onChange={(e) => cart.setDistrict(e.target.value === 'inside' ? settings.inside_city_district : 'Other')}
            className="h-11 w-full rounded-xl border border-cocoa-200 bg-white px-3 text-sm focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200">
            <option value="inside">Inside {settings.inside_city_district}</option>
            <option value="outside">Outside {settings.inside_city_district}</option>
          </select>
        </div>
      )}
      <div className="flex justify-between"><span className="text-cocoa-600">Delivery charge</span><span className="font-medium">{cart.delivery === 0 ? <span className="text-emerald-700">Free</span> : formatTaka(cart.delivery)}</span></div>
      {cart.freeThreshold > 0 && cart.subtotal < cart.freeThreshold && (
        <p className="flex items-start gap-2 rounded-xl bg-caramel-50 px-3 py-2 text-[13px] text-caramel-800"><Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Add {formatTaka(cart.freeThreshold - cart.subtotal)} more for free delivery.</p>
      )}
      <div className="flex items-baseline justify-between border-t border-cocoa-100 pt-3"><span className="font-semibold">Total</span><span className="font-display text-2xl font-bold">{formatTaka(cart.total)}</span></div>
    </div>
  );
}

export default function Cart() {
  const cart = useCart();
  const { settings, loading } = useCatalog();
  const navigate = useNavigate();
  usePageMeta({ title: `Your cart | ${settings.store_name}`, description: 'Review the chocolates in your cart.', noindex: true });

  if (!loading && cart.lines.length === 0) {
    return <div className="container-x py-12"><EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Button to="/shop">Start shopping</Button>}>Add a few chocolates and they&apos;ll show up here.</EmptyState></div>;
  }

  return (
    <div className="container-x py-8 sm:py-10">
      <h1 className="h-page">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {cart.lines.map(({ product, quantity }) => (
            <li key={product.id} className="card flex gap-4 p-3 sm:p-4">
              <Link to={`/product/${product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-100 sm:h-28 sm:w-28"><ProductImage product={product} /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs text-cocoa-500">{product.brand}</p><Link to={`/product/${product.slug}`} className="line-clamp-2 font-display text-lg font-semibold leading-tight hover:text-caramel-700">{product.name}</Link></div>
                  <button onClick={() => cart.remove(product.id)} className="rounded-full p-2 text-cocoa-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${product.name}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                <p className="mt-0.5 text-sm text-cocoa-600">{formatTaka(product.price)} each</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <QuantityStepper size="sm" value={quantity} onChange={(n) => cart.setQty(product.id, n)} max={Math.min(product.stock, 50)} label={`Quantity of ${product.name}`} />
                  <p className="font-semibold">{formatTaka(product.price * quantity)}</p>
                </div>
                {quantity >= product.stock && <p className="mt-1 text-xs text-amber-700">Maximum available quantity.</p>}
              </div>
            </li>
          ))}
          <li><Link to="/shop" className="inline-block pt-2 text-sm font-semibold text-caramel-700 hover:underline">← Continue shopping</Link></li>
        </ul>

        <aside className="card h-fit p-5 sm:p-6 lg:sticky lg:top-28">
          <h2 className="mb-4 font-display text-xl font-semibold">Order summary</h2>
          <OrderSummary cart={cart} settings={settings} showDeliveryChoice />
          {cart.belowMinimum && <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Minimum order amount is {formatTaka(cart.minOrder)}. Add {formatTaka(cart.minOrder - cart.subtotal)} more to check out.</p>}
          <Button size="lg" className="mt-5 w-full" disabled={cart.belowMinimum} onClick={() => navigate('/checkout')}>Proceed to checkout</Button>
          <p className="mt-3 text-center text-xs text-cocoa-500">Cash on delivery · Final price is confirmed when you place the order.</p>
        </aside>
      </div>
    </div>
  );
}
