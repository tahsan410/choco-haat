import { useState } from 'react';
import { formatTaka } from '../../lib/format.js';

// Single-series area/line chart. One axis, thin line, recessive grid, hover crosshair + tooltip.
const W = 640; const H = 240; const P = { l: 52, r: 12, t: 12, b: 28 };

const niceMax = (v) => {
  if (v <= 0) return 1000;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};
const short = (n) => (n >= 100000 ? `${+(n / 100000).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(Math.round(n)));
const label = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function LineChart({ data, title = 'Revenue by day' }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const x = (i) => P.l + (i * (W - P.l - P.r)) / Math.max(1, data.length - 1);
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const total = data.reduce((s, d) => s + d.value, 0);
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1)))));
  };
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}: total ${formatTaka(total)} over ${data.length} days`} onMouseMove={move} onMouseLeave={() => setHover(null)} onTouchMove={(e) => move(e.touches[0] && { currentTarget: e.currentTarget, clientX: e.touches[0].clientX })}>
        <defs><linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A65F0B" stopOpacity=".22" /><stop offset="1" stopColor="#A65F0B" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#2A1710" strokeOpacity={t === 0 ? 0.25 : 0.08} />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6A4B38">{short(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
          <text key={d.date} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#6A4B38">{label(d.date)}</text>
        ))}
        <path d={area} fill="url(#lc-fill)" />
        <path d={line} fill="none" stroke="#A65F0B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#2A1710" strokeOpacity=".25" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.value)} r="5" fill="#A65F0B" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-lg border border-cocoa-100 bg-white px-3 py-1.5 text-xs shadow-lift" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <p className="text-cocoa-500">{label(h.date)}</p><p className="font-semibold text-cocoa-900">{formatTaka(h.value)}</p>
        </div>
      )}
    </div>
  );
}
