'use client';

// Prompt #168c section 2.6: 7-Day Average card. Moved from /components/dashboard
// per spec section 3.4 + restyled to match the Nutrition section visual language
// (translucent navy with backdrop blur, larger gauge to match circle gauge style).
//
// Computes rolling average quality_score over the last `days` calendar days in
// user's local timezone. Skips meals where qualityScore is null (legacy +
// freshly-saved rows still awaiting Gordon score). Empty state shows soft
// "Log more meals to see your average" prompt when fewer than 3 meals are
// scored within the window.

import { useMemo } from 'react';
import type { Meal, QualityTier } from '@/lib/gordon/types';
import { assignTier, TIER_BOUNDARIES } from '@/lib/gordon/constants';
import { QualityScoreRing } from '@/components/meals/QualityScoreRing';

export interface AverageQualityScoreTileProps {
  readonly meals: Meal[];
  readonly days?: number;
  readonly userTimezone?: string;
}

const DEFAULT_DAYS = 7;
const MIN_MEALS_FOR_AVERAGE = 3;

function localDateKey(iso: string, timezone: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(d);
  } catch {
    return '';
  }
}

function colorForTier(tier: QualityTier): string {
  const match = TIER_BOUNDARIES.find((t) => t.tier === tier);
  return match ? match.colorHex : '#2DA5A0';
}

export function AverageQualityScoreTile(props: AverageQualityScoreTileProps) {
  const { meals, days = DEFAULT_DAYS, userTimezone } = props;
  const tz = useMemo(
    () => userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [userTimezone],
  );

  const stats = useMemo(() => {
    const windowKeys = new Set<string>();
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = localDateKey(d.toISOString(), tz);
      if (key) windowKeys.add(key);
    }

    let sum = 0;
    let count = 0;
    for (const m of meals) {
      if (m.qualityScore === null || m.qualityScore === undefined) continue;
      const key = localDateKey(m.loggedAt, tz);
      if (!windowKeys.has(key)) continue;
      sum += Number(m.qualityScore);
      count += 1;
    }

    if (count < MIN_MEALS_FOR_AVERAGE) {
      return { hasData: false, avg: 0, tier: null as QualityTier | null, count };
    }
    const avg = Math.round(sum / count);
    return { hasData: true, avg, tier: assignTier(avg), count };
  }, [meals, days, tz]);

  return (
    <section className="font-[Instrument_Sans] flex items-center gap-5 rounded-2xl border border-white/10 bg-[#1E3054]/40 backdrop-blur-md p-5 text-white md:p-6">
      <div className="shrink-0">
        {stats.hasData && stats.tier ? (
          <QualityScoreRing score={stats.avg} tier={stats.tier} sizePx={100} />
        ) : (
          <div
            role="img"
            aria-label="No scored meals yet"
            className="relative inline-flex items-center justify-center"
            style={{ width: 100, height: 100 }}
          >
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={10} />
            </svg>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.10em] text-white/55">
              n/a
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.10em] text-white/55">{days} day average</div>
        {stats.hasData && stats.tier ? (
          <>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[32px] font-semibold tabular-nums leading-none text-white">{stats.avg}</span>
              <span
                className="text-[13px] font-medium uppercase tracking-[0.10em]"
                style={{ color: colorForTier(stats.tier) }}
              >
                {stats.tier}
              </span>
            </div>
            <div className="mt-2 text-[12px] text-white/55">Quality score across {stats.count} logged meals</div>
          </>
        ) : (
          <div className="mt-1 text-[13px] text-white/65">Log more meals to see your average</div>
        )}
      </div>
    </section>
  );
}

export default AverageQualityScoreTile;
