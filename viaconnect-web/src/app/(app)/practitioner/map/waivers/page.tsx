'use client';

// Prompt #101 Phase 4: practitioner waiver list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { WaiverListCard } from '@/components/practitioner/map/waivers/WaiverListCard';
import type { MAPWaiverStatus, MAPWaiverType } from '@/lib/map/waivers/types';

interface WaiverRow {
  waiver_id: string;
  waiver_type: MAPWaiverType;
  status: MAPWaiverStatus;
  scope_description: string;
  waiver_start_at: string;
  waiver_end_at: string;
}

export default function PractitionerWaiversListPage() {
  const [rows, setRows] = useState<WaiverRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('map_waivers')
      .select('waiver_id, waiver_type, status, scope_description, waiver_start_at, waiver_end_at')
      .order('created_at', { ascending: false });
    setRows((data ?? []) as WaiverRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/practitioner/map/violations" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Compliance
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
              MAP waivers
            </h1>
            <p className="text-xs text-white/55 mt-1">
              Request a temporary below-MAP price for a legitimate circumstance. Max 3 active concurrent; margin floor always preserved.
            </p>
          </div>
          <Link
            href="/practitioner/map/waivers/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> New waiver
          </Link>
        </div>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No waiver history yet. Request one when you need below-MAP pricing for a bounded campaign.</p>
          </section>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <WaiverListCard
                key={r.waiver_id}
                waiverId={r.waiver_id}
                waiverType={r.waiver_type}
                status={r.status}
                scopeDescription={r.scope_description}
                waiverStartAt={r.waiver_start_at}
                waiverEndAt={r.waiver_end_at}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
