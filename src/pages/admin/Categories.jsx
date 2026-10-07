import { useState } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader, Panel } from '../../components/admin/ui.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EmptyState, TableSkeleton } from '../../components/ui/Feedback.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input, Checkbox } from '../../components/ui/Field.jsx';
import { slugify } from '../../lib/format.js';

export default function Categories() {
  const { loading, categories, products, saveCategory, deleteCategory } = useAdminData();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState({});
  const counts = new Map();
  for (const p of products) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);

  const save = async (e) => {
    e.preventDefault();
    if (!edit.name.trim()) { setErr({ name: 'Name is required.' }); return; }
    setBusy(true);
    try {
      await saveCategory({ ...edit, name: edit.name.trim(), slug: slugify(edit.slug || edit.name), sort_order: Number(edit.sort_order) || 0 });
      toast.success('Category saved'); setEdit(null); setErr({});
    } catch (ex) { toast.error(/duplicate|unique/i.test(ex.message) ? 'Another category already uses this name/slug.' : ex.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await deleteCategory(del.id); toast.success('Category deleted'); setDel(null); } catch (ex) { toast.error(ex.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="Brands and groups shown on the shop and homepage." actions={<Button onClick={() => { setErr({}); setEdit({ name: '', slug: '', sort_order: categories.length + 1, is_active: true }); }}><Plus className="h-4 w-4" /> Add category</Button>} />
      <Panel pad={false}>
        {loading ? <TableSkeleton cols={4} /> : categories.length === 0 ? <EmptyState icon={Tags} title="No categories yet">Create categories like KitKat, Kinder or Gift Boxes.</EmptyState> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[560px]">
            <thead><tr className="border-b border-cocoa-100 bg-cream/60"><th className="th">Name</th><th className="th">Slug</th><th className="th text-right">Products</th><th className="th text-right">Order</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody>{categories.map((c) => (
              <tr key={c.id} className="border-b border-cocoa-50 last:border-0">
                <td className="td font-medium">{c.name}</td><td className="td text-cocoa-500">{c.slug}</td><td className="td text-right tabular-nums">{counts.get(c.id) || 0}</td><td className="td text-right tabular-nums">{c.sort_order}</td>
                <td className="td">{c.is_active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>}</td>
                <td className="td"><div className="flex justify-end gap-1"><button onClick={() => { setErr({}); setEdit(c); }} className="rounded-lg p-2 hover:bg-cocoa-50" aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></button><button onClick={() => setDel(c)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'Add category'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" form="cat-form" loading={busy}>Save</Button></>}>
        {edit && (
          <form id="cat-form" onSubmit={save} noValidate className="space-y-4">
            <Input label="Name" required value={edit.name} error={err.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, ...(edit.id ? {} : { slug: slugify(e.target.value) }) })} />
            <Input label="URL slug" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} hint="Used in /shop?category=slug" />
            <Input label="Display order" type="number" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: e.target.value })} />
            <Checkbox label="Visible in the shop" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!del} loading={busy} danger onClose={() => setDel(null)} onConfirm={remove} title="Delete category?" confirmLabel="Delete category" message={`“${del?.name}” will be removed. Its ${counts.get(del?.id) || 0} product(s) are kept but become uncategorised.`} />
    </>
  );
}
