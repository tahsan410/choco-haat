const TONES = {
  gray: 'bg-cocoa-50 text-cocoa-700 ring-cocoa-100',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-800 ring-red-200',
  blue: 'bg-blue-50 text-blue-800 ring-blue-200',
  caramel: 'bg-caramel-50 text-caramel-800 ring-caramel-200',
};

export function Badge({ tone = 'gray', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}>{children}</span>;
}

// Pending yellow · Confirmed blue · Processing purple · Shipped orange · Delivered green · Cancelled red
export const STATUS_STYLES = {
  Pending: { badge: 'bg-yellow-100 text-yellow-900 ring-yellow-300', dot: 'bg-yellow-500', color: '#EAB308' },
  Confirmed: { badge: 'bg-blue-100 text-blue-900 ring-blue-300', dot: 'bg-blue-500', color: '#3B82F6' },
  Processing: { badge: 'bg-purple-100 text-purple-900 ring-purple-300', dot: 'bg-purple-500', color: '#8B5CF6' },
  Shipped: { badge: 'bg-orange-100 text-orange-900 ring-orange-300', dot: 'bg-orange-500', color: '#F97316' },
  Delivered: { badge: 'bg-green-100 text-green-900 ring-green-300', dot: 'bg-green-600', color: '#16A34A' },
  Cancelled: { badge: 'bg-red-100 text-red-900 ring-red-300', dot: 'bg-red-500', color: '#EF4444' },
};

export function StatusBadge({ status, className = '' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.badge} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />{status}
    </span>
  );
}
