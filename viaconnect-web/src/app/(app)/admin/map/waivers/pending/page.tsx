'use client';

// Prompt #101 Phase 5: admin waiver approval queue.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PendingWaiver {
  waiver_id: string;
  waiver_type: string;
  practitioner_id: string;
  scope_description: string;
  justification: string;
  waiver_start_at: string;
  waiver_end_at: string;
  created_at: string;
}

export default function AdminWaiverPendingPage() {
  const [rows, setRows] = useState<PendingWaiver[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('map_waivers')
      .select('waiver_id, waiver_type, practitioner_id, scope_description, justification, waiver_start_at, waiver_end_at, created_at')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });
    setRows((data ?? []) as PendingWaiver[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (waiverId: string, outcome: 'approve'|'reject'|'info_request') => {
    setBusy(waiverId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) return;

      if (outcome === 'approve') {
        await supabase.from('map_waivers').update({
          status: 'active',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        }).eq('waiver_id', waiverId);
      } else if (outcome === 'reject') {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        await supabase.from('map_waivers').update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        }).eq('waiver_id', waiverId);
      } else {
        const note = prompt('Information request note for practitioner:');
        if (!note) return;
        await supabase.from('map_waivers').update({
          status: 'info_requested',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_notes: note,
        }).eq('waiver_id', waiverId);
      }
      await refresh();
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Waivers pending approval
        </h1>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">Queue is clear.</p>
          </section>
        ) : (
          <ul className="space-y-3">
            {rows.map((w) => (
              <li key={w.waiver_id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-semibold">{w.waiver_type.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-white/50 font-mono">Practitioner {w.practitioner_id.slice(0, 8)}</p>
                  </div>
                  <p className="text-[10px] text-white/55">
                    {new Date(w.waiver_start_at).toLocaleDateString()} to {new Date(w.waiver_end_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-[11px] text-white/70 line-clamp-3">{w.scope_description}</p>
                <p className="text-[11px] text-white/55 italic line-clamp-4">{w.justification}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => act(w.waiver_id, 'approve')} disabled={busy === w.waiver_id} className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-1 text-[11px] text-emerald-200 font-semibold disabled:opacity-50">
                    Approve
                  </button>
                  <button onClick={() => act(w.waiver_id, 'info_request')} disabled={busy === w.waiver_id} className="rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 px-3 py-1 text-[11px] text-sky-200 disabled:opacity-50">
                    Request info
                  </button>
                  <button onClick={() => act(w.waiver_id, 'reject')} disabled={busy === w.waiver_id} className="rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 px-3 py-1 text-[11px] text-red-200 disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
