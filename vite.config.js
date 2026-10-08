import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Cache-busting + absolute URLs for the favicon / social-share image.
//  • Browsers cache favicons very aggressively, and WhatsApp / Facebook cache share images per URL.
//    Adding ?v=<build time> makes every deploy look like a brand-new file to them.
//  • og:image must be an absolute https URL for link previews, so it is built from VITE_SITE_URL.
const ASSET_V = String(Date.now());
const siteUrlPlugin = (siteUrl) => ({
  name: 'site-url-and-asset-version',
  // order: 'pre' → replace the placeholders BEFORE Vite parses index.html. Otherwise Vite tries to
  // decodeURI("/favicon.svg?v=%ASSET_V%") and fails with "URI malformed".
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replaceAll('%SITE_URL%', siteUrl).replaceAll('%ASSET_V%', ASSET_V),
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (env.VITE_SITE_URL || process.env.URL || '').replace(/\/$/, ''); // Netlify also provides URL
  return {
  define: { __ASSET_V__: JSON.stringify(ASSET_V), __SITE_URL__: JSON.stringify(siteUrl) },
  plugins: [react(), siteUrlPlugin(siteUrl)],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    // `netlify dev` proxies functions; plain `vite` runs in demo mode if Supabase is not configured.
    port: 5173,
  },
};
});