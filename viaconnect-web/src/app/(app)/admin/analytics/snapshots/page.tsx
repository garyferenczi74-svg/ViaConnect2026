'use client';

// Prompt #94 Phase 6.6: Snapshots time-series page.
// Reads unit_economics_snapshots filtered to overall, ordered by month, and
// renders a table of headline metrics over time so the founder can spot
// month-over-month direction without recomputing from raw data.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

const supabase = createClient();

interface SnapRow {
  snapshot_month: string;
  active_customers_count: number;
  new_customers_count: number;
  churned_customers_count: number;
  total_revenue_cents: number;
  contribution_margin_cents: number;
  contribution_margin_percent: number | null;
  marketing_spend_cents: number;
  blended_cac_cents: number | null;
  payback_period_months: number | null;
  ltv_24mo_cents: number | null;
  ltv_cac_ratio_24mo: number | null;
  net_revenue_retention_percent: number | null;
  monthly_churn_rate_percent: number | null;
  arr_cents: number | null;
  mrr_cents: number | null;
}

const NA = 'n/a';
const fmtUsd = (c: number | null) =>
  c == null ? NA : `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtBigUsd = (c: number | null) => {
  if (c == null) return NA;
  const dollars = c / 100;
  if (Math.abs(dollars) >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (Math.abs(dollars) >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
};
const fmtPct = (n: number | null) =>
  n == null ? NA : `${n.toFixed(1)}%`;
const fmtRatio = (n: number | null) =>
  n == null ? NA : `${n.toFixed(2)}x`;
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short' });

function delta(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null) return null;
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function DeltaIcon({ d }: { d: number | null }) {
  if (d == null) return <Minus className="w-3 h-3 text-gray-500" strokeWidth={1.5} />;
  if (d > 0.5)  return <TrendingUp className="w-3 h-3 text-portal-green" strokeWidth={1.5} />;
  if (d < -0.5) return <TrendingDown className="w-3 h-3 text-rose-300" strokeWidth={1.5} />;
  return <Minus className="w-3 h-3 text-gray-500" strokeWidth={1.5} />;
}

export default function SnapshotsPage() {
  const [rows, setRows] = useState<SnapRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('unit_economics_snapshots')
      .select(
        'snapshot_month, active_customers_count, new_customers_count, churned_customers_count, total_revenue_cents, contribution_margin_cents, contribution_margin_percent, marketing_spend_cents, blended_cac_cents, payback_period_months, ltv_24mo_cents, ltv_cac_ratio_24mo, net_revenue_retention_percent, monthly_churn_rate_percent, arr_cents, mrr_cents',
      )
      .eq('segment_type', 'overall')
      .eq('segment_value', 'all')
      .order('snapshot_month', { ascending: false })
      .limit(36);
    setRows((data ?? []) as SnapRow[]);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  const ordered = useMemo(() => [...rows].sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month)), [rows]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Snapshots</h1>
            <p className="text-sm text-gray-400 mt-1">
              Monthly unit economics rollup history. Newest first.
            </p>
          </div>
          <button
            onClick={reload}
            className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300">
          <p className="font-medium text-white">No snapshots yet.</p>
          <p className="mt-1 text-gray-400">
            The first overall snapshot will be generated by the monthly snapshot Edge Function (Phase 7).
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-white/[0.03]">Month</th>
                <th className="text-right px-3 py-2">ARR</th>
                <th className="text-right px-3 py-2">MRR</th>
                <th className="text-right px-3 py-2">Active</th>
                <th className="text-right px-3 py-2">New</th>
                <th className="text-right px-3 py-2">Churned</th>
                <th className="text-right px-3 py-2">CAC</th>
                <th className="text-right px-3 py-2">LTV (24mo)</th>
                <th className="text-right px-3 py-2">LTV:CAC</th>
                <th className="text-right px-3 py-2">Payback</th>
                <th className="text-right px-3 py-2">NRR</th>
                <th className="text-right px-3 py-2">Margin %</th>
                <th className="text-right px-3 py-2">Churn %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const idxAsc = ordered.findIndex((x) => x.snapshot_month === r.snapshot_month);
                const prev = idxAsc > 0 ? ordered[idxAsc - 1] : null;
                return (
                  <tr key={r.snapshot_month} className="border-t border-white/5">
                    <td className="px-3 py-2 sticky left-0 bg-[#0E1A30]/95 backdrop-blur font-medium">{fmtMonth(r.snapshot_month)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <DeltaIcon d={delta(r.arr_cents, prev?.arr_cents ?? null)} />
                        {fmtBigUsd(r.arr_cents)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{fmtBigUsd(r.mrr_cents)}</td>
                    <td className="px-3 py-2 text-right">{r.active_customers_count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-portal-green">{r.new_customers_count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-rose-300">{r.churned_customers_count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{fmtUsd(r.blended_cac_cents)}</td>
                    <td className="px-3 py-2 text-right">{fmtUsd(r.ltv_24mo_cents)}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtRatio(r.ltv_cac_ratio_24mo)}</td>
                    <td className="px-3 py-2 text-right">{r.payback_period_months != null ? `${r.payback_period_months.toFixed(1)} mo` : NA}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(r.net_revenue_retention_percent)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(r.contribution_margin_percent)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(r.monthly_churn_rate_percent)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
