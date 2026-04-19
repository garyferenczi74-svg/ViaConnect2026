'use client';

// Prompt #94 Phase 6.4: Cohorts analytics page.
// Three views via tabs:
//   retention  /api/admin/analytics/cohort/retention
//   revenue    /api/admin/analytics/cohort/revenue
//   compare    /api/admin/analytics/cohort/compare  (multiple cohorts side by side)
//
// 'loose' active definition is exposed but the API flags it as
// is_engagement_not_retention; we render a banner so the chart label is
// honest.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';

interface RetentionCell {
  month_offset: number;
  active_count: number | null;
  retention_rate: number | null;
  is_projected: boolean;
}
interface RetentionCurve {
  cohort_month: string;
  cohort_size_initial: number;
  active_definition: string;
  is_engagement_not_retention: boolean;
  retention_by_month: RetentionCell[];
  checkpoints: { month_1: number | null; month_3: number | null; month_6: number | null; month_12: number | null; month_24: number | null };
}
interface RevenueCurve {
  cohort_month: string;
  cohort_size_initial: number;
  monthly_revenue_per_customer_by_month: number[];
  cumulative_revenue_per_customer_by_month: number[];
  cumulative_contribution_margin_per_customer_by_month: number[];
}
interface ComparisonResult {
  cohorts: Array<{
    cohort_month: string;
    segment_descriptor: string;
    cohort_size: number;
    retention_curve: number[];
    revenue_curve: number[];
    ltv_24mo_cents: number;
  }>;
  comparison_notes: string[];
}

