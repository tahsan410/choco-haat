import { Link } from 'react-router-dom';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-2xl font-semibold tracking-tight text-cocoa-900 sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-cocoa-600">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = '', pad = true }) {
  return (
    <section className={`rounded-2xl border border-cocoa-100 bg-white shadow-soft ${className}`}>
      {(title || action) && <div className="flex items-center justify-between gap-3 border-b border-cocoa-100 px-5 py-4"><h2 className="font-display text-lg font-semibold">{title}</h2>{action}</div>}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, to, tone = 'brown' }) {
  const tones = { brown: 'bg-cocoa-50 text-cocoa-700', caramel: 'bg-caramel-100 text-caramel-700', green: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-blue-100 text-blue-700' };
  const body = (
    <div className="flex h-full items-start gap-4 rounded-2xl border border-cocoa-100 bg-white p-5 shadow-soft transition hover:border-cocoa-200">
      {Icon && <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" aria-hidden /></span>}
      <div className="min-w-0"><p className="text-sm text-cocoa-600">{label}</p><p className="mt-0.5 truncate font-display text-2xl font-bold tabular-nums text-cocoa-900">{value}</p>{hint && <p className="mt-0.5 text-xs text-cocoa-500">{hint}</p>}</div>
    </div>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

export const Table = ({ children }) => <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse">{children}</table></div>;
