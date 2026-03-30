"use client";

import { Sparkles } from "lucide-react";
import { ListenToSummary } from "./ListenToSummary";
import { ShareablePatternCard } from "./ShareablePatternCard";

interface MasterPatternSummary {
  name: string;
}

interface ExecutiveSummaryHeroProps {
  executiveSummary: string;
  masterPatterns: MasterPatternSummary[];
  overallBurdenScore: number;
  burdenTier: string;
}

export function ExecutiveSummaryHero({ executiveSummary, masterPatterns, overallBurdenScore, burdenTier }: ExecutiveSummaryHeroProps) {
  const scoreColor = overallBurdenScore >= 70 ? "text-red-400 border-red-400/30" :
    overallBurdenScore >= 50 ? "text-amber-400 border-amber-400/30" :
    overallBurdenScore >= 30 ? "text-yellow-400 border-yellow-400/30" :
    "text-teal-400 border-teal-400/30";

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 via-[#1A2744] to-orange-400/5" />
      <div className="relative p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#2DA5A033" }} />
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)", border: "1px solid #2DA5A026" }}>
              <Sparkles className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Your Blueprint</h2>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mb-3">{executiveSummary}</p>

        {/* Listen + Share */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ListenToSummary summaryText={executiveSummary} />
          <ShareablePatternCard patterns={masterPatterns} burdenScore={overallBurdenScore} />
        </div>

        {/* Master pattern pills */}
        {masterPatterns.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {masterPatterns.map((pattern, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-teal-400/10 border border-teal-400/20 text-teal-400/70 font-medium">
                {pattern.name}
              </span>
            ))}
          </div>
        )}

        {/* Burden score inline */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full border-2 ${scoreColor} flex items-center justify-center`}>
            <span className="text-sm font-bold">{overallBurdenScore}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-white/50">{burdenTier} Symptom Burden</p>
            <p className="text-[10px] text-white/25">Based on 24 symptom assessments</p>
          </div>
        </div>
      </div>
    </div>
  );
}
