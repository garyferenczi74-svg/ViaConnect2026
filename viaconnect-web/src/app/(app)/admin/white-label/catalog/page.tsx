'use client';

// Prompt #96 Phase 2: Admin white-label catalog config UI.
//
// Tabular view of all white_label_catalog_config rows (one per supplement
// SKU seeded in Phase 1). Admin can flip eligibility/retail-exclusive,
// edit MOQ + timelines, and view current values. Retail-exclusive flips
// require a 20+ char justification. Eligible and retail-exclusive are
// mutually exclusive (DB CHECK + API guard + UI hint).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  Check,
  Lock,
} from 'lucide-react';

interface CatalogRow {
  id: string;
  product_catalog_id: string;
  is_white_label_eligible: boolean;
  is_retail_exclusive: boolean;
  base_msrp_cents: number;
  base_cogs_cents: number;
  production_minimum_moq: number;
  retail_exclusive_reason: string | null;
  standard_production_weeks: number;
  expedited_production_weeks: number;
  is_active: boolean;
  updated_at: string;
  product_catalog: {
    id: string; name: string; sku: string; category: string; active: boolean;
  } | null;
}

type Filter = 'all' | 'eligible' | 'retail_exclusive';

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function WhiteLabelCatalogAdminPage() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [reasonByRow, setReasonByRow] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/white-label/catalog');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows((json.rows ?? []) as CatalogRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => {
    if (filter === 'eligible') return rows.filter((r) => r.is_white_label_eligible && r.is_active);
    if (filter === 'retail_exclusive') return rows.filter((r) => r.is_retail_exclusive);
    return rows;
  }, [rows, filter]);

  async function patch(row: CatalogRow, body: Record<string, unknown>) {
    setBusyId(row.id);
    setError(null);
    try {
      const r = await fetch('/api/admin/white-label/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_catalog_id: row.product_catalog_id, ...body }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/white-label" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Catalog configuration</h1>
            <p className="text-sm text-gray-400 mt-1">
              Per-SKU white-label eligibility, MOQ, and production timeline. Peptides are excluded at the seed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'eligible', 'retail_exclusive'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2 py-1 rounded border ${
                  filter === f ? 'border-copper text-copper' : 'border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
            <button
              onClick={reload}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && (
        <>
          <p className="md:hidden text-xs text-gray-400 mb-2">Scroll horizontally to see all columns.</p>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-right px-3 py-2">MSRP</th>
                  <th className="text-right px-3 py-2">COGS</th>
                  <th className="text-center px-3 py-2">Eligible</th>
                  <th className="text-center px-3 py-2">Retail only</th>
                  <th className="text-right px-3 py-2">MOQ</th>
                  <th className="text-right px-3 py-2">Std wks</th>
                  <th className="text-right px-3 py-2">Exp wks</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                    {filter === 'all' ? 'No catalog rows yet.' : 'No SKUs match this filter.'}
                  </td></tr>
                )}
                {visible.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      <p className="font-medium">{row.product_catalog?.name ?? row.product_catalog_id}</p>
                      <p className="text-xs text-gray-500">{row.product_catalog?.sku}</p>
                    </td>
                    <td className="px-3 py-2 text-right">{fmtUsd(row.base_msrp_cents)}</td>
                    <td className="px-3 py-2 text-right">{fmtUsd(row.base_cogs_cents)}</td>
                    <td className="px-3 py-2 text-center">
                      {row.is_white_label_eligible ? (
                        <Check className="w-4 h-4 text-portal-green inline" strokeWidth={1.5} />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-500 inline" strokeWidth={1.5} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.is_retail_exclusive ? (
                        <span className="text-amber-300 text-xs">retail only</span>
                      ) : (
                        <span className="text-gray-500 text-xs">no</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{row.production_minimum_moq.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{row.standard_production_weeks}</td>
                    <td className="px-3 py-2 text-right">{row.expedited_production_weeks}</td>
                    <td className="px-3 py-2">
                      {row.is_retail_exclusive ? (
                        <button
                          disabled={busyId === row.id}
                          onClick={() => patch(row, { is_retail_exclusive: false, is_white_label_eligible: true })}
                          className="text-xs px-2 py-1 rounded border border-white/10 text-gray-300 hover:text-white"
                        >
                          {busyId === row.id ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : 'Restore eligible'}
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={reasonByRow[row.id] ?? ''}
                            onChange={(e) => setReasonByRow((s) => ({ ...s, [row.id]: e.target.value }))}
                            placeholder="Justification (20+ chars)"
                            className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-500 w-44"
                          />
                          <button
                            disabled={busyId === row.id || (reasonByRow[row.id]?.trim().length ?? 0) < 20}
                            onClick={() => patch(row, {
                              is_retail_exclusive: true,
                              retail_exclusive_reason: reasonByRow[row.id]?.trim(),
                            })}
                            className="text-xs px-2 py-1 rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
                          >
                            Flag retail only
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
