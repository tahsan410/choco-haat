// Picks the backend at start-up:
//   • Supabase (+ Netlify Functions) when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set  → production
//   • localStorage demo backend otherwise, but ONLY in dev or when VITE_ENABLE_DEMO_MODE=true
import { supabaseConfigured } from '../lib/supabase.js';
import { supabaseApi } from './supabaseApi.js';
import { demoApi } from './demoApi.js';

const demoAllowed = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

const unconfigured = new Proxy({ mode: 'unconfigured' }, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return async () => {
      throw new Error('The store backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README).');
    };
  },
});

export const api = supabaseConfigured ? supabaseApi : demoAllowed ? demoApi : unconfigured;
export const isDemo = api.mode === 'demo';
export const isConfigured = api.mode !== 'unconfigured';
