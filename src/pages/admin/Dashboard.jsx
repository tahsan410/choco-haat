import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, CheckCircle2, XCircle, Wallet, Package, Boxes, Users, AlertTriangle, CloudOff } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { PageHeader, Panel, StatCard, Table } from '../../components/admin/ui.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { TableSkeleton, ErrorState, Skeleton } from '../../components/ui/Feedback.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import Donut from '../../components/charts/Donut.jsx';
import Button from '../../components/ui/Button.jsx';
import { computeAnalytics, deriveCustomers } from '../../lib/analytics.js';
import { formatTaka, timeAgo } from '../../lib/format.js';
import { isDemo } from '../../services/api.js';

export function TopProductsTable({ rows }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-cocoa-500">No sales yet. Top-selling products appear here once orders arrive.</p>;
  return (
    <Table>
      <thead><tr className="border-b border-cocoa-100"><th className="th">Product</th><th className="th text-right">Orders</th><th className="th text-right">Quantity sold</th><th className="th text-right">Revenue</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.key} className="border-b border-cocoa-50 last:border-0"><td className="td font-medium">{r.name}</td><td className="td text-right tabular-nums">{r.orders}</td><td className="td text-right tabular-nums">{r.quantity}</td><td className="td text-right font-semibold tabular-nums">{formatTaka(r.revenue)}</td></tr>
      ))}</tbody>
    </Table>
  );
}

export default function Dashboard() {
  const { loading, error, orders, products, reload } = useAdminData();
  const navigate = useNavigate();
  const a = useMemo(() => computeAnalytics(orders, products), [orders, products]);
  const customers = useMemo(() => deriveCustomers(orders), [orders]);
  const lowStock = useMemo(() => products.filter((p) => p.is_active && p.stock <= (Number(p.low_stock_threshold) || 5)).sort((x, y) => x.stock - y.stock), [products]);
  const unsynced = orders.filter((o) => !o.sheet_synced && !o.is_archived).length;

  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  if (loading) {
    return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div>;
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle="How the shop is doing right now." actions={<Button to="/admin/orders" variant="dark" size="sm">View orders</Button>} />

      {!isDemo && unsynced > 0 && (
        <Link to="/admin/settings" className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 hover:bg-red-100/60">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span><strong>{unsynced} order{unsynced > 1 ? 's are' : ' is'} not in Google Sheets yet.</strong> The orders are safe in the database. Open Settings to retry the sync.</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value={formatTaka(a.revenue)} hint="Excludes cancelled orders" icon={Wallet} tone="caramel" />
        <StatCard label="Total orders" value={a.totalOrders} icon={ShoppingCart} to="/admin/orders" />
        <StatCard label="Pending orders" value={a.pendingOrders} hint="Need confirmation" icon={Clock} tone="amber" to="/admin/orders?status=Pending" />
        <StatCard label="Completed orders" value={a.deliveredOrders} hint="Delivered" icon={CheckCircle2} tone="green" to="/admin/orders?status=Delivered" />
        <StatCard label="Cancelled orders" value={a.cancelledOrders} icon={XCircle} tone="red" to="/admin/orders?status=Cancelled" />
        <StatCard label="Total products" value={a.totalProducts} icon={Package} to="/admin/products" />
        <StatCard label="Items sold" value={a.itemsSold} hint="Across valid orders" icon={Boxes} tone="blue" />
        <StatCard label="Customers" value={customers.length} icon={Users} to="/admin/customers" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Revenue, last 30 days" className="xl:col-span-2" action={<span className="text-sm text-cocoa-500">{formatTaka(a.salesMonth)} this month</span>}>
          <LineChart data={a.revenueByDay} />
        </Panel>
        <Panel title="Orders by status"><Donut counts={a.byStatus} /></Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Top selling products" className="xl:col-span-2" pad={false} action={<Link to="/admin/analytics" className="text-sm font-semibold text-caramel-700 hover:underline">Full analytics</Link>}>
          <TopProductsTable rows={a.topProducts.slice(0, 5)} />
        </Panel>
        <Panel title="Low stock" action={<Link to="/admin/products" className="text-sm font-semibold text-caramel-700 hover:underline">Restock</Link>}>
          {lowStock.length === 0 ? <p className="py-6 text-center text-sm text-cocoa-500">All products are well stocked.</p> : (
            <ul className="divide-y divide-cocoa-50">
              {lowStock.slice(0, 7).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="flex min-w-0 items-center gap-2"><AlertTriangle className={`h-4 w-4 shrink-0 ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`} aria-hidden /><span className="truncate">{p.name}</span></span><span className={`shrink-0 font-semibold ${p.stock === 0 ? 'text-red-700' : 'text-amber-700'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recent orders" className="mt-6" pad={false} action={<Link to="/admin/orders" className="text-sm font-semibold text-caramel-700 hover:underline">All orders</Link>}>
        {orders.length === 0 ? <p className="px-5 py-10 text-center text-sm text-cocoa-500">No orders yet. New orders appear here the moment customers place them.</p> : (
          <ul className="divide-y divide-cocoa-50">
            {orders.slice(0, 8).map((o) => (
              <li key={o.id}>
                <button onClick={() => navigate(`/admin/orders/${o.id}`)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left hover:bg-cream sm:grid-cols-[1.3fr_1fr_.6fr_.7fr_auto]">
                  <span className="font-semibold text-cocoa-900">#{o.order_number}</span>
                  <span className="order-3 text-sm text-cocoa-600 sm:order-none">{o.customer_name}</span>
                  <span className="order-4 text-sm text-cocoa-500 sm:order-none">{(() => { const n = o.items.reduce((s, i) => s + i.quantity, 0); return `${n} item${n === 1 ? '' : 's'}`; })()}</span>
                  <span className="text-right font-semibold tabular-nums sm:text-left">{formatTaka(o.total)}</span>
                  <span className="order-5 col-span-2 flex items-center justify-between gap-3 sm:order-none sm:col-span-1"><StatusBadge status={o.status} /><span className="text-xs text-cocoa-400 sm:hidden">{timeAgo(o.created_at)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
