import { createClient } from '@supabase/supabase-js';

// Tolerate a trailing "/" or "/rest/v1" pasted into the env var.
const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
let url = rawUrl;
try { if (rawUrl) url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).origin; } catch { /* keep raw */ }
const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabaseConfigured = Boolean(url && anon);

// Only the public anon key is ever used in the browser. Row Level Security protects the data.
export const supabase = supabaseConfigured
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
