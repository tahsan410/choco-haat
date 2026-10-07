import { Link } from 'react-router-dom';
import { Phone, Mail, MessageCircle, MapPin, Clock } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import Button from '../../components/ui/Button.jsx';
import { usePageMeta } from '../../lib/seo.js';

export default function Contact() {
  const { settings: s } = useCatalog();
  usePageMeta({ title: `Contact us | ${s.store_name}`, description: `Call, email or message ${s.store_name} about your chocolate order.` });
  const tel = String(s.contact_phone).replace(/[^\d+]/g, '');
  const wa = String(s.whatsapp_number || '').replace(/\D/g, '');
  const channels = [
    { icon: Phone, title: 'Call us', value: s.contact_phone, action: <Button href={`tel:${tel}`} variant="dark" size="sm">Call now</Button> },
    wa && { icon: MessageCircle, title: 'WhatsApp', value: `+${wa}`, action: <Button href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" size="sm">Chat on WhatsApp</Button> },
    { icon: Mail, title: 'Email', value: s.contact_email, action: <Button href={`mailto:${s.contact_email}`} variant="secondary" size="sm">Send an email</Button> },
  ].filter(Boolean);
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="h-page">Contact us</h1>
        <p className="mt-2 text-lg text-cocoa-600">Questions about an order, a product or delivery? We&apos;re happy to help.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {channels.map(({ icon: Icon, title, value, action }) => (
            <li key={title} className="card flex flex-col p-6"><span className="grid h-11 w-11 place-items-center rounded-full bg-caramel-100 text-caramel-700"><Icon className="h-5 w-5" aria-hidden /></span><h2 className="mt-4 font-display text-xl font-semibold">{title}</h2><p className="mt-1 break-all text-cocoa-600">{value}</p><div className="mt-4">{action}</div></li>
          ))}
          <li className="card p-6"><span className="grid h-11 w-11 place-items-center rounded-full bg-caramel-100 text-caramel-700"><MapPin className="h-5 w-5" aria-hidden /></span><h2 className="mt-4 font-display text-xl font-semibold">Where we are</h2><p className="mt-1 text-cocoa-600">{s.address_line}</p><p className="mt-3 flex items-center gap-2 text-sm text-cocoa-500"><Clock className="h-4 w-4" aria-hidden /> Orders are confirmed by phone, usually within a few hours.</p></li>
        </ul>
        <p className="mt-8 text-cocoa-600">Looking for your order? <Link className="font-semibold text-caramel-700 hover:underline" to="/track-order">Track it here</Link>.</p>
      </div>
    </div>
  );
}
