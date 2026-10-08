import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Archive, ArchiveRestore, Trash2, Cloud, CloudOff, RefreshCw, Phone, Printer } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Panel } from '../../components/admin/ui.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, Skeleton } from '../../components/ui/Feedback.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Timeline } from '../store/TrackOrder.jsx';
import { ORDER_STATUSES } from '../../../shared/constants.js';
import { formatDateTime, formatTaka } from '../../lib/format.js';
import { isDemo } from '../../services/api.js';
import { paymentLabel } from '../../../shared/constants.js';

export default function OrderDetails() {
  const { id } = useParams();
  const { loading, orders, updateOrderStatus, setArchived, deleteOrder, retrySync } = useAdminData();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const order = orders.find((o) => o.id === id);

  if (loading && !order) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;
  if (!order) return <EmptyState title="Order not found" action={<Button to="/admin/orders">Back to orders</Button>}>It may have been deleted.</EmptyState>;

  const change = async (s) => {
    if (s === order.status) return;
    setBusy(true);
    try { await updateOrderStatus(order.id, s); toast.success(`Status changed to ${s}`); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const doConfirm = async () => {
    setBusy(true);
    try {
      if (confirm === 'delete') { await deleteOrder(order.id); toast.success('Order permanently deleted'); navigate('/admin/orders', { replace: true }); return; }
      await setArchived(order.id, confirm === 'archive'); toast.success(confirm === 'archive' ? 'Order archived' : 'Order restored'); setConfirm(null);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const sync = async () => {
    setSyncing(true);
    try { await retrySync(order.id); toast.success('Synced to Google Sheets'); } catch (e) { toast.error(e.message); } finally { setSyncing(false); }
  };
  const next = ORDER_STATUSES[ORDER_STATUSES.indexOf(order.status) + 1];
  const canAdvance = next && next !== 'Cancelled' && order.status !== 'Cancelled';

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cocoa-600 hover:text-cocoa-900"><ArrowLeft className="h-4 w-4" /> Orders</Link>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirm(order.is_archived ? 'restore' : 'archive')}>{order.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{order.is_archived ? 'Restore' : 'Archive'}</Button>
          <Button size="sm" variant="dangerGhost" onClick={() => setConfirm('delete')}><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">#{order.order_number}</h1>
        <StatusBadge status={order.status} className="text-sm" />
        {order.is_archived && <span className="rounded-full bg-cocoa-100 px-2.5 py-0.5 text-xs font-semibold text-cocoa-700">Archived</span>}
        <span className="text-sm text-cocoa-500">{formatDateTime(order.created_at)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Products" pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead><tr className="border-b border-cocoa-100"><th className="th">Product</th><th className="th text-right">Quantity</th><th className="th text-right">Unit price</th><th className="th text-right">Total</th></tr></thead>
                <tbody>{order.items.map((i) => <tr key={i.id} className="border-b border-cocoa-50 last:border-0"><td className="td font-medium">{i.product_name}</td><td className="td text-right tabular-nums">{i.quantity}</td><td className="td text-right tabular-nums">{formatTaka(i.unit_price)}</td><td className="td text-right font-semibold tabular-nums">{formatTaka(i.line_total)}</td></tr>)}</tbody>
              </table>
            </div>
            <dl className="space-y-1.5 border-t border-cocoa-100 bg-cream/50 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-cocoa-600">Subtotal</dt><dd className="tabular-nums">{formatTaka(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt><dd className="tabular-nums">−{formatTaka(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-cocoa-600">Delivery charge</dt><dd className="tabular-nums">{formatTaka(order.delivery_charge)}</dd></div>
              <div className="flex justify-between border-t border-cocoa-100 pt-2 text-base font-bold"><dt>Total</dt><dd className="font-display text-xl tabular-nums">{formatTaka(order.total)}</dd></div>
              <p className="pt-1 text-xs text-cocoa-500">Payment: {paymentLabel(order.payment_method)}</p>
              {order.payment_trx_id && <p className="rounded-lg bg-cream/80 px-3 py-2 text-sm text-cocoa-800"><span className="font-semibold">TrxID:</span> <span className="font-mono tracking-wide">{order.payment_trx_id}</span>{order.payment_sender && <> · paid from <span className="font-mono">{order.payment_sender}</span></>} · expected <strong>{formatTaka(order.total)}</strong><span className="block text-xs text-cocoa-500">Check this in your {paymentLabel(order.payment_method)} app before confirming the order.</span></p>}
            </dl>
          </Panel>

          <Panel title="Customer">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-cocoa-500">Name</dt><dd className="mt-0.5 font-medium">{order.customer_name}</dd></div>
              <div><dt className="text-xs font-semibold text-cocoa-500">Phone</dt><dd className="mt-0.5"><a href={`tel:${order.phone}`} className="inline-flex items-center gap-1.5 font-medium text-caramel-700 hover:underline"><Phone className="h-3.5 w-3.5" />{order.phone}</a></dd></div>
              <div><dt className="text-xs font-semibold text-cocoa-500">Email</dt><dd className="mt-0.5">{order.email ? <a href={`mailto:${order.email}`} className="hover:underline">{order.email}</a> : <span className="text-cocoa-400">—</span>}</dd></div>
              <div><dt className="text-xs font-semibold text-cocoa-500">Area</dt><dd className="mt-0.5">{order.upazila}, {order.district}, {order.division}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-semibold text-cocoa-500">Address</dt><dd className="mt-0.5">{order.address}</dd></div>
              {order.delivery_note && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-cocoa-500">Delivery note</dt><dd className="mt-0.5 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">{order.delivery_note}</dd></div>}
            </dl>
          </Panel>
        </div>

        <div className="space-y-6 print:hidden">
          <Panel title="Order status">
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Change status</label>
            <select id="status" value={order.status} disabled={busy} onChange={(e) => change(e.target.value)} className="h-11 w-full rounded-xl border border-cocoa-200 bg-white px-3 text-sm font-semibold focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200">
              {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {canAdvance && <Button className="mt-3 w-full" variant="dark" loading={busy} onClick={() => change(next)}>Mark as {next}</Button>}
            {order.status !== 'Cancelled' && order.status !== 'Delivered' && <p className="mt-2 text-xs text-cocoa-500">Cancelling returns the items to stock automatically.</p>}
            <div className="mt-6"><Timeline status={order.status} /></div>
          </Panel>

          {!isDemo && (
            <Panel title="Google Sheets">
              {order.sheet_synced ? <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Cloud className="h-4 w-4" /> Synced to Google Sheets</p> : (
                <div className="space-y-3">
                  <p className="flex items-start gap-2 text-sm font-medium text-red-700"><CloudOff className="mt-0.5 h-4 w-4 shrink-0" /> Not synced yet. The order is safe in the database.</p>
                  {order.sheet_sync_error && <p className="break-words rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{order.sheet_sync_error}</p>}
                  <Button size="sm" variant="secondary" loading={syncing} onClick={sync}><RefreshCw className="h-4 w-4" /> Retry sync</Button>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!confirm} loading={busy} danger={confirm === 'delete'} onClose={() => setConfirm(null)} onConfirm={doConfirm}
        title={confirm === 'delete' ? 'Delete order permanently?' : confirm === 'archive' ? 'Archive this order?' : 'Restore this order?'}
        confirmLabel={confirm === 'delete' ? 'Delete permanently' : confirm === 'archive' ? 'Archive' : 'Restore'}
        message={confirm === 'delete' ? 'Are you sure you want to permanently delete this order? This cannot be undone. Archiving keeps your sales history instead.' : confirm === 'archive' ? 'The order moves to the Archived tab and still counts in analytics.' : 'The order returns to the active list.'} />
    </>
  );
}
