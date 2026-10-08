import { useEffect, useRef, useState } from 'react';

const INTERVAL = 2500;
const FADE_MS = 800;

/**
 * Plain auto-playing picture slideshow for the hero: just the pictures, cross-fading with a slow gentle zoom.
 * Pictures come from the products marked "Featured on homepage" in Admin → Products.
 */
export default function HeroSlideshow({ products, className = '' }) {
  const n = products.length;
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(-1);
  const timer = useRef(null);

  useEffect(() => {
    if (n < 2) return undefined;
    const t = setInterval(() => {
      if (document.hidden) return;
      setI((cur) => { setPrev(cur); return (cur + 1) % n; });
    }, INTERVAL);
    return () => clearInterval(t);
  }, [n]);

  // the outgoing picture stays underneath until the new one has fully faded in
  useEffect(() => {
    if (prev < 0) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPrev(-1), FADE_MS + 100);
    return () => clearTimeout(timer.current);
  }, [prev]);

  if (!n) return null;
  return (
    <div className={`relative aspect-[5/4] w-full ${className}`} role="img" aria-label="Featured chocolates">
      {products.map((p, k) => {
        const active = k === i;
        const visible = active || k === prev;
        return (
          <img
            key={p.id}
            src={p.image_url} alt={active ? p.name : ''} aria-hidden={!active}
            width="640" height="512"
            loading={k === 0 ? 'eager' : 'lazy'} fetchpriority={k === 0 ? 'high' : undefined} decoding="async"
            style={{ transitionDuration: `${FADE_MS}ms, ${INTERVAL + FADE_MS}ms` }}
            className={`absolute inset-0 h-full w-full rounded-[1.75rem] object-cover shadow-lift transition-[opacity,transform] ease-out ${active ? 'z-10 scale-[1.04] opacity-100' : visible ? 'z-0 scale-100 opacity-100' : 'z-0 scale-100 opacity-0'}`}
          />
        );
      })}
    </div>
  );
}