const NA = 'n/a';
const fmtUsd = (c: number | null | undefined) =>
  c == null ? NA : `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtPct = (n: number | null | undefined) =>
  n == null ? NA : `${(n * 100).toFixed(1)}%`;
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'long' });

function defaultCohort(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

type Tab = 'retention' | 'revenue' | 'compare';

export default function CohortsAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('retention');
  const [cohort, setCohort] = useState<string>(defaultCohort);
  const [active, setActive] = useState<'strict' | 'standard' | 'loose'>('strict');
  const [horizon, setHorizon] = useState<number>(24);
  const [compareList, setCompareList] = useState<string>(() => {
    const c2 = new Date(); c2.setMonth(c2.getMonth() - 12);
    const c1 = new Date(); c1.setMonth(c1.getMonth() - 6);
    return [c2, c1]
      .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
      .join(',');
  });

  const [retention, setRetention] = useState<RetentionCurve | null>(null);
  const [revenue, setRevenue] = useState<RevenueCurve | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cohortInputValue = useMemo(() => cohort.slice(0, 7), [cohort]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'retention') {
        const r = await fetch(`/api/admin/analytics/cohort/retention?cohort=${cohort}&active=${active}&horizon=${horizon}`);
        if (!r.ok) throw new Error(`Retention: ${r.status}`);
        setRetention((await r.json()) as RetentionCurve);
      } else if (tab === 'revenue') {
        const r = await fetch(`/api/admin/analytics/cohort/revenue?cohort=${cohort}&horizon=${horizon}`);
        if (!r.ok) throw new Error(`Revenue: ${r.status}`);
        setRevenue((await r.json()) as RevenueCurve);
      } else {
        const r = await fetch(`/api/admin/analytics/cohort/compare?cohorts=${compareList}&active=${active}&horizon=${horizon}`);
        if (!r.ok) throw new Error(`Compare: ${r.status}`);
        setComparison((await r.json()) as ComparisonResult);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab, cohort, active, horizon, compareList]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Cohorts</h1>
            <p className="text-sm text-gray-400 mt-1">
              {tab === 'compare' ? `${compareList.split(',').length} cohorts` : `Cohort: ${fmtMonth(cohort)}`}
            </p>
          </div>
          <button
            onClick={load}
            className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      <nav className="flex gap-2 mb-6 border-b border-white/10">
        {(['retention', 'revenue', 'compare'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${
              tab === t ? 'text-white border-b-2 border-copper' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <section className="flex flex-wrap items-center gap-3 mb-6">
        {tab !== 'compare' && (
          <label className="text-xs text-gray-400 inline-flex items-center gap-2">
            Cohort
            <input
              type="month"
              value={cohortInputValue}
              onChange={(e) => setCohort(`${e.target.value}-01`)}
              className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white"
            />
          </label>
        )}
        {tab === 'compare' && (
          <label className="text-xs text-gray-400 inline-flex items-center gap-2">
            Cohorts (comma separated YYYY-MM-01)
            <input
              type="text"
              value={compareList}
              onChange={(e) => setCompareList(e.target.value)}
              className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white w-96 max-w-full"
            />
          </label>
        )}
        {tab !== 'revenue' && (
          <label className="text-xs text-gray-400 inline-flex items-center gap-2">
            Active definition
            <select
              value={active}
              onChange={(e) => setActive(e.target.value as typeof active)}
              className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white"
            >
              <option value="strict">Strict (paid subscription)</option>
              <option value="standard">Standard (any purchase)</option>
              <option value="loose">Loose (logged in)</option>
            </select>
          </label>
        )}
        <label className="text-xs text-gray-400 inline-flex items-center gap-2">
          Horizon (months)
          <input
            type="number"
            min={1}
            max={60}
            value={horizon}
            onChange={(e) => setHorizon(Math.max(1, Math.min(60, Number(e.target.value) || 24)))}
            className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white w-20"
          />
        </label>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && !retention && !revenue && !comparison && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {tab === 'retention' && retention && (
        <RetentionView curve={retention} />
      )}
      {tab === 'revenue' && revenue && (
        <RevenueView curve={revenue} />
      )}
      {tab === 'compare' && comparison && (
        <CompareView result={comparison} />
      )}
    </div>
  );
}

function RetentionView({ curve }: { curve: RetentionCurve }) {
  return (
    <>
      {curve.is_engagement_not_retention && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 inline-flex items-center gap-2">
          <Info className="w-4 h-4" strokeWidth={1.5} />
          Loose definition shown; this is engagement, not retention. Do not use as the LTV basis.
        </div>
      )}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Cohort size" value={curve.cohort_size_initial.toLocaleString()} />
        <Stat label="M1"  value={fmtPct(curve.checkpoints.month_1)} />
        <Stat label="M3"  value={fmtPct(curve.checkpoints.month_3)} />
        <Stat label="M6"  value={fmtPct(curve.checkpoints.month_6)} />
        <Stat label="M12" value={fmtPct(curve.checkpoints.month_12)} />
      </section>
      <p className="md:hidden text-xs text-gray-400 mb-2">Scroll horizontally to see all months.</p>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-400">
            <tr>
              <th className="text-left px-3 py-2">Month</th>
              <th className="text-right px-3 py-2">Active count</th>
              <th className="text-right px-3 py-2">Retention</th>
              <th className="text-left px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {curve.retention_by_month.map((c) => (
              <tr key={c.month_offset} className="border-t border-white/5">
                <td className="px-3 py-2">M{c.month_offset}</td>
                <td className="px-3 py-2 text-right">{c.active_count?.toLocaleString() ?? NA}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtPct(c.retention_rate)}</td>
                <td className="px-3 py-2 text-xs">
                  {c.is_projected ? (
                    <span className="text-amber-300">projected</span>
                  ) : (
                    <span className="text-portal-green">actual</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RevenueView({ curve }: { curve: RevenueCurve }) {
  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Stat label="Cohort size" value={curve.cohort_size_initial.toLocaleString()} />
        <Stat label="Cumulative revenue per customer (M12)" value={fmtUsd(curve.cumulative_revenue_per_customer_by_month[12])} />
        <Stat label="Cumulative contribution per customer (M12)" value={fmtUsd(curve.cumulative_contribution_margin_per_customer_by_month[12])} />
      </section>
      <p className="md:hidden text-xs text-gray-400 mb-2">Scroll horizontally to see all months.</p>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-400">
            <tr>
              <th className="text-left px-3 py-2">Month</th>
              <th className="text-right px-3 py-2">Revenue per customer</th>
              <th className="text-right px-3 py-2">Cumulative revenue</th>
              <th className="text-right px-3 py-2">Cumulative margin</th>
            </tr>
          </thead>
          <tbody>
            {curve.monthly_revenue_per_customer_by_month.map((m, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-3 py-2">M{i}</td>
                <td className="px-3 py-2 text-right">{fmtUsd(m)}</td>
                <td className="px-3 py-2 text-right">{fmtUsd(curve.cumulative_revenue_per_customer_by_month[i])}</td>
                <td className="px-3 py-2 text-right">{fmtUsd(curve.cumulative_contribution_margin_per_customer_by_month[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CompareView({ result }: { result: ComparisonResult }) {
  const months = result.cohorts[0]?.retention_curve.length ?? 0;
  return (
    <>
      {result.comparison_notes.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {result.comparison_notes.map((n, i) => (
            <p key={i} className="inline-flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" strokeWidth={1.5} /> {n}
            </p>
          ))}
        </div>
      )}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {result.cohorts.map((c) => (
          <div key={c.cohort_month} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-gray-400">{c.segment_descriptor}</p>
            <p className="text-lg font-semibold mt-1">{fmtMonth(c.cohort_month)}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-400">Cohort size</p>
                <p className="text-white text-base">{c.cohort_size.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">LTV (24 mo)</p>
                <p className="text-white text-base">{fmtUsd(c.ltv_24mo_cents)}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
      <p className="md:hidden text-xs text-gray-400 mb-2">Scroll horizontally to see all months.</p>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-400">
            <tr>
              <th className="text-left px-3 py-2">Month</th>
              {result.cohorts.map((c) => (
                <th key={c.cohort_month} className="text-right px-3 py-2">{fmtMonth(c.cohort_month)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: months }).map((_, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-3 py-2">M{i}</td>
                {result.cohorts.map((c) => (
                  <td key={c.cohort_month} className="px-3 py-2 text-right">{fmtPct(c.retention_curve[i])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
