import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Star, Link2 } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input, Select, Textarea, Checkbox } from '../../components/ui/Field.jsx';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../services/api.js';
import { slugify } from '../../lib/format.js';
import { productArt } from '../../lib/productArt.js';

const EMPTY = {
  name: '', slug: '', brand: '', category_id: '', short_description: '', description: '', ingredients: '', storage_info: '', authenticity_info: '',
  price: '', comparison_price: '', show_comparison: false, cost_price: '', stock: '', low_stock_threshold: 5,
  weight: '', country_of_origin: '', expiry_info: '', image_url: '', images: [], is_featured: false, is_active: true,
};

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export default function ProductForm({ product, open, onClose }) {
  const { categories, saveProduct } = useAdminData();
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setUrlInput(''); setSlugTouched(!!product);
    setF(product ? { ...EMPTY, ...product, category_id: product.category_id || '', comparison_price: product.comparison_price ?? '', image_url: product.image_url || '', images: product.images || [] } : EMPTY);
  }, [open, product]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v, ...(k === 'name' && !slugTouched ? { slug: slugify(v) } : {}) }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  // Every picture lives in one ordered list; the first one is the main image.
  const pics = [f.image_url, ...f.images].filter(Boolean);
  const setPics = (list) => setF((x) => ({ ...x, image_url: list[0] || '', images: list.slice(1) }));

  const upload = async (files) => {
    setUploading(true);
    try {
      const urls = [];
      for (const file of [...files]) {
        if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image.`); continue; }
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} is larger than 5 MB.`); continue; }
        urls.push(await api.adminUploadImage(file));
      }
      if (urls.length) setPics([...pics, ...urls]);
    } catch (e) { toast.error(e.message); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const addUrl = () => {
    const u = urlInput.trim();
    if (!/^https?:\/\//i.test(u)) { toast.error('Enter a full image link starting with https://'); return; }
    setPics([...pics, u]); setUrlInput('');
  };

  const validate = () => {
    const er = {};
    if (!f.name.trim()) er.name = 'Product name is required.';
    if (!f.slug.trim()) er.slug = 'URL slug is required.';
    if (f.price === '' || Number(f.price) < 0) er.price = 'Enter the selling price.';
    if (f.show_comparison && !(Number(f.comparison_price) > Number(f.price))) er.comparison_price = 'Market price must be higher than your price to show a comparison.';
    if (f.stock === '' || !Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) er.stock = 'Enter a whole number (0 or more).';
    if (f.cost_price !== '' && Number(f.cost_price) < 0) er.cost_price = 'Cost cannot be negative.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) { setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 30); return; }
    setSaving(true);
    try {
      const { is_demo, ...rest } = f;
      await saveProduct({
        ...(product ? { id: product.id, is_demo } : {}),
        ...rest,
        name: f.name.trim(), slug: slugify(f.slug), brand: f.brand.trim(),
        category_id: f.category_id || null,
        price: Number(f.price), comparison_price: numOrNull(f.comparison_price), cost_price: Number(f.cost_price) || 0,
        stock: Number(f.stock), low_stock_threshold: Number(f.low_stock_threshold) || 5,
        image_url: f.image_url || null, images: f.images,
        show_comparison: Boolean(f.show_comparison && f.comparison_price),
      });
      toast.success(product ? 'Product updated' : 'Product added');
      onClose();
    } catch (err) {
      const dup = /duplicate|unique|slug/i.test(err.message);
      if (dup) setErrors((x) => ({ ...x, slug: 'Another product already uses this URL slug.' }));
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit product' : 'Add product'} size="xl"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="product-form" loading={saving}>{product ? 'Save changes' : 'Add product'}</Button></>}>
      <form id="product-form" onSubmit={submit} noValidate className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2">
          <Input label="Product name" required value={f.name} onChange={set('name')} error={errors.name} wrapClass="sm:col-span-2" />
          <Input label="Brand" value={f.brand} onChange={set('brand')} placeholder="e.g. Kinder" />
          <Select label="Category" value={f.category_id} onChange={set('category_id')}><option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Input label="URL slug" required value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug')(e); }} error={errors.slug} hint="Used in the product link, e.g. /product/kinder-bueno" />
          <Input label="Short description" value={f.short_description} onChange={set('short_description')} hint="Shown on product cards." />
          <Textarea label="Full description" rows={4} value={f.description} onChange={set('description')} wrapClass="sm:col-span-2" />
        </section>

        <section>
          <h3 className="mb-3 font-display text-lg font-semibold">Pricing &amp; stock</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Selling price (৳)" required type="number" min="0" step="1" inputMode="decimal" value={f.price} onChange={set('price')} error={errors.price} />
            <Input label="Comparison / market price (৳)" type="number" min="0" step="1" inputMode="decimal" value={f.comparison_price} onChange={set('comparison_price')} error={errors.comparison_price} />
            <Input label="Cost price (৳)" type="number" min="0" step="1" inputMode="decimal" value={f.cost_price} onChange={set('cost_price')} error={errors.cost_price} hint="Private – for profit reports." />
            <Input label="Stock quantity" required type="number" min="0" step="1" inputMode="numeric" value={f.stock} onChange={set('stock')} error={errors.stock} />
            <Input label="Low-stock alert at" type="number" min="1" step="1" inputMode="numeric" value={f.low_stock_threshold} onChange={set('low_stock_threshold')} />
            <div className="flex items-end pb-2.5"><Checkbox label="Show market price & savings to customers" checked={f.show_comparison} onChange={set('show_comparison')} /></div>
          </div>
          <p className="mt-2 text-xs text-cocoa-500">Only enable the comparison when the market price is accurate – customers will see it as a real price comparison.</p>
        </section>

        <section>
          <h3 className="mb-3 font-display text-lg font-semibold">Product details</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Weight" value={f.weight} onChange={set('weight')} placeholder="e.g. 43 g" />
            <Input label="Country of origin" value={f.country_of_origin} onChange={set('country_of_origin')} />
            <Input label="Expiry information" value={f.expiry_info} onChange={set('expiry_info')} placeholder="e.g. Best before Mar 2027" />
            <Textarea label="Ingredients" rows={3} value={f.ingredients} onChange={set('ingredients')} wrapClass="sm:col-span-3" />
            <Textarea label="Storage information" rows={2} value={f.storage_info} onChange={set('storage_info')} wrapClass="sm:col-span-3" />
            <Textarea label="Authenticity information" rows={2} value={f.authenticity_info} onChange={set('authenticity_info')} wrapClass="sm:col-span-3" />
          </div>
        </section>

        <section>
          <h3 className="mb-1 font-display text-lg font-semibold">Images</h3>
          <p className="mb-3 text-sm text-cocoa-500">The first image is the main photo. Without photos, a neutral placeholder wrapper is shown.</p>
          <ul className="flex flex-wrap gap-3">
            {pics.map((src, i) => (
              <li key={src + i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-cocoa-200 bg-cream-100">
                <img src={src} alt={`Product ${i + 1}`} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = productArt({ name: f.name || 'Image', brand: f.brand }); }} />
                {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-caramel-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Main</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  {i > 0 ? <button type="button" onClick={() => setPics([src, ...pics.filter((_, j) => j !== i)])} className="rounded-full bg-white/90 p-1 text-cocoa-800" aria-label="Make main image"><Star className="h-3.5 w-3.5" /></button> : <span />}
                  <button type="button" onClick={() => setPics(pics.filter((_, j) => j !== i))} className="rounded-full bg-white/90 p-1 text-red-600" aria-label="Remove image"><X className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-cocoa-300 text-cocoa-500 hover:border-caramel-600 hover:text-caramel-700 disabled:opacity-50">
                <span className="flex flex-col items-center gap-1 text-xs font-medium"><ImagePlus className="h-5 w-5" />{uploading ? 'Uploading…' : 'Upload'}</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files?.length && upload(e.target.files)} />
            </li>
          </ul>
          <div className="mt-3 flex max-w-xl gap-2">
            <Input aria-label="Image link" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="…or paste an image link (https://)" wrapClass="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
            <Button type="button" variant="secondary" onClick={addUrl}><Link2 className="h-4 w-4" /> Add</Button>
          </div>
        </section>

        <section className="flex flex-wrap gap-6 rounded-xl bg-cream px-4 py-3">
          <Checkbox label="Featured on homepage (hero slideshow + Featured section)" checked={f.is_featured} onChange={set('is_featured')} />
          <Checkbox label="Active (visible in the shop)" checked={f.is_active} onChange={set('is_active')} />
        </section>
      </form>
    </Modal>
  );
}
