import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Archive, ArchiveRestore, Trash2, Eye, Download, ShoppingCart, CloudOff } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader, Panel } from '../../components/admin/ui.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/Feedback.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { ORDER_STATUSES } from '../../../shared/constants.js';
import { dayKey, formatDate, formatTaka } from '../../lib/format.js';
import { isDemo } from '../../services/api.js';

const PAGE = 20;
const field = 'h-10 rounded-xl border border-cocoa-200 bg-white px-3 text-sm focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200';

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Order ID', 'Date', 'Customer', 'Phone', 'Address', 'Products', 'Subtotal', 'Delivery', 'Total', 'Status'];
  const lines = rows.map((o) => [o.order_number, o.created_at, o.customer_name, o.phone, `${o.address}, ${o.upazila}, ${o.district}`, o.items.map((i) => `${i.product_name} x${i.quantity}`).join('; '), o.subtotal, o.delivery_charge, o.total, o.status].map(esc).join(','));
  return [head.map(esc).join(','), ...lines].join('\n');
}

export default function Orders() {
  const { loading, error, orders, reload, updateOrderStatus, setArchived, deleteOrder } = useAdminData();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const view = params.get('view') || 'active';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const sort = params.get('sort') || 'newest';

  const set = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); setPage(1); };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^#/, '');
    let list = orders.filter((o) => (view === 'archived' ? o.is_archived : view === 'active' ? !o.is_archived : true));
    if (status) list = list.filter((o) => o.status === status);
    if (needle) list = list.filter((o) => o.order_number.toLowerCase().includes(needle) || o.phone.includes(needle.replace(/[\s-]/g, '')) || o.customer_name.toLowerCase().includes(needle));
    if (from) list = list.filter((o) => dayKey(o.created_at) >= from);
    if (to) list = list.filter((o) => dayKey(o.created_at) <= to);
    return [...list].sort((a, b) => (sort === 'oldest' ? 1 : -1) * (new Date(a.created_at) - new Date(b.created_at)) * (sort === 'oldest' ? 1 : 1));
  }, [orders, q, status, view, from, to, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);

  const changeStatus = async (o, s) => {
    try { await updateOrderStatus(o.id, s); toast.success(`${o.order_number} → ${s}`); } catch (e) { toast.error(e.message); }
  };
  const run = async () => {
    setBusy(true);
    try {
      if (confirm.type === 'delete') { await deleteOrder(confirm.order.id); toast.success('Order permanently deleted'); }
      else { await setArchived(confirm.order.id, confirm.type === 'archive'); toast.success(confirm.type === 'archive' ? 'Order archived' : 'Order restored'); }
      setConfirm(null);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([`﻿${toCsv(filtered)}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `orders-${dayKey(new Date().toISOString())}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (error) return <ErrorState message={error} onRetry={() => reload()} />;

  return (
    <>
      <PageHeader title="Orders" subtitle={`${filtered.length} order${filtered.length === 1 ? '' : 's'}`} actions={<Button variant="secondary" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4" /> Export CSV</Button>} />

      <Panel pad={false}>
        <div className="space-y-3 border-b border-cocoa-100 p-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Order view">
            {[['active', 'Active'], ['archived', 'Archived'], ['all', 'All']].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => set('view', k === 'active' ? '' : k)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${view === k ? 'bg-cocoa-800 text-cream' : 'bg-cocoa-50 text-cocoa-700 hover:bg-cocoa-100'}`}>{label}</button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
            <div className="relative sm:col-span-2 lg:col-span-1"><label htmlFor="oq" className="sr-only">Search orders</label><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" aria-hidden /><input id="oq" value={q} onChange={(e) => set('q', e.target.value)} placeholder="Order ID, phone or name" className={`${field} w-full pl-9`} /></div>
            <label className="sr-only" htmlFor="os">Status</label>
            <select id="os" value={status} onChange={(e) => set('status', e.target.value)} className={field}><option value="">All statuses</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <label className="sr-only" htmlFor="of">From date</label><input id="of" type="date" value={from} onChange={(e) => set('from', e.target.value)} className={field} title="From date" />
            <label className="sr-only" htmlFor="ot">To date</label><input id="ot" type="date" value={to} onChange={(e) => set('to', e.target.value)} className={field} title="To date" />
            <label className="sr-only" htmlFor="osort">Sort</label>
            <select id="osort" value={sort} onChange={(e) => set('sort', e.target.value === 'newest' ? '' : e.target.value)} className={field}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
          </div>
        </div>

        {loading ? <TableSkeleton cols={6} /> : rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title={orders.length ? 'No orders match' : 'No orders yet'} action={orders.length ? <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Clear filters</Button> : null}>{orders.length ? 'Try changing the search or filters.' : 'Orders from customers will show up here automatically.'}</EmptyState>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px]">
                <thead><tr className="border-b border-cocoa-100 bg-cream/60"><th className="th">Order ID</th><th className="th">Customer</th><th className="th">Date</th><th className="th text-right">Items</th><th className="th text-right">Total</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
                <tbody>{rows.map((o) => (
                  <tr key={o.id} className="border-b border-cocoa-50 last:border-0 hover:bg-cream/50">
                    <td className="td font-semibold"><Link to={`/admin/orders/${o.id}`} className="hover:text-caramel-700">#{o.order_number}</Link>{!isDemo && !o.sheet_synced && <span title={o.sheet_sync_error || 'Not synced to Google Sheets'} className="ml-1.5 inline-block align-middle text-red-500"><CloudOff className="h-3.5 w-3.5" aria-label="Not synced to Google Sheets" /></span>}</td>
                    <td className="td"><p className="font-medium">{o.customer_name}</p><p className="text-xs text-cocoa-500">{o.phone}</p></td>
                    <td className="td whitespace-nowrap text-cocoa-600">{formatDate(o.created_at)}</td>
                    <td className="td text-right tabular-nums">{o.items.length}</td>
                    <td className="td text-right font-semibold tabular-nums">{formatTaka(o.total)}</td>
                    <td className="td"><label className="sr-only" htmlFor={`st-${o.id}`}>Status of {o.order_number}</label>
                      <select id={`st-${o.id}`} value={o.status} onChange={(e) => changeStatus(o, e.target.value)} className="h-8 rounded-lg border border-cocoa-200 bg-white px-2 text-xs font-semibold focus:border-caramel-600 focus:outline-none">{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                    </td>
                    <td className="td"><div className="flex justify-end gap-1">
                      <Link to={`/admin/orders/${o.id}`} className="rounded-lg p-2 text-cocoa-600 hover:bg-cocoa-50" aria-label={`View ${o.order_number}`}><Eye className="h-4 w-4" /></Link>
                      <button onClick={() => setConfirm({ type: o.is_archived ? 'restore' : 'archive', order: o })} className="rounded-lg p-2 text-cocoa-600 hover:bg-cocoa-50" aria-label={`${o.is_archived ? 'Restore' : 'Archive'} ${o.order_number}`}>{o.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
                      <button onClick={() => setConfirm({ type: 'delete', order: o })} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${o.order_number}`}><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <ul className="divide-y divide-cocoa-50 md:hidden">
              {rows.map((o) => (
                <li key={o.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3"><Link to={`/admin/orders/${o.id}`} className="font-semibold">#{o.order_number}</Link><StatusBadge status={o.status} /></div>
                  <p className="text-sm text-cocoa-700">{o.customer_name} · {o.phone}</p>
                  <div className="flex items-center justify-between text-sm"><span className="text-cocoa-500">{formatDate(o.created_at)} · {o.items.length} product{o.items.length > 1 ? 's' : ''}</span><span className="font-bold">{formatTaka(o.total)}</span></div>
                  <div className="flex gap-2 pt-1">
                    <select aria-label={`Status of ${o.order_number}`} value={o.status} onChange={(e) => changeStatus(o, e.target.value)} className="h-9 flex-1 rounded-lg border border-cocoa-200 bg-white px-2 text-sm">{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                    <Button size="sm" variant="secondary" to={`/admin/orders/${o.id}`}>View</Button>
                    <button onClick={() => setConfirm({ type: o.is_archived ? 'restore' : 'archive', order: o })} className="rounded-full border border-cocoa-200 px-3 text-cocoa-600" aria-label="Archive or restore">{o.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
                    <button onClick={() => setConfirm({ type: 'delete', order: o })} className="rounded-full border border-red-200 px-3 text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>

            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-cocoa-100 px-4 py-3 text-sm">
                <span className="text-cocoa-500">Page {page} of {pages}</span>
                <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>
              </div>
            )}
          </>
        )}
      </Panel>

      <ConfirmDialog open={!!confirm} loading={busy} danger={confirm?.type === 'delete'} onClose={() => setConfirm(null)} onConfirm={run}
        title={confirm?.type === 'delete' ? 'Delete order permanently?' : confirm?.type === 'archive' ? 'Archive this order?' : 'Restore this order?'}
        confirmLabel={confirm?.type === 'delete' ? 'Delete permanently' : confirm?.type === 'archive' ? 'Archive' : 'Restore'}
        message={confirm?.type === 'delete' ? `Are you sure you want to permanently delete this order (#${confirm?.order.order_number})? This cannot be undone. Consider archiving instead – archived orders keep your sales history.` : confirm?.type === 'archive' ? `#${confirm?.order.order_number} moves to the Archived tab. It still counts in your sales and analytics.` : `#${confirm?.order.order_number} returns to the active orders list.`} />
    </>
  );
}
