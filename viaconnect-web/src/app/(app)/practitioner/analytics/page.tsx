"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Activity,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { PageTransition, StaggerChild } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { SherlockInsightCard } from "@/components/practitioner/analytics/SherlockInsightCard";
import { MedicalDisclaimer } from "@/components/practitioner/analytics/MedicalDisclaimer";
import { DependencyPendingBanner } from "@/components/practitioner/analytics/DependencyPendingBanner";
import { KPICard } from "@/components/practitioner/analytics/KPICard";
import { getSherlockStubInsight } from "@/lib/practitioner-analytics/sherlock-stub";
import {
  fetchPracticeHealth,
  type PracticeHealthRow,
} from "@/lib/practitioner-analytics/queries-client";
import { PRACTITIONER_PENDING_REASON } from "@/lib/practitioner-analytics/constants";
import {
  formatBioOptScore,
  formatEngagementScore,
  formatSignedDelta,
} from "@/lib/practitioner-analytics/formatters";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { PORTAL_EMPTY_COPY } from "@/lib/portal/empty-state-copy";

export default function AnalyticsPage() {
  const insight = getSherlockStubInsight("practice_health");
  const [practice, setPractice] = useState<PracticeHealthRow | null>(null);
  const [practicePending, setPracticePending] = useState(true);
  const [practicePendingReason, setPracticePendingReason] = useState(
    PRACTITIONER_PENDING_REASON.practice_health,
  );
  const charts = PORTAL_EMPTY_COPY.practitionerAnalyticsCharts;

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const outcome = await fetchPracticeHealth(supabase);
      if (outcome.status === "live" && outcome.data) {
        setPractice(outcome.data);
        setPracticePending(false);
      } else {
        setPracticePendingReason(
          outcome.pendingReason ?? PRACTITIONER_PENDING_REASON.practice_health,
        );
        setPracticePending(true);
      }
    };
    run().catch((err) => {
      console.error("practitioner analytics: practice health load failed", err);
      setPracticePending(true);
    });
  }, []);

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <StaggerChild className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold text-white">Practice Health</h2>
          </div>
          {practicePending && (
            <DependencyPendingBanner pendingReason={practicePendingReason} />
          )}
          {!practicePending && practice && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard
                icon={Users}
                label="Active clients"
                value={String(practice.totalActiveClients)}
                sub={`${practice.newClients30d} new in 30d`}
                delta={practice.newClients30d > 0 ? formatSignedDelta(practice.newClients30d) : null}
                deltaDirection={practice.newClients30d > 0 ? "up" : "flat"}
              />
              <KPICard
                icon={TrendingUp}
                label="Avg Bio Optimization"
                value={formatBioOptScore(practice.avgBioOptimizationScore)}
                sub={`${practice.clientsBioOptHigh} high, ${practice.clientsBioOptMid} mid, ${practice.clientsBioOptLow} low`}
              />
              <KPICard
                icon={Activity}
                label="Avg engagement"
                value={formatEngagementScore(practice.avgEngagementScore)}
                sub="0 to 100 aggregate"
              />
              <KPICard
                icon={Users}
                label="New clients, 90d"
                value={String(practice.newClients90d)}
                sub="rolling window"
              />
            </div>
          )}
          <SherlockInsightCard insight={insight} />
          <div className="flex flex-wrap gap-2 text-[11px]">
            <Link href="/practitioner/analytics/cohorts" className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-white/80">Cohorts</Link>
            <Link href="/practitioner/analytics/protocols" className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-white/80">Protocols</Link>
            <Link href="/practitioner/analytics/revenue" className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-white/80">Revenue</Link>
            <Link href="/practitioner/analytics/engagement" className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-white/80">Engagement</Link>
          </div>
          <div className="border-t border-white/[0.06]" />
        </StaggerChild>

        <StaggerChild className="space-y-4">
          <h1 className="text-xl font-semibold text-white sm:text-2xl">{charts.heading}</h1>
          <PortalEmptyState copy={charts} />
        </StaggerChild>

        <MedicalDisclaimer />
      </div>
    </PageTransition>
  );
}
