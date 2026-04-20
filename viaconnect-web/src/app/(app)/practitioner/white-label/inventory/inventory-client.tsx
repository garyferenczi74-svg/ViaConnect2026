'use client';

// Prompt #96 Phase 6: Practitioner inventory client.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Warehouse,
  Building2,
  AlertTriangle,
  Package,
  Plus,
} from 'lucide-react';

interface Lot {
  id: string;
  lot_number: string;
  manufactured_date: string;
  expiration_date: string;
  units_produced: number;
  units_available: number;
  units_sold: number;
  units_expired: number;
  units_returned: number;
  units_recalled: number;
  storage_location: 'viacura_warehouse' | 'practitioner_facility';
  viacura_storage_days: number;
  viacura_storage_fee_accrued_cents: number;
  status: string;
  expiration_status: 'ok' | 'approaching' | 'warning' | 'urgent' | 'expired';
  days_until_expiration: number;
  product_catalog: { name: string; sku: string } | null;
  white_label_label_designs: { id: string; display_product_name: string; version_number: number } | null;
}

interface Summary {
  total_units: number;
  units_at_viacura: number;
  units_at_practitioner: number;
  total_storage_fee_accrued_cents: number;
  expiring_soon_lots: number;
}

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtMonth = (iso: string) => new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short' });

function expirationBadge(status: Lot['expiration_status'], days: number) {
  const map: Record<Lot['expiration_status'], { label: string; cls: string }> = {
    ok: { label: 'OK', cls: 'border-portal-green/30 bg-portal-green/10 text-portal-green' },
    approaching: { label: `${days}d`, cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
    warning: { label: `${days}d`, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    urgent: { label: `${days}d`, cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
    expired: { label: 'Expired', cls: 'border-rose-500/60 bg-rose-500/20 text-rose-300' },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${m.cls}`}>{m.label}</span>
  );
}

export default function InventoryClient() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyLotId, setBusyLotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/white-label/inventory');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setLots(json.lots ?? []);
      setSummary(json.summary ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  async function transfer(lotId: string, to: Lot['storage_location']) {
    setBusyLotId(lotId);
    setError(null);
    try {
      const r = await fetch(`/api/practitioner/white-label/inventory/${lotId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyLotId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/practitioner/white-label/enroll" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventory</h1>
            <p className="text-sm text-gray-400 mt-1">Active lots; storage fees accrued past 60 free days at the ViaCura warehouse.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
            <Link href="/practitioner/white-label/orders/new" className="text-xs px-2 py-1 rounded bg-copper hover:bg-amber-600 text-white inline-flex items-center gap-1">
              <Plus className="w-3 h-3" strokeWidth={1.5} /> New order
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>
      )}

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && summary && (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Stat label="Total units" value={summary.total_units.toLocaleString()} Icon={Package} />
          <Stat label="At ViaCura"  value={summary.units_at_viacura.toLocaleString()} Icon={Warehouse} />
          <Stat label="At practice" value={summary.units_at_practitioner.toLocaleString()} Icon={Building2} />
          <Stat label="Storage fees accrued" value={fmtUsd(summary.total_storage_fee_accrued_cents)} Icon={Warehouse} />
          <Stat label="Expiring soon" value={summary.expiring_soon_lots.toLocaleString()} Icon={AlertTriangle} />
        </section>
      )}

      {!loading && lots.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300">
          No active inventory yet. Place a production order and your first lots will appear here once delivered.
        </div>
      )}

      {!loading && lots.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-left px-3 py-2">Lot</th>
                <th className="text-right px-3 py-2">Available</th>
                <th className="text-right px-3 py-2">Sold</th>
                <th className="text-left px-3 py-2">Expires</th>
                <th className="text-left px-3 py-2">Storage</th>
                <th className="text-right px-3 py-2">Storage fee</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <p className="font-medium">{lot.white_label_label_designs?.display_product_name ?? lot.product_catalog?.name}</p>
                    <p className="text-xs text-gray-500">{lot.product_catalog?.sku} ; v{lot.white_label_label_designs?.version_number}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{lot.lot_number}</td>
                  <td className="px-3 py-2 text-right">{lot.units_available.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{lot.units_sold.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{fmtMonth(lot.expiration_date)}</span>
                      {expirationBadge(lot.expiration_status, lot.days_until_expiration)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {lot.storage_location === 'viacura_warehouse' ? (
                      <span className="inline-flex items-center gap-1"><Warehouse className="w-3 h-3" strokeWidth={1.5} /> ViaCura ({lot.viacura_storage_days}d)</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" strokeWidth={1.5} /> Practice</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{lot.viacura_storage_fee_accrued_cents > 0 ? fmtUsd(lot.viacura_storage_fee_accrued_cents) : 'n/a'}</td>
                  <td className="px-3 py-2 text-right">
                    {lot.storage_location === 'viacura_warehouse' ? (
                      <button disabled={busyLotId === lot.id}
                        onClick={() => transfer(lot.id, 'practitioner_facility')}
                        className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.06] disabled:opacity-40">
                        {busyLotId === lot.id ? <Loader2 className="w-3 h-3 animate-spin inline" strokeWidth={1.5} /> : 'Ship to practice'}
                      </button>
                    ) : (
                      <button disabled={busyLotId === lot.id}
                        onClick={() => transfer(lot.id, 'viacura_warehouse')}
                        className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.06] disabled:opacity-40">
                        {busyLotId === lot.id ? <Loader2 className="w-3 h-3 animate-spin inline" strokeWidth={1.5} /> : 'Return to ViaCura'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, Icon }: { label: string; value: string; Icon: typeof Package }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <Icon className="w-4 h-4 text-copper mb-2" strokeWidth={1.5} />
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
