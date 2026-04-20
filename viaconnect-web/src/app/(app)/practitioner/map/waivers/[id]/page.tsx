'use client';

// Prompt #101 Phase 4: waiver detail view.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MAPWaiverStatus, MAPWaiverType } from '@/lib/map/waivers/types';

interface Waiver {
  waiver_id: string;
  waiver_type: MAPWaiverType;
  status: MAPWaiverStatus;
  scope_description: string;
  scope_urls: string[];
  waiver_start_at: string;
  waiver_end_at: string;
  justification: string;
  review_notes: string | null;
  rejection_reason: string | null;
  revocation_reason: string | null;
  reviewed_at: string | null;
  revoked_at: string | null;
}

export default function WaiverDetailPage() {
  const params = useParams<{ id: string }>();
  const [w, setW] = useState<Waiver | null>(null);

  const refresh = useCallback(async () => {
    if (!params?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('map_waivers')
      .select('*')
      .eq('waiver_id', params.id)
      .maybeSingle();
    if (data) setW(data as Waiver);
  }, [params?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!w) return (
    <div className="min-h-screen bg-[#0B1520] text-white p-6">
      <p className="text-xs text-white/60">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/practitioner/map/waivers" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Waivers
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Waiver detail
        </h1>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <Row label="Type" value={w.waiver_type} />
          <Row label="Status" value={w.status} />
          <Row label="Window" value={`${new Date(w.waiver_start_at).toLocaleDateString()} to ${new Date(w.waiver_end_at).toLocaleDateString()}`} />
          <Row label="Scope" value={w.scope_description} />
          {w.scope_urls.length > 0 && (
            <Row label="Scope URLs" value={w.scope_urls.join('\n')} monospace />
          )}
          <Row label="Justification" value={w.justification} />
          {w.review_notes && <Row label="Admin notes" value={w.review_notes} />}
          {w.rejection_reason && <Row label="Rejection reason" value={w.rejection_reason} />}
          {w.revocation_reason && <Row label="Revocation reason" value={w.revocation_reason} />}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-white/50">{label}</p>
      <p className={`text-xs text-white whitespace-pre-wrap ${monospace ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
