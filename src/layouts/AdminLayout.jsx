import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Tags, Users, BarChart3, Settings, TicketPercent, LogOut, Menu, X, Bell, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { AdminDataProvider, useAdminData } from '../context/AdminDataContext.jsx';
import { LogoMark } from '../components/store/Logo.jsx';
import { Spinner } from '../components/ui/Feedback.jsx';
import { buildNotifications } from '../lib/analytics.js';
import { usePageMeta } from '../lib/seo.js';
import { isDemo } from '../services/api.js';

const NAV = [
  ['/admin', 'Dashboard', LayoutDashboard, true],
  ['/admin/orders', 'Orders', ShoppingCart],
  ['/admin/products', 'Products', Package],
  ['/admin/categories', 'Categories', Tags],
  ['/admin/customers', 'Customers', Users],
  ['/admin/analytics', 'Analytics', BarChart3],
  ['/admin/coupons', 'Coupons', TicketPercent],
  ['/admin/settings', 'Settings', Settings],
];

const TONE = { blue: 'bg-blue-500', amber: 'bg-amber-500', red: 'bg-red-500', green: 'bg-green-600' };

function Notifications() {
  const { orders, products } = useAdminData();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const failed = orders.filter((o) => !o.sheet_synced && !o.is_archived).length;
  const list = useMemo(() => buildNotifications(orders, products, Date.now(), api_failed(failed)), [orders, products, failed]);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative grid h-10 w-10 place-items-center rounded-full text-cocoa-700 hover:bg-cocoa-50" aria-label={`Notifications, ${list.length}`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {list.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-caramel-600 px-1 text-[10px] font-bold text-white">{list.length > 9 ? '9+' : list.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,90vw)] animate-pop-in overflow-hidden rounded-2xl border border-cocoa-100 bg-white shadow-lift">
          <p className="border-b border-cocoa-100 px-4 py-3 text-sm font-semibold">Notifications</p>
          <ul className="max-h-80 divide-y divide-cocoa-50 overflow-y-auto">
            {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-cocoa-500">You&apos;re all caught up.</li>}
            {list.map((n) => (
              <li key={n.id}><button onClick={() => { setOpen(false); navigate(n.to); }} className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-cream"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[n.tone]}`} aria-hidden />{n.text}</button></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
// Sheets sync warnings only make sense when a real backend is running (demo mode never syncs).
const api_failed = (n) => (isDemo ? 0 : n);

function Shell() {
  const { admin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  usePageMeta({ title: 'Admin', description: 'Store administration', noindex: true });
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${isActive ? 'bg-caramel-600 text-white' : 'text-cocoa-100 hover:bg-white/10'}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />{label}
        </NavLink>
      ))}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-3">
        <Link to="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-cocoa-200 hover:bg-white/10"><ExternalLink className="h-[18px] w-[18px]" aria-hidden />View store</Link>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-cocoa-200 hover:bg-white/10"><LogOut className="h-[18px] w-[18px]" aria-hidden />Logout</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream-100/60 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-cocoa-800 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5 text-cream"><LogoMark /><div><p className="font-display text-lg font-semibold leading-none">Admin</p><p className="mt-1 text-xs text-cocoa-300">Store dashboard</p></div></div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-cocoa-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-fade-in flex-col bg-cocoa-800">
            <div className="flex items-center justify-between px-5 py-4 text-cream"><span className="font-display text-lg font-semibold">Admin</span><button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
            {nav}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-cocoa-100 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cocoa-50 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">{isDemo && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Demo mode</span>}</div>
          <Notifications />
          <p className="hidden max-w-[14rem] truncate text-sm text-cocoa-600 sm:block">{admin?.email}</p>
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner className="h-8 w-8" /></div>;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <AdminDataProvider><Shell /></AdminDataProvider>;
}
