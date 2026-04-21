'use client';

// Prompt #105 Phase 2b.3 — snapshot detail + CFO approval screen.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Snapshot {
  snapshot_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  as_of_timestamp: string;
  state: string;
  total_kpis_computed: number;
  cfo_reviewed_at: string | null;
  cfo_review_notes: string | null;
}

interface KPIRow {
  snapshot_id: string;
  kpi_id: string;
  kpi_version: number;
  unit: string;
  computed_value_numeric: number | null;
  computed_value_integer: number | null;
  prior_period_value: number | null;
  comparison_delta_pct: number | null;
  provenance_json: Record<string, unknown>;
  kpi_library?: { display_name: string };
}

export default function SnapshotDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [kpis, setKpis] = useState<KPIRow[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data: s } = await sb
      .from('aggregation_snapshots')
      .select('snapshot_id, period_type, period_start, period_end, as_of_timestamp, state, total_kpis_computed, cfo_reviewed_at, cfo_review_notes')
      .eq('snapshot_id', params.id)
      .maybeSingle();
    setSnap(s as Snapshot | null);
    if (s) {
      const { data: k } = await sb
        .from('board_pack_kpi_snapshots')
        .select(`
          snapshot_id, kpi_id, kpi_version, unit,
          computed_value_numeric, computed_value_integer,
          prior_period_value, comparison_delta_pct, provenance_json,
          kpi_library!inner(display_name)
        `)
        .eq('aggregation_snapshot_id', params.id);
      setKpis((k as KPIRow[] | null) ?? []);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const transition = async (toState: string) => {
    if (!snap) return;
    setBusy(true);
    setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data, error } = await sb.functions.invoke('exec-transition-snapshot', {
      body: { snapshotId: snap.snapshot_id, toState, notes: notes || undefined },
    });
    setBusy(false);
    if (error || (data && (data as { error?: string }).error)) {
      setErr((error?.message as string) ?? (data as { error?: string; detail?: string }).detail ?? 'Transition failed');
      return;
    }
    setNotes('');
    await load();
  };

  if (!snap) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-6">
        <Link href="/admin/exec-reporting/snapshots" className="text-xs text-white/60">← Snapshots</Link>
        <p className="mt-4 text-sm text-white/70">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/exec-reporting/snapshots" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Snapshots
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5 space-y-3">
          <h1 className="text-lg font-semibold">
            {snap.period_type} {snap.period_start} → {snap.period_end}
          </h1>
          <div className="flex gap-4 text-xs text-white/70">
            <span>As of: {snap.as_of_timestamp.slice(0, 10)}</span>
            <span>KPIs computed: {snap.total_kpis_computed}</span>
            <span>State: <span className="text-white font-medium">{snap.state}</span></span>
          </div>
          {snap.cfo_reviewed_at && (
            <p className="text-xs text-white/60">
              CFO reviewed {snap.cfo_reviewed_at.slice(0, 19).replace('T', ' ')}
              {snap.cfo_review_notes ? ` — "${snap.cfo_review_notes}"` : ''}
            </p>
          )}
        </div>

        {/* Transition controls */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/40 p-4 space-y-3">
          <p className="text-xs font-medium text-white/85">Transitions</p>
          {snap.state === 'computed' && (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Review notes (optional)"
                className="w-full rounded-lg bg-black/30 border border-white/[0.08] p-2 text-xs"
                rows={2}
              />
              <button
                onClick={() => transition('cfo_review')}
                disabled={busy}
                className="rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 px-3 py-1.5 text-xs font-medium"
              >
                Move to CFO review
              </button>
            </>
          )}
          {snap.state === 'cfo_review' && (
            <div className="flex gap-2">
              <button
                onClick={() => transition('cfo_approved')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 px-3 py-1.5 text-xs font-medium"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> CFO approve
              </button>
              <button
                onClick={() => transition('draft')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} /> Return to draft
              </button>
            </div>
          )}
          {snap.state === 'cfo_approved' && (
            <button
              onClick={() => transition('locked')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/25 hover:bg-violet-500/40 text-violet-100 px-3 py-1.5 text-xs font-medium"
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> Lock snapshot
            </button>
          )}
          {snap.state === 'locked' && (
            <p className="text-xs text-violet-200">
              Locked — immutable forever. All downstream packs reference these KPI values.
            </p>
          )}
          {err && <p className="text-xs text-red-300">{err}</p>}
        </div>

        {/* KPIs */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          <div className="p-3 border-b border-white/[0.08]">
            <p className="text-xs font-medium text-white/85">KPIs ({kpis.length})</p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-black/20 text-white/60">
              <tr>
                <th className="text-left font-normal p-3">KPI</th>
                <th className="text-right font-normal p-3">Value</th>
                <th className="text-right font-normal p-3">Prior</th>
                <th className="text-right font-normal p-3">Δ</th>
                <th className="text-left font-normal p-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => {
                const v = k.computed_value_numeric ?? k.computed_value_integer;
                const delta = k.comparison_delta_pct !== null
                  ? `${k.comparison_delta_pct > 0 ? '+' : ''}${(k.comparison_delta_pct * 100).toFixed(1)}%`
                  : '';
                return (
                  <tr key={`${k.kpi_id}-${k.kpi_version}`} className="border-t border-white/[0.05]">
                    <td className="p-3 text-white/85">
                      {k.kpi_library?.display_name ?? k.kpi_id}
                      <span className="text-white/40 text-[10px] ml-2">v{k.kpi_version}</span>
                    </td>
                    <td className="p-3 text-right text-white/85 tabular-nums">
                      {v !== null ? v.toLocaleString('en-US') : '—'}
                    </td>
                    <td className="p-3 text-right text-white/60 tabular-nums">
                      {k.prior_period_value !== null ? k.prior_period_value.toLocaleString('en-US') : '—'}
                    </td>
                    <td className="p-3 text-right text-white/70 tabular-nums">{delta}</td>
                    <td className="p-3 text-white/55">{k.unit}</td>
                  </tr>
                );
              })}
              {kpis.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-xs text-white/55">
                    No KPI snapshots yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
