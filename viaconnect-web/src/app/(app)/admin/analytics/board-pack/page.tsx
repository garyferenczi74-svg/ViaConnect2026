'use client';

// Prompt #94 Phase 7.4: Board pack page.
// Renders the latest overall snapshot + 12-month trend + archetype
// distribution + active alerts in a print-optimized layout. The user
// generates a PDF via the browser's native Print to PDF; this avoids
// adding a heavyweight PDF dependency to the bundle.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Printer,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const supabase = createClient();

interface SnapshotRow {
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
  gross_revenue_retention_percent: number | null;
  monthly_churn_rate_percent: number | null;
  arr_cents: number | null;
  mrr_cents: number | null;
  arpu_cents: number | null;
}

interface ArchetypeDist { archetype_id: string; display_name: string; count: number }
interface AlertRow {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  snapshot_month: string;
  current_value: number | null;
  threshold_value: number | null;
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
const fmtPct = (n: number | null) => n == null ? NA : `${n.toFixed(1)}%`;
const fmtRatio = (n: number | null) => n == null ? NA : `${n.toFixed(2)}x`;
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short' });
const fmtMonthLong = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'long' });

export default function BoardPackPage() {
  const [latest, setLatest] = useState<SnapshotRow | null>(null);
  const [trend, setTrend] = useState<SnapshotRow[]>([]);
  const [archetypes, setArchetypes] = useState<ArchetypeDist[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const sb = supabase as any;
      const [
        { data: snaps },
        { data: defs },
        { data: assigns },
        { data: alertRows },
      ] = await Promise.all([
        sb.from('unit_economics_snapshots')
          .select('snapshot_month, active_customers_count, new_customers_count, churned_customers_count, total_revenue_cents, contribution_margin_cents, contribution_margin_percent, marketing_spend_cents, blended_cac_cents, payback_period_months, ltv_24mo_cents, ltv_cac_ratio_24mo, net_revenue_retention_percent, gross_revenue_retention_percent, monthly_churn_rate_percent, arr_cents, mrr_cents, arpu_cents')
          .eq('segment_type', 'overall')
          .eq('segment_value', 'all')
          .order('snapshot_month', { ascending: false })
          .limit(12),
        sb.from('archetype_definitions')
          .select('id, display_name, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        sb.from('customer_archetypes')
          .select('archetype_id')
          .eq('is_primary', true),
        sb.from('unit_economics_alerts')
          .select('id, alert_type, severity, message, snapshot_month, current_value, threshold_value')
          .eq('is_acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const snapsArr = (snaps ?? []) as SnapshotRow[];
      setLatest(snapsArr[0] ?? null);
      setTrend([...snapsArr].sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month)));

      const defsArr = (defs ?? []) as Array<{ id: string; display_name: string; sort_order: number }>;
      const assignsArr = (assigns ?? []) as Array<{ archetype_id: string }>;
      const counts = new Map<string, number>();
      for (const a of assignsArr) counts.set(a.archetype_id, (counts.get(a.archetype_id) ?? 0) + 1);
      setArchetypes(defsArr.map((d) => ({ archetype_id: d.id, display_name: d.display_name, count: counts.get(d.id) ?? 0 })));

      setAlerts((alertRows ?? []) as AlertRow[]);
      setLoading(false);
    })();
  }, []);

  const totalAssigned = useMemo(() => archetypes.reduce((s, a) => s + a.count, 0), [archetypes]);

  return (
    <div className="min-h-screen bg-white text-gray-900 print:p-0">
      <div className="print:hidden border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white sticky top-0">
        <Link href="/admin/analytics" className="text-xs text-gray-600 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-900 text-white text-sm hover:bg-gray-800"
        >
          <Printer className="w-4 h-4" strokeWidth={1.5} /> Print to PDF
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 print:py-4">
        <header className="mb-6 border-b border-gray-200 pb-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">FarmCeutica Wellness ; Unit Economics Board Pack</p>
          <h1 className="text-3xl font-bold mt-1">{latest ? fmtMonthLong(latest.snapshot_month) : 'Latest period'}</h1>
          <p className="text-xs text-gray-500 mt-1">Generated {new Date().toLocaleDateString()}</p>
        </header>

        {loading && (
          <div className="text-sm text-gray-500 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
          </div>
        )}

        {!loading && !latest && (
          <div className="border border-gray-200 rounded p-6 text-sm">
            No snapshots have been generated yet. Once the monthly snapshot tick runs (1st of each month at 06:00 UTC), the board pack will populate.
          </div>
        )}

        {!loading && latest && (
          <>
            <Section title="Headline metrics">
              <Grid>
                <Pill label="ARR"           value={fmtBigUsd(latest.arr_cents)} />
                <Pill label="MRR"           value={fmtBigUsd(latest.mrr_cents)} />
                <Pill label="ARPU"          value={fmtUsd(latest.arpu_cents)} />
                <Pill label="Active"        value={(latest.active_customers_count ?? 0).toLocaleString()} />
                <Pill label="Blended CAC"   value={fmtUsd(latest.blended_cac_cents)} />
                <Pill label="LTV (24 mo)"   value={fmtUsd(latest.ltv_24mo_cents)} />
                <Pill label="LTV : CAC"     value={fmtRatio(latest.ltv_cac_ratio_24mo)} />
                <Pill label="Payback"       value={latest.payback_period_months != null ? `${latest.payback_period_months.toFixed(1)} mo` : NA} />
                <Pill label="Margin %"      value={fmtPct(latest.contribution_margin_percent)} />
                <Pill label="NRR"           value={fmtPct(latest.net_revenue_retention_percent)} />
                <Pill label="GRR"           value={fmtPct(latest.gross_revenue_retention_percent)} />
                <Pill label="Monthly churn" value={fmtPct(latest.monthly_churn_rate_percent)} />
              </Grid>
            </Section>

            <Section title="Twelve-month trend">
              <table className="w-full text-xs border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1.5">Month</th>
                    <th className="text-right px-2 py-1.5">ARR</th>
                    <th className="text-right px-2 py-1.5">Active</th>
                    <th className="text-right px-2 py-1.5">New</th>
                    <th className="text-right px-2 py-1.5">Churned</th>
                    <th className="text-right px-2 py-1.5">CAC</th>
                    <th className="text-right px-2 py-1.5">LTV (24 mo)</th>
                    <th className="text-right px-2 py-1.5">LTV : CAC</th>
                    <th className="text-right px-2 py-1.5">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((r) => (
                    <tr key={r.snapshot_month} className="border-t border-gray-200">
                      <td className="px-2 py-1.5">{fmtMonth(r.snapshot_month)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtBigUsd(r.arr_cents)}</td>
                      <td className="px-2 py-1.5 text-right">{r.active_customers_count.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{r.new_customers_count.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{r.churned_customers_count.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{fmtUsd(r.blended_cac_cents)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtUsd(r.ltv_24mo_cents)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtRatio(r.ltv_cac_ratio_24mo)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtPct(r.contribution_margin_percent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title={`Archetype distribution ; total assigned: ${totalAssigned.toLocaleString()}`}>
              <div className="space-y-1.5">
                {archetypes.map((a) => {
                  const pct = totalAssigned > 0 ? (a.count / totalAssigned) * 100 : 0;
                  return (
                    <div key={a.archetype_id} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span>{a.display_name}</span>
                        <span className="text-gray-600">{a.count.toLocaleString()} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded">
                        <div className="h-full bg-copper rounded" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Active alerts">
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-500">No active alerts.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {alerts.map((a) => (
                    <li key={a.id} className="border border-gray-200 rounded p-3 flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${a.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'}`} strokeWidth={1.5} />
                      <div>
                        <p className="font-medium">{a.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Type: {a.alert_type} ; severity: {a.severity} ; month: {fmtMonth(a.snapshot_month)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 print:break-inside-avoid">
      <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">{children}</div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}
