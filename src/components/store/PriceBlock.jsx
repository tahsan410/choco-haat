import { formatTaka, discountInfo, stockInfo } from '../../lib/format.js';
import { Badge } from '../ui/Badge.jsx';

export function PriceBlock({ product, size = 'card' }) {
  const d = discountInfo(product);
  const big = size === 'detail';
  return (
    <div>
      {d && (
        <p className={`${big ? 'text-sm' : 'text-xs'} text-cocoa-500`}>
          Market price <s className="decoration-cocoa-400">{formatTaka(d.compare)}</s>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="sr-only">Our price</span>
        <span className={`font-display font-bold text-cocoa-900 ${big ? 'text-4xl' : 'text-xl'}`}>{formatTaka(product.price)}</span>
        {d && <Badge tone="green" className={big ? 'text-sm' : ''}>Save {formatTaka(d.save)}</Badge>}
      </div>
    </div>
  );
}

export function StockBadge({ product, fallbackThreshold }) {
  const s = stockInfo(product, fallbackThreshold);
  return <Badge tone={s.tone}><span className={`h-1.5 w-1.5 rounded-full ${s.tone === 'green' ? 'bg-emerald-500' : s.tone === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} aria-hidden />{s.label}</Badge>;
}
