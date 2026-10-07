import { ChevronDown } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { formatTaka } from '../../lib/format.js';
import { usePageMeta } from '../../lib/seo.js';

export default function FAQ() {
  const { settings: s } = useCatalog();
  const free = Number(s.free_delivery_threshold) > 0 ? ` Orders over ${formatTaka(s.free_delivery_threshold)} ship free.` : '';
  const items = [
    ['How do I place an order?', 'Add chocolates to your cart, go to checkout, enter your delivery details and place the order. You receive an Order ID straight away – please save it.'],
    ['How much is delivery?', `Delivery is ${formatTaka(s.inside_city_charge)} inside ${s.inside_city_district} and ${formatTaka(s.outside_city_charge)} to the rest of Bangladesh.${free}`],
    ['How can I pay?', 'Cash on delivery: pay the delivery person when your order arrives. More payment options may be added later.'],
    ['How do I track my order?', 'Open Track Order, then enter your Order ID and the phone number you used while ordering. Both are needed to protect your privacy.'],
    ['Are the chocolates authentic?', 'Yes. We sell sealed, original products, and each product page shows weight, origin and expiry information.'],
    ['What about expiry dates?', 'Every chocolate carries its best-before date on the pack. If you receive an item that is expired or damaged, contact us immediately.'],
    ['Can I cancel or change my order?', 'Yes, as long as it has not been shipped. Call us as soon as possible with your Order ID.'],
    ['How should I store chocolate?', 'Keep it in a cool, dry place away from sunlight – ideally below 25°C. Avoid the refrigerator unless the pack says otherwise.'],
  ];
  usePageMeta({
    title: `FAQ | ${s.store_name}`,
    description: 'Answers about ordering, delivery charges, cash on delivery, tracking and storing chocolate.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  });
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="h-page">Frequently asked questions</h1>
        <div className="mt-8 divide-y divide-cocoa-100 overflow-hidden rounded-2xl border border-cocoa-100 bg-white">
          {items.map(([q, a]) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-cocoa-900 hover:bg-cream [&::-webkit-details-marker]:hidden">{q}<ChevronDown className="h-5 w-5 shrink-0 text-cocoa-400 transition group-open:rotate-180" aria-hidden /></summary>
              <p className="px-5 pb-5 leading-relaxed text-cocoa-700">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
