import { useEffect, useState } from 'react';
import { Save, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader, Panel } from '../../components/admin/ui.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input, Select } from '../../components/ui/Field.jsx';
import { api, isDemo } from '../../services/api.js';
import { BD_LOCATIONS } from '../../../shared/constants.js';

const ALL_DISTRICTS = Object.values(BD_LOCATIONS).flat().sort();

export default function Settings() {
  const { settings, refresh } = useCatalog();
  const { orders, retryAllSync } = useAdminData();
  const toast = useToast();
  const [f, setF] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState({});
  useEffect(() => setF(settings), [settings]);
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErr((x) => ({ ...x, [k]: undefined })); };
  const unsynced = orders.filter((o) => !o.sheet_synced).length;

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    for (const k of ['inside_city_charge', 'outside_city_charge', 'free_delivery_threshold', 'min_order_amount', 'low_stock_threshold']) {
      if (f[k] === '' || Number.isNaN(Number(f[k])) || Number(f[k]) < 0) er[k] = 'Enter a number (0 or more).';
    }
    if (!String(f.store_name).trim()) er.store_name = 'Store name is required.';
    setErr(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    try {
      const num = (k) => Number(f[k]) || 0;
      await api.adminSaveSettings({ ...f, store_name: f.store_name.trim(), inside_city_charge: num('inside_city_charge'), outside_city_charge: num('outside_city_charge'), free_delivery_threshold: num('free_delivery_threshold'), min_order_amount: num('min_order_amount'), low_stock_threshold: Math.max(1, num('low_stock_threshold')) });
      await refresh();
      toast.success('Settings saved');
    } catch (ex) { toast.error(ex.message); } finally { setSaving(false); }
  };

  const retry = async () => {
    setSyncing(true);
    try { const r = await retryAllSync(); toast.success(`Synced ${r.synced} of ${r.attempted} orders`); } catch (ex) { toast.error(ex.message); } finally { setSyncing(false); }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Everything here takes effect immediately across the shop – nothing is hard-coded." />
      <form onSubmit={save} noValidate className="space-y-6">
        <Panel title="Delivery & orders">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Inside-city district" value={f.inside_city_district} onChange={set('inside_city_district')} hint="Orders to this district use the inside-city charge.">{ALL_DISTRICTS.map((d) => <option key={d}>{d}</option>)}</Select>
            <Input label="Inside-city delivery charge (৳)" type="number" min="0" value={f.inside_city_charge} onChange={set('inside_city_charge')} error={err.inside_city_charge} />
            <Input label="Outside-city delivery charge (৳)" type="number" min="0" value={f.outside_city_charge} onChange={set('outside_city_charge')} error={err.outside_city_charge} />
            <Input label="Free delivery threshold (৳)" type="number" min="0" value={f.free_delivery_threshold} onChange={set('free_delivery_threshold')} error={err.free_delivery_threshold} hint="0 = no free delivery." />
            <Input label="Minimum order amount (৳)" type="number" min="0" value={f.min_order_amount} onChange={set('min_order_amount')} error={err.min_order_amount} hint="0 = no minimum." />
            <Input label="Default low-stock alert" type="number" min="1" value={f.low_stock_threshold} onChange={set('low_stock_threshold')} error={err.low_stock_threshold} />
          </div>
        </Panel>
        <Panel title="Store information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Store name" required value={f.store_name} onChange={set('store_name')} error={err.store_name} />
            <Input label="Tagline" value={f.tagline} onChange={set('tagline')} />
            <Input label="Contact phone" value={f.contact_phone} onChange={set('contact_phone')} />
            <Input label="Contact email" type="email" value={f.contact_email} onChange={set('contact_email')} />
            <Input label="WhatsApp number" value={f.whatsapp_number} onChange={set('whatsapp_number')} placeholder="8801XXXXXXXXX" hint="With country code, digits only. Leave empty to hide." />
            <Input label="Address / location" value={f.address_line} onChange={set('address_line')} />
          </div>
        </Panel>
        <Panel title="Payment numbers (bKash / Nagad)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="bKash number" value={f.bkash_number || ''} onChange={set('bkash_number')} placeholder="01XXXXXXXXX" hint="Customers Send Money to this number. Shown at checkout." />
            <Input label="Nagad number" value={f.nagad_number || ''} onChange={set('nagad_number')} placeholder="01XXXXXXXXX" hint="Leave empty if you don't use Nagad yet." />
          </div>
        </Panel>
        <div><Button type="submit" size="lg" loading={saving}><Save className="h-4 w-4" /> Save settings</Button></div>
      </form>

      <Panel title="Google Sheets sync" className="mt-6">
        {isDemo ? <p className="text-sm text-cocoa-600">Google Sheets sync runs in production (Supabase + Netlify Functions). Follow the README’s “Google Sheets setup” section.</p> : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className={`flex items-center gap-2 text-sm font-medium ${unsynced ? 'text-red-700' : 'text-emerald-700'}`}>{unsynced ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}{unsynced ? `${unsynced} order${unsynced > 1 ? 's are' : ' is'} not in the sheet yet (safe in the database).` : 'All orders are in Google Sheets.'}</p>
            {unsynced > 0 && <Button variant="secondary" loading={syncing} onClick={retry}><RefreshCw className="h-4 w-4" /> Retry all</Button>}
          </div>
        )}
      </Panel>
    </>
  );
}
