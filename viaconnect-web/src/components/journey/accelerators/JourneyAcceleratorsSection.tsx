"use client";

/**
 * src/components/journey/accelerators/JourneyAcceleratorsSection.tsx
 *
 * Section wrapper for Journey Accelerators on the coaching-layout Your Journey
 * page (Prompt 208g, Task G-T6). Supersedes the 208d D-T5 layout that
 * delegated directly to JourneyAccelerators bare.
 *
 * Wires useBioOptimizationTrend (for the current BOS score) and
 * useJourneyRecommendations (DB-first, template-default fallback), then renders
 * a 2x2 responsive grid of AcceleratorCard. Fail-open: shows a calm muted note
 * when recs is empty (rare because the hook seeds defaults). Never throws.
 *
 * No em-dashes or en-dashes. No emojis.
 */

import { useBioOptimizationTrend } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend";
import { useJourneyRecommendations } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useJourneyRecommendations";
import { AcceleratorCard } from "./AcceleratorCard";

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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {recs.map((rec) => (
        <AcceleratorCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
