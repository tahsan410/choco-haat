import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, PackageOpen, RotateCcw, PlusCircle } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../services/api.js';
import { BD_LOCATIONS } from '../../../shared/constants.js';
import { normalizePhone } from '../../../shared/orderLogic.js';
import { formatTaka, formatDateTime } from '../../lib/format.js';
import { usePageMeta } from '../../lib/seo.js';
import { paymentLabel } from '../../../shared/constants.js';

function OrderCard({ order, onReorder }) {
  const [open, setOpen] = useState(false);
  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold tracking-wide">{order.order_number}</p>
          <p className="text-sm text-cocoa-500">{formatDateTime(order.created_at)} · {count} item{count === 1 ? '' : 's'}</p>
        </div>
        <div className="text-right">
          <StatusBadge status={order.status} />
          <p className="mt-1 font-display text-lg font-bold">{formatTaka(order.total)}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-cocoa-700">{order.items.map((i) => `${i.product_name} × ${i.quantity}`).join(', ')}</p>

      {open && (
        <div className="mt-4 space-y-3 border-t border-cocoa-100 pt-4 text-sm">
          <ul className="space-y-1.5">
            {order.items.map((i) => <li key={`${i.product_id}-${i.product_name}`} className="flex justify-between gap-3"><span>{i.product_name} <span className="text-cocoa-500">× {i.quantity}</span></span><span className="font-medium">{formatTaka(i.line_total)}</span></li>)}
          </ul>
          <div className="space-y-1 border-t border-cocoa-100 pt-3">
            <div className="flex justify-between"><span className="text-cocoa-600">Subtotal</span><span>{formatTaka(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{formatTaka(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-cocoa-600">Delivery</span><span>{order.delivery_charge === 0 ? 'Free' : formatTaka(order.delivery_charge)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>{formatTaka(order.total)}</span></div>
          </div>
          <p className="text-cocoa-600"><span className="font-semibold text-cocoa-800">Delivery to:</span> {order.address}, {order.upazila}, {order.district}, {order.division}</p>
          <p className="text-cocoa-600"><span className="font-semibold text-cocoa-800">Payment:</span> {paymentLabel(order.payment_method)}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? 'Hide details' : 'View details'}</Button>
        <Button size="sm" variant="ghost" to={`/track-order?order=${encodeURIComponent(order.order_number)}`}>Track</Button>
        {order.status !== 'Cancelled' && <Button size="sm" variant="ghost" onClick={() => onReorder(order)}><RotateCcw className="h-4 w-4" aria-hidden /> Order again</Button>}
      </div>
    </li>
  );
}

function AddOrderForm({ onClaimed, initial }) {
  const [form, setForm] = useState({ orderNumber: initial?.orderNumber || '', phone: initial?.phone || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!normalizePhone(form.phone)) { setError('Enter the phone number you used for that order.'); return; }
    setBusy(true); setError('');
    try { await api.customerClaimOrder(form); setForm({ orderNumber: '', phone: '' }); onClaimed(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate className="card mt-6 p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><PlusCircle className="h-5 w-5 text-caramel-600" aria-hidden /> Add an earlier order</h3>
      <p className="mt-1 text-sm text-cocoa-600">Ordered before without signing in? Enter that order&apos;s ID and phone number to see it here.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input label="Order ID" placeholder="CHOC-20261007-0001" value={form.orderNumber} onChange={(e) => { setForm((f) => ({ ...f, orderNumber: e.target.value.toUpperCase() })); setError(''); }} />
        <Input label="Phone used on the order" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setError(''); }} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</p>}
      <Button type="submit" className="mt-4" variant="dark" loading={busy} disabled={!form.orderNumber.trim()}>Add to my account</Button>
    </form>
  );
}

function DetailsForm() {
  const { customer, profile, saveProfile } = useCustomer();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '', address: '', division: '', district: '', upazila: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      name: profile?.full_name || customer?.name || '', phone: profile?.phone || '', address: profile?.address || '',
      division: profile?.division || '', district: profile?.district || '', upazila: profile?.upazila || '',
    });
  }, [profile, customer]);

  const set = (k) => (e) => { const value = e.target.value; setForm((f) => ({ ...f, [k]: value, ...(k === 'division' ? { district: '' } : {}) })); setError(''); };
  const submit = async (e) => {
    e.preventDefault();
    if (form.phone && !normalizePhone(form.phone)) { setError('Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).'); return; }
    setBusy(true);
    try { await saveProfile({ ...form, phone: form.phone ? normalizePhone(form.phone) : '' }); toast.success('Details saved'); }
    catch (err) { setError(err.message || 'Could not save. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="card p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold">Saved delivery details</h2>
      <p className="mt-1 text-sm text-cocoa-600">We fill these in for you at checkout. Signed in as <span className="font-medium text-cocoa-800">{customer.email}</span>.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input label="Full name" autoComplete="name" value={form.name} onChange={set('name')} />
        <Input label="Phone number" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" />
        <Textarea wrapClass="sm:col-span-2" label="Full address" rows={2} autoComplete="street-address" value={form.address} onChange={set('address')} />
        <Select label="Division" value={form.division} onChange={set('division')}>
          <option value="">Select division</option>
          {Object.keys(BD_LOCATIONS).map((d) => <option key={d}>{d}</option>)}
        </Select>
        <Select label="District" value={form.district} onChange={set('district')} disabled={!form.division}>
          <option value="">{form.division ? 'Select district' : 'Select division first'}</option>
          {(BD_LOCATIONS[form.division] || []).map((d) => <option key={d}>{d}</option>)}
        </Select>
        <Input wrapClass="sm:col-span-2" label="Upazila / Area" value={form.upazila} onChange={set('upazila')} />
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</p>}
      <Button type="submit" className="mt-5" loading={busy}>Save details</Button>
    </form>
  );
}

