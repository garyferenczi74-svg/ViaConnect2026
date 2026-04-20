'use client';

// Prompt #99 Phase 2 (Path A): Engagement Insights — wired to
// v_practitioner_engagement_summary when data is present; dependency
// banner when not. Aggregate-only per #17b Addendum.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Users, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SherlockInsightCard } from '@/components/practitioner/analytics/SherlockInsightCard';
import { MedicalDisclaimer } from '@/components/practitioner/analytics/MedicalDisclaimer';
import { DependencyPendingBanner } from '@/components/practitioner/analytics/DependencyPendingBanner';
import { KPICard } from '@/components/practitioner/analytics/KPICard';
import { getSherlockStubInsight } from '@/lib/practitioner-analytics/sherlock-stub';
import {
  bucketSharePercent,
  fetchEngagementSummary,
  type EngagementSummaryRow,
} from '@/lib/practitioner-analytics/queries-client';
import { PRACTITIONER_PENDING_REASON } from '@/lib/practitioner-analytics/constants';
import { formatEngagementScore } from '@/lib/practitioner-analytics/formatters';

export default function EngagementAnalyticsPage() {
  const insight = getSherlockStubInsight('engagement');
  const [row, setRow] = useState<EngagementSummaryRow | null>(null);
  const [pending, setPending] = useState(true);
  const [pendingReason, setPendingReason] = useState(
    PRACTITIONER_PENDING_REASON.engagement,
  );

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const outcome = await fetchEngagementSummary(supabase);
      if (outcome.status === 'live' && outcome.data) {
        setRow(outcome.data);
        setPending(false);
      } else {
        setPendingReason(outcome.pendingReason ?? PRACTITIONER_PENDING_REASON.engagement);
        setPending(true);
      }
    };
    run().catch((err) => {
      console.error('practitioner analytics: engagement summary load failed', err);
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
            <Activity className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Client Engagement Insights
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Aggregate engagement signals only. Individual reward-program data is
            never surfaced here, per the #17b Addendum.
          </p>
        </div>

        {pending && <DependencyPendingBanner pendingReason={pendingReason} />}

        {!pending && row && (
          <>
            <div className="grid sm:grid-cols-4 gap-3">
              <KPICard
                icon={Users}
                label="Consenting clients"
                value={String(row.consentingClientCount)}
                sub={`${row.clientsWithScore} with scored data`}
              />
              <KPICard
                icon={TrendingUp}
                label="Avg engagement"
                value={formatEngagementScore(row.avgEngagementScore)}
                sub="0 to 100 scale"
              />
              <KPICard
                icon={TrendingUp}
                label="P50 engagement"
                value={formatEngagementScore(row.p50EngagementScore)}
                sub="median client"
              />
              <KPICard
                icon={TrendingUp}
                label="P90 engagement"
                value={formatEngagementScore(row.p90EngagementScore)}
                sub="top decile"
              />
            </div>

            <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
              <h2 className="text-sm font-semibold mb-3">Engagement distribution</h2>
              {row.clientsWithScore === 0 ? (
                <p className="text-xs text-white/55">
                  No scored clients yet. Distribution activates once your patients accumulate engagement history.
                </p>
              ) : (
                <DistributionBars row={row} />
              )}
            </section>
          </>
        )}

        <SherlockInsightCard insight={insight} />
        <MedicalDisclaimer />
      </div>
    </div>
  );
}

function DistributionBars({ row }: { row: EngagementSummaryRow }) {
  const buckets = [
    { label: '0 to 29', count: row.clientsLowEngagement, tone: 'bg-red-400/70' },
    { label: '30 to 60', count: row.clientsMediumEngagement, tone: 'bg-amber-400/70' },
    { label: '61 to 80', count: row.clientsHighEngagement, tone: 'bg-sky-400/70' },
    { label: '81 to 100', count: row.clientsVeryHighEngagement, tone: 'bg-emerald-400/70' },
  ];
  return (
    <div className="space-y-2">
      {buckets.map((b) => {
        const share = bucketSharePercent(b.count, row.clientsWithScore);
        return (
          <div key={b.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span>{b.label}</span>
              <span>{b.count} clients ({share}%)</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full ${b.tone} rounded-full`}
                style={{ width: `${share}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
