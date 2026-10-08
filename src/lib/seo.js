import { useEffect } from 'react';

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

/**
 * Per-page SEO: title, description, canonical, Open Graph / Twitter tags and optional JSON-LD.
 * (Single-page apps update these on the client; the defaults live in index.html for crawlers.)
 */
export function usePageMeta({ title, description, image, path, jsonLd, noindex = false }) {
  useEffect(() => {
    const fullTitle = title || 'Buy Chocolate Online in Bangladesh';
    document.title = fullTitle;
    const url = SITE_URL ? `${SITE_URL}${path ?? window.location.pathname}` : window.location.href;
    const img = image && /^https?:/.test(image) ? image : SITE_URL ? `${SITE_URL}/og-image.png${typeof __ASSET_V__ === 'undefined' ? '' : `?v=${__ASSET_V__}`}` : undefined;

    setMeta('name', 'description', description);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', img);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = url;

    let script = document.getElementById('page-jsonld');
    if (jsonLd) {
      if (!script) { script = document.createElement('script'); script.id = 'page-jsonld'; script.type = 'application/ld+json'; document.head.appendChild(script); }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) script.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, image, path, noindex, JSON.stringify(jsonLd)]);
}

export const siteUrl = SITE_URL;