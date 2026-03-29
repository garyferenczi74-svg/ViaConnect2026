"use client";

const TIERS = {
  1: { label: "Personalized", description: "Built from your Clinical Assessment Questionnaire", color: "bg-blue-400/15 border-blue-400/30 text-blue-400", score: 72, missing: ["Lab results would validate nutrient levels", "GENEX360\u2122 would enable pharmacogenomic optimization"] },
  2: { label: "Clinically Enhanced", description: "Enhanced with your lab results and biomarkers", color: "bg-teal-400/15 border-teal-400/30 text-teal-400", score: 86, missing: ["GENEX360\u2122 would enable pharmacogenomic optimization"] },
  3: { label: "Precision Optimized", description: "Precision-tuned with your genetics, labs, and assessment", color: "bg-teal-400/15 border-teal-400/30 text-teal-400", score: 96, missing: [] },
} as const;

export function ProtocolConfidenceBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const config = TIERS[tier];
  return (
    <div className={`rounded-xl p-4 md:p-5 border ${config.color}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">{config.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{config.score}% confidence</span>
          </div>
          <p className="text-xs text-white/40">{config.description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${tier >= 1 ? "bg-teal-400" : "bg-white/10"}`} />
          <div className={`w-2.5 h-2.5 rounded-full ${tier >= 2 ? "bg-teal-400" : "bg-white/10"}`} />
          <div className={`w-2.5 h-2.5 rounded-full ${tier >= 3 ? "bg-teal-400" : "bg-white/10"}`} />
        </div>
      </div>
      {config.missing.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[11px] text-white/25 mb-1.5">Improve your protocol:</p>
          {config.missing.map((item, i) => (
            <p key={i} className="text-xs text-white/30 flex items-center gap-1.5 mt-1">
              <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
