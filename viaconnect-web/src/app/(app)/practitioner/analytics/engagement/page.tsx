'use client';

// Prompt #99 Phase 1 (Path A): Client Engagement Insights scaffold.
// Distribution, drivers, dormancy risk, onboarding funnel, retention
// heatmap activate in Path B once engagement_score_snapshots + wearables
// are populated. Surface is aggregate-only per #17b Addendum;
// individual Helix Rewards data is never touched.

import Link from 'next/link';
import { ArrowLeft, Activity } from 'lucide-react';
import { SherlockInsightCard } from '@/components/practitioner/analytics/SherlockInsightCard';
import { MedicalDisclaimer } from '@/components/practitioner/analytics/MedicalDisclaimer';
import { DependencyPendingBanner } from '@/components/practitioner/analytics/DependencyPendingBanner';
import { getSherlockStubInsight } from '@/lib/practitioner-analytics/sherlock-stub';
import { PRACTITIONER_PENDING_REASON } from '@/lib/practitioner-analytics/queries';

export default function EngagementAnalyticsPage() {
  const insight = getSherlockStubInsight('engagement');
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
            <Activity className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Client Engagement Insights
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Aggregate engagement signals only. Individual Helix Rewards data is
            never surfaced here, per the #17b Addendum.
          </p>
        </div>

        <DependencyPendingBanner pendingReason={PRACTITIONER_PENDING_REASON.engagement} />
        <SherlockInsightCard insight={insight} />
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
