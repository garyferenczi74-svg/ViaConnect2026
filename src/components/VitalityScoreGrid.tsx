"use client";

import { VitalityDimension } from "@/data/assessment";

interface VitalityScoreGridProps {
  dimensions: VitalityDimension[];
  overallScore: number;
}

function getScoreColor(score: number, max: number = 10): { stroke: string; text: string; bg: string } {
  const ratio = score / max;
  if (ratio >= 0.7) return { stroke: "#4ade80", text: "text-[#4ade80]", bg: "bg-[#4ade80]/10" };
  if (ratio >= 0.4) return { stroke: "#facc15", text: "text-yellow-400", bg: "bg-yellow-400/10" };
  return { stroke: "#f87171", text: "text-red-400", bg: "bg-red-400/10" };
}

function CircularGauge({
  score,
  maxScore,
  label,
  size = 80,
}: {
  score: number;
  maxScore: number;
  label: string;
  size?: number;
}) {
  const { stroke, text } = getScoreColor(score, maxScore);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / maxScore) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#2e3545"
            strokeWidth={4}
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={4}
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease-out" }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-black ${text}`}>{score}</span>
        </div>
      </div>
      <p className="text-[10px] text-[#bccabb]/70 font-mono uppercase tracking-widest text-center leading-tight">
        {label}
      </p>
    </div>
  );
}

function LargeGauge({ score, maxScore }: { score: number; maxScore: number }) {
  const { stroke, text } = getScoreColor(score, maxScore);
  const size = 160;
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / maxScore) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#2e3545"
          strokeWidth={6}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black ${text}`}>{score}</span>
        <span className="text-[10px] text-[#bccabb]/50 font-mono">/ {maxScore}</span>
      </div>
    </div>
  );
}

export default function VitalityScoreGrid({ dimensions, overallScore }: VitalityScoreGridProps) {
  return (
    <div
      className="rounded-2xl border border-[#3d4a3e]/15 p-6"
      style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
    >
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-1">
        Vitality Score Matrix
      </h3>
      <p className="text-[10px] text-[#bccabb]/60 font-mono uppercase tracking-widest mb-6">
        Multi-Dimensional Health Assessment
      </p>

      <div className="flex flex-col items-center gap-8">
        {/* Overall Score */}
        <div className="text-center">
          <LargeGauge score={overallScore} maxScore={100} />
          <p className="text-xs font-bold text-[#dce2f7] mt-2">Overall Vitality</p>
          <p className="text-[10px] text-[#bccabb]/50 font-mono">Composite Index</p>
        </div>

        {/* Individual Gauges */}
        <div className="grid grid-cols-5 gap-6 w-full">
          {dimensions.map((dim) => (
            <CircularGauge
              key={dim.label}
              score={dim.score}
              maxScore={dim.maxScore}
              label={dim.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
