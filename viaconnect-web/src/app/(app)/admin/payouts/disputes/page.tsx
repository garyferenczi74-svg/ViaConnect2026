'use client';

// Prompt #102 Phase 2: admin disputes queue.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Dispute {
  dispute_id: string;
  practitioner_id: string;
  dispute_reason: string;
  practitioner_explanation: string;
  status: string;
  created_at: string;
}

export default function AdminDisputesQueuePage() {
  const [rows, setRows] = useState<Dispute[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('payout_disputes')
      .select('dispute_id, practitioner_id, dispute_reason, practitioner_explanation, status, created_at')
      .in('status', ['pending_review', 'more_info_requested'])
      .order('created_at', { ascending: true });
    setRows((data ?? []) as Dispute[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (id: string, outcome: 'approve' | 'reject') => {
    setBusy(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      const notes = prompt(`${outcome === 'approve' ? 'Resolution' : 'Rejection'} notes:`);
      if (!notes) return;
      await supabase.from('payout_disputes').update({
        status: outcome === 'approve' ? 'approved' : 'rejected',
        reviewer_id: userId,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      }).eq('dispute_id', id);
      await refresh();
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/payouts" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Payouts
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Disputes pending review
        </h1>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">Queue is clear.</p>
          </section>
        ) : (
          <ul className="space-y-3">
            {rows.map((d) => (
              <li key={d.dispute_id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-semibold">{d.dispute_reason.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-white/50 font-mono">Practitioner {d.practitioner_id.slice(0, 8)}</p>
                  </div>
                  <span className="text-[10px] text-white/55">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[11px] text-white/70 line-clamp-4">{d.practitioner_explanation}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => act(d.dispute_id, 'approve')} disabled={busy === d.dispute_id} className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-1 text-[11px] text-emerald-200 font-semibold disabled:opacity-50">
                    Approve
                  </button>
                  <button onClick={() => act(d.dispute_id, 'reject')} disabled={busy === d.dispute_id} className="rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 px-3 py-1 text-[11px] text-red-200 disabled:opacity-50">
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
