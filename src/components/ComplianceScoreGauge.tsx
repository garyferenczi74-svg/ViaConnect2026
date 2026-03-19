"use client";

interface ComplianceScoreGaugeProps {
  score: number;
}

export default function ComplianceScoreGauge({ score }: ComplianceScoreGaugeProps) {
  const circumference = 2 * Math.PI * 88;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-48 h-48 shrink-0">
      {/* Gauge Background */}
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
          style={{
            transition: "stroke-dashoffset 1s ease-out",
            filter: "drop-shadow(0 0 10px rgba(107, 251, 154, 0.3))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-mono font-bold text-[#6bfb9a]">{score}</span>
        <span className="text-[10px] text-[#bccabb] uppercase font-bold tracking-tighter -mt-1">/ 100 PTS</span>
      </div>
    </div>
  );
}
