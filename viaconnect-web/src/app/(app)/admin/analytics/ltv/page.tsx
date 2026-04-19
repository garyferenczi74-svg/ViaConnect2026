'use client';

// Prompt #94 Phase 6.3: LTV analytics page.
// Calls /api/admin/analytics/ltv with cohort + segment selection. Renders
// LTV at 12/24/36 mo with explicit "projected" badges + a per-month
// contribution-margin curve table.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface LTVResult {
  cohort_month: string;
  segment_type: string;
  segment_value: string;
  cohort_size: number;
  contribution_margin_per_customer_by_month: number[];
  cumulative_ltv_per_customer_by_month: number[];
  ltv_12mo_cents: number;
  ltv_24mo_cents: number;
  ltv_36mo_cents: number;
  is_12mo_projected: boolean;
  is_24mo_projected: boolean;
  is_36mo_projected: boolean;
  retention_curve: number[];
  projection_method: string;
}

const NA = 'n/a';
const fmtUsd = (c: number | null) =>
  c == null ? NA : `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'long' });

function defaultCohort(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const SEGMENTS = [
  { value: 'overall',                label: 'Overall' },
  { value: 'tier',                   label: 'Tier' },
  { value: 'archetype',              label: 'Archetype' },
  { value: 'channel',                label: 'Channel' },
  { value: 'practitioner_attached',  label: 'Practitioner attached' },
] as const;

export default function LTVPage() {
  const [cohort, setCohort] = useState<string>(defaultCohort);
  const [segmentType, setSegmentType] = useState<typeof SEGMENTS[number]['value']>('overall');
  const [segmentValue, setSegmentValue] = useState<string>('');
  const [result, setResult] = useState<LTVResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cohortInputValue = useMemo(() => cohort.slice(0, 7), [cohort]);

  async function reload() {
    if (segmentType !== 'overall' && !segmentValue) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ cohort, segment_type: segmentType });
      if (segmentType !== 'overall') params.set('segment_value', segmentValue);
      const r = await fetch(`/api/admin/analytics/ltv?${params.toString()}`);
      if (!r.ok) throw new Error(`LTV: ${r.status}`);
      setResult((await r.json()) as LTVResult);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (segmentType === 'overall') reload();
  }, [cohort, segmentType]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Lifetime Value</h1>
            <p className="text-sm text-gray-400 mt-1">Cohort: {fmtMonth(cohort)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-gray-400 inline-flex items-center gap-2">
              Cohort
              <input
                type="month"
                value={cohortInputValue}
                onChange={(e) => setCohort(`${e.target.value}-01`)}
                className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white"
              />
            </label>
            <label className="text-xs text-gray-400 inline-flex items-center gap-2">
              Segment
              <select
                value={segmentType}
                onChange={(e) => { setSegmentType(e.target.value as any); setSegmentValue(''); }}
                className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white"
              >
                {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            {segmentType !== 'overall' && (
              <input
                type="text"
                value={segmentValue}
                onChange={(e) => setSegmentValue(e.target.value)}
                placeholder={segmentType === 'practitioner_attached' ? 'true or false' : `${segmentType} id`}
                className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-gray-500"
              />
            )}
            <button
              onClick={reload}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Run
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && !result && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {result && (
        <>
          <div className="mb-6 text-xs text-gray-400">
            Cohort size: <span className="text-white font-medium">{result.cohort_size.toLocaleString()}</span>
            ; projection method: <span className="text-white">{result.projection_method}</span>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            <Horizon label="LTV (12 mo)" cents={result.ltv_12mo_cents} projected={result.is_12mo_projected} />
            <Horizon label="LTV (24 mo)" cents={result.ltv_24mo_cents} projected={result.is_24mo_projected} />
            <Horizon label="LTV (36 mo)" cents={result.ltv_36mo_cents} projected={result.is_36mo_projected} />
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Cumulative LTV per customer, by month</h2>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400">
                  <tr>
                    <th className="text-left px-3 py-2">Month offset</th>
                    <th className="text-right px-3 py-2">Contribution margin per customer</th>
                    <th className="text-right px-3 py-2">Cumulative LTV per customer</th>
                    <th className="text-right px-3 py-2">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cumulative_ltv_per_customer_by_month.slice(0, 36).map((cum, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-3 py-2">M{i}</td>
                      <td className="px-3 py-2 text-right">{fmtUsd(result.contribution_margin_per_customer_by_month[i])}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtUsd(cum)}</td>
                      <td className="px-3 py-2 text-right">{result.retention_curve[i] != null ? `${(result.retention_curve[i] * 100).toFixed(1)}%` : NA}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Horizon({ label, cents, projected }: { label: string; cents: number; projected: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-2">
        <TrendingUp className="w-4 h-4 text-copper" strokeWidth={1.5} />
        {projected && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Projected
          </span>
        )}
      </div>
      <p className="text-2xl md:text-3xl font-semibold">{fmtUsd(cents)}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
