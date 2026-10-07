const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ'’]/g, '');

/** Instant client-side search across name, brand and description. Every word must match. */
export function searchProducts(products, query) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return products;
  return products
    .map((p) => {
      const name = norm(p.name); const brand = norm(p.brand);
      const hay = `${name} ${brand} ${norm(p.short_description)} ${norm(p.description)}`;
      if (!words.every((w) => hay.includes(w))) return null;
      const score = words.reduce((s, w) => s + (name.startsWith(w) ? 4 : name.includes(w) ? 3 : brand.includes(w) ? 2 : 1), 0);
      return { p, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
