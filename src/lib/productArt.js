// Generic, original placeholder artwork for products that have no photo yet.
// (A neutral chocolate-wrapper illustration tinted per brand – not any brand's real packaging.)
const PALETTES = [
  ['#7A2E1D', '#D9A441'], ['#1F3A5F', '#E3B04B'], ['#5B2A6B', '#F0C987'], ['#8C1D2F', '#F4D9A6'],
  ['#2F5D3A', '#E8C170'], ['#3A2418', '#C98A3B'], ['#A64B12', '#F7E0B5'], ['#243B53', '#F0B94D'],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function wrapLines(text, max = 14) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

const cache = new Map();

export function productArt(product) {
  const key = `${product.brand}|${product.name}`;
  if (cache.has(key)) return cache.get(key);
  const [base, accent] = PALETTES[hash(product.brand || product.name) % PALETTES.length];
  const lines = wrapLines(product.name);
  const startY = 330 - (lines.length - 1) * 22;
  const text = lines.map((l, i) => `<text x="200" y="${startY + i * 44}" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="700" fill="#FFF8EA">${esc(l)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${esc(product.name)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="#1C0F0A"/></linearGradient>
<linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect width="400" height="400" fill="#F4EBDC"/>
<ellipse cx="200" cy="372" rx="130" ry="12" fill="#2A1710" opacity=".14"/>
<g transform="rotate(-6 200 200)">
<rect x="78" y="46" width="244" height="316" rx="22" fill="url(#g)"/>
<rect x="78" y="46" width="244" height="316" rx="22" fill="url(#s)"/>
<rect x="78" y="92" width="244" height="14" fill="${accent}"/><rect x="78" y="302" width="244" height="14" fill="${accent}"/>
<path d="M78 70 q0 -24 22 -24 h200 q22 0 22 24" fill="${accent}" opacity=".9"/>
<g fill="#FFF8EA" opacity=".10"><rect x="104" y="132" width="44" height="44" rx="6"/><rect x="154" y="132" width="44" height="44" rx="6"/><rect x="204" y="132" width="44" height="44" rx="6"/><rect x="254" y="132" width="44" height="44" rx="6"/></g>
<text x="200" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" letter-spacing="3" fill="${accent}">${esc((product.brand || '').slice(0, 18))}</text>
${text}
</g></svg>`;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

export const productImage = (product) => product.image_url || productArt(product);
export const productGallery = (product) => {
  const imgs = [product.image_url, ...(product.images || [])].filter(Boolean);
  return imgs.length ? [...new Set(imgs)] : [productArt(product)];
};
