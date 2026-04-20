'use client';

// Prompt #96 Phase 6: Admin inventory dashboard.

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
  Users,
  CircleDollarSign,
} from 'lucide-react';

interface Summary {
  total_active_lots: number;
  total_units: number;
  units_at_viacura: number;
  units_at_practitioner: number;
  total_storage_fees_accrued_cents: number;
  expiring_within_30: number;
  expiring_within_90: number;
  practitioner_count: number;
}

interface ExpiringLot {
  id: string;
  lot_number: string;
  expiration_date: string;
  units_available: number;
  storage_location: string;
  product_catalog: { name: string; sku: string } | null;
  practitioners: { display_name: string; practice_name: string } | null;
  expiration_class: { status: string; days_until_expiration: number };
}

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtMonth = (iso: string) => new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short' });

export default function AdminInventoryPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expiring, setExpiring] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/white-label/inventory');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setSummary(json.summary);
      setExpiring(json.expiring ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/white-label" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventory (cross-practitioner)</h1>
            <p className="text-sm text-gray-400 mt-1">Aggregated inventory across enrolled practitioners; expiring lots queue.</p>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
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
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Practitioners with inventory" value={summary.practitioner_count.toLocaleString()} Icon={Users} />
            <Stat label="Active lots" value={summary.total_active_lots.toLocaleString()} Icon={Package} />
            <Stat label="Units at ViaCura" value={summary.units_at_viacura.toLocaleString()} Icon={Warehouse} />
            <Stat label="Units at practices" value={summary.units_at_practitioner.toLocaleString()} Icon={Building2} />
            <Stat label="Storage fees accrued" value={fmtUsd(summary.total_storage_fees_accrued_cents)} Icon={CircleDollarSign} />
            <Stat label="Expiring < 30d" value={summary.expiring_within_30.toLocaleString()} Icon={AlertTriangle} />
            <Stat label="Expiring < 90d" value={summary.expiring_within_90.toLocaleString()} Icon={AlertTriangle} />
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Expiring soon</h2>
            {expiring.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No lots within the 90-day window.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400">
                    <tr>
                      <th className="text-left px-3 py-2">Practitioner</th>
                      <th className="text-left px-3 py-2">Product / lot</th>
                      <th className="text-right px-3 py-2">Units</th>
                      <th className="text-left px-3 py-2">Expires</th>
                      <th className="text-left px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiring.map((lot) => (
                      <tr key={lot.id} className="border-t border-white/5">
                        <td className="px-3 py-2">{lot.practitioners?.practice_name ?? lot.practitioners?.display_name ?? 'unknown'}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{lot.product_catalog?.name ?? lot.product_catalog?.sku}</p>
                          <p className="text-xs text-gray-500 font-mono">{lot.lot_number}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{lot.units_available.toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs">{fmtMonth(lot.expiration_date)} ({lot.expiration_class.days_until_expiration}d)</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            lot.expiration_class.status === 'expired' ? 'border-rose-500/60 bg-rose-500/20 text-rose-300'
                            : lot.expiration_class.status === 'urgent' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          }`}>{lot.expiration_class.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
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
