import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Spinner } from '../../components/ui/Feedback.jsx';
import { api } from '../../services/api.js';
import { usePageMeta } from '../../lib/seo.js';

/** Landing page of the "reset password" e-mail link. The link signs the person in temporarily. */
export default function AccountReset() {
  const { customer, loading } = useCustomer();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  usePageMeta({ title: 'Choose a new password', description: 'Reset your password.', noindex: true });

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Use at least 6 characters.'); return; }
    setBusy(true); setError('');
    try {
      await api.customerUpdatePassword(password);
      toast.success('Password updated');
      navigate('/account', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (loading) return <div className="grid min-h-[40vh] place-items-center"><Spinner className="h-8 w-8" /></div>;
  if (!customer) {
    return (
      <div className="container-x py-12"><div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">This link has expired</h1>
        <p className="mt-2 text-cocoa-600">Request a new password reset link and try again.</p>
        <Button to="/account/login" className="mt-6" variant="dark">Back to sign in</Button>
      </div></div>
    );
  }
  return (
    <div className="container-x py-10 sm:py-14">
      <form onSubmit={submit} noValidate className="card mx-auto max-w-md space-y-4 p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <Input label="New password" type="password" required autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} error={error} hint="At least 6 characters." />
        <Button type="submit" size="lg" className="w-full" loading={busy}>Update password</Button>
        <p className="text-center text-sm"><Link to="/account" className="text-cocoa-600 hover:underline">Cancel</Link></p>
      </form>
    </div>
  );
}