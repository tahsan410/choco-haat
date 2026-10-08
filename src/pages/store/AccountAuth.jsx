import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { api } from '../../services/api.js';
import { usePageMeta } from '../../lib/seo.js';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Sign in / create account / forgot password – one page, three modes. */
export default function AccountAuth({ mode: initialMode = 'login' }) {
  const { customer, loading, signIn, signUp } = useCustomer();
  const { settings } = useCatalog();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // login | register | forgot
  const [form, setForm] = useState({ name: state?.name || '', email: state?.email || '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState(null); // { title, text }
  usePageMeta({ title: `${mode === 'register' ? 'Create account' : 'Sign in'} | ${settings.store_name}`, description: 'Your Choco Haat account.', noindex: true });

  const after = state?.from || '/account';
  if (!loading && customer && !notice) return <Navigate to={after} replace state={state?.claim ? { claim: state.claim } : undefined} />;

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })); setFormError(''); };
  const switchMode = (m) => { setMode(m); setErrors({}); setFormError(''); };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!EMAIL_OK.test(form.email.trim())) er.email = 'Enter a valid email address.';
    if (mode === 'register' && form.name.trim().length < 2) er.name = 'Please enter your name.';
    if (mode !== 'forgot' && form.password.length < 6) er.password = mode === 'register' ? 'Use at least 6 characters.' : 'Enter your password.';
    if (Object.keys(er).length) { setErrors(er); return; }

    setBusy(true); setFormError('');
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password);
        navigate(after, { replace: true, state: state?.claim ? { claim: state.claim } : undefined });
      } else if (mode === 'register') {
        const res = await signUp({ email: form.email, password: form.password, name: form.name });
        if (res.needsConfirmation) {
          setNotice({ title: 'Check your email', text: `We sent a confirmation link to ${form.email.trim()}. Open it, then sign in here.` });
        } else {
          navigate(after, { replace: true, state: state?.claim ? { claim: state.claim } : undefined });
        }
      } else {
        await api.customerResetPassword(form.email);
        setNotice({ title: 'Check your email', text: `If an account exists for ${form.email.trim()}, we sent a link to choose a new password.` });
      }
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (notice) {
    return (
      <div className="container-x py-12">
        <div className="card mx-auto max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-caramel-50 text-caramel-700"><MailCheck className="h-7 w-7" aria-hidden /></span>
          <h1 className="mt-4 font-display text-2xl font-semibold">{notice.title}</h1>
          <p className="mt-2 text-cocoa-600">{notice.text}</p>
          <Button className="mt-6" variant="dark" onClick={() => { setNotice(null); switchMode('login'); }}>Back to sign in</Button>
        </div>
      </div>
    );
  }

  const title = mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back';
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-cocoa-600">
          {mode === 'register' && 'See all your orders in one place and check out faster. You can still order without an account.'}
          {mode === 'login' && 'Sign in to see your orders and saved delivery details.'}
          {mode === 'forgot' && 'Enter your email and we will send you a link to choose a new password.'}
        </p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {mode === 'register' && <Input label="Full name" required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />}
          <Input label="Email" required type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
          {mode !== 'forgot' && (
            <Input label="Password" required type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} error={errors.password} hint={mode === 'register' ? 'At least 6 characters.' : undefined} />
          )}
          {formError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{formError}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>{mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</Button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm text-cocoa-600">
          {mode === 'login' && (
            <>
              <p><button type="button" onClick={() => switchMode('forgot')} className="font-semibold text-caramel-700 hover:underline">Forgot your password?</button></p>
              <p>New here? <button type="button" onClick={() => switchMode('register')} className="font-semibold text-caramel-700 hover:underline">Create an account</button></p>
            </>
          )}
          {mode === 'register' && <p>Already have an account? <button type="button" onClick={() => switchMode('login')} className="font-semibold text-caramel-700 hover:underline">Sign in</button></p>}
          {mode === 'forgot' && <p><button type="button" onClick={() => switchMode('login')} className="font-semibold text-caramel-700 hover:underline">Back to sign in</button></p>}
          <p className="pt-1"><Link to="/shop" className="hover:underline">Continue shopping as a guest</Link></p>
        </div>
      </div>
    </div>
  );
}