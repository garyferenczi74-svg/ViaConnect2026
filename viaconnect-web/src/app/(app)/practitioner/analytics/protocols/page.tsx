'use client';

// Prompt #99 Phase 2 (Path A): Protocol Performance — wired to
// v_practitioner_protocol_effectiveness. Top-10 by active client count.
// Outcome deltas + interaction intelligence activate when the
// corresponding dependency tables go live.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SherlockInsightCard } from '@/components/practitioner/analytics/SherlockInsightCard';
import { MedicalDisclaimer } from '@/components/practitioner/analytics/MedicalDisclaimer';
import { DependencyPendingBanner } from '@/components/practitioner/analytics/DependencyPendingBanner';
import { getSherlockStubInsight } from '@/lib/practitioner-analytics/sherlock-stub';
import {
  fetchProtocolEffectiveness,
  type ProtocolEffectivenessRow,
} from '@/lib/practitioner-analytics/queries-client';
import { PRACTITIONER_PENDING_REASON } from '@/lib/practitioner-analytics/constants';
import { formatTierConfidence } from '@/lib/practitioner-analytics/formatters';

export default function ProtocolsAnalyticsPage() {
  const insight = getSherlockStubInsight('protocols');
  const [rows, setRows] = useState<ProtocolEffectivenessRow[]>([]);
  const [pending, setPending] = useState(true);
  const [pendingReason, setPendingReason] = useState(
    PRACTITIONER_PENDING_REASON.protocols,
  );

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const outcome = await fetchProtocolEffectiveness(supabase);
      if (outcome.status === 'live') {
        setRows(outcome.data ?? []);
        setPending(false);
      } else {
        setRows([]);
        setPendingReason(outcome.pendingReason ?? PRACTITIONER_PENDING_REASON.protocols);
        setPending(true);
      }
    };
    run().catch((err) => {
      console.error('practitioner analytics: protocol effectiveness load failed', err);
      setPending(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/practitioner/analytics"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Analytics
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Protocol Performance Intelligence
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Active client count + average confidence by protocol. Outcome
            deltas, interaction intelligence, and FarmCeutica product
            suggestions activate as their dependencies land.
          </p>
        </div>

        {pending && <DependencyPendingBanner pendingReason={pendingReason} />}

        {!pending && rows.length > 0 && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Top 10 protocols by active clients</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-white/50 text-[10px] uppercase tracking-wide">
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left font-semibold py-2 px-2">Protocol</th>
                    <th className="text-right font-semibold py-2 px-2">Active clients</th>
                    <th className="text-right font-semibold py-2 px-2">Total clients</th>
                    <th className="text-right font-semibold py-2 px-2">Avg confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.protocolName} className="border-b border-white/[0.04]">
                      <td className="py-2 px-2 text-white">{r.protocolName}</td>
                      <td className="py-2 px-2 text-right text-white/80">{r.activeClientCount}</td>
                      <td className="py-2 px-2 text-right text-white/60">{r.totalClientCount}</td>
                      <td className="py-2 px-2 text-right text-white/80">
                        {formatTierConfidence(r.avgConfidenceScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <SherlockInsightCard insight={insight} />
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
