import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, onChange, min = 1, max = 50, size = 'md', label = 'Quantity' }) {
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const btn = `grid ${h} ${size === 'sm' ? 'w-9' : 'w-11'} place-items-center text-cocoa-700 transition hover:bg-cocoa-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-caramel-600 disabled:opacity-30 disabled:hover:bg-transparent`;
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-full border border-cocoa-200 bg-white`} role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); onChange(Number.isNaN(n) ? min : Math.min(max, Math.max(min, n))); }}
        className={`${h} ${size === 'sm' ? 'w-9' : 'w-12'} border-x border-cocoa-100 bg-transparent text-center text-sm font-semibold text-cocoa-900 focus:outline-none`}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
