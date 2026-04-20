'use client';

// Prompt #99 Phase 1 (Path A): Client Cohort Analysis scaffold.
// Dependency banner + Sherlock stub + medical disclaimer — the tabs
// for tier / demographic / concern / genetic / tenure cohorts activate
// in Path B once clients + bio_optimization_scores + caq_submissions go live.

import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { SherlockInsightCard } from '@/components/practitioner/analytics/SherlockInsightCard';
import { MedicalDisclaimer } from '@/components/practitioner/analytics/MedicalDisclaimer';
import { DependencyPendingBanner } from '@/components/practitioner/analytics/DependencyPendingBanner';
import {
  getSherlockStubInsight,
} from '@/lib/practitioner-analytics/sherlock-stub';
import { PRACTITIONER_PENDING_REASON } from '@/lib/practitioner-analytics/constants';

export default function CohortsPage() {
  const insight = getSherlockStubInsight('cohorts');
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
            <Users className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Client Cohort Analysis
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Segments by protocol tier, demographic, primary concern, genetic
            archetype, and tenure. Aggregate only; individual Helix signals excluded.
          </p>
        </div>

        <DependencyPendingBanner pendingReason={PRACTITIONER_PENDING_REASON.cohorts} />
        <SherlockInsightCard insight={insight} />
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
