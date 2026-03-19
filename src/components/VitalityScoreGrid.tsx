"use client";

import { VitalityDimension } from "@/data/assessment";

interface VitalityScoreGridProps {
  dimensions: VitalityDimension[];
  overallScore: number;
  mode?: "full" | "overall-only" | "grid-only";
}

function getGaugeColor(score: number, max: number = 10): { stroke: string; textClass: string } {
  const ratio = score / max;
  if (ratio >= 0.7) return { stroke: "#6bfb9a", textClass: "text-[#6bfb9a]" };
  if (ratio >= 0.4) return { stroke: "#ffb657", textClass: "text-[#ffb657]" };
  return { stroke: "#ffb4ab", textClass: "text-[#ffb4ab]" };
}

function MiniGauge({ score, maxScore, label }: { score: number; maxScore: number; label: string }) {
  const { stroke, textClass } = getGaugeColor(score, maxScore);
  const percentage = (score / maxScore) * 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#2e3545"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-mono text-sm font-bold ${textClass}`}>
          {score}
        </span>
      </div>
      <span className="text-[10px] uppercase text-[#dce2f7]/60 text-center tracking-wide">
        {label}
      </span>
    </div>
  );
}

function LargeGauge({ score, maxScore }: { score: number; maxScore: number }) {
  const { stroke, textClass } = getGaugeColor(score, maxScore);
  const percentage = (score / maxScore) * 100;

  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          stroke="#2e3545"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          stroke={stroke}
          strokeWidth="8"
          strokeDasharray={`${percentage * 2.827} ${282.7 - percentage * 2.827}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-black ${textClass}`}>{score}</span>
        <span className="text-xs font-mono text-[#dce2f7]/40 uppercase">Optimal: 85+</span>
      </div>
    </div>
  );
}

export default function VitalityScoreGrid({ dimensions, overallScore, mode = "full" }: VitalityScoreGridProps) {
  if (mode === "overall-only") {
    return <LargeGauge score={overallScore} maxScore={100} />;
  }

  return (
    <div className="glass-card p-8 rounded-3xl">
      <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest mb-8 font-medium">
        Vitality Matrix
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-8">
        {dimensions.map((dim) => (
          <MiniGauge key={dim.label} score={dim.score} maxScore={dim.maxScore} label={dim.label} />
        ))}
      </div>

      {/* Alert */}
      <div className="mt-12 p-6 rounded-2xl bg-[#141b2b] border border-[#3d4a3e]/5">
        <div className="flex gap-4 items-start">
          <svg className="w-6 h-6 text-[#ffb657] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <h4 className="text-[#dce2f7] font-bold text-sm">Vitality Alert: Sleep Inconsistency</h4>
            <p className="text-xs text-[#dce2f7]/60 mt-1 leading-relaxed">
              System logs indicate circadian disruption in the last 72-hour window. Cortisol levels likely peaking pre-maturely. Suggest 15m &ldquo;Blue-Light-Zero&rdquo; protocol before sleep.
            </p>
          </div>
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
