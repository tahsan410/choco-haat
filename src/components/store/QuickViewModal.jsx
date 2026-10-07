import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import ProductImage from './ProductImage.jsx';
import QuantityStepper from './QuantityStepper.jsx';
import { PriceBlock, StockBadge } from './PriceBlock.jsx';
import { useAddToCart } from './ProductCard.jsx';

export default function QuickViewModal({ product, onClose }) {
  const [qty, setQty] = useState(1);
  const addToCart = useAddToCart();
  useEffect(() => { setQty(1); }, [product?.id]);
  if (!product) return null;
  const out = product.stock <= 0;

  return (
    <Modal open={!!product} onClose={onClose} title={product.name} size="lg">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-cream-100"><ProductImage product={product} eager /></div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-cocoa-500">{product.brand}</p>
          <div className="mt-3"><PriceBlock product={product} size="detail" /></div>
          <div className="mt-3"><StockBadge product={product} /></div>
          <p className="mt-4 text-[15px] leading-relaxed text-cocoa-700">{product.short_description || product.description}</p>
          {product.weight && <p className="mt-2 text-sm text-cocoa-500">Weight: {product.weight}</p>}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            {!out && <QuantityStepper value={qty} onChange={setQty} max={Math.min(product.stock, 50)} />}
            <Button onClick={() => { addToCart(product, qty); onClose(); }} disabled={out} className="flex-1"><ShoppingBag className="h-4 w-4" /> {out ? 'Out of stock' : 'Add to Cart'}</Button>
          </div>
          <Link to={`/product/${product.slug}`} onClick={onClose} className="mt-4 text-sm font-semibold text-caramel-700 underline-offset-4 hover:underline">View full details</Link>
        </div>
      </div>
    </Modal>
  );
}
