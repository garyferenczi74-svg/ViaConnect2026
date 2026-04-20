'use client';

// Prompt #102 Phase 2: practitioner dispute list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Dispute { dispute_id: string; dispute_reason: string; status: string; created_at: string; resolution_notes: string | null; }

const STATUS_TONE: Record<string, string> = {
  pending_review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  more_info_requested: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  partially_approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function DisputesListPage() {
  const [rows, setRows] = useState<Dispute[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('payout_disputes')
      .select('dispute_id, dispute_reason, status, created_at, resolution_notes')
      .order('created_at', { ascending: false });
    setRows((data ?? []) as Dispute[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/practitioner/operations/payouts" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Payouts
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Disputes
        </h1>
        <p className="text-xs text-white/55">
          Contest a claw-back or MAP-violation hold. The disputed amount is held in escrow; the rest of your payout flows normally.
        </p>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No disputes.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {rows.map((d) => (
              <li key={d.dispute_id} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white font-semibold">{d.dispute_reason.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-white/55">{new Date(d.created_at).toLocaleDateString()}</p>
                  {d.resolution_notes && <p className="text-[10px] text-white/55 mt-1">{d.resolution_notes}</p>}
                </div>
                <span className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border ${STATUS_TONE[d.status] ?? ''}`}>
                  {d.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
