import { useState } from 'react';
import { Plus, Trash2, Pencil, TicketPercent } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader, Panel } from '../../components/admin/ui.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EmptyState, TableSkeleton } from '../../components/ui/Feedback.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input, Select, Checkbox } from '../../components/ui/Field.jsx';
import { formatDate, formatTaka } from '../../lib/format.js';

const blank = { code: '', type: 'percent', value: '', min_order: 0, expires_at: '', usage_limit: '', is_active: true, _new: true };

export default function Coupons() {
  const { loading, coupons, saveCoupon, deleteCoupon } = useAdminData();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState({});

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(edit.code.trim())) er.code = 'Use 3–32 letters, numbers, - or _.';
    if (!(Number(edit.value) > 0)) er.value = 'Enter a value above 0.';
    if (edit.type === 'percent' && Number(edit.value) > 100) er.value = 'Percentage cannot exceed 100.';
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const { _new, ...c } = edit;
      await saveCoupon({ ...c, code: c.code.trim().toUpperCase(), value: Number(c.value), min_order: Number(c.min_order) || 0, usage_limit: c.usage_limit === '' ? null : Number(c.usage_limit), expires_at: c.expires_at ? new Date(`${c.expires_at}T23:59:59+06:00`).toISOString() : null });
      toast.success('Coupon saved'); setEdit(null);
    } catch (ex) { toast.error(ex.message); } finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { await deleteCoupon(del.code); toast.success('Coupon deleted'); setDel(null); } catch (ex) { toast.error(ex.message); } finally { setBusy(false); } };

  return (
    <>
      <PageHeader title="Coupons" subtitle="Customers enter a code at checkout. Rules are verified on the server." actions={<Button onClick={() => { setErr({}); setEdit(blank); }}><Plus className="h-4 w-4" /> New coupon</Button>} />
      <Panel pad={false}>
        {loading ? <TableSkeleton cols={5} /> : coupons.length === 0 ? <EmptyState icon={TicketPercent} title="No coupons yet">Create a percentage or fixed-amount discount code.</EmptyState> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[700px]">
            <thead><tr className="border-b border-cocoa-100 bg-cream/60"><th className="th">Code</th><th className="th">Discount</th><th className="th text-right">Min. order</th><th className="th text-right">Used</th><th className="th">Expires</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody>{coupons.map((c) => (
              <tr key={c.code} className="border-b border-cocoa-50 last:border-0">
                <td className="td font-mono font-semibold">{c.code}</td><td className="td">{c.type === 'percent' ? `${c.value}%` : formatTaka(c.value)}</td><td className="td text-right tabular-nums">{Number(c.min_order) ? formatTaka(c.min_order) : '—'}</td>
                <td className="td text-right tabular-nums">{c.used_count}{c.usage_limit != null ? ` / ${c.usage_limit}` : ''}</td><td className="td">{c.expires_at ? formatDate(c.expires_at) : 'Never'}</td>
                <td className="td">{c.is_active ? <Badge tone="green">Active</Badge> : <Badge>Off</Badge>}</td>
                <td className="td"><div className="flex justify-end gap-1"><button onClick={() => { setErr({}); setEdit({ ...c, expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '', usage_limit: c.usage_limit ?? '' }); }} className="rounded-lg p-2 hover:bg-cocoa-50" aria-label={`Edit ${c.code}`}><Pencil className="h-4 w-4" /></button><button onClick={() => setDel(c)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${c.code}`}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._new ? 'New coupon' : 'Edit coupon'} size="sm" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" form="coupon-form" loading={busy}>Save coupon</Button></>}>
        {edit && (
          <form id="coupon-form" onSubmit={save} noValidate className="space-y-4">
            <Input label="Code" required value={edit.code} disabled={!edit._new} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} error={err.code} placeholder="SWEET10" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (৳)</option></Select>
              <Input label="Value" required type="number" min="0" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} error={err.value} />
            </div>
            <Input label="Minimum order (৳)" type="number" min="0" value={edit.min_order} onChange={(e) => setEdit({ ...edit, min_order: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Expiry date" type="date" value={edit.expires_at} onChange={(e) => setEdit({ ...edit, expires_at: e.target.value })} />
              <Input label="Usage limit" type="number" min="1" value={edit.usage_limit} onChange={(e) => setEdit({ ...edit, usage_limit: e.target.value })} placeholder="Unlimited" />
            </div>
            <Checkbox label="Active" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!del} loading={busy} danger onClose={() => setDel(null)} onConfirm={remove} title="Delete coupon?" confirmLabel="Delete coupon" message={`Coupon ${del?.code} will stop working. Past orders are not affected.`} />
    </>
  );
}
