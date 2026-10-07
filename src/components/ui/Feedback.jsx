import { Loader2, PackageOpen, AlertTriangle } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-caramel-600 ${className}`} aria-label="Loading" />;
}

export function Skeleton({ className = '' }) {
  return <div className={`relative overflow-hidden rounded-xl bg-cocoa-100/70 ${className}`} aria-hidden>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>;
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-cocoa-100 bg-white">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-2 p-3 sm:p-4"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-3 h-10 w-full rounded-full" /></div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">{Array.from({ length: cols }).map((__, c) => <Skeleton key={c} className="h-8 flex-1" />)}</div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = PackageOpen, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-cocoa-50 text-cocoa-400"><Icon className="h-7 w-7" aria-hidden /></div>
      <h3 className="font-display text-xl font-semibold text-cocoa-800">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-cocoa-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <AlertTriangle className="mb-2 h-8 w-8 text-red-600" aria-hidden />
      <p className="font-medium text-red-900">{message || 'Something went wrong.'}</p>
      {onRetry && <button onClick={onRetry} className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">Try again</button>}
    </div>
  );
}
