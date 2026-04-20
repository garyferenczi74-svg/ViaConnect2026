'use client';

// Prompt #101 Phase 4: practitioner VIP exemption list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type {
  MAPVIPExemptionReason,
  MAPVIPExemptionStatus,
} from '@/lib/map/vip/types';

interface VIPRow {
  vip_exemption_id: string;
  product_id: string;
  reason: MAPVIPExemptionReason;
  status: MAPVIPExemptionStatus;
  exemption_start_at: string;
  exemption_end_at: string;
  exempted_price_cents: number;
}

const STATUS_TONE: Record<MAPVIPExemptionStatus, string> = {
  pending_approval: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  active: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  expired_auto: 'bg-white/[0.04] text-white/50 border-white/10',
  revoked: 'bg-red-500/15 text-red-300 border-red-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function PractitionerVIPListPage() {
  const [rows, setRows] = useState<VIPRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('map_vip_exemptions')
      .select('vip_exemption_id, product_id, reason, status, exemption_start_at, exemption_end_at, exempted_price_cents')
      .order('created_at', { ascending: false });
    setRows((data ?? []) as VIPRow[]);
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
              <Users className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
              VIP customer exemptions
            </h1>
            <p className="text-xs text-white/55 mt-1">
              Customer-specific below-MAP pricing. Max 5 active concurrent; auto-expire after 180 days of no orders.
            </p>
          </div>
          <Link
            href="/practitioner/map/vip-exemptions/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> New exemption
          </Link>
        </div>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No VIP exemptions yet.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.vip_exemption_id} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white font-semibold">{r.reason.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-white/55">
                    {new Date(r.exemption_start_at).toLocaleDateString()} to {new Date(r.exemption_end_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border ${STATUS_TONE[r.status]}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
