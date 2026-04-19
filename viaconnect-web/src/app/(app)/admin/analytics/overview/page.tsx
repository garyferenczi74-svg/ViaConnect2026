'use client';

// Prompt #94 Phase 6.1: Unit economics overview KPI strip.
// Reads the most recent overall unit_economics_snapshots row and renders the
// headline metrics. When no snapshot exists yet (pre-launch) we show an
// explanation rather than a wall of dashes.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Target,
  Activity,
  PercentCircle,
} from 'lucide-react';

const supabase = createClient();

interface SnapshotRow {
  id: string;
  snapshot_month: string;
  snapshot_generated_at: string;
  active_customers_count: number;
  new_customers_count: number;
  churned_customers_count: number;
  total_revenue_cents: number;
  contribution_margin_cents: number;
  contribution_margin_percent: number | null;
  marketing_spend_cents: number;
  blended_cac_cents: number | null;
  payback_period_months: number | null;
  ltv_12mo_cents: number | null;
  ltv_24mo_cents: number | null;
  ltv_36mo_cents: number | null;
  ltv_cac_ratio_24mo: number | null;
  net_revenue_retention_percent: number | null;
  gross_revenue_retention_percent: number | null;
  monthly_churn_rate_percent: number | null;
  arpu_cents: number | null;
  mrr_cents: number | null;
  arr_cents: number | null;
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
const fmtMonths = (n: number | null) =>
  n == null ? NA : `${n.toFixed(1)} mo`;
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short' });

export default function AnalyticsOverviewPage() {
  const [snapshot, setSnapshot] = useState<SnapshotRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('unit_economics_snapshots')
        .select(
          'id, snapshot_month, snapshot_generated_at, active_customers_count, new_customers_count, churned_customers_count, total_revenue_cents, contribution_margin_cents, contribution_margin_percent, marketing_spend_cents, blended_cac_cents, payback_period_months, ltv_12mo_cents, ltv_24mo_cents, ltv_36mo_cents, ltv_cac_ratio_24mo, net_revenue_retention_percent, gross_revenue_retention_percent, monthly_churn_rate_percent, arpu_cents, mrr_cents, arr_cents',
        )
        .eq('segment_type', 'overall')
        .eq('segment_value', 'all')
        .order('snapshot_month', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSnapshot((data as SnapshotRow | null) ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2">Overview</h1>
        <p className="text-sm text-gray-400 mt-1">
          Headline unit economics from the latest monthly snapshot.
        </p>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading snapshot
        </div>
      )}

      {!loading && !snapshot && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300">
          <p className="font-medium text-white">No snapshot yet.</p>
          <p className="mt-1 text-gray-400">
            The first overall snapshot will be generated once the snapshot Edge Function runs (Phase 7). Until then, use the CAC, LTV, and Cohorts pages to read live data.
          </p>
        </div>
      )}

      {!loading && snapshot && (
        <>
          <p className="text-xs text-gray-400 mb-4">
            Snapshot for {fmtMonth(snapshot.snapshot_month)}; generated {new Date(snapshot.snapshot_generated_at).toLocaleString()}.
          </p>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Kpi label="ARR"   value={fmtBigUsd(snapshot.arr_cents)}                    Icon={CircleDollarSign} />
            <Kpi label="MRR"   value={fmtBigUsd(snapshot.mrr_cents)}                    Icon={CircleDollarSign} />
            <Kpi label="ARPU"  value={fmtUsd(snapshot.arpu_cents)}                      Icon={Activity} />
            <Kpi label="Active customers" value={(snapshot.active_customers_count ?? 0).toLocaleString()} Icon={Activity} />
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Kpi label="Blended CAC"         value={fmtUsd(snapshot.blended_cac_cents)}      Icon={TrendingDown} />
            <Kpi label="LTV (24 mo)"         value={fmtUsd(snapshot.ltv_24mo_cents)}         Icon={TrendingUp} />
            <Kpi label="LTV : CAC (24 mo)"   value={fmtRatio(snapshot.ltv_cac_ratio_24mo)}    Icon={Target} />
            <Kpi label="Payback"             value={fmtMonths(snapshot.payback_period_months)} Icon={PercentCircle} />
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Kpi label="Contribution margin" value={fmtBigUsd(snapshot.contribution_margin_cents)} Icon={TrendingUp} />
            <Kpi label="Margin %"            value={fmtPct(snapshot.contribution_margin_percent)} Icon={PercentCircle} />
            <Kpi label="NRR"                 value={fmtPct(snapshot.net_revenue_retention_percent)} Icon={TrendingUp} />
            <Kpi label="GRR"                 value={fmtPct(snapshot.gross_revenue_retention_percent)} Icon={TrendingUp} />
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Marketing spend"    value={fmtBigUsd(snapshot.marketing_spend_cents)}     Icon={CircleDollarSign} />
            <Kpi label="New customers"      value={(snapshot.new_customers_count ?? 0).toLocaleString()} Icon={TrendingUp} />
            <Kpi label="Churned customers"  value={(snapshot.churned_customers_count ?? 0).toLocaleString()} Icon={TrendingDown} />
            <Kpi label="Monthly churn"      value={fmtPct(snapshot.monthly_churn_rate_percent)} Icon={TrendingDown} />
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, Icon }: { label: string; value: string; Icon: typeof CircleDollarSign }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-copper" strokeWidth={1.5} />
      </div>
      <p className="text-xl md:text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
