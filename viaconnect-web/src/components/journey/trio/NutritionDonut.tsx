'use client';

/**
 * src/components/journey/trio/NutritionDonut.tsx
 *
 * The LIVE nutrition macros donut for the Your Journey page (Prompt 208d, 3.6,
 * Task D-T4). It reads TODAY's confirmed nutrition_logs (gordon's log) directly
 * from the browser (owner-scoped RLS), sums carbs / protein / fat grams into the
 * donut segments, and shows "kcal remaining" in the center (target from
 * useNutritionTargets minus today's logged calories).
 *
 * Sources (each fail-open):
 *   - macros + kcal: nutrition_logs where status='confirmed' and logged_at is
 *     today (UTC day), summed client-side. Mirrors the EnergyBalanceTriangle
 *     read pattern but scoped to today. No logs -> honest empty donut.
 *   - target kcal: useNutritionTargets(userId).targets.dailyKcal. No target ->
 *     center falls back to consumed kcal with a neutral label, never a guess.
 *
 * gordon is lowercase in any user-facing label. Honest-empty when there are no
 * logs today ("Log a meal to see your macros"). Never throws.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 (carbs) / Orange #B75E18
 * (protein) / muted slate (fat), DM Sans, Lucide strokeWidth 1.5, no emojis,
 * no em/en-dashes, reduced-motion safe (the Donut handles motion).
 */

import { useEffect, useMemo, useState } from 'react';
import { Salad } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import { Donut } from './Donut';

const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const SLATE = '#6C7A99';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

interface TodayMacros {
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  logCount: number;
}

const EMPTY: TodayMacros = {
  calories: 0,
  carbsG: 0,
  proteinG: 0,
  fatG: 0,
  logCount: 0,
};

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const p = Number(v);
    if (Number.isFinite(p)) return p;
  }
  return 0;
}

/** Start of the current UTC day, matching the daily-totals route convention. */
function todayBounds(): { startIso: string; endIso: string } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Today's confirmed macro totals from nutrition_logs, read client-side and
 * fail-open. Returns zeros (logCount 0) on any error or with no logs; never
 * throws.
 */
function useTodayMacros(userId: string | null): TodayMacros {
  const [macros, setMacros] = useState<TodayMacros>(EMPTY);

  useEffect(() => {
    if (!userId) {
      setMacros(EMPTY);
      return;
    }
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const sb = supabase as unknown as { from: (t: string) => any };
        const { startIso, endIso } = todayBounds();

        const { data } = await sb
          .from('nutrition_logs')
          .select('calories, carbs_g, protein_g, total_fat_g')
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .gte('logged_at', startIso)
          .lt('logged_at', endIso);

        if (!active) return;

        const rows = (Array.isArray(data) ? data : []) as Array<
          Record<string, unknown>
        >;
        const totals = rows.reduce<TodayMacros>(
          (acc, r) => ({
            calories: acc.calories + num(r.calories),
            carbsG: acc.carbsG + num(r.carbs_g),
            proteinG: acc.proteinG + num(r.protein_g),
            fatG: acc.fatG + num(r.total_fat_g),
            logCount: acc.logCount + 1,
          }),
          { ...EMPTY },
        );
        setMacros(totals);
      } catch {
        if (active) setMacros(EMPTY);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  return macros;
}

function LegendRow({
  color,
  label,
  grams,
}: {
  color: string;
  label: string;
  grams: number;
}) {
  const g = Number.isFinite(grams) ? Math.round(grams) : 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span
          className="text-[11px] text-white/70"
          style={{ fontFamily: DM_SANS }}
        >
          {label}
        </span>
      </span>
      <span
        className="text-[11px] font-semibold tabular-nums text-white/85"
        style={{ fontFamily: DM_SANS }}
      >
        {g} g
      </span>
    </div>
  );
}

export function NutritionDonut({ userId }: { userId: string | null }) {
  const macros = useTodayMacros(userId);
  const { targets } = useNutritionTargets(userId);

  const hasLogs = macros.logCount > 0;

  const segments = useMemo(
    () => [
      { value: macros.carbsG, color: TEAL, label: 'Carbs' },
      { value: macros.proteinG, color: ORANGE, label: 'Protein' },
      { value: macros.fatG, color: SLATE, label: 'Fat' },
    ],
    [macros.carbsG, macros.proteinG, macros.fatG],
  );

  // Center: kcal remaining (target - consumed) when a target exists; else the
  // consumed kcal with a neutral label. Honest "--" when there is no target and
  // nothing consumed.
  const targetKcal =
    typeof targets?.dailyKcal === 'number' && targets.dailyKcal > 0
      ? targets.dailyKcal
      : null;
  const consumed = Math.round(macros.calories);

  let centerValue: string;
  let centerLabel: string;
  if (targetKcal !== null) {
    const remaining = Math.round(targetKcal - macros.calories);
    centerValue = String(remaining);
    centerLabel = 'kcal left';
  } else if (hasLogs) {
    centerValue = String(consumed);
    centerLabel = 'kcal logged';
  } else {
    centerValue = '--';
    centerLabel = 'kcal';
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <div className="flex items-center gap-2">
        <Salad
          className="h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{ color: TEAL }}
        />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: TEAL }}
          >
            Nutrition
          </span>
          <p
            className="text-[12px] text-white/65"
            style={{ fontFamily: DM_SANS }}
          >
            Today&apos;s macros from your gordon log.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Donut
          segments={segments}
          centerValue={centerValue}
          centerLabel={centerLabel}
          emptyCenter="No meals yet"
          ariaLabel="Today's macronutrient split"
        />

        {hasLogs ? (
          <div className="flex w-full flex-col gap-1.5">
            <LegendRow color={TEAL} label="Carbs" grams={macros.carbsG} />
            <LegendRow color={ORANGE} label="Protein" grams={macros.proteinG} />
            <LegendRow color={SLATE} label="Fat" grams={macros.fatG} />
          </div>
        ) : (
          <p
            className="text-center text-[12px] leading-relaxed text-white/55"
            style={{ fontFamily: DM_SANS }}
          >
            Log a meal to see your macros.
          </p>
        )}
      </div>
    </div>
  );
}

export default NutritionDonut;
