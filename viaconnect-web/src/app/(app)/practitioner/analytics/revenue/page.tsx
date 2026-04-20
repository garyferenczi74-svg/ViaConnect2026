'use client';

// Prompt #99 Phase 1 (Path A): Revenue & Business Intelligence scaffold.
// MRR hero, 12-month timeline, tier mix, projection fan, tax CSV
// activate in Path B once whitelabel_orders (#96), referral_commissions
// (#98), and practitioner_transactions go live.

import Link from 'next/link';
import { ArrowLeft, LineChart } from 'lucide-react';
import { SherlockInsightCard } from '@/components/practitioner/analytics/SherlockInsightCard';
import { MedicalDisclaimer } from '@/components/practitioner/analytics/MedicalDisclaimer';
import { DependencyPendingBanner } from '@/components/practitioner/analytics/DependencyPendingBanner';
import { getSherlockStubInsight } from '@/lib/practitioner-analytics/sherlock-stub';
import { PRACTITIONER_PENDING_REASON } from '@/lib/practitioner-analytics/constants';

export default function RevenueAnalyticsPage() {
  const insight = getSherlockStubInsight('revenue');
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
            <LineChart className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Revenue & Business Intelligence
          </h1>
          <p className="text-xs text-white/55 mt-1">
            MRR, 12-month timeline, tier mix, projection fan, tax summary.
          </p>
        </div>

        <DependencyPendingBanner pendingReason={PRACTITIONER_PENDING_REASON.revenue} />
        <SherlockInsightCard insight={insight} />
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
