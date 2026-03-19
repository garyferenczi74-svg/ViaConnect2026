"use client";

import { ComplianceCategory } from "@/data/compliance";

interface ComplianceScoreGaugeProps {
  score: number;
  categories: ComplianceCategory[];
}

function getBarColor(score: number): string {
  if (score >= 95) return "from-[#4ade80] to-[#6bfb9a]";
  if (score >= 85) return "from-[#4ade80] to-[#4ade80]/70";
  if (score >= 70) return "from-[#fbbf24] to-[#fbbf24]/70";
  return "from-[#f87171] to-[#f87171]/70";
}

export default function ComplianceScoreGauge({ score, categories }: ComplianceScoreGaugeProps) {
  const circumference = 2 * Math.PI * 88;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-8 rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest font-medium">
            Compliance Score
          </h3>
          <p className="text-xl font-bold text-[#dce2f7] mt-1">Regulatory Posture</p>
        </div>
        <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 px-3 py-1 rounded-full uppercase font-bold">
          HIPAA Compliant
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-10">
        {/* Gauge */}
        <div className="relative w-[200px] h-[200px] shrink-0">
          <svg width="200" height="200" className="-rotate-90">
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="#374151"
              strokeWidth="12"
            />
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="#4ade80"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-[#4ade80]">{score}</span>
            <span className="text-sm text-[#dce2f7]/40 font-mono">/100</span>
          </div>
        </div>

        {/* Category bars */}
        <div className="flex-1 w-full space-y-4">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center gap-4">
              <span className="w-40 text-xs text-[#dce2f7]/60 shrink-0 truncate">{cat.label}</span>
              <div className="flex-1 h-2 bg-[#2e3545] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getBarColor(cat.score)}`}
                  style={{ width: `${cat.score}%`, transition: "width 0.8s ease-out" }}
                />
              </div>
              <span className={`text-xs font-mono font-bold w-10 text-right ${cat.score >= 95 ? "text-[#4ade80]" : cat.score >= 85 ? "text-[#4ade80]/70" : "text-[#fbbf24]"}`}>
                {cat.score}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(107, 251, 154, 0.15);
        }
      `}</style>
    </div>
  );
}
