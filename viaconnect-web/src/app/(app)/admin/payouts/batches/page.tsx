'use client';

// Prompt #102 Phase 2: admin payout batches list + create.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/payouts/statementGenerator';

interface Batch {
  batch_id: string;
  batch_label: string;
  period_start: string;
  period_end: string;
  status: string;
  total_lines_count: number;
  total_payout_cents: number;
  created_at: string;
}

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-white/[0.06] text-white/60 border-white/10',
  pending_admin_approval: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  executing: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
  cancelled: 'bg-white/[0.04] text-white/50 border-white/10',
};

export default function AdminBatchesListPage() {
  const [rows, setRows] = useState<Batch[]>([]);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('payout_batches').select('*').order('created_at', { ascending: false }).limit(50);
    setRows((data ?? []) as Batch[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createBatch = async () => {
    setCreating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) return;

      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      await supabase.from('payout_batches').insert({
        batch_label: `Payout ${startStr} to ${endStr}`,
        period_start: startStr,
        period_end: endStr,
        created_by: userId,
      });
      await refresh();
    } finally { setCreating(false); }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/payouts" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Payouts
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Payout batches</h1>
          <button onClick={createBatch} disabled={creating} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> {creating ? 'Creating...' : 'New batch'}
          </button>
        </div>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No batches yet.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {rows.map((b) => (
              <li key={b.batch_id}>
                <Link href={`/admin/payouts/batches/${b.batch_id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3">
                  <div>
                    <p className="text-sm text-white font-semibold">{b.batch_label}</p>
                    <p className="text-[10px] text-white/55">{b.total_lines_count} lines · {formatCents(b.total_payout_cents)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border ${STATUS_TONE[b.status] ?? ''}`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
