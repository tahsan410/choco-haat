import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anon);

// Only the public anon key is ever used in the browser. Row Level Security protects the data.
export const supabase = supabaseConfigured
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
