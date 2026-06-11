'use client';

// Prompt 183 Task 5 (2026-06-10): PRESENTATIONAL 7 Day Meal History tile, the
// full width Row 4 tile of the My Nutrition bento hub (mockup section 5.3).
//
// Contract: this surface receives already computed metrics as props and renders
// them. It never fetches, writes, or resolves a user; the hub controller wires
// useNutritionHubMetrics once and passes streakDays + dailyMealCounts down. No
// createClient, no fetch, no Supabase import. Both props are optional and fail
// open: when a value is missing the tile renders WITHOUT that metric (a calm
// empty state) and never invents a value or shows 0 as if it were real.
//
// Layout: a Plasma Core streak gauge on the left (reusing PlasmaGauge, value =
// streakDays, max = 7 so the ring fills toward the 7 day target) and the seven
// day bars on the right, oldest to newest with today emphasized. Filled bars
// use brand Teal #2DA5A0; empty days are a dim white track. The detailed
// history drill down lands in a later prompt, so this tile carries no launch
// affordance, only the at a glance summary.

import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CalendarDays, Flame } from 'lucide-react';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import {
  barHeightFractions,
  weekdayLabelsEndingToday,
} from './nutritionMealHistory.helpers';

export interface NutritionMealHistoryTileProps {
  // Current consecutive run of days with at least one meal ending today, 0..7,
  // from useNutritionHubMetrics. Undefined renders the gauge empty state.
  readonly streakDays?: number;
  // Per day meal counts for the 7 day window, length 7, oldest to newest, where
  // index 6 is today, from useNutritionHubMetrics. Undefined renders a calm
  // placeholder rather than fabricated bars.
  readonly dailyMealCounts?: number[];
}

// Brand tokens. Card #1E3054, Teal #2DA5A0, Orange #B75E18, Navy #1A2744.
const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const STREAK_GAUGE_MAX = 7;
const STREAK_GAUGE_SIZE = 132;

function hasStreak(streakDays: number | undefined): streakDays is number {
  return typeof streakDays === 'number' && Number.isFinite(streakDays);
}

function hasCounts(dailyMealCounts: number[] | undefined): dailyMealCounts is number[] {
  return Array.isArray(dailyMealCounts) && dailyMealCounts.length > 0;
}

// Left column: the streak gauge plus its caption, or a matched empty state when
// streakDays is undefined. The empty gauge renders value 0 with a "no data yet"
// caption so it never reads as a real zero day streak.
function StreakGauge({ streakDays, reduced }: { streakDays?: number; reduced: boolean }) {
  const present = hasStreak(streakDays);
  const clamped = present ? Math.max(0, Math.min(STREAK_GAUGE_MAX, Math.round(streakDays))) : 0;

  return (
    <div className="flex flex-shrink-0 flex-col items-center justify-center gap-2">
      <PlasmaGauge
        value={clamped}
        metric="nutrition"
        max={STREAK_GAUGE_MAX}
        size={STREAK_GAUGE_SIZE}
        animated={!reduced}
        showUnit={false}
        ariaLabel={
          present
            ? `Meal logging streak ${clamped} of ${STREAK_GAUGE_MAX} days`
            : 'Meal logging streak not available yet'
        }
      />
      {present ? (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
          <Flame aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: ORANGE }} />
          <span>day streak</span>
        </div>
      ) : (
        <p className="text-[11px] font-medium text-white/40">No streak yet</p>
      )}
    </div>
  );
}

// One bar in the seven day window. Height encodes the day's meal count: a zero
// count day is a dim track at the floor; a day with meals fills in Teal scaled
// to the busiest day in the window. Today (the last bar) carries a brighter
// fill and a small dot so it reads as the current day at a glance.
function DayBar({
  fraction,
  count,
  label,
  isToday,
  reduced,
}: {
  fraction: number;
  count: number;
  label: string;
  isToday: boolean;
  reduced: boolean;
}) {
  const filled = count >= 1;
  const heightPct = filled ? `${Math.round(fraction * 100)}%` : '0%';

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div
        className="relative flex h-20 w-full items-end overflow-hidden rounded-md bg-white/[0.06] md:h-24"
        role="img"
        aria-label={
          isToday
            ? `Today, ${count} ${count === 1 ? 'meal' : 'meals'} logged`
            : `${label}, ${count} ${count === 1 ? 'meal' : 'meals'} logged`
        }
      >
        {filled ? (
          <div
            className="w-full rounded-md"
            style={{
              height: heightPct,
              background: isToday
                ? `linear-gradient(180deg, #5FD3CE, ${TEAL})`
                : `linear-gradient(180deg, ${TEAL}, ${TEAL}CC)`,
              boxShadow: isToday ? `0 0 12px ${TEAL}66` : 'none',
              opacity: isToday ? 1 : 0.85,
              transition: reduced ? 'none' : 'height 320ms ease-out',
            }}
          />
        ) : null}
        {isToday ? (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: TEAL }}
          />
        ) : null}
      </div>
      <span
        className={`text-[10px] tabular-nums ${isToday ? 'font-semibold text-white/75' : 'text-white/40'}`}
      >
        {label}
      </span>
    </div>
  );
}

// Right column: the seven bars, or a calm dim placeholder when dailyMealCounts
// is undefined. The placeholder shows seven empty tracks with no labels and a
// short note, never fabricated bars.
function BarRow({ dailyMealCounts, reduced }: { dailyMealCounts?: number[]; reduced: boolean }) {
  const present = hasCounts(dailyMealCounts);
  const fractions = useMemo(
    () => (present ? barHeightFractions(dailyMealCounts) : []),
    [present, dailyMealCounts],
  );
  const labels = useMemo(() => weekdayLabelsEndingToday(new Date(), 7), []);

  if (!present) {
    return (
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-end gap-1.5 sm:gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-20 flex-1 rounded-md bg-white/[0.05] md:h-24"
            />
          ))}
        </div>
        <p className="mt-3 text-center text-[12px] text-white/40">
          Log meals to build your 7 day history.
        </p>
      </div>
    );
  }

  const lastIndex = dailyMealCounts.length - 1;

  return (
    <div className="flex min-w-0 flex-1 items-end gap-1.5 sm:gap-2">
      {dailyMealCounts.map((count, i) => (
        <DayBar
          key={i}
          fraction={fractions[i] ?? 0}
          count={count}
          label={labels[i] ?? ''}
          isToday={i === lastIndex}
          reduced={reduced}
        />
      ))}
    </div>
  );
}

export function NutritionMealHistoryTile({
  streakDays,
  dailyMealCounts,
}: NutritionMealHistoryTileProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="font-[Instrument_Sans] w-full rounded-2xl border border-white/10 bg-[#1E3054]/40 text-white backdrop-blur-md">
      <header className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-4">
        <CalendarDays className="h-4 w-4 text-white/70" strokeWidth={1.5} />
        <h2 className="text-[15px] font-semibold text-white">7 day meal history</h2>
      </header>

      <div className="flex flex-col items-stretch gap-5 px-4 pb-4 md:flex-row md:items-center md:gap-7 md:px-5 md:pb-5">
        <StreakGauge streakDays={streakDays} reduced={reduced} />
        <BarRow dailyMealCounts={dailyMealCounts} reduced={reduced} />
      </div>
    </section>
  );
}

export default NutritionMealHistoryTile;
