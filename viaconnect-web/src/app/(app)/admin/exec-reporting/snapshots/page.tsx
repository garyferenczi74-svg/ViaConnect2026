'use client';

// Prompt #105 Phase 2b.3 — aggregation snapshots list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
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
}

const STATE_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-white/80',
  computing: 'bg-blue-500/20 text-blue-200',
  computed: 'bg-blue-500/30 text-blue-100',
  cfo_review: 'bg-amber-500/25 text-amber-100',
  cfo_approved: 'bg-emerald-500/25 text-emerald-100',
  locked: 'bg-violet-500/30 text-violet-100',
  failed: 'bg-red-500/25 text-red-100',
};

export default function ExecSnapshotsList() {
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data } = await sb
      .from('aggregation_snapshots')
      .select('snapshot_id, period_type, period_start, period_end, as_of_timestamp, state, total_kpis_computed, cfo_reviewed_at')
      .order('as_of_timestamp', { ascending: false })
      .limit(100);
    setRows((data as Snapshot[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/exec-reporting" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Executive reporting
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Aggregation snapshots
        </h1>

        {loading && <p className="text-xs text-white/55">Loading...</p>}

        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-5">
            <p className="text-sm text-white/75">No snapshots yet.</p>
            <p className="text-xs text-white/55 mt-1">
              Snapshots are created by calling exec-compute-snapshot with an aggregate KPI payload.
              They advance through computing, computed, cfo_review, cfo_approved, and locked.
            </p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="text-left font-normal p-3">Period</th>
                  <th className="text-left font-normal p-3">As of</th>
                  <th className="text-left font-normal p-3">KPIs</th>
                  <th className="text-left font-normal p-3">State</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.snapshot_id} className="border-t border-white/[0.05]">
                    <td className="p-3 text-white/85">{r.period_type} {r.period_start} → {r.period_end}</td>
                    <td className="p-3 text-white/70">{r.as_of_timestamp.slice(0, 10)}</td>
                    <td className="p-3 text-white/70">{r.total_kpis_computed}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${STATE_COLORS[r.state] ?? 'bg-white/10 text-white/80'}`}>
                        {r.state}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/admin/exec-reporting/snapshots/${r.snapshot_id}`} className="text-[#E8803A] hover:underline text-xs">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
