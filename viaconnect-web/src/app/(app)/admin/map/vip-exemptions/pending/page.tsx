'use client';

// Prompt #101 Phase 5: admin VIP exemption approval queue.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PendingVIP {
  vip_exemption_id: string;
  practitioner_id: string;
  product_id: string;
  reason: string;
  exempted_price_cents: number;
  exemption_start_at: string;
  exemption_end_at: string;
  created_at: string;
}

export default function AdminVIPPendingPage() {
  const [rows, setRows] = useState<PendingVIP[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('map_vip_exemptions')
      .select('vip_exemption_id, practitioner_id, product_id, reason, exempted_price_cents, exemption_start_at, exemption_end_at, created_at')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });
    setRows((data ?? []) as PendingVIP[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (id: string, outcome: 'approve'|'reject') => {
    setBusy(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) return;
      if (outcome === 'approve') {
        await supabase.from('map_vip_exemptions').update({
          status: 'active', reviewed_by: userId, reviewed_at: new Date().toISOString(),
        }).eq('vip_exemption_id', id);
      } else {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        await supabase.from('map_vip_exemptions').update({
          status: 'rejected', reviewed_by: userId, reviewed_at: new Date().toISOString(),
          revocation_reason: reason,
        }).eq('vip_exemption_id', id);
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
          <Users className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          VIP exemptions pending approval
        </h1>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">Queue is clear.</p>
          </section>
        ) : (
          <ul className="space-y-3">
            {rows.map((v) => (
              <li key={v.vip_exemption_id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-semibold">{v.reason.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-white/50 font-mono">
                      Practitioner {v.practitioner_id.slice(0, 8)} / Product {v.product_id.slice(0, 8)}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/55">
                    ${(v.exempted_price_cents / 100).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => act(v.vip_exemption_id, 'approve')} disabled={busy === v.vip_exemption_id} className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-1 text-[11px] text-emerald-200 font-semibold disabled:opacity-50">
                    Approve
                  </button>
                  <button onClick={() => act(v.vip_exemption_id, 'reject')} disabled={busy === v.vip_exemption_id} className="rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 px-3 py-1 text-[11px] text-red-200 disabled:opacity-50">
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
