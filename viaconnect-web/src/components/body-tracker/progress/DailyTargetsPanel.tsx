'use client';

// Prompt 179 Section 7.3 Daily Targets (Gordon). Prompt 201 (2026-06-15): the
// targets render as a Gordon-attributed instrument grid inside a ProgressCard.
// DD-3: the Calories and macro tiles carry a thin Plasma Core ring of today's
// logged intake vs the target, read through the existing meals and hub-metrics
// selectors (never a new query) and failing open to a target-only readout. The
// numbers come from the engine-resolved target; nothing is recomputed here.

import { useMemo } from 'react';
import { Gauge, Flame, Beef, Droplet, Wheat, Leaf, CandyOff, GlassWater } from 'lucide-react';
import type { TargetView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import { getDisplayName } from '@/lib/getDisplayName';
import { useUserMeals } from '@/hooks/useUserMeals';
import { useNutritionHubMetrics } from '@/components/nutrition/hub/useNutritionHubMetrics';

function localDayKey(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

interface Tile {
  label: string;
  targetValue: number | null;
  unit: string;
  Icon: typeof Flame;
  color: string;
  consumed?: number | null;
  ring?: boolean;
  note?: string;
  display?: string;
}

export function DailyTargetsPanel({
  target,
  userId,
}: {
  target: TargetView | null;
  userId?: string | null;
}) {
  // DD-3 today-vs-target. Both reads fail open: macros come from the same hub
  // metrics selector My Nutrition uses; today's calories are summed from the
  // existing user-meals read. Hooks run before the early return per hook rules.
  const { metrics } = useNutritionHubMetrics();
  const { meals } = useUserMeals(userId ?? null, { days: 1, includeLegacy: true });
  const todayKcal = useMemo(() => {
    const today = localDayKey(new Date());
    let sum = 0;
    let any = false;
    for (const m of meals) {
      if (m.loggedAt && localDayKey(new Date(m.loggedAt)) === today) {
        sum += m.caloriesKcal ?? 0;
        any = true;
      }
    }
    return any ? Math.round(sum) : null;
  }, [meals]);

  if (!target) return null;

  const teal = '#2DA5A0';
  const orange = '#B75E18';
  const sugarStretch =
    target.added_sugar_limit_g != null ? Math.round(target.added_sugar_limit_g / 2) : null;

  const tiles: Tile[] = [
    { label: 'Calories', targetValue: target.calorie_target_kcal, unit: 'kcal', Icon: Flame, color: orange, consumed: todayKcal, ring: true },
    { label: 'Protein', targetValue: target.protein_g, unit: 'g', Icon: Beef, color: teal, consumed: metrics.proteinG ?? null, ring: true },
    { label: 'Fat', targetValue: target.fat_g, unit: 'g', Icon: Droplet, color: teal, consumed: metrics.fatG ?? null, ring: true },
    { label: 'Carbs', targetValue: target.carb_g, unit: 'g', Icon: Wheat, color: teal, consumed: metrics.carbsG ?? null, ring: true },
    { label: 'Fiber', targetValue: target.fiber_g, unit: 'g', Icon: Leaf, color: teal, consumed: metrics.fiberG ?? null, ring: true },
    {
      label: 'Added sugar ceiling',
      targetValue: target.added_sugar_limit_g,
      unit: 'g',
      Icon: CandyOff,
      color: orange,
      note: sugarStretch != null ? `stretch ${sugarStretch} g` : undefined,
      display: target.added_sugar_limit_g != null ? undefined : 'not set',
    },
    {
      label: 'Hydration',
      targetValue: target.hydration_ml,
      unit: 'ml',
      Icon: GlassWater,
      color: teal,
      display: target.hydration_ml != null ? undefined : 'not set',
    },
  ];

  return (
    <ProgressCard icon={Gauge} accent="teal" attributionSlug="gordon">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Daily Targets</h2>
        <span className="text-xs text-white/50">
          Set by {getDisplayName('gordon')} from your goal trajectory
        </span>
      </div>
      <p className="mb-4 text-xs text-white/50">These drive today&apos;s Nutrition Score and Daily Macros.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const showRing = t.ring === true && t.consumed != null && t.targetValue != null && t.targetValue > 0;
          return (
            <div key={t.label} className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <t.Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: t.color }} />
                <span className="text-[11px] text-white/60">{t.label}</span>
              </div>
              {showRing ? (
                <div className="flex flex-col items-center">
                  <PlasmaGauge
                    value={Math.max(0, Math.min(100, Math.round((t.consumed! / t.targetValue!) * 100)))}
                    displayValue={t.consumed!}
                    metric="plasmateal"
                    size={84}
                    variant="compact"
                    caption={`OF ${t.targetValue}`}
                    ariaLabel={`${t.label}: ${t.consumed} of ${t.targetValue} ${t.unit} today`}
                  />
                  <span className="mt-1 text-[10px] text-white/35">{t.unit}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-semibold text-white">{t.display ?? `${t.targetValue}`}</span>
                    <span className="text-[11px] text-white/40">{t.unit}</span>
                  </div>
                  {t.note ? <p className="mt-0.5 text-[10px] text-white/35">{t.note}</p> : null}
                </>
              )}
            </div>
          );
        })}
      </div>
    </ProgressCard>
  );
}
