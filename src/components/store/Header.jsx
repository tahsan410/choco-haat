import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingBag, X, ChevronDown, User } from 'lucide-react';
import Logo from './Logo.jsx';
import SearchBox from './SearchBox.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';

const link = ({ isActive }) => `rounded-full px-3.5 py-2 text-sm font-medium transition ${isActive ? 'bg-cocoa-800 text-cream' : 'text-cocoa-700 hover:bg-cocoa-50 hover:text-cocoa-900'}`;

export function CartButton({ className = '' }) {
  const { count, bump } = useCart();
  return (
    <Link to="/cart" className={`relative grid h-11 w-11 place-items-center rounded-full text-cocoa-800 transition hover:bg-cocoa-50 ${className}`} aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
      <ShoppingBag className="h-[22px] w-[22px]" aria-hidden />
      {count > 0 && (
        <span key={bump} className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] animate-cart-bump place-items-center rounded-full bg-caramel-600 px-1 text-[11px] font-bold text-white">{count}</span>
      )}
    </Link>
  );
}

function AccountButton() {
  const { customer } = useCustomer();
  return (
    <Link to={customer ? '/account' : '/account/login'} className="relative grid h-11 w-11 place-items-center rounded-full text-cocoa-800 transition hover:bg-cocoa-50" aria-label={customer ? 'My account' : 'Sign in'} title={customer ? 'My account' : 'Sign in'}>
      <User className="h-[22px] w-[22px]" aria-hidden />
      {customer && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-cream" aria-hidden />}
    </Link>
  );
}

export default function Header() {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [cats, setCats] = useState(false);
  const { categories, settings } = useCatalog();
  const { pathname } = useLocation();

  useEffect(() => { setMenu(false); setSearch(false); setCats(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-cocoa-100/80 bg-cream/90 backdrop-blur-md">
      <div className="hidden bg-cocoa-800 text-center text-xs text-cocoa-100 sm:block">
        <p className="container-x py-1.5">bKash &amp; Nagad accepted · Delivery across Bangladesh · Call {settings.contact_phone}</p>
      </div>
      <div className="container-x flex h-16 items-center gap-3">
        <button className="grid h-11 w-11 place-items-center rounded-full text-cocoa-800 hover:bg-cocoa-50 lg:hidden" onClick={() => setMenu((m) => !m)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
          {menu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <Logo />

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/shop" end className={link}>Shop</NavLink>
          <div className="relative" onMouseLeave={() => setCats(false)}>
            <button onMouseEnter={() => setCats(true)} onClick={() => setCats((c) => !c)} onKeyDown={(e) => e.key === 'Escape' && setCats(false)} className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-cocoa-700 hover:bg-cocoa-50" aria-expanded={cats} aria-haspopup="true">
              Categories <ChevronDown className={`h-4 w-4 transition ${cats ? 'rotate-180' : ''}`} />
            </button>
            {cats && (
              <div className="absolute left-0 top-full z-50 w-60 animate-pop-in pt-2">
                <ul className="overflow-hidden rounded-2xl border border-cocoa-100 bg-white py-2 shadow-lift">
                  {categories.map((c) => <li key={c.id}><Link to={`/shop?category=${c.slug}`} className="block px-4 py-2 text-sm text-cocoa-800 hover:bg-cream">{c.name}</Link></li>)}
                  {!categories.length && <li className="px-4 py-2 text-sm text-cocoa-500">No categories yet</li>}
                </ul>
              </div>
            )}
          </div>
          <NavLink to="/about" className={link}>About</NavLink>
          <NavLink to="/contact" className={link}>Contact</NavLink>
          <NavLink to="/track-order" className={link}>Track Order</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchBox className="mr-1 hidden w-64 xl:block" />
          <button className="grid h-11 w-11 place-items-center rounded-full text-cocoa-800 hover:bg-cocoa-50 xl:hidden" onClick={() => setSearch((s) => !s)} aria-label="Search" aria-expanded={search}><Search className="h-[22px] w-[22px]" /></button>
          <AccountButton />
          <CartButton />
        </div>
      </div>

      {search && <div className="container-x animate-fade-in pb-3 xl:hidden"><SearchBox autoFocus onDone={() => setSearch(false)} /></div>}

      {menu && (
        <nav className="animate-fade-in border-t border-cocoa-100 bg-cream lg:hidden" aria-label="Mobile">
          <ul className="container-x grid gap-1 py-3">
            {[['/', 'Home'], ['/shop', 'Shop'], ['/about', 'About Us'], ['/contact', 'Contact'], ['/faq', 'FAQ'], ['/track-order', 'Track Order'], ['/account', 'My Account']].map(([to, label]) => (
              <li key={to}><NavLink to={to} end className={({ isActive }) => `block rounded-xl px-4 py-3 text-base font-medium ${isActive ? 'bg-cocoa-800 text-cream' : 'text-cocoa-800 hover:bg-cocoa-50'}`}>{label}</NavLink></li>
            ))}
            {categories.length > 0 && (
              <li className="mt-2 border-t border-cocoa-100 pt-3">
                <p className="px-4 pb-1 text-xs font-semibold text-cocoa-500">Categories</p>
                <div className="flex flex-wrap gap-2 px-3">{categories.map((c) => <Link key={c.id} to={`/shop?category=${c.slug}`} className="rounded-full border border-cocoa-200 bg-white px-3 py-1.5 text-sm text-cocoa-800">{c.name}</Link>)}</div>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
