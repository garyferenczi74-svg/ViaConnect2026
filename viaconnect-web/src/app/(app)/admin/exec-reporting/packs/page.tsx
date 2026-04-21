'use client';

// Prompt #105 Phase 2b.3 — board packs list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Pack {
  pack_id: string;
  short_code: string;
  pack_title: string;
  period_type: string;
  period_start: string;
  period_end: string;
  state: string;
  cfo_approved_at: string | null;
  ceo_issued_at: string | null;
  created_at: string;
}

const STATE_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-white/80',
  mdna_pending: 'bg-blue-500/20 text-blue-200',
  mdna_drafted: 'bg-blue-500/30 text-blue-100',
  cfo_review: 'bg-amber-500/25 text-amber-100',
  cfo_approved: 'bg-emerald-500/25 text-emerald-100',
  pending_ceo_approval: 'bg-orange-500/30 text-orange-100',
  issued: 'bg-violet-500/30 text-violet-100',
  erratum_issued: 'bg-red-500/20 text-red-200',
  archived: 'bg-white/5 text-white/50',
};

export default function ExecPacksList() {
  const [rows, setRows] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data } = await sb
      .from('board_packs')
      .select('pack_id, short_code, pack_title, period_type, period_start, period_end, state, cfo_approved_at, ceo_issued_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setRows((data as Pack[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/exec-reporting" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Executive reporting
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Board packs
        </h1>

        {loading && <p className="text-xs text-white/55">Loading...</p>}

        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-5">
            <p className="text-sm text-white/75">No packs yet.</p>
            <p className="text-xs text-white/55 mt-1">
              Packs are created from a locked aggregation snapshot + a board pack template.
            </p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="text-left font-normal p-3">Pack</th>
                  <th className="text-left font-normal p-3">Period</th>
                  <th className="text-left font-normal p-3">State</th>
                  <th className="text-left font-normal p-3">CFO</th>
                  <th className="text-left font-normal p-3">CEO</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.pack_id} className="border-t border-white/[0.05]">
                    <td className="p-3">
                      <p className="text-white/90">{r.pack_title}</p>
                      <p className="text-[10px] text-white/50">{r.short_code}</p>
                    </td>
                    <td className="p-3 text-white/75">{r.period_type} {r.period_start} → {r.period_end}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${STATE_COLORS[r.state] ?? 'bg-white/10 text-white/80'}`}>
                        {r.state}
                      </span>
                    </td>
                    <td className="p-3 text-white/65">{r.cfo_approved_at ? r.cfo_approved_at.slice(0, 10) : '—'}</td>
                    <td className="p-3 text-white/65">{r.ceo_issued_at ? r.ceo_issued_at.slice(0, 10) : '—'}</td>
                    <td className="p-3 text-right">
                      <Link href={`/admin/exec-reporting/packs/${r.pack_id}`} className="text-[#E8803A] hover:underline">
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
