'use client';

// Prompt #102 Phase 2: admin payouts dashboard.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/payouts/statementGenerator';

interface Totals { pendingRuns: number; pendingNetCents: number; activeBatches: number; disputesPending: number; }

export default function AdminPayoutsDashboardPage() {
  const [t, setT] = useState<Totals | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const [rResp, bResp, dResp] = await Promise.all([
      supabase.from('commission_reconciliation_runs').select('net_payable_cents', { count: 'exact' }).eq('status', 'reconciled'),
      supabase.from('payout_batches').select('batch_id', { count: 'exact', head: true }).in('status', ['draft','pending_admin_approval','approved','executing']),
      supabase.from('payout_disputes').select('dispute_id', { count: 'exact', head: true }).in('status', ['pending_review','more_info_requested']),
    ]);
    const runRows = (rResp.data ?? []) as Array<{ net_payable_cents: number }>;
    setT({
      pendingRuns: rResp.count ?? runRows.length,
      pendingNetCents: runRows.reduce((s, r) => s + Number(r.net_payable_cents ?? 0), 0),
      activeBatches: bResp.count ?? 0,
      disputesPending: dResp.count ?? 0,
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Admin
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Payout operations
        </h1>

        {t && (
          <div className="grid sm:grid-cols-4 gap-3">
            <Card label="Reconciled, unpaid" value={String(t.pendingRuns)} />
            <Card label="Pending net total" value={formatCents(t.pendingNetCents)} />
            <Card label="Active batches" value={String(t.activeBatches)} />
            <Card label="Disputes pending" value={String(t.disputesPending)} />
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/admin/payouts/batches" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 text-xs text-white/85">Batches</Link>
          <Link href="/admin/payouts/disputes" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 text-xs text-white/85">Disputes</Link>
          <Link href="/admin/channels/verification" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 text-xs text-white/85">Channel verification</Link>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/65 mt-1">{label}</p>
    </div>
  );
}
