import { NavLink } from 'react-router-dom';
import { Home, Store, PackageSearch, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';

export default function MobileBar() {
  const { count, bump } = useCart();
  const item = ({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${isActive ? 'text-caramel-700' : 'text-cocoa-500'}`;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-cocoa-100 bg-white/95 pt-1 backdrop-blur md:hidden" aria-label="Quick navigation">
      <div className="mx-auto flex max-w-md">
        <NavLink to="/" end className={item}><Home className="h-5 w-5" aria-hidden />Home</NavLink>
        <NavLink to="/shop" className={item}><Store className="h-5 w-5" aria-hidden />Shop</NavLink>
        <NavLink to="/track-order" className={item}><PackageSearch className="h-5 w-5" aria-hidden />Track</NavLink>
        <NavLink to="/cart" className={item}>
          <span className="relative"><ShoppingBag className="h-5 w-5" aria-hidden />
            {count > 0 && <span key={bump} className="absolute -right-2.5 -top-2 grid h-4 min-w-[1rem] animate-cart-bump place-items-center rounded-full bg-caramel-600 px-1 text-[10px] font-bold text-white">{count}</span>}
          </span>Cart
        </NavLink>
      </div>
    </nav>
  );
}
