import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { PageHeader, Panel } from '../../components/admin/ui.jsx';
import { EmptyState, TableSkeleton } from '../../components/ui/Feedback.jsx';
import { deriveCustomers } from '../../lib/analytics.js';
import { formatDate, formatTaka } from '../../lib/format.js';

export default function Customers() {
  const { loading, orders } = useAdminData();
  const [q, setQ] = useState('');
  const all = useMemo(() => deriveCustomers(orders), [orders]);
  const list = useMemo(() => { const n = q.trim().toLowerCase(); return n ? all.filter((c) => c.name.toLowerCase().includes(n) || c.phone.includes(n)) : all; }, [all, q]);
  return (
    <>
      <PageHeader title="Customers" subtitle="Built automatically from orders (grouped by phone number)." />
      <Panel pad={false}>
        <div className="border-b border-cocoa-100 p-4"><div className="relative max-w-sm"><label htmlFor="cq" className="sr-only">Search customers</label><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" aria-hidden /><input id="cq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or phone" className="h-10 w-full rounded-xl border border-cocoa-200 bg-white pl-9 pr-3 text-sm focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200" /></div></div>
        {loading ? <TableSkeleton cols={5} /> : list.length === 0 ? <EmptyState icon={Users} title="No customers yet">Customers appear after their first order.</EmptyState> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr className="border-b border-cocoa-100 bg-cream/60"><th className="th">Customer</th><th className="th">District</th><th className="th text-right">Orders</th><th className="th text-right">Total spent</th><th className="th">Last order</th></tr></thead>
            <tbody>{list.map((c) => <tr key={c.phone} className="border-b border-cocoa-50 last:border-0"><td className="td"><p className="font-medium">{c.name}</p><p className="text-xs text-cocoa-500">{c.phone}{c.email ? ` · ${c.email}` : ''}</p></td><td className="td">{c.district}</td><td className="td text-right tabular-nums">{c.orders}</td><td className="td text-right font-semibold tabular-nums">{formatTaka(c.spent)}</td><td className="td text-cocoa-600">{formatDate(c.lastOrder)}</td></tr>)}</tbody>
          </table></div>
        )}
      </Panel>
    </>
  );
}
