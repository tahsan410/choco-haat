import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/store/Header.jsx';
import Footer from '../components/store/Footer.jsx';
import MobileBar from '../components/store/MobileBar.jsx';
import { isDemo } from '../services/api.js';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

export default function StoreLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">Skip to content</a>
      {isDemo && <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">Demo mode – products and orders are stored in this browser only. Connect Supabase to go live.</div>}
      <Header />
      <main id="main" key={pathname} className="flex-1 animate-fade-in pb-24 md:pb-0"><Outlet /></main>
      <Footer />
      <MobileBar />
    </div>
  );
}
