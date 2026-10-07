import { useState } from 'react';
import { productArt } from '../../lib/productArt.js';

export default function ProductImage({ product, src, className = '', eager = false, sizes }) {
  const [failed, setFailed] = useState(false);
  const url = !failed && (src || product.image_url) ? src || product.image_url : productArt(product);
  return (
    <img
      src={url}
      alt={`${product.name} – ${product.brand}`.replace(/ – $/, '')}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      sizes={sizes}
      width="400"
      height="400"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
