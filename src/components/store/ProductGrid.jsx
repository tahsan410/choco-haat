import { useState } from 'react';
import ProductCard from './ProductCard.jsx';
import QuickViewModal from './QuickViewModal.jsx';

export default function ProductGrid({ products, className = 'grid-cols-2 lg:grid-cols-4' }) {
  const [quick, setQuick] = useState(null);
  return (
    <>
      <div className={`grid gap-3 sm:gap-5 ${className}`}>
        {products.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQuick} />)}
      </div>
      <QuickViewModal product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
