import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { supabase } from '../lib/supabase.js';

const CustomerContext = createContext(null);
export const useCustomer = () => useContext(CustomerContext);

/** Optional customer accounts (email + password). Guests can always check out without one. */
export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try { setProfile(await api.customerGetProfile()); } catch { setProfile(null); }
  }, []);

  useEffect(() => {
    let alive = true;
    api.customerSession()
      .then((c) => { if (alive) { setCustomer(c); if (c) loadProfile(); } })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    // Keeps the header in sync after e-mail confirmation / password-reset links and sign-out in other tabs.
    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setCustomer(u ? { id: u.id, email: u.email, name: u.user_metadata?.full_name || '' } : null);
      if (!u) setProfile(null);
    });
    return () => { alive = false; sub?.data?.subscription?.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const c = await api.customerSignIn(email, password);
    setCustomer(c); loadProfile();
    return c;
  }, [loadProfile]);

  const signUp = useCallback(async (details) => {
    const res = await api.customerSignUp(details);
    if (res.user) { setCustomer(res.user); loadProfile(); }
    return res;
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await api.customerSignOut();
    setCustomer(null); setProfile(null);
  }, []);

  const saveProfile = useCallback(async (p) => {
    await api.customerSaveProfile(p);
    await loadProfile();
  }, [loadProfile]);

  const value = useMemo(
    () => ({ customer, profile, loading, signIn, signUp, signOut, saveProfile }),
    [customer, profile, loading, signIn, signUp, signOut, saveProfile],
  );
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}