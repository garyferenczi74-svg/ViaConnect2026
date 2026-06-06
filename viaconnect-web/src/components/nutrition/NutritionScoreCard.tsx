'use client';

// Prompt #168c section 2.7 + Gary 2026-05-15 expansion: NutritionScoreCard
// now hosts THREE circle gauges side by side instead of one. Layout:
//   [Nutrition Score]   [Total Daily Macros]   [7 Day Average]
// All three share the spec section 2.4 Path C tier color bands.
//
//   Nutrition Score      = avg of today's qualityScore values (excludes legacy
//                          rows where qualityScore is null).
//   Total Daily Macros   = avg of (today's protein/target, carbs/target,
//                          fat_total/target, fiber/target), capped at 100%.
//   7 Day Average        = avg of qualityScore over the last 7 days.

import { useEffect, useMemo, useState } from 'react';
import { Apple } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUserMeals } from '@/hooks/useUserMeals';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import { generateTargets } from '@/lib/gordon/generateTargets';
import { NutritionScoreCircleGauge } from './NutritionScoreCircleGauge';
import { SegmentedDayGauge } from './SegmentedDayGauge';

interface NutritionScoreCardProps {
  // Optional. If not passed, the component fetches its own user.
  readonly userId?: string | null;
}

const SEVEN_DAYS = 7;

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

