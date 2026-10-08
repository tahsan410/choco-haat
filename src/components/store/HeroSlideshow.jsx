import { useEffect, useState } from 'react';

const INTERVAL = 2000;

/**
 * Plain auto-playing picture slideshow for the hero (no text, prices, arrows or hover effects).
 * Pictures come from the products marked "Featured on homepage" in Admin → Products.
 */
export default function HeroSlideshow({ products, className = '' }) {
  const n = products.length;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (n < 2) return undefined;
    const t = setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % n); }, INTERVAL);
    return () => clearInterval(t);
  }, [n]);

  if (!n) return null;
  return (
    <div className={`relative aspect-square w-full overflow-hidden rounded-[1.75rem] bg-cocoa-900 shadow-lift ring-1 ring-white/15 ${className}`} role="img" aria-label="Featured chocolates">
      {products.map((p, k) => (
        <div key={p.id} aria-hidden={k !== i} className={`absolute inset-0 transition-opacity duration-700 ease-out ${k === i ? 'opacity-100' : 'opacity-0'}`}>
          {/* soft blurred copy fills the frame whatever the photo's shape */}
          <img src={p.image_url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" loading={k === 0 ? 'eager' : 'lazy'} decoding="async" />
          <img
            src={p.image_url} alt={k === i ? p.name : ''}
            width="600" height="600"
            loading={k === 0 ? 'eager' : 'lazy'} fetchpriority={k === 0 ? 'high' : undefined} decoding="async"
            className="absolute inset-0 h-full w-full object-contain p-5 drop-shadow-[0_18px_28px_rgba(0,0,0,.3)] sm:p-7"
          />
        </div>
      ))}
    </div>
  );
}