export default function Account() {
  const { customer, loading, signOut } = useCustomer();
  const { settings } = useCatalog();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const claimedOnce = useRef(false);
  usePageMeta({ title: `My account | ${settings.store_name}`, description: 'Your orders and saved details.', noindex: true });

  const load = useCallback(async () => {
    setError('');
    try { setOrders(await api.customerOrders()); } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { if (customer) load(); }, [customer, load]);

  // Coming from "Create account" on the order-success page: add that order automatically.
  useEffect(() => {
    if (!customer || !state?.claim || claimedOnce.current) return;
    claimedOnce.current = true;
    api.customerClaimOrder(state.claim).then(() => { toast.success('Your order was added to your account'); load(); }).catch(() => {});
  }, [customer, state, toast, load]);

  const totals = useMemo(() => (orders || []).filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0), [orders]);

  if (loading) return <div className="grid min-h-[40vh] place-items-center"><Spinner className="h-8 w-8" /></div>;
  if (!customer) return <Navigate to="/account/login" replace state={{ from: '/account' }} />;

  const reorder = (order) => {
    let added = 0;
    for (const i of order.items) if (i.product_id && cart.add(i.product_id, i.quantity).ok) added += 1;
    if (added === 0) toast.error('Those products are not available right now.');
    else {
      if (added < order.items.length) toast.info('Some products are unavailable and were skipped.');
      navigate('/cart');
    }
  };

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === id ? 'bg-cocoa-800 text-cream' : 'text-cocoa-700 hover:bg-cocoa-50'}`}>{label}</button>
  );

  return (
    <div className="container-x py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-page">My account</h1>
          <p className="mt-1 text-cocoa-600">Hello{customer.name ? `, ${customer.name.split(' ')[0]}` : ''}! {orders?.length ? `You have placed ${orders.length} order${orders.length === 1 ? '' : 's'} (${formatTaka(totals)} so far).` : ''}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={async () => { await signOut(); navigate('/'); }}><LogOut className="h-4 w-4" aria-hidden /> Sign out</Button>
      </div>

      <div className="mt-6 flex gap-2" role="group" aria-label="Account sections">{tabBtn('orders', 'My orders')}{tabBtn('details', 'Saved details')}</div>

      <div className="mt-6 max-w-3xl">
        {tab === 'details' && <DetailsForm />}
        {tab === 'orders' && (
          <>
            {error && <ErrorState message={error} onRetry={load} />}
            {!error && orders === null && <div className="grid min-h-[20vh] place-items-center"><Spinner className="h-7 w-7" /></div>}
            {!error && orders && orders.length === 0 && (
              <EmptyState icon={PackageOpen} title="No orders yet" action={<Button to="/shop">Browse chocolates</Button>}>Orders you place while signed in will show up here.</EmptyState>
            )}
            {!error && orders && orders.length > 0 && <ul className="space-y-4">{orders.map((o) => <OrderCard key={o.order_number} order={o} onReorder={reorder} />)}</ul>}
            <AddOrderForm initial={state?.claim} onClaimed={() => { toast.success('Order added to your account'); load(); }} />
            <p className="mt-6 text-sm text-cocoa-500">Need help with an order? <Link to="/contact" className="font-semibold text-caramel-700 hover:underline">Contact us</Link>.</p>
          </>
        )}
      </div>
    </div>
  );
}