export function NutritionScoreCard({ userId: propUserId }: NutritionScoreCardProps = {}) {
  const [internalUserId, setInternalUserId] = useState<string | null>(propUserId ?? null);

  useEffect(() => {
    if (propUserId !== undefined) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setInternalUserId(data.user?.id ?? null);
    });
  }, [propUserId]);

  const userId = propUserId ?? internalUserId;
  const { meals } = useUserMeals(userId, { days: SEVEN_DAYS, includeLegacy: false });
  const { targets: prompt168Targets } = useNutritionTargets(userId);
  const effectiveTargets = useMemo(() => (
    prompt168Targets
    ?? generateTargets({ caqSnapshot: null, bodySnapshot: null, bioOptDay: null, mealPatternHistory: null })
  ), [prompt168Targets]);

  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const computed = useMemo(() => {
    const todayKey = localDateKey(new Date().toISOString(), tz);
    if (!todayKey) {
      return {
        nutritionScore: 0,
        nutritionMealCount: 0,
        macrosScore: 0,
        macrosMealCount: 0,
        daysLoggedThisWeek: 0,
      };
    }

    // Nutrition Score: avg qualityScore over today's scored meals.
    let nutritionSum = 0;
    let nutritionScoredCount = 0;
    let todayMealCount = 0;
    let proteinSum = 0;
    let carbsSum = 0;
    let fatSum = 0;
    let fiberSum = 0;

    for (const m of meals) {
      if (localDateKey(m.loggedAt, tz) !== todayKey) continue;
      // Per #168c + #168d, narrowed by Prompt 173b (2026-06-01): the legacy
      // marker is qualityScore IS NULL. New full_manual saves run through
      // Gordon scoring and contribute to both the Nutrition Score average
      // AND the Total Daily Macros aggregate; only pre-173b NULL-score rows
      // are excluded.
      if (m.qualityScore === null || m.qualityScore === undefined) continue;
      todayMealCount += 1;
      proteinSum += Number(m.proteinG) || 0;
      carbsSum += Number(m.carbsG) || 0;
      fatSum += Number(m.fatTotalG) || 0;
      fiberSum += Number(m.fiberG) || 0;
      if (m.qualityScore !== null && m.qualityScore !== undefined) {
        nutritionScoredCount += 1;
        nutritionSum += Math.max(0, Math.min(100, Number(m.qualityScore)));
      }
    }
    const nutritionScore = nutritionScoredCount > 0 ? Math.round(nutritionSum / nutritionScoredCount) : 0;

    // Total Daily Macros: avg of (sum / target * 100) across the 4 macros.
    // Each ratio capped at 100% so a single overshoot does not skew the average.
    const proteinPct = effectiveTargets.dailyProteinG > 0
      ? Math.min(100, (proteinSum / effectiveTargets.dailyProteinG) * 100)
      : 0;
    const carbsPct = effectiveTargets.dailyCarbsG > 0
      ? Math.min(100, (carbsSum / effectiveTargets.dailyCarbsG) * 100)
      : 0;
    const fatPct = effectiveTargets.dailyFatTotalG > 0
      ? Math.min(100, (fatSum / effectiveTargets.dailyFatTotalG) * 100)
      : 0;
    const fiberPct = effectiveTargets.dailyFiberG > 0
      ? Math.min(100, (fiberSum / effectiveTargets.dailyFiberG) * 100)
      : 0;
    const macrosScore = todayMealCount > 0
      ? Math.round((proteinPct + carbsPct + fatPct + fiberPct) / 4)
      : 0;

    // 7 Day check-in: count UNIQUE days in the last 7 where at least one meal
    // was logged. The gauge below renders 7 arc segments; one fills per logged
    // day. Quality score (avg) collapsed in favor of days-logged count per
    // Gary 2026-05-15 directive.
    const windowKeys = new Set<string>();
    const today = new Date();
    for (let i = 0; i < SEVEN_DAYS; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = localDateKey(d.toISOString(), tz);
      if (key) windowKeys.add(key);
    }
    const daysWithMeals = new Set<string>();
    for (const m of meals) {
      const key = localDateKey(m.loggedAt, tz);
      if (!windowKeys.has(key)) continue;
      daysWithMeals.add(key);
    }

    return {
      nutritionScore,
      nutritionMealCount: todayMealCount,
      macrosScore,
      macrosMealCount: todayMealCount,
      daysLoggedThisWeek: daysWithMeals.size,
    };
  }, [meals, tz, effectiveTargets]);

  // Prompt 175m gauge sizing v2 (2026-06-05): aggressive pass. Mobile
  // ring drops 140 -> 100 px so each gauge group sits at ~140 px
  // vertical instead of ~210 px; three groups plus tight gaps now total
  // ~420 px, leaving the whole card visible on a single iPhone screen.
  // Stroke 10 -> 6 proportional to the ring shrink. Center value and
  // denominator scale too, handled inside the two gauge components.
  // Header, padding, grid gap, and caption gap all tightened on mobile.
  // Desktop sizes (150 px ring, 12 px stroke, gap-6) unchanged.
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-3 md:p-5">
      <div className="mb-2 flex items-center gap-2 md:mb-4">
        <Apple className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        <h2 className="text-base font-bold text-white">Nutrition Score</h2>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-6">
        <div className="flex flex-col items-center gap-1 md:gap-2">
          <NutritionScoreCircleGauge
            score={computed.nutritionScore}
            mealCount={computed.nutritionMealCount}
            emptyStateLabel={`Based on ${computed.nutritionMealCount} meals logged today`}
            mobilePx={100}
            desktopPx={150}
            mobileStroke={6}
            desktopStroke={12}
          />
          <span className="text-[11px] uppercase tracking-[0.10em] text-white/55 md:text-[12px]">
            Nutrition Score
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 md:gap-2">
          <NutritionScoreCircleGauge
            score={computed.macrosScore}
            mealCount={computed.macrosMealCount}
            emptyStateLabel="Log meals to fill your daily macros"
            mobilePx={100}
            desktopPx={150}
            mobileStroke={6}
            desktopStroke={12}
          />
          <span className="text-[11px] uppercase tracking-[0.10em] text-white/55 md:text-[12px]">
            Total Daily Macros
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 md:gap-2">
          <SegmentedDayGauge
            daysLogged={computed.daysLoggedThisWeek}
            totalDays={SEVEN_DAYS}
            mobilePx={100}
            desktopPx={150}
            mobileStroke={6}
            desktopStroke={12}
          />
          <span className="text-[11px] uppercase tracking-[0.10em] text-white/55 md:text-[12px]">
            7 Day Average
          </span>
        </div>
      </div>
    </div>
  );
}
