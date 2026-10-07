import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Minus, PackageOpen, EyeOff, Sparkles } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader, Panel } from '../../components/admin/ui.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/Feedback.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import ProductImage from '../../components/store/ProductImage.jsx';
import ProductForm from './ProductForm.jsx';
import { formatTaka, stockInfo } from '../../lib/format.js';

const field = 'h-10 rounded-xl border border-cocoa-200 bg-white px-3 text-sm focus:border-caramel-600 focus:outline-none focus:ring-2 focus:ring-caramel-200';

export default function Products() {
  const { loading, error, products, categories, reload, saveProduct, deleteProduct, adjustStock, removeDemoProducts } = useAdminData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [demoConfirm, setDemoConfirm] = useState(false);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const demoCount = products.filter((p) => p.is_demo).length;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => (!needle || `${p.name} ${p.brand}`.toLowerCase().includes(needle)) && (!cat || p.category_id === cat) && (!stockFilter || stockInfo(p, 5).key === stockFilter));
  }, [products, q, cat, stockFilter]);

  const step = async (p, delta) => { try { await adjustStock(p.id, delta); } catch (e) { toast.error(e.message); } };
  const toggleActive = async (p) => { try { await saveProduct({ ...p, is_active: !p.is_active }); toast.success(p.is_active ? 'Hidden from the shop' : 'Visible in the shop'); } catch (e) { toast.error(e.message); } };
  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteProduct(del.id); toast.success('Product deleted'); setDel(null); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const removeDemo = async () => {
    setBusy(true);
    try { const n = await removeDemoProducts(); toast.success(`${n} demo product${n === 1 ? '' : 's'} removed`); setDemoConfirm(false); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (error) return <ErrorState message={error} onRetry={() => reload()} />;

  return (
    <>
      <PageHeader title="Products" subtitle={`${products.length} product${products.length === 1 ? '' : 's'}`} actions={<>
        {demoCount > 0 && <Button size="sm" variant="secondary" onClick={() => setDemoConfirm(true)}><Sparkles className="h-4 w-4" /> Remove demo products ({demoCount})</Button>}
        <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add product</Button>
      </>} />

      <Panel pad={false}>
        <div className="grid gap-2 border-b border-cocoa-100 p-4 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="relative"><label htmlFor="pq" className="sr-only">Search products</label><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" aria-hidden /><input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className={`${field} w-full pl-9`} /></div>
          <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)} className={field}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select aria-label="Stock" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className={field}><option value="">Any stock level</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
        </div>

        {loading ? <TableSkeleton cols={5} /> : list.length === 0 ? (
          <EmptyState icon={PackageOpen} title={products.length ? 'No products match' : 'No products yet'} action={!products.length && <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add your first product</Button>}>{products.length ? 'Try a different search or filter.' : 'Add chocolates and they appear in the shop immediately.'}</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr className="border-b border-cocoa-100 bg-cream/60"><th className="th">Product</th><th className="th">Category</th><th className="th text-right">Price</th><th className="th">Stock</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
              <tbody>{list.map((p) => {
                const s = stockInfo(p, 5);
                return (
                  <tr key={p.id} className="border-b border-cocoa-50 last:border-0 hover:bg-cream/50">
                    <td className="td"><div className="flex items-center gap-3"><span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-100"><ProductImage product={p} /></span><div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-cocoa-500">{p.brand}{p.is_demo && <Badge tone="amber" className="ml-2">Demo</Badge>}</p></div></div></td>
                    <td className="td text-cocoa-600">{catName.get(p.category_id) || '—'}</td>
                    <td className="td text-right"><p className="font-semibold tabular-nums">{formatTaka(p.price)}</p>{p.comparison_price ? <p className="text-xs text-cocoa-400 line-through">{formatTaka(p.comparison_price)}</p> : null}</td>
                    <td className="td">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => step(p, -1)} disabled={p.stock <= 0} className="grid h-7 w-7 place-items-center rounded-lg border border-cocoa-200 hover:bg-cocoa-50 disabled:opacity-40" aria-label={`Decrease stock of ${p.name}`}><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-9 text-center font-semibold tabular-nums" aria-label={`${p.stock} in stock`}>{p.stock}</span>
                        <button onClick={() => step(p, 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-cocoa-200 hover:bg-cocoa-50" aria-label={`Increase stock of ${p.name}`}><Plus className="h-3.5 w-3.5" /></button>
                        <button onClick={() => step(p, 10)} className="rounded-lg border border-cocoa-200 px-1.5 py-1 text-[11px] font-semibold hover:bg-cocoa-50" aria-label={`Add 10 to stock of ${p.name}`}>+10</button>
                      </div>
                      <div className="mt-1"><Badge tone={s.tone}>{s.key === 'in' ? 'In Stock' : s.key === 'low' ? 'Low Stock' : 'Out of Stock'}</Badge></div>
                    </td>
                    <td className="td"><div className="flex flex-wrap items-center gap-1.5">{p.is_active ? <Badge tone="green">Active</Badge> : <Badge><EyeOff className="h-3 w-3" />Hidden</Badge>}{p.is_featured && <Badge tone="caramel">Featured</Badge>}</div></td>
                    <td className="td"><div className="flex justify-end gap-1">
                      <button onClick={() => toggleActive(p)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-cocoa-700 hover:bg-cocoa-50">{p.is_active ? 'Hide' : 'Show'}</button>
                      <button onClick={() => setEditing(p)} className="rounded-lg p-2 text-cocoa-600 hover:bg-cocoa-50" aria-label={`Edit ${p.name}`}><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDel(p)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </Panel>

      <ProductForm open={editing !== undefined} product={editing || null} onClose={() => setEditing(undefined)} />
      <ConfirmDialog open={!!del} loading={busy} danger onClose={() => setDel(null)} onConfirm={confirmDelete} title="Delete product?" confirmLabel="Delete product"
        message={`“${del?.name}” will be removed from the shop. Past orders keep its name and price. If you only want to stop selling it for now, use Hide instead.`} />
      <ConfirmDialog open={demoConfirm} loading={busy} danger onClose={() => setDemoConfirm(false)} onConfirm={removeDemo} title="Remove all demo products?" confirmLabel="Remove demo products"
        message={`This deletes the ${demoCount} sample product${demoCount === 1 ? '' : 's'} that came with the project. Products you added yourself are not touched.`} />
    </>
  );
}
