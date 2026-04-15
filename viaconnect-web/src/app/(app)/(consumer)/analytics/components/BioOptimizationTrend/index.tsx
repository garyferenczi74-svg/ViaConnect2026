"use client";

import { useMemo, useState } from "react";
import { ScoreHero } from "./ScoreHero";
import { TimeRangeSelector } from "./TimeRangeSelector";
import { TrendChart } from "./TrendChart";
import { HannahInsightPanel } from "./HannahInsightPanel";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { JourneyAccelerators } from "./JourneyAccelerators";
import { EngagementFooter } from "./EngagementFooter";
import { ProtocolConfidenceCTA } from "./ProtocolConfidenceCTA";
import { useBioOptimizationTrend } from "./hooks/useBioOptimizationTrend";
import { useHannahInsights } from "./hooks/useHannahInsights";
import { useJourneyRecommendations } from "./hooks/useJourneyRecommendations";
import {
  daysActive as countDaysActive,
  personalBest as calcPersonalBest,
  type TimeRange,
} from "./utils/trendCalculations";

type Props = {
  userId: string | null;
  displayName: string;
  streak?: number;
  adherencePct?: number;
};

export function BioOptimizationTrend({
  userId,
  displayName,
  streak = 0,
  adherencePct = 72,
}: Props) {
  const [range, setRange] = useState<TimeRange>("7D");

  const { data, isLoading } = useBioOptimizationTrend(userId, range);

  const bioPoints = data?.bioScores ?? [];
  const dailyPoints = data?.dailyScores ?? [];
  const current = data?.current ?? 0;

  const weeksActive = useMemo(() => {
    if (bioPoints.length === 0) return 0;
    const first = new Date(bioPoints[0].date).getTime();
    const last = new Date(bioPoints[bioPoints.length - 1].date).getTime();
    return Math.max(1, Math.round((last - first) / (7 * 24 * 60 * 60 * 1000)));
  }, [bioPoints]);

  const insight = useHannahInsights({
    displayName,
    range,
    points: bioPoints,
    current,
    weeksActive,
  });

  const recs = useJourneyRecommendations(current);

  const pb = calcPersonalBest(bioPoints);
  const active = countDaysActive(bioPoints);

  return (
    <section
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "rgba(30,48,84,0.45)",
        border: "1px solid rgba(45,165,160,0.18)",
        boxShadow:
          "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
<div className="relative z-10 p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2
              className="text-lg md:text-xl font-semibold text-white"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              Bio Optimization Trend
            </h2>
            <p
              className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-1"
              style={{ fontFamily: "var(--font-dm-mono), monospace" }}
            >
              {isLoading ? "Loading readings" : `${bioPoints.length} readings, ${dailyPoints.length} daily`}
            </p>
          </div>
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>

        {/* Hero score */}
        <ScoreHero current={current} points={bioPoints} displayName={displayName} />

        {/* Chart + Hannah */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TrendChart bioPoints={bioPoints} dailyPoints={dailyPoints} range={range} />
          </div>
          <HannahInsightPanel insight={insight} />
        </div>

        {/* Categories + Accelerators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryBreakdown categoryAverages={data?.categoryAverages ?? {
            sleep: 0, nutrition: 0, movement: 0, stress: 0, adherence: 0,
          }} />
          <JourneyAccelerators recs={recs} />
        </div>

        {/* Engagement footer */}
        <EngagementFooter
          personalBest={pb}
          daysActive={active}
          current={current}
          streak={streak}
          confidence={adherencePct}
        />

        {/* GeneX360 CTA */}
        <ProtocolConfidenceCTA currentConfidence={72} targetConfidence={96} />
      </div>
    </section>
  );
}

export default BioOptimizationTrend;
