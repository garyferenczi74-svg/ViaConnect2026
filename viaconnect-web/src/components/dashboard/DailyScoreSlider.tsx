"use client";

import { useRef, useState } from "react";

interface DailyScoreWidget {
  id: string;
  label: string;
  icon: string;
  score: number;
  delta: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-teal-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-yellow-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

export function DailyScoreSlider({ scores }: { scores: DailyScoreWidget[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 152;
      setActiveIndex(Math.round(scrollLeft / cardWidth));
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Daily Scores</h3>
        <span className="text-xs text-white/25">Swipe to see all</span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {scores.map((s) => (
          <div
            key={s.id}
            className="flex-shrink-0 w-[120px] sm:w-[140px] snap-start rounded-2xl p-3 sm:p-4 bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm flex flex-col items-center gap-1.5 sm:gap-2 transition-all hover:border-white/15 hover:bg-white/[0.06]"
          >
            <span className="text-2xl">{s.icon}</span>
            <span className={`text-2xl font-bold ${getScoreColor(s.score)}`}>{s.score}</span>
            <span className="text-[11px] text-white/40 font-medium uppercase tracking-wider">{s.label}</span>
            <span className={`text-xs font-medium flex items-center gap-0.5 ${
              s.delta > 0 ? "text-teal-400" : s.delta < 0 ? "text-red-400" : "text-white/25"
            }`}>
              {s.delta > 0 ? "\u2191" : s.delta < 0 ? "\u2193" : "\u2013"}{Math.abs(s.delta)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        {scores.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-2.5 h-2.5 bg-teal-400" : "w-1.5 h-1.5 bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
