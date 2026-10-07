import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.adminSession().then((s) => alive && setAdmin(s)).catch(() => {}).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const signIn = useCallback(async (email, password, opts) => { const s = await api.adminSignIn(email, password, opts); setAdmin(s); return s; }, []);
  const signOut = useCallback(async () => { await api.adminSignOut(); setAdmin(null); }, []);

  const value = useMemo(() => ({ admin, loading, signIn, signOut }), [admin, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
