import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ShoppingBag, Copy, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import ProductImage from '../../components/store/ProductImage.jsx';
import { OrderSummary } from './Cart.jsx';
import Button from '../../components/ui/Button.jsx';
import AccountNudge from '../../components/store/AccountNudge.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { EmptyState } from '../../components/ui/Feedback.jsx';
import { api } from '../../services/api.js';
import { ApiError } from '../../services/errors.js';
import { BD_LOCATIONS, PAYMENT_METHODS } from '../../../shared/constants.js';
import { validateOrderInput } from '../../../shared/orderLogic.js';
import { formatTaka } from '../../lib/format.js';
import { usePageMeta } from '../../lib/seo.js';

export const LAST_ORDER_KEY = 'chocohaat.lastOrder';

export default function Checkout() {
  const cart = useCart();
  const { settings, refresh, loading } = useCatalog();
  const toast = useToast();
  const { customer, profile, saveProfile } = useCustomer();
  const navigate = useNavigate();
  usePageMeta({ title: `Checkout | ${settings.store_name}`, description: 'Complete your chocolate order.', noindex: true });

  const methods = PAYMENT_METHODS.filter((m) => m.enabled);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', division: '', district: '', upazila: '', note: '', paymentMethod: methods[0].id, paymentSender: '', paymentTrxId: '', website: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [copied, setCopied] = useState(false);
  const selected = methods.find((m) => m.id === form.paymentMethod) || methods[0];
  const payNumber = selected?.settingKey ? String(settings[selected.settingKey] || '').trim() : '';
  const copyNumber = async () => {
    try { await navigator.clipboard.writeText(payNumber); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked – number is visible anyway */ }
  };

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value, ...(k === 'division' ? { district: '' } : {}) }));
    setErrors((er) => ({ ...er, [k]: undefined, ...(k === 'division' ? { district: undefined } : {}) }));
  };

  // Signed-in customers: fill empty fields from their saved details (never overwrites what they typed).
  const prefilled = useRef(false);
  useEffect(() => {
    if (!customer || prefilled.current) return;
    prefilled.current = true;
    setForm((f) => {
      const div = profile?.division && BD_LOCATIONS[profile.division] ? profile.division : '';
      const dist = div && BD_LOCATIONS[div].includes(profile?.district) ? profile.district : '';
      return {
        ...f,
        name: f.name || profile?.full_name || customer.name || '',
        phone: f.phone || profile?.phone || '',
        email: f.email || customer.email || '',
        address: f.address || profile?.address || '',
        division: f.division || div,
        district: f.district || dist,
        upazila: f.upazila || profile?.upazila || '',
      };
    });
  }, [customer, profile]);

  // The delivery charge in the summary follows the district the customer picks.
  useEffect(() => { cart.setDistrict(form.district || cart.district); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [form.district]);

  const districts = useMemo(() => BD_LOCATIONS[form.division] || [], [form.division]);

  if (!loading && cart.lines.length === 0) {
    return <div className="container-x py-12"><EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Button to="/shop">Browse chocolates</Button>}>Add something sweet before checking out.</EmptyState></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const payload = { ...form, couponCode: cart.coupon, items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) };
    const v = validateOrderInput(payload);
    if (!v.ok) {
      setErrors(v.errors);
      if (v.errors.items) setFormError(v.errors.items);
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 30);
      return;
    }
    if (cart.belowMinimum) { setFormError(`Minimum order amount is ${formatTaka(cart.minOrder)}.`); return; }

    setSubmitting(true);
    try {
      const { order } = await api.createOrder(payload);
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      // First order of a signed-in customer: remember the delivery details for next time.
      if (customer && !profile) saveProfile({ name: v.value.name, phone: v.value.phone, address: v.value.address, division: v.value.division, district: v.value.district, upazila: v.value.upazila }).catch(() => {});
      cart.clear();
      refresh();
      navigate('/order-success', { state: { order }, replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      if (err instanceof ApiError && ['OUT_OF_STOCK', 'PRODUCT_UNAVAILABLE'].includes(err.code)) refresh();
      const msg = err.message || 'Could not place your order. Please try again.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-x py-8 sm:py-10">
      <h1 className="h-page">Checkout</h1>
      <AccountNudge className="mt-5" />
      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="cust">
            <h2 id="cust" className="mb-5 font-display text-xl font-semibold">Customer information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} placeholder="e.g. Tahsan Ahmed" />
              <Input label="Phone number" required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="01XXXXXXXXX" hint="We call this number to confirm your order." />
              <Input wrapClass="sm:col-span-2" label="Email (optional)" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
              <Textarea wrapClass="sm:col-span-2" label="Full address" required rows={2} autoComplete="street-address" value={form.address} onChange={set('address')} error={errors.address} placeholder="House / road / area / landmark" />
              <Select label="Division" required value={form.division} onChange={set('division')} error={errors.division} autoComplete="address-level1">
                <option value="">Select division</option>
                {Object.keys(BD_LOCATIONS).map((d) => <option key={d}>{d}</option>)}
              </Select>
              <Select label="District" required value={form.district} onChange={set('district')} error={errors.district} disabled={!form.division}>
                <option value="">{form.division ? 'Select district' : 'Select division first'}</option>
                {districts.map((d) => <option key={d}>{d}</option>)}
              </Select>
              <Input wrapClass="sm:col-span-2" label="Upazila / Area" required value={form.upazila} onChange={set('upazila')} error={errors.upazila} placeholder="e.g. Sylhet Sadar, Zindabazar" />
              <Textarea wrapClass="sm:col-span-2" label="Delivery note (optional)" rows={2} value={form.note} onChange={set('note')} placeholder="Anything the delivery person should know" />
              {/* Honeypot – hidden from people, bots tend to fill it */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="pay">
            <h2 id="pay" className="mb-4 font-display text-xl font-semibold">Payment</h2>
            <div className="space-y-2" role="radiogroup" aria-labelledby="pay">
              {methods.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${form.paymentMethod === m.id ? 'border-caramel-600 bg-caramel-50' : 'border-cocoa-200'}`}>
                  <input type="radio" name="payment" value={m.id} checked={form.paymentMethod === m.id} onChange={set('paymentMethod')} className="mt-1 text-caramel-600 focus:ring-caramel-500" />
                  <span><span className="block font-semibold">{m.label}</span><span className="text-sm text-cocoa-600">{m.description}</span></span>
                </label>
              ))}
            </div>
            {selected?.mobile && (
              <div className="mt-4 rounded-xl border p-4" style={{ borderColor: selected.color, background: `${selected.color}0F` }}>
                <p className="text-sm font-semibold text-cocoa-800">How to pay with {selected.label}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-cocoa-700">
                  <li>Open your {selected.label} app and choose <strong>Send Money</strong>.</li>
                  <li>Send <strong>{formatTaka(cart.total)}</strong> to the number below.</li>
                  <li>Copy the <strong>Transaction ID</strong> (TrxID) from the confirmation and enter it here.</li>
                </ol>
                {payNumber ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-lg bg-white px-3 py-2 font-display text-xl font-semibold tracking-wide text-cocoa-900 shadow-sm">{payNumber}</span>
                    <button type="button" onClick={copyNumber} className="inline-flex items-center gap-1.5 rounded-lg border border-cocoa-200 bg-white px-3 py-2 text-sm font-medium text-cocoa-700 hover:bg-cream-100">
                      {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied ? 'Copied' : 'Copy number'}
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-red-700">{selected.label} number is not set yet. Please call {settings.contact_phone} to place this order.</p>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input label={`Your ${selected.label} number`} required type="tel" inputMode="tel" value={form.paymentSender} onChange={set('paymentSender')} error={errors.paymentSender} placeholder="01XXXXXXXXX" hint="The number you sent money from." />
                  <Input label="Transaction ID (TrxID)" required value={form.paymentTrxId} onChange={(e) => set('paymentTrxId')({ target: { value: e.target.value.toUpperCase() } })} error={errors.paymentTrxId} placeholder="e.g. 9H7K2LM4QP" autoCapitalize="characters" autoComplete="off" />
                </div>
                <p className="mt-3 text-xs text-cocoa-600">We confirm your payment before shipping. Wrong or reused TrxIDs delay the order.</p>
              </div>
            )}
            <div className="mt-5">
              <Input label="Coupon code (optional)" value={cart.coupon} onChange={(e) => cart.setCoupon(e.target.value.toUpperCase())} placeholder="Enter code" wrapClass="max-w-xs" hint="Checked when you place the order." />
            </div>
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-28">
          <div className="card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-xl font-semibold">Your order</h2>
            <ul className="mb-5 max-h-72 space-y-3 overflow-y-auto pr-1">
              {cart.lines.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-100"><ProductImage product={product} /><span className="absolute -right-0 -top-0 grid h-5 min-w-[1.25rem] place-items-center rounded-bl-lg bg-cocoa-800 px-1 text-[11px] font-bold text-cream">{quantity}</span></span>
                  <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</span><span className="text-xs text-cocoa-500">{formatTaka(product.price)} × {quantity}</span></span>
                  <span className="text-sm font-semibold">{formatTaka(product.price * quantity)}</span>
                </li>
              ))}
            </ul>
            <OrderSummary cart={cart} settings={settings} />
            {formError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{formError}</p>}
            <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting}><Lock className="h-4 w-4" /> Place order · {formatTaka(cart.total)}</Button>
            <p className="mt-3 text-center text-xs text-cocoa-500">The final price and stock are verified securely when you place the order.</p>
          </div>
          <p className="mt-4 text-center text-sm"><Link to="/cart" className="font-semibold text-caramel-700 hover:underline">← Back to cart</Link></p>
        </aside>
      </form>
    </div>
  );
}
