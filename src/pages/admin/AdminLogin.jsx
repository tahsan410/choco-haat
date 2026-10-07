import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LogoMark } from '../../components/store/Logo.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { api, isDemo } from '../../services/api.js';
import { usePageMeta } from '../../lib/seo.js';

export default function AdminLogin() {
  const { admin, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  usePageMeta({ title: 'Admin login', description: 'Store administration', noindex: true });

  useEffect(() => { if (isDemo) api.adminNeedsSetup().then(setSetup); }, []);

  if (!loading && admin) return <Navigate to={location.state?.from || '/admin'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await signIn(email, password, { create: setup }); navigate(location.state?.from || '/admin', { replace: true }); }
    catch (err) { setError(err.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-cocoa-800 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-lift sm:p-9">
        <div className="flex items-center gap-3"><LogoMark className="h-11 w-11" /><div><h1 className="font-display text-2xl font-semibold">{setup ? 'Create demo admin' : 'Admin login'}</h1><p className="text-sm text-cocoa-500">Store dashboard</p></div></div>
        {isDemo && <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">{setup ? 'Demo mode: choose an email and password for the local demo admin. They are stored (hashed) in this browser only.' : 'Demo mode: sign in with the demo admin you created in this browser.'} Production uses Supabase Auth.</p>}
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" required autoComplete={setup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} hint={setup ? 'At least 6 characters.' : undefined} />
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email || !password}><Lock className="h-4 w-4" />{setup ? 'Create & sign in' : 'Sign in'}</Button>
        </form>
        <p className="mt-6 text-center text-sm"><a href="/" className="text-cocoa-500 hover:text-cocoa-800">← Back to store</a></p>
      </div>
    </div>
  );
}
