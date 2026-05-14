'use client';

// Prompt #168 Apply B: AverageQualityScoreTile.
// Computes the rolling average quality_score over the last `days` calendar
// days in the user's local timezone. Skips meals where qualityScore is null
// (legacy rows pre-Gordon and freshly-saved rows still awaiting score).
//
// Empty state shows a small "n/a" glyph plus a soft prompt to log a meal so
// the average has data to report against. No em or en dashes anywhere.

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

    if (count === 0) {
      return { hasData: false, avg: 0, tier: null as QualityTier | null };
    }
    const avg = Math.round(sum / count);
    return { hasData: true, avg, tier: assignTier(avg) };
  }, [meals, days, tz]);

  return (
    <section className="font-[Instrument_Sans] flex items-center gap-4 rounded-2xl border border-white/10 bg-[#1E3054] p-4 text-white md:p-5">
      <div className="shrink-0">
        {stats.hasData && stats.tier ? (
          <QualityScoreRing score={stats.avg} tier={stats.tier} sizePx={80} />
        ) : (
          <div
            role="img"
            aria-label="No scored meals yet"
            className="relative inline-flex items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            <svg width={80} height={80} viewBox="0 0 80 80">
              <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={8} />
            </svg>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.10em] text-white/55">
              n/a
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.10em] text-white/55">{days}-day average</div>
        {stats.hasData && stats.tier ? (
          <>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold tabular-nums leading-none text-white">{stats.avg}</span>
              <span
                className="text-[12px] font-medium uppercase tracking-[0.10em]"
                style={{ color: colorForTier(stats.tier) }}
              >
                {stats.tier}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-white/55">Quality score across logged meals</div>
          </>
        ) : (
          <div className="mt-1 text-[13px] text-white/65">Log a meal to see your average</div>
        )}
      </div>
    </section>
  );
}

export default AverageQualityScoreTile;
