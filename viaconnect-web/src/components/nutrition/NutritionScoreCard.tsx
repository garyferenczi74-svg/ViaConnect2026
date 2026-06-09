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
import { isMealNutrientKnown } from '@/lib/gordon/known-nutrients';
import {
  calorieWeightedMealQualityScore,
  totalDailyMacrosScore,
  type DailyMacroAttainments,
  type ScoredMealContribution,
} from '@/lib/gordon/daily-aggregate';
import { NutritionScoreCircleGauge } from './NutritionScoreCircleGauge';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';

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

    // Nutrition Score: calorie-weighted average of today's per-meal
    // qualityScore values per 177 spec section 4.5 (Gordon tunable
    // default). A substantial dinner now influences the day more than
    // a small snack, rather than a tiny perfect snack masking a poor
    // dinner under a uniform average. The averaging math lives in
    // lib/gordon/daily-aggregate so the swap to uniform (or any other
    // future weighting) is a one-line change at the call site.
    //
    // Per Prompt 177d Phase D (2026-06-07): macro totals exclude any
    // meal that could not determine the macro on its source channel.
    const scoredMealsToday: ScoredMealContribution[] = [];
    let nutritionScoredCount = 0;
    let todayMealCount = 0;
    let caloriesSum = 0;
    let proteinSum = 0;
    let carbsSum = 0;
    let fatSum = 0;
    let fiberSum = 0;
    let caloriesKnownCount = 0;
    let proteinKnownCount = 0;
    let carbsKnownCount = 0;
    let fatKnownCount = 0;
    let fiberKnownCount = 0;

    for (const m of meals) {
      if (localDateKey(m.loggedAt, tz) !== todayKey) continue;
      // Per #168c + #168d, narrowed by Prompt 177d (Gary 2026-06-06
      // decision): the legacy marker is qualityScore IS NULL. New
      // full_manual saves run through Gordon and contribute to both the
      // Nutrition Score average AND the Total Daily Macros aggregate;
      // only pre-177d NULL-score rows are excluded.
      if (m.qualityScore === null || m.qualityScore === undefined) continue;
      todayMealCount += 1;
      // Prompt 177e (2026-06-07): calories is always determined on
      // every channel (the 4 / 4 / 9 reconciliation anchor) so its
      // known check defaults to true unless the parser explicitly
      // marks it false.
      if (isMealNutrientKnown(m, 'calories_kcal')) {
        caloriesSum += Number(m.caloriesKcal) || 0;
        caloriesKnownCount += 1;
      }
      if (isMealNutrientKnown(m, 'protein_g')) {
        proteinSum += Number(m.proteinG) || 0;
        proteinKnownCount += 1;
      }
      if (isMealNutrientKnown(m, 'carbs_g')) {
        carbsSum += Number(m.carbsG) || 0;
        carbsKnownCount += 1;
      }
      if (isMealNutrientKnown(m, 'fat_total_g')) {
        fatSum += Number(m.fatTotalG) || 0;
        fatKnownCount += 1;
      }
      if (isMealNutrientKnown(m, 'fiber_g')) {
        fiberSum += Number(m.fiberG) || 0;
        fiberKnownCount += 1;
      }
      nutritionScoredCount += 1;
      scoredMealsToday.push({
        qualityScore: Number(m.qualityScore),
        caloriesKcal: Number(m.caloriesKcal) || 0,
      });
    }
    const nutritionScore = calorieWeightedMealQualityScore(scoredMealsToday);

    // Total Daily Macros per Prompt 177e (2026-06-07): the tracked set
    // is calories, protein, carbs, fat, fiber, matching what Gordon
    // already targets in nutrition_targets. Each macro contributes its
    // attainment (logged / target * 100, capped at 100). The five
    // attainments combine via DAILY_MACRO_WEIGHTS so calories influences
    // the day without naively double-counting energy. A macro with no
    // known contributors today is skipped from the weighted average
    // rather than counted as 0.
    const caloriesPct = caloriesKnownCount > 0 && effectiveTargets.dailyKcal > 0
      ? Math.min(100, (caloriesSum / effectiveTargets.dailyKcal) * 100)
      : null;
    const proteinPct = proteinKnownCount > 0 && effectiveTargets.dailyProteinG > 0
      ? Math.min(100, (proteinSum / effectiveTargets.dailyProteinG) * 100)
      : null;
    const carbsPct = carbsKnownCount > 0 && effectiveTargets.dailyCarbsG > 0
      ? Math.min(100, (carbsSum / effectiveTargets.dailyCarbsG) * 100)
      : null;
    const fatPct = fatKnownCount > 0 && effectiveTargets.dailyFatTotalG > 0
      ? Math.min(100, (fatSum / effectiveTargets.dailyFatTotalG) * 100)
      : null;
    const fiberPct = fiberKnownCount > 0 && effectiveTargets.dailyFiberG > 0
      ? Math.min(100, (fiberSum / effectiveTargets.dailyFiberG) * 100)
      : null;
    const attainments: DailyMacroAttainments = {
      calories: caloriesPct,
      protein: proteinPct,
      carbs: carbsPct,
      fat: fatPct,
      fiber: fiberPct,
    };
    const macrosScore = todayMealCount > 0 ? totalDailyMacrosScore(attainments) : 0;
    const macrosPartial =
      caloriesKnownCount < todayMealCount ||
      proteinKnownCount < todayMealCount ||
      carbsKnownCount < todayMealCount ||
      fatKnownCount < todayMealCount ||
      fiberKnownCount < todayMealCount;

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
      macrosPartial,
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
      {/* Prompt 177f (2026-06-07): mobile-only layout restructure.
          Mobile: hero Nutrition Score spans both columns (col-span-2);
          Total Daily Macros + 7 Day Average sit side by side beneath
          at the smaller 88 px diameter that matches the Daily macros
          section gauges. Desktop: identical to pre-177f three-column
          layout via md:grid-cols-3 + md:col-span-1, and the secondary
          gauges keep their desktop 150 px diameter. Layout only; every
          value, label, tier color, caption, and stroke threshold is
          unchanged. */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-6">
        <div className="col-span-2 flex flex-col items-center gap-1 md:col-span-1 md:gap-2">
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
          {/* Visual pass (Gary 2026-06-09): the Total Daily Macros gauge takes
              the amethyst (purple metallic) PlasmaGauge finish so it reads
              apart from the green Nutrition Score gauge and the gold 7 Day
              Average in the same row. */}
          <NutritionScoreCircleGauge
            score={computed.macrosScore}
            mealCount={computed.macrosMealCount}
            emptyStateLabel="Log meals to fill your daily macros"
            mobilePx={88}
            desktopPx={150}
            mobileStroke={5}
            desktopStroke={12}
            compactMobileCaption
            finish="amethyst"
          />
          <span className="text-[10px] uppercase tracking-[0.10em] text-white/55 md:text-[12px]">
            Total Daily Macros
          </span>
          {/* Prompt 177d Phase D (2026-06-07): one or more meals today
              omitted a macro; the score reflects only known
              contributions. */}
          {computed.macrosPartial ? (
            <span
              className="text-[10px] font-medium"
              style={{ color: '#2DA5A0' }}
              title="One or more text-channel meals today omitted a macro; the score reflects only known contributions."
            >
              Estimated
            </span>
          ) : null}
        </div>
        <div className="flex flex-col items-center gap-1 md:gap-2">
          {/* Prompt 182o (2026-06-09): 7 Day Average gauge swaps from the
              SegmentedDayGauge ring-of-segments to the shared PlasmaGauge
              driven by the same 7-day check-in count. value = days logged
              this week, max = 7 so the center reads N over the / 7
              denominator and the colored arc fills proportionally.
              metric=wellness (champagne gold) so the gauge reads apart
              from the two green nutrition gauges in the same row. */}
          <div className="md:hidden">
            <PlasmaGauge
              value={computed.daysLoggedThisWeek}
              metric="wellness"
              variant="standard"
              size={88}
              max={SEVEN_DAYS}
            />
          </div>
          <div className="hidden md:block">
            <PlasmaGauge
              value={computed.daysLoggedThisWeek}
              metric="wellness"
              variant="standard"
              size={150}
              max={SEVEN_DAYS}
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.10em] text-white/55 md:text-[12px]">
            7 Day Average
          </span>
        </div>
      </div>
    </div>
  );
}
