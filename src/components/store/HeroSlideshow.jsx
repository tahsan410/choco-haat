import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTaka } from '../../lib/format.js';

const INTERVAL = 4500;

/**
 * Auto-playing product slideshow for the hero. One slide per product photo.
 * Slides come from the products marked "Featured on homepage" in Admin → Products.
 * Pauses on hover / focus / hidden tab, swipeable on phones, respects "reduce motion".
 */
export default function HeroSlideshow({ products, className = '' }) {
  const n = products.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touch = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const go = useCallback((d) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => { if (i >= n) setI(0); }, [n, i]);

  useEffect(() => {
    if (n < 2 || paused || reduced) return undefined;
    const t = setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % n); }, INTERVAL);
    return () => clearInterval(t);
  }, [n, paused, reduced, i]); // `i` restarts the timer after a manual change

  const onKey = (e) => { if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e) => {
    const start = touch.current; touch.current = null; setPaused(false);
    if (start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  if (!n) return null;
  return (
    <div
      className={`group relative aspect-square w-full overflow-hidden rounded-[1.75rem] bg-cocoa-900 shadow-lift ring-1 ring-white/15 ${className}`}
      role="region" aria-roledescription="carousel" aria-label="Featured chocolates"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={onKey} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {products.map((p, k) => {
        const active = k === i;
        return (
          <Link
            key={p.id}
            to={`/product/${p.slug}`}
            aria-hidden={!active} tabIndex={active ? 0 : -1}
            aria-label={`${p.name}, ${formatTaka(p.price)}`}
            className={`absolute inset-0 block transition-opacity duration-700 ease-out ${active ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            {/* soft blurred copy fills the frame whatever the photo's shape */}
            <img src={p.image_url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" loading={k === 0 ? 'eager' : 'lazy'} decoding="async" />
            <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />
            <img
              src={p.image_url} alt={`${p.name}${p.brand ? ` – ${p.brand}` : ''}`}
              width="600" height="600"
              loading={k === 0 ? 'eager' : 'lazy'} fetchpriority={k === 0 ? 'high' : undefined} decoding="async"
              className={`absolute inset-0 h-full w-full object-contain p-6 pb-24 drop-shadow-[0_18px_28px_rgba(0,0,0,.35)] transition-transform duration-[5500ms] ease-out sm:p-8 sm:pb-24 ${active && !reduced ? 'scale-105' : 'scale-100'}`}
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cocoa-900/90 via-cocoa-900/55 to-transparent px-5 pb-12 pt-16 text-cream sm:px-6">
              {p.brand && <span className="block text-[11px] font-semibold uppercase tracking-[.18em] text-caramel-300">{p.brand}</span>}
              <span className="mt-0.5 flex items-end justify-between gap-3">
                <span className="line-clamp-2 font-display text-xl font-semibold leading-tight sm:text-2xl">{p.name}</span>
                <span className="shrink-0 rounded-full bg-caramel-300 px-3 py-1 text-sm font-bold text-cocoa-900">{formatTaka(p.price)}</span>
              </span>
            </span>
          </Link>
        );
      })}

      {n > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous slide" className="absolute left-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-cocoa-900 opacity-0 shadow transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 sm:grid"><ChevronLeft className="h-5 w-5" aria-hidden /></button>
          <button type="button" onClick={() => go(1)} aria-label="Next slide" className="absolute right-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-cocoa-900 opacity-0 shadow transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 sm:grid"><ChevronRight className="h-5 w-5" aria-hidden /></button>
          <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-1.5" role="tablist" aria-label="Choose slide">
            {products.map((p, k) => (
              <button key={p.id} type="button" role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}: ${p.name}`} onClick={() => setI(k)} className="grid h-6 place-items-center px-0.5">
                <span className={`block h-1.5 rounded-full transition-all duration-300 ${k === i ? 'w-6 bg-caramel-300' : 'w-1.5 bg-white/55 hover:bg-white/85'}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

