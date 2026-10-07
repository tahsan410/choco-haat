import { useMemo } from 'react';
import { Wallet, ShoppingCart, TrendingUp, Boxes, Trophy, Tag, XCircle, CalendarDays } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader, Panel, StatCard } from '../../components/admin/ui.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import Donut from '../../components/charts/Donut.jsx';
import BarList from '../../components/charts/BarList.jsx';
import Button from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Feedback.jsx';
import { TopProductsTable } from './Dashboard.jsx';
import { computeAnalytics } from '../../lib/analytics.js';
import { formatTaka } from '../../lib/format.js';
import { isDemo } from '../../services/api.js';

export default function Analytics() {
  const { loading, orders, products, categories, seedSamples } = useAdminData();
  const toast = useToast();
  const a = useMemo(() => computeAnalytics(orders, products), [orders, products]);
  const bestCat = categories.find((c) => c.id === a.bestCategoryId);
  const profit = a.topProducts.reduce((s, r) => s + r.profit, 0);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  return (
    <>
      <PageHeader title="Sales analytics" subtitle="Calculated live from your orders. Cancelled orders are never counted as revenue."
        actions={isDemo && <Button size="sm" variant="secondary" onClick={async () => { try { const n = await seedSamples(25); toast.success(`${n} sample orders added`); } catch (e) { toast.error(e.message); } }}>Add 25 sample orders</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales today" value={formatTaka(a.salesToday)} icon={CalendarDays} tone="caramel" />
        <StatCard label="Sales this week" value={formatTaka(a.salesWeek)} hint="Last 7 days" icon={CalendarDays} tone="caramel" />
        <StatCard label="Sales this month" value={formatTaka(a.salesMonth)} hint="Last 30 days" icon={CalendarDays} tone="caramel" />
        <StatCard label="Total sales" value={formatTaka(a.revenue)} icon={Wallet} tone="green" />
        <StatCard label="Total orders" value={a.totalOrders} icon={ShoppingCart} />
        <StatCard label="Average order value" value={formatTaka(a.averageOrderValue)} icon={TrendingUp} tone="blue" />
        <StatCard label="Products sold" value={a.itemsSold} icon={Boxes} tone="blue" />
        <StatCard label="Estimated profit" value={formatTaka(profit)} hint="Price − cost price" icon={Wallet} tone="green" />
        <StatCard label="Best-selling product" value={a.bestSellingProduct?.name || '—'} hint={a.bestSellingProduct ? `${a.bestSellingProduct.quantity} sold` : 'No sales yet'} icon={Trophy} tone="amber" />
        <StatCard label="Best-selling category" value={bestCat?.name || '—'} icon={Tag} tone="amber" />
        <StatCard label="Cancelled orders" value={a.cancelledOrders} icon={XCircle} tone="red" />
        <StatCard label="In delivery pipeline" value={a.inFlightOrders} hint="Confirmed · Processing · Shipped" icon={ShoppingCart} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Revenue by date (30 days)" className="xl:col-span-2"><LineChart data={a.revenueByDay} /></Panel>
        <Panel title="Delivery status"><Donut counts={a.byStatus} /></Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Top selling products" className="xl:col-span-2" pad={false}><TopProductsTable rows={a.topProducts.slice(0, 15)} /></Panel>
        <Panel title="Units sold"><BarList rows={a.topProducts.slice(0, 8).map((r) => ({ key: r.key, label: r.name, value: r.quantity }))} unit=" sold" /></Panel>
      </div>
    </>
  );
}
