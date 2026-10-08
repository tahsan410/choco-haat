import { BadgeCheck, Tag, Truck, Heart } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import Button from '../../components/ui/Button.jsx';
import { usePageMeta } from '../../lib/seo.js';

export default function About() {
  const { settings } = useCatalog();
  usePageMeta({ title: `About us | ${settings.store_name}`, description: `${settings.store_name} is an online chocolate shop in Bangladesh – authentic chocolates, honest prices, delivered to your door.` });
  const values = [
    { icon: BadgeCheck, title: 'Authenticity first', text: 'We sell sealed, original products and show expiry information so you always know what you are buying.' },
    { icon: Tag, title: 'Honest pricing', text: 'We aim to keep prices fair every day. When we show a market price next to ours, it is a real comparison – never an inflated one.' },
    { icon: Truck, title: 'Reliable delivery', text: 'Carefully packed and sent to all 64 districts, with easy bKash and Nagad payment.' },
    { icon: Heart, title: 'Made for sharing', text: 'From a single KitKat to a gift box for Eid, birthdays and weddings – chocolate is better together.' },
  ];
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="h-page">About {settings.store_name}</h1>
        <div className="prose-choco mt-6 text-lg">
          <p>We started {settings.store_name} with a simple idea: everyone in Bangladesh should be able to enjoy genuine, good chocolate without paying a premium for it.</p>
          <p>We bring together the chocolates people already love – from everyday favourites to special-occasion gifts – and sell them online at competitive prices, with clear information on every product page.</p>
        </div>
      </div>
      <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        {values.map(({ icon: Icon, title, text }) => (
          <li key={title} className="card p-6"><span className="grid h-11 w-11 place-items-center rounded-full bg-caramel-100 text-caramel-700"><Icon className="h-5 w-5" aria-hidden /></span><h2 className="mt-4 font-display text-xl font-semibold">{title}</h2><p className="mt-1.5 leading-relaxed text-cocoa-600">{text}</p></li>
        ))}
      </ul>
      <div className="mt-10 text-center"><Button to="/shop" size="lg">Browse chocolates</Button></div>
    </div>
  );
}
