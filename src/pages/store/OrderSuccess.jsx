import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Copy, Check } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { formatTaka, formatDateTime } from '../../lib/format.js';
import { usePageMeta } from '../../lib/seo.js';
import { LAST_ORDER_KEY } from './Checkout.jsx';

export default function OrderSuccess() {
  const { state } = useLocation();
  const toast = useToast();
  const { customer, loading: authLoading } = useCustomer();
  const [copied, setCopied] = useState(false);
  usePageMeta({ title: 'Order placed', description: 'Your order has been received.', noindex: true });

  let order = state?.order;
  if (!order) { try { order = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null'); } catch { order = null; } }
  if (!order) return <Navigate to="/" replace />;

  const copy = async () => {
    try { await navigator.clipboard.writeText(order.order_number); setCopied(true); toast.success('Order ID copied'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.info('Select the Order ID and copy it manually.'); }
  };

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-9 w-9" aria-hidden /></span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Order Placed Successfully!</h1>
          <p className="mt-2 text-cocoa-600">Thank you, {order.customer_name.split(' ')[0]}. We&apos;ll call you shortly to confirm your order.</p>
        </div>

        <div className="mt-8 rounded-2xl border-2 border-dashed border-caramel-400 bg-caramel-50 p-5 text-center">
          <p className="text-sm font-medium text-caramel-800">Your Order ID</p>
          <p className="mt-1 select-all font-display text-3xl font-bold tracking-wide text-cocoa-900">{order.order_number}</p>
          <button onClick={copy} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-cocoa-800 ring-1 ring-cocoa-200 hover:ring-cocoa-400">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</button>
          <p className="mt-3 text-sm text-cocoa-700">Please save this Order ID. You need it with your phone number to track your order.</p>
        </div>

        <div className="card mt-6 divide-y divide-cocoa-100">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div><p className="text-xs font-semibold text-cocoa-500">Customer</p><p className="mt-1 font-medium">{order.customer_name}</p><p className="text-sm text-cocoa-600">{order.phone}</p></div>
            <div><p className="text-xs font-semibold text-cocoa-500">Delivery to</p><p className="mt-1 text-sm text-cocoa-800">{order.address}, {order.upazila}, {order.district}, {order.division}</p></div>
            <div><p className="text-xs font-semibold text-cocoa-500">Status</p><div className="mt-1"><StatusBadge status={order.status} /></div></div>
            <div><p className="text-xs font-semibold text-cocoa-500">Placed</p><p className="mt-1 text-sm">{formatDateTime(order.created_at)} · {order.payment_method === 'COD' ? 'Cash on Delivery' : order.payment_method}</p></div>
          </div>
          <ul className="divide-y divide-cocoa-100">
            {order.items.map((i) => (
              <li key={i.product_name} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span>{i.product_name} <span className="text-cocoa-500">× {i.quantity}</span></span><span className="font-medium">{formatTaka(i.line_total)}</span></li>
            ))}
          </ul>
          <div className="space-y-1.5 p-5 text-sm">
            <div className="flex justify-between"><span className="text-cocoa-600">Subtotal</span><span>{formatTaka(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{formatTaka(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-cocoa-600">Delivery</span><span>{order.delivery_charge === 0 ? 'Free' : formatTaka(order.delivery_charge)}</span></div>
            <div className="flex justify-between border-t border-cocoa-100 pt-2 text-base font-bold"><span>Total to pay</span><span className="font-display text-xl">{formatTaka(order.total)}</span></div>
          </div>
        </div>

        {!authLoading && (customer ? (
          <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">This order is saved in <Link to="/account" className="font-semibold underline">your account</Link>.</p>
        ) : (
          <div className="mt-6 rounded-2xl border border-cocoa-100 bg-white p-5 text-center">
            <p className="font-display text-lg font-semibold">Keep track of all your orders</p>
            <p className="mt-1 text-sm text-cocoa-600">Create a free account to see this and future orders in one place, and check out faster next time.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button to="/account/register" size="sm" variant="primary" state={{ claim: { orderNumber: order.order_number, phone: order.phone }, name: order.customer_name, from: '/account' }}>Create account</Button>
              <Button to="/account/login" size="sm" variant="ghost" state={{ claim: { orderNumber: order.order_number, phone: order.phone }, from: '/account' }}>I already have one</Button>
            </div>
          </div>
        ))}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to={`/track-order?order=${encodeURIComponent(order.order_number)}`} variant="dark" size="lg">Track Order</Button>
          <Button to="/shop" variant="secondary" size="lg">Continue Shopping</Button>
        </div>
        <p className="mt-6 text-center text-sm text-cocoa-500">Questions? <Link to="/contact" className="font-semibold text-caramel-700 hover:underline">Contact us</Link>.</p>
      </div>
    </div>
  );
}