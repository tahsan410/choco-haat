// Horizontal bars for rankings (e.g. top products). Bars start at zero, thin, rounded at the data end.
export default function BarList({ rows, format = (n) => n, unit = '' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-cocoa-500">No data yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${format(r.value)}${unit}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="truncate font-medium text-cocoa-800">{r.label}</span><span className="shrink-0 tabular-nums text-cocoa-600">{format(r.value)}{unit}</span></div>
          <div className="h-2 rounded-full bg-cocoa-100" role="presentation"><div className="h-2 rounded-full bg-caramel-600 transition-[width] duration-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
