import { STATUS_STYLES } from '../ui/Badge.jsx';
import { ORDER_STATUSES } from '../../../shared/constants.js';

// Order-status donut. Colours are the same reserved status colours as the badges, and every
// segment is also named + counted in the legend, so meaning never relies on colour alone.
export default function Donut({ counts }) {
  const total = ORDER_STATUSES.reduce((s, k) => s + (counts[k] || 0), 0);
  const R = 52; const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label={`Orders by status, ${total} total`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#2A1710" strokeOpacity=".07" strokeWidth="16" />
        {total > 0 && ORDER_STATUSES.map((k) => {
          const n = counts[k] || 0;
          if (!n) return null;
          const len = (n / total) * C;
          const el = <circle key={k} cx="70" cy="70" r={R} fill="none" stroke={STATUS_STYLES[k].color} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-offset}><title>{`${k}: ${n}`}</title></circle>;
          offset += len;
          return el;
        })}
        <g className="rotate-90" style={{ transformOrigin: '70px 70px' }}>
          <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="700" fill="#2A1710" fontFamily="Fraunces, Georgia, serif">{total}</text>
          <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#6A4B38">orders</text>
        </g>
      </svg>
      <ul className="min-w-[10rem] flex-1 space-y-1.5 text-sm">
        {ORDER_STATUSES.map((k) => (
          <li key={k} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-cocoa-700"><span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[k].dot}`} aria-hidden />{k}</span><span className="font-semibold tabular-nums">{counts[k] || 0}</span></li>
        ))}
      </ul>
    </div>
  );
}
