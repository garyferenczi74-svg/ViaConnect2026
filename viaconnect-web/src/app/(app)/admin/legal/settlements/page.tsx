'use client';

// Prompt #104 Phase 7: Settlements list + Revenue Recovery KPI.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, ScaleIcon, TrendingUp } from 'lucide-react';

interface Row {
  settlement_id: string;
  case_id: string;
  case_label: string | null;
  settlement_date: string;
  monetary_amount_cents: number;
  currency: string;
  approval_tier: string;
  approved_at: string | null;
  cfo_approved_at: string | null;
  ceo_approved_at: string | null;
  executed_at: string | null;
  payment_received_at: string | null;
}

interface Kpi {
  recovery_ytd_cents: number;
  recovery_lifetime_cents: number;
  paid_settlement_count_ytd: number;
  paid_settlement_count_lifetime: number;
}

export default function SettlementsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paidOnly, setPaidOnly] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (paidOnly) params.set('paid_only', 'true');
      const r = await fetch(`/api/admin/legal/settlements?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
      setKpi(json.kpi ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [paidOnly]);

  function dollar(cents: number) {
    return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/legal" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Legal Ops
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <ScaleIcon className="w-6 h-6" strokeWidth={1.5} /> Settlements
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Approval-tier matched: less than $5K compliance only; $5K to $25K + CFO; over $25K + CEO.
            </p>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      {kpi && (
        <div className="grid gap-3 md:grid-cols-3 mb-6">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1 inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" strokeWidth={1.5} /> Recovery YTD
            </div>
            <div className="text-2xl font-bold text-emerald-300">{dollar(kpi.recovery_ytd_cents)}</div>
            <div className="text-xs text-gray-400 mt-1">{kpi.paid_settlement_count_ytd} paid settlement{kpi.paid_settlement_count_ytd === 1 ? '' : 's'}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Recovery lifetime</div>
            <div className="text-2xl font-bold">{dollar(kpi.recovery_lifetime_cents)}</div>
            <div className="text-xs text-gray-400 mt-1">{kpi.paid_settlement_count_lifetime} paid lifetime</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-gray-400">
            <div className="uppercase tracking-wide text-gray-400 mb-1">Notes</div>
            Recovery YTD counts paid settlements only. Drafted-but-unpaid settlements are excluded.
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <label className="text-xs text-gray-300 inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
          <input type="checkbox" checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} />
          Paid only
        </label>
      </div>

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

      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300">
          No settlements yet.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-gray-400">
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-3 py-2">Case</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Tier</th>
                <th className="text-left px-3 py-2">Settlement date</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = r.payment_received_at
                  ? 'paid'
                  : r.executed_at
                    ? 'executed'
                    : (r.ceo_approved_at || r.cfo_approved_at || r.approved_at)
                      ? 'in_approval'
                      : 'drafted';
                return (
                  <tr key={r.settlement_id} className="border-b border-white/[0.04]">
                    <td className="px-3 py-2">
                      <Link href={`/admin/legal/cases/${r.case_id}/settlement`} className="font-mono hover:text-copper">
                        {r.case_label ?? r.case_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{dollar(r.monetary_amount_cents)} {r.currency}</td>
                    <td className="px-3 py-2 font-mono">{r.approval_tier}</td>
                    <td className="px-3 py-2">{r.settlement_date}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        status === 'paid'
                          ? 'border-emerald-500/40 text-emerald-300'
                          : status === 'executed'
                            ? 'border-sky-500/40 text-sky-300'
                            : status === 'in_approval'
                              ? 'border-amber-500/40 text-amber-300'
                              : 'border-white/10 text-gray-300'
                      }`}>
                        {status}
                      </span>
                    </td>
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
