'use client';

// Prompt #99 Phase 1 (Path A): Protocol Performance Intelligence scaffold.
// Top protocols, heatmap, interaction intelligence, FarmCeutica-only
// recommendations, and peptide safety panel activate in Path B once
// user_protocols + interaction_events are flowing.

import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { SherlockInsightCard } from '@/components/practitioner/analytics/SherlockInsightCard';
import { MedicalDisclaimer } from '@/components/practitioner/analytics/MedicalDisclaimer';
import { DependencyPendingBanner } from '@/components/practitioner/analytics/DependencyPendingBanner';
import { getSherlockStubInsight } from '@/lib/practitioner-analytics/sherlock-stub';
import { PRACTITIONER_PENDING_REASON } from '@/lib/practitioner-analytics/queries';

export default function ProtocolsAnalyticsPage() {
  const insight = getSherlockStubInsight('protocols');
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
            Effectiveness, interaction intelligence, peptide safety. Product
            suggestions draw exclusively from the FarmCeutica catalog.
          </p>
        </div>

        <DependencyPendingBanner pendingReason={PRACTITIONER_PENDING_REASON.protocols} />
        <SherlockInsightCard insight={insight} />
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
