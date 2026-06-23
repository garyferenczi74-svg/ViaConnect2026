"use client";

import { JourneyAccelerators } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/JourneyAccelerators";
import { useBioOptimizationTrend } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend";
import { useJourneyRecommendations } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useJourneyRecommendations";

/**
 * Thin section wrapper for Journey Accelerators on the single-page
 * Your Journey view (/analytics, Prompt 208d Task D-T5).
 *
 * Wires useBioOptimizationTrend (for the current BOS score) and
 * useJourneyRecommendations (DB-first, template-default fallback) then
 * delegates all rendering to JourneyAccelerators with bare=true so the
 * outer SectionShell heading is not duplicated. Fail-open: renders a calm
 * muted note when recs is empty (rare because the hook seeds defaults).
 * Never throws.
 */
export function JourneyAcceleratorsSection({ userId }: { userId: string | null }) {
  const { data } = useBioOptimizationTrend(userId, "7D");
  const current = data?.current ?? 0;

  const recs = useJourneyRecommendations(userId, current);

  if (recs.length === 0) {
    return (
      <p
        className="text-xs text-white/50 leading-relaxed"
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        Your personalized accelerators will appear here once your data is ready.
      </p>
    );
  }

  return <JourneyAccelerators recs={recs} bare />;
}
