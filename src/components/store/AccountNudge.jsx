import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext.jsx';

const KEY = 'chocohaat.nudge.dismissed';
const read = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

/**
 * A small, dismissible hint shown to guests on the cart / checkout pages:
 * explains what an account gives them. Not shown to signed-in customers, never blocks ordering.
 */
export default function AccountNudge({ className = '' }) {
  const { customer, loading } = useCustomer();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(read);
  if (loading || customer || hidden) return null;

  const dismiss = () => { setHidden(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } };
  const state = { from: pathname };
  const btn = 'inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition';

  return (
    <div className={`relative rounded-2xl border border-caramel-200 bg-caramel-50 p-4 pr-10 sm:p-5 sm:pr-12 ${className}`} role="note">
      <button onClick={dismiss} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-cocoa-500 hover:bg-white/70" aria-label="Dismiss"><X className="h-4 w-4" aria-hidden /></button>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-caramel-700 sm:grid"><Sparkles className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-cocoa-900">Order faster with a free account</p>
          <p className="mt-1 text-sm text-cocoa-700">Your address is filled in for you next time, and you can see every order and its status in one place. No account needed – you can also order as a guest.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/account/register" state={state} className={`${btn} bg-caramel-600 text-white hover:bg-caramel-700`}>Create account</Link>
            <Link to="/account/login" state={state} className={`${btn} bg-white text-cocoa-800 ring-1 ring-inset ring-cocoa-200 hover:ring-cocoa-400`}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}