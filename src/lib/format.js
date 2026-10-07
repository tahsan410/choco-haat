const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ৳1,150 – Indian/Bangladeshi digit grouping (lakh/crore). */
export const formatTaka = (n) => `৳${nf.format(Math.round(Number(n) || 0))}`;

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const formatDateTime = (iso) => (iso ? `${dateFmt.format(new Date(iso))}, ${timeFmt.format(new Date(iso))}` : '—');
/** YYYY-MM-DD in Dhaka time (used for grouping sales by day). */
export const dayKey = (iso) => dayKeyFmt.format(new Date(iso));

export function timeAgo(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function discountInfo(product) {
  const price = Number(product.price);
  const cmp = Number(product.comparison_price);
  if (!product.show_comparison || !cmp || cmp <= price) return null;
  return { compare: cmp, save: cmp - price, percent: Math.round(((cmp - price) / cmp) * 100) };
}

export function stockInfo(product, fallbackThreshold = 5) {
  const stock = Number(product.stock) || 0;
  const threshold = Number(product.low_stock_threshold) || fallbackThreshold;
  if (stock <= 0) return { key: 'out', label: 'Out of stock', tone: 'red' };
  if (stock <= threshold) return { key: 'low', label: `Only ${stock} left`, tone: 'amber' };
  return { key: 'in', label: 'In stock', tone: 'green' };
}
