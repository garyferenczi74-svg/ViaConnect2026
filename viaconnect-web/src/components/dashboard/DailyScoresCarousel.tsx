'use client';

// DailyScoresCarousel — horizontal scrolling row of recent daily scores.
// Sources from bio_optimization_history (already fetched by useUserDashboardData).

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, LineChart } from 'lucide-react';
import type { DashboardBioHistory } from '@/hooks/useUserDashboardData';
import { ScoreCard, type DailyScore } from './ScoreCard';

interface DailyScoresCarouselProps {
  history: DashboardBioHistory[];
  daysToShow?: number;
}

export function DailyScoresCarousel({ history, daysToShow = 14 }: DailyScoresCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build daily score list from history (newest first), compute deltas
  const scores: DailyScore[] = (() => {
    if (!history || history.length === 0) return [];
    // history comes from the hook ordered ascending — take the last N
    const recent = history.slice(-daysToShow);
    const todayIso = new Date().toISOString().slice(0, 10);
    return recent
      .map((row, idx) => {
        const prev = idx > 0 ? recent[idx - 1].score : row.score;
        const breakdown = (row.breakdown || {}) as Record<string, unknown>;
        const adh =
          typeof breakdown.adherence_percent === 'number'
            ? (breakdown.adherence_percent as number)
            : undefined;
        return {
          date: row.date,
          score: Math.round(row.score),
          delta: Math.round(row.score - prev),
          adherencePercent: adh,
          isToday: row.date === todayIso,
        };
      })
      .reverse(); // newest first for display
  })();

  // Auto-scroll to today's card on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [scores.length]);

  const scrollBy = (delta: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  if (scores.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-5 text-center">
        <LineChart className="mx-auto mb-2 h-8 w-8 text-white/30" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-white">No daily scores yet</p>
        <p className="mt-1 text-xs text-white/40">
          Your daily Bio Optimization scores will appear here as data is collected.
        </p>
      </section>
    );
  }

  return (
    <section className="relative">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Daily Scores · last {scores.length} days
        </h3>
        <div className="hidden gap-1 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-300)}
            aria-label="Scroll left"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(300)}
            aria-label="Scroll right"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {scores.map((s) => (
          <ScoreCard key={s.date} score={s} />
        ))}
      </div>
    </section>
  );
}
