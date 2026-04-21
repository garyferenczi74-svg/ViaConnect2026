'use client';

// Prompt #105 Phase 2b.3 — executive reporting admin landing.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileBarChart2, LayoutGrid, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Totals {
  snapshotsDraft: number;
  snapshotsCfoReview: number;
  snapshotsLocked: number;
  packsDraft: number;
  packsCfoReview: number;
  packsPendingCeo: number;
  packsIssued: number;
}

export default function ExecReportingAdminLanding() {
  const [t, setT] = useState<Totals | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const countEq = async (table: string, col: string, val: string) => {
      const r = await sb.from(table).select(col, { count: 'exact', head: true }).eq(col, val);
      return (r.count as number | null) ?? 0;
    };
    const [sD, sR, sL, pD, pC, pP, pI] = await Promise.all([
      countEq('aggregation_snapshots', 'state', 'draft'),
      countEq('aggregation_snapshots', 'state', 'cfo_review'),
      countEq('aggregation_snapshots', 'state', 'locked'),
      countEq('board_packs', 'state', 'draft'),
      countEq('board_packs', 'state', 'cfo_review'),
      countEq('board_packs', 'state', 'pending_ceo_approval'),
      countEq('board_packs', 'state', 'issued'),
    ]);
    setT({
      snapshotsDraft: sD, snapshotsCfoReview: sR, snapshotsLocked: sL,
      packsDraft: pD, packsCfoReview: pC, packsPendingCeo: pP, packsIssued: pI,
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
          <FileBarChart2 className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Executive reporting
        </h1>
        <p className="text-xs text-white/60 max-w-2xl">
          Quarterly and annual board packs. Every KPI traces through a locked
          aggregation snapshot; every distribution carries a per-recipient
          watermark; issued packs are immutable.
        </p>

        {t && (
          <>
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-white/55" strokeWidth={1.5} />
                Aggregation snapshots
              </h2>
              <div className="grid sm:grid-cols-3 gap-3">
                <Card label="Draft" value={String(t.snapshotsDraft)} />
                <Card label="CFO review" value={String(t.snapshotsCfoReview)} />
                <Card label="Locked" value={String(t.snapshotsLocked)} />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
                <FileText className="h-4 w-4 text-white/55" strokeWidth={1.5} />
                Board packs
              </h2>
              <div className="grid sm:grid-cols-4 gap-3">
                <Card label="Draft" value={String(t.packsDraft)} />
                <Card label="CFO review" value={String(t.packsCfoReview)} />
                <Card label="Pending CEO" value={String(t.packsPendingCeo)} />
                <Card label="Issued" value={String(t.packsIssued)} />
              </div>
            </div>
          </>
        )}

        <div className="grid sm:grid-cols-3 gap-3 pt-4">
          <Link href="/admin/exec-reporting/snapshots" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 text-xs text-white/85">
            Snapshots
          </Link>
          <Link href="/admin/exec-reporting/packs" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 text-xs text-white/85">
            Packs
          </Link>
          <Link href="/admin/exec-reporting/members" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 text-xs text-white/85">
            Board members
          </Link>
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
