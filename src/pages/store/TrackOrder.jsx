import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Circle, XCircle, Loader2, PackageSearch } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { api } from '../../services/api.js';
import { TIMELINE_STEPS, TIMELINE_LABELS } from '../../../shared/constants.js';
import { normalizePhone, ORDER_NUMBER_RE } from '../../../shared/orderLogic.js';
import { formatTaka, formatDateTime } from '../../lib/format.js';
import { usePageMeta } from '../../lib/seo.js';

export function Timeline({ status }) {
  if (status === 'Cancelled') {
    return <div role="alert" className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-900"><XCircle className="h-6 w-6 shrink-0" aria-hidden /><div><p className="font-semibold">This order was cancelled</p><p className="text-sm">If you did not expect this, please contact us.</p></div></div>;
  }
  const current = TIMELINE_STEPS.indexOf(status);
  return (
    <ol className="space-y-0">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < current || status === 'Delivered';
        const now = i === current && status !== 'Delivered';
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0" aria-current={now ? 'step' : undefined}>
            {i < TIMELINE_STEPS.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${done ? 'bg-emerald-500' : 'bg-cocoa-200'}`} aria-hidden />}
            <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-600 text-white' : now ? 'bg-caramel-600 text-white ring-4 ring-caramel-100' : 'bg-cocoa-100 text-cocoa-400'}`}>
              {done ? <Check className="h-4 w-4" aria-hidden /> : now ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Circle className="h-3 w-3" aria-hidden />}
            </span>
            <div className="pt-1"><p className={`font-semibold ${done || now ? 'text-cocoa-900' : 'text-cocoa-400'}`}>{TIMELINE_LABELS[step]}</p>{now && <p className="text-sm text-cocoa-600">In progress</p>}</div>
          </li>
        );
      })}
    </ol>
  );
}

export default function TrackOrder() {
  const [params] = useSearchParams();
  const { settings } = useCatalog();
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  usePageMeta({ title: `Track your order | ${settings.store_name}`, description: 'Enter your Order ID and phone number to see where your chocolates are.' });

  useEffect(() => { const o = params.get('order'); if (o) setOrderNumber(o); }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!ORDER_NUMBER_RE.test(orderNumber.trim().toUpperCase())) er.order = 'Enter your Order ID, e.g. CHOC-20261006-0001.';
    if (!normalizePhone(phone)) er.phone = 'Enter the phone number used for the order.';
    setErrors(er); setError('');
    if (Object.keys(er).length) return;
    setLoading(true); setOrder(null);
    try { setOrder(await api.trackOrder({ orderNumber: orderNumber.trim(), phone })); }
    catch (err) { setError(err.message || 'Could not look up this order.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="container-x py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="h-page">Track your order</h1>
        <p className="mt-2 text-cocoa-600">Enter your Order ID and the phone number you used when ordering.</p>

        <form onSubmit={submit} noValidate className="card mt-6 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Input label="Order ID" required value={orderNumber} onChange={(e) => { setOrderNumber(e.target.value.toUpperCase()); setErrors((x) => ({ ...x, order: undefined })); }} error={errors.order} placeholder="CHOC-20261006-0001" autoCapitalize="characters" autoComplete="off" />
          <Input label="Phone number" required type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: undefined })); }} error={errors.phone} placeholder="01XXXXXXXXX" />
          <div className="sm:col-span-2"><Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto"><PackageSearch className="h-4 w-4" /> Track order</Button></div>
        </form>

        {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}

        {order && (
          <div className="mt-6 animate-pop-in space-y-5">
            <div className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-semibold text-cocoa-500">Order</p><p className="font-display text-2xl font-bold">{order.order_number}</p><p className="text-sm text-cocoa-600">Placed {formatDateTime(order.created_at)}</p></div>
                <StatusBadge status={order.status} className="text-sm" />
              </div>
              <div className="mt-6"><Timeline status={order.status} /></div>
            </div>
            <div className="card divide-y divide-cocoa-100">
              <ul className="divide-y divide-cocoa-100">
                {order.items.map((i) => <li key={i.product_name} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span>{i.product_name} <span className="text-cocoa-500">× {i.quantity}</span></span><span className="font-medium">{formatTaka(i.line_total)}</span></li>)}
              </ul>
              <div className="flex items-center justify-between px-5 py-3 text-sm"><span className="text-cocoa-600">Delivery</span><span>{order.delivery_charge === 0 ? 'Free' : formatTaka(order.delivery_charge)}</span></div>
              <div className="flex items-center justify-between px-5 py-4 font-bold"><span>Total</span><span className="font-display text-xl">{formatTaka(order.total)}</span></div>
              <div className="px-5 py-4 text-sm"><p className="text-xs font-semibold text-cocoa-500">Delivery information</p><p className="mt-1 text-cocoa-800">{order.customer_name} · {order.phone}</p><p className="text-cocoa-700">{order.address}, {order.upazila}, {order.district}, {order.division}</p><p className="mt-1 text-cocoa-500">{order.payment_method === 'COD' ? 'Cash on Delivery' : order.payment_method}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
