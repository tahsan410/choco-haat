import { BadgeCheck, Tag, Truck, ShieldCheck } from 'lucide-react';

export const TRUST_ITEMS = [
  { icon: BadgeCheck, title: 'Authentic products', text: 'Sourced from trusted suppliers, sealed in original packs.' },
  { icon: Tag, title: 'Competitive prices', text: 'Fair prices every day – compare with the market.' },
  { icon: Truck, title: 'Fast delivery', text: 'Doorstep delivery across all 64 districts.' },
  { icon: ShieldCheck, title: 'Secure ordering', text: 'Cash on delivery. Pay only when it arrives.' },
];

export default function TrustBar({ compact = false }) {
  return (
    <ul className={`grid gap-4 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-caramel-100 text-caramel-700"><Icon className="h-5 w-5" aria-hidden /></span>
          <div><p className="text-sm font-semibold text-cocoa-900">{title}</p>{!compact && <p className="text-[13px] leading-snug text-cocoa-600">{text}</p>}</div>
        </li>
      ))}
    </ul>
  );
}
