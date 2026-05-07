'use client';

import Link from 'next/link';
import { Info, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { BodyScoreGauge } from './BodyScoreGauge';
import { BiologicalAgeBar } from './BiologicalAgeBar';
import type { BodyScoreTier } from '@/lib/body-tracker/types';

interface HealthReportCardProps {
  score: number;
  previousScore?: number;
  confidencePct: number;
  tier: BodyScoreTier;
  biologicalAge?: number;
  chronologicalAge?: number;
  weeklyBreakdownHref?: string;
  weekOffset?: number;
  onWeekChange?: (nextOffset: number) => void;
  canGoBack?: boolean;
}

function arnoldHealthSummary(score: number): string {
  if (score >= 800) return 'Your health metrics are well above average. Strong work.';
  if (score >= 600) return 'Your health metrics are slightly above average. Stay the course.';
  if (score >= 400) return 'Your health metrics are developing. Small wins compound; keep logging.';
  if (score >= 200) return 'Your health metrics need attention. Focus on the basics: sleep, hydration, movement.';
  if (score > 0)    return 'Your health metrics need urgent care. Talk to your healthcare provider.';
  return 'Log a few entries so Arnold can build your baseline.';
}

function weekRangeForOffset(offset: number): string {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + offset * 7);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} to ${fmt(end)}`;
}

export function HealthReportCard({
  score,
  previousScore,
  confidencePct,
  tier,
  biologicalAge,
  chronologicalAge,
  weeklyBreakdownHref,
  weekOffset = 0,
  onWeekChange,
  canGoBack = true,
}: HealthReportCardProps) {
  const summary = arnoldHealthSummary(score);
  const showBioAge = typeof biologicalAge === 'number' && typeof chronologicalAge === 'number';
  const navEnabled = typeof onWeekChange === 'function';
  const isCurrentWeek = weekOffset === 0;
  const prevDisabled = !navEnabled || !canGoBack;
  const nextDisabled = !navEnabled || isCurrentWeek;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm md:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Health Report</h2>
        <div className="flex items-center gap-1.5">
          {navEnabled && (
            <button
              type="button"
              onClick={() => onWeekChange!(weekOffset - 1)}
              disabled={prevDisabled}
              aria-label="Previous week"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
          )}
          <span className="min-w-[110px] text-center text-xs text-white/40">
            {weekRangeForOffset(weekOffset)}
          </span>
          {navEnabled && (
            <button
              type="button"
              onClick={() => onWeekChange!(weekOffset + 1)}
              disabled={nextDisabled}
              aria-label="Next week"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </header>

      <BodyScoreGauge
        score={score}
        previousScore={previousScore}
        confidencePct={confidencePct}
        tier={tier}
      />

      <p className="mt-5 text-sm leading-relaxed text-white/70">{summary}</p>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-white/45">
        <Info size={12} strokeWidth={1.5} />
        <span>Confidence rises as you log more entries and connect data sources.</span>
      </div>

      {showBioAge && (
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <BiologicalAgeBar
            biologicalAge={biologicalAge!}
            chronologicalAge={chronologicalAge!}
          />
        </div>
      )}

      {weeklyBreakdownHref && (
        <Link
          href={weeklyBreakdownHref}
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-[#2DA5A0] transition-colors hover:text-[#2DA5A0]/80"
        >
          View Weekly Breakdown
          <ArrowRight size={12} strokeWidth={1.5} />
        </Link>
      )}
    </section>
  );
}
