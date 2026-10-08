import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import Logo from './Logo.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { formatTaka } from '../../lib/format.js';

export default function Footer() {
  const { settings: s, categories } = useCatalog();
  const wa = String(s.whatsapp_number || '').replace(/\D/g, '');
  return (
    <footer className="mt-10 bg-cocoa-800 text-cocoa-100">
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cocoa-200">{s.tagline}. Authentic chocolates, delivered to your doorstep across Bangladesh.</p>
        </div>
        <div>
          <h3 className="font-sans text-sm font-semibold text-cream">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/shop">All chocolates</Link></li>
            {categories.slice(0, 5).map((c) => <li key={c.id}><Link className="hover:text-white" to={`/shop?category=${c.slug}`}>{c.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-sans text-sm font-semibold text-cream">Help</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/track-order">Track your order</Link></li>
            <li><Link className="hover:text-white" to="/faq">FAQ</Link></li>
            <li><Link className="hover:text-white" to="/about">About us</Link></li>
            <li><Link className="hover:text-white" to="/contact">Contact us</Link></li>
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-cocoa-300">
            Delivery: {formatTaka(s.inside_city_charge)} inside {s.inside_city_district}, {formatTaka(s.outside_city_charge)} elsewhere.
            {Number(s.free_delivery_threshold) > 0 && <> Free delivery over {formatTaka(s.free_delivery_threshold)}.</>}
          </p>
        </div>
        <div>
          <h3 className="font-sans text-sm font-semibold text-cream">Contact</h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-caramel-300" aria-hidden /><a href={`tel:${String(s.contact_phone).replace(/[^\d+]/g, '')}`} className="hover:text-white">{s.contact_phone}</a></li>
            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-caramel-300" aria-hidden /><a href={`mailto:${s.contact_email}`} className="break-all hover:text-white">{s.contact_email}</a></li>
            {wa && <li className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-caramel-300" aria-hidden /><a href={`https://wa.me/${wa}`} className="hover:text-white" target="_blank" rel="noreferrer">WhatsApp us</a></li>}
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-caramel-300" aria-hidden /><span>{s.address_line}</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-cocoa-300 sm:flex-row">
          <p>© {new Date().getFullYear()} {s.store_name}. All rights reserved.</p>
          <p className="flex items-center gap-4"><span>bKash · Nagad · Cash on Delivery</span><Link to="/admin" className="hover:text-white">Admin</Link></p>
        </div>
      </div>
    </footer>
  );
}
