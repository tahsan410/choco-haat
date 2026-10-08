import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';

const FALLBACK = (className) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <rect width="32" height="32" rx="9" fill="#2A1710" />
    <g fill="#E3B04B">
      <rect x="6" y="7" width="9" height="8" rx="2" /><rect x="17" y="7" width="9" height="8" rx="2" opacity=".75" />
      <rect x="6" y="17" width="9" height="8" rx="2" opacity=".75" /><rect x="17" y="17" width="9" height="8" rx="2" opacity=".5" transform="rotate(8 21.5 21)" />
    </g>
  </svg>
);

const V = typeof __ASSET_V__ === 'undefined' ? '' : `?v=${__ASSET_V__}`;

/**
 * Shows your own logo when you add `public/logo.png` (or logo.svg) to the project;
 * otherwise falls back to the built-in icon. See README → "Changing the logo".
 */
export function LogoMark({ className = 'h-8 w-8' }) {
  const [src, setSrc] = useState(0); // 0 = logo.png, 1 = logo.svg, 2 = built-in icon
  const files = ['/logo.png', '/logo.svg'];
  if (src >= files.length) return FALLBACK(className);
  return (
    <img
      src={`${files[src]}${V}`}
      alt=""
      aria-hidden
      className={`${className} object-contain`}
      onError={() => setSrc((n) => n + 1)}
    />
  );
}

export default function Logo({ light = false }) {
  const { settings } = useCatalog();
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-600" aria-label={`${settings.store_name} – home`}>
      <LogoMark />
      <span className={`font-display text-[22px] font-semibold tracking-tight ${light ? 'text-cream' : 'text-cocoa-900'}`}>{settings.store_name}</span>
    </Link>
  );
}