'use client';

// ScoreCard — single daily Bio Optimization score card used inside
// DailyScoresCarousel.

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export interface DailyScore {
  date: string; // ISO date
  score: number;
  delta: number;
  adherencePercent?: number;
  isToday?: boolean;
}

interface ScoreCardProps {
  score: DailyScore;
}

const colorForScore = (score: number): string => {
  if (score >= 91) return '#A855F7';
  if (score >= 76) return '#22C55E';
  if (score >= 51) return '#2DA5A0';
  if (score >= 26) return '#F59E0B';
  return '#EF4444';
};

const formatDate = (iso: string, isToday?: boolean): { line1: string; line2: string } => {
  if (isToday) {
    const d = new Date(iso);
    return {
      line1: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      line2: 'Today',
    };
  }
  const d = new Date(iso);
  return {
    line1: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    line2: d.toLocaleDateString('en-US', { weekday: 'short' }),
  };
};

export function ScoreCard({ score }: ScoreCardProps) {
  const color = colorForScore(score.score);
  const { line1, line2 } = formatDate(score.date, score.isToday);

  return (
    <div
      className={`flex h-[160px] w-[120px] flex-shrink-0 snap-center flex-col items-center justify-between rounded-2xl border p-3 transition-all sm:h-[170px] sm:w-[130px] ${
        score.isToday
          ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.06] shadow-[0_0_24px_rgba(45,165,160,0.12)]'
          : 'border-white/10 bg-white/[0.04] hover:border-white/20'
      }`}
    >
      {/* Date */}
      <div className="text-center">
        <p className="text-[11px] font-semibold text-white/70">{line1}</p>
        <p
          className={`text-[10px] ${score.isToday ? 'font-semibold text-[#2DA5A0]' : 'text-white/40'}`}
        >
          {line2}
        </p>
      </div>

      {/* Score */}
      <div className="text-center">
        <p className="text-3xl font-bold leading-none" style={{ color }}>
          {score.score}
        </p>
      </div>

      {/* Delta */}
      <div className="flex items-center gap-1 text-[11px] font-medium">
        {score.delta > 0 ? (
          <>
            <TrendingUp className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
            <span className="text-[#22C55E]">+{score.delta}</span>
          </>
        ) : score.delta < 0 ? (
          <>
            <TrendingDown className="h-3 w-3 text-[#EF4444]" strokeWidth={1.5} />
            <span className="text-[#EF4444]">{score.delta}</span>
          </>
        ) : (
          <>
            <Minus className="h-3 w-3 text-white/40" strokeWidth={1.5} />
            <span className="text-white/40">0</span>
          </>
        )}
      </div>

      {/* Adherence mini-bar */}
      {typeof score.adherencePercent === 'number' && (
        <div className="w-full">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#2DA5A0]"
              style={{ width: `${score.adherencePercent}%` }}
            />
          </div>
          <p className="mt-1 text-center text-[9px] text-white/35">{score.adherencePercent}%</p>
        </div>
      )}
    </div>
  );
}
