'use client';

// Prompt #168 Apply B: MealLogEntryCard.
// Single meal row in the dashboard meal list. Tapping toggles an expanded
// view that surfaces ScoreBreakdownPanel (when scoreBreakdown is present) and
// a small macro grid. Legacy rows (scoreBreakdown null) show a neutral grey
// ring with copy explaining the score is unavailable.
//
// Token map per Section 6 of the plan: card surface #1E3054, Teal/Orange tier
// colors, Instrument Sans, Lucide React icons at strokeWidth 1.5.

import { useMemo, useState } from 'react';
import { Coffee, Sun, Moon, Cookie, ChevronDown, ChevronUp } from 'lucide-react';
import type { Meal, MealType } from '@/lib/gordon/types';
import { QualityScoreRing } from '@/components/meals/QualityScoreRing';
import { ScoreBreakdownPanel } from '@/components/meals/ScoreBreakdownPanel';

export interface MealLogEntryCardProps {
  readonly meal: Meal;
  readonly expanded?: boolean;
  readonly userTimezone?: string;
}

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function MealTypeIcon({ type }: { type: MealType }) {
  const cls = 'h-4 w-4 text-white/70';
  if (type === 'breakfast') return <Coffee className={cls} strokeWidth={1.5} />;
  if (type === 'lunch') return <Sun className={cls} strokeWidth={1.5} />;
  if (type === 'dinner') return <Moon className={cls} strokeWidth={1.5} />;
  return <Cookie className={cls} strokeWidth={1.5} />;
}

function formatTimeLocal(iso: string, timezone: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    }).format(d);
  } catch {
    return '';
  }
}

export function MealLogEntryCard(props: MealLogEntryCardProps) {
  const { meal, expanded: expandedProp, userTimezone } = props;
  const tz = useMemo(
    () => userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [userTimezone],
  );
  const [open, setOpen] = useState<boolean>(Boolean(expandedProp));
  const expanded = expandedProp !== undefined ? expandedProp : open;
  const toggleable = expandedProp === undefined;

  const time = formatTimeLocal(meal.loggedAt, tz);
  const fallbackName = time
    ? `${MEAL_TYPE_LABEL[meal.mealType]} at ${time}`
    : MEAL_TYPE_LABEL[meal.mealType];
  const displayName = meal.mealName && meal.mealName.trim() !== '' ? meal.mealName : fallbackName;

  const hasScore = meal.qualityScore !== null && meal.qualityTier !== null;
  const scoreValue = hasScore ? Number(meal.qualityScore) : 0;
  const tierLabel = hasScore ? meal.qualityTier : null;

  return (
    <article className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054] text-white">
      <button
        type="button"
        onClick={() => {
          if (toggleable) setOpen((prev) => !prev);
        }}
        aria-expanded={toggleable ? expanded : undefined}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left"
      >
        <div className="shrink-0">
          {hasScore && tierLabel ? (
            <QualityScoreRing score={scoreValue} tier={tierLabel} sizePx={60} />
          ) : (
            <div
              role="img"
              aria-label="Score not available for legacy meal"
              className="relative inline-flex items-center justify-center"
              style={{ width: 60, height: 60 }}
            >
              <svg width={60} height={60} viewBox="0 0 60 60">
                <circle cx={30} cy={30} r={25} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
              </svg>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.10em] text-white/55">
                n/a
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MealTypeIcon type={meal.mealType} />
            <span className="text-[13px] uppercase tracking-[0.10em] text-white/60">
              {MEAL_TYPE_LABEL[meal.mealType]}
            </span>
            {time ? <span className="text-[12px] text-white/40">{time}</span> : null}
          </div>
          <div className="mt-0.5 truncate text-[15px] font-medium text-white">{displayName}</div>
          <div className="mt-0.5 flex items-center gap-3 text-[12px] text-white/60">
            <span className="tabular-nums">{Math.round(meal.caloriesKcal)} kcal</span>
            {!hasScore ? (
              <span className="text-white/50">Score not available for legacy meal</span>
            ) : null}
          </div>
        </div>

        {toggleable ? (
          <div className="shrink-0 text-white/60">
            {expanded ? (
              <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
            )}
          </div>
        ) : null}
      </button>

      {expanded ? (
        <div className="border-t border-white/10 px-3 py-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <MacroCell label="Protein" value={meal.proteinG} unit="g" />
            <MacroCell label="Carbs" value={meal.carbsG} unit="g" />
            <MacroCell label="Fat" value={meal.fatTotalG} unit="g" />
            <MacroCell label="Fiber" value={meal.fiberG} unit="g" />
            <MacroCell label="Sugar" value={meal.sugarG} unit="g" />
            <MacroCell label="Sodium" value={meal.sodiumMg} unit="mg" />
            <MacroCell label="Healthy fat" value={meal.fatHealthyG} unit="g" />
            <MacroCell label="Calories" value={meal.caloriesKcal} unit="kcal" />
          </div>
          {meal.scoreBreakdown ? (
            <div className="mt-3">
              <ScoreBreakdownPanel breakdown={meal.scoreBreakdown} defaultOpen={true} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function MacroCell({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.10em] text-white/50">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-white">
        {Math.round(value)}
        <span className="ml-1 text-[11px] font-normal text-white/60">{unit}</span>
      </div>
    </div>
  );
}

export default MealLogEntryCard;
