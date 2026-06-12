// Prompt 192 Task 2: small shared helpers for the insight detectors.

import { addDays, localDateOf } from '../time';
import type { DetectorInput, InsightMeal, InsightTargets, TrackedMacro } from '../types';

/** Meals with a Gordon quality score; legacy null score rows are excluded everywhere. */
export function scoredMeals(input: DetectorInput): InsightMeal[] {
  return input.scoredMeals.filter((m) => m.qualityScore !== null);
}

export function mealsByDate(meals: InsightMeal[]): Map<string, InsightMeal[]> {
  const map = new Map<string, InsightMeal[]>();
  for (const meal of meals) {
    const list = map.get(meal.date);
    if (list) list.push(meal);
    else map.set(meal.date, [meal]);
  }
  return map;
}

/** The last completed local day relative to the injected clock. */
export function yesterdayLocal(input: DetectorInput): string {
  return addDays(localDateOf(input.now, input.timezone), -1);
}

export interface MacroDef {
  macro: TrackedMacro;
  label: string;
  grams: (m: InsightMeal) => number;
  known: (m: InsightMeal) => boolean;
  target: (t: InsightTargets) => number;
}

export const MACRO_DEFS: ReadonlyArray<MacroDef> = [
  {
    macro: 'protein',
    label: 'protein',
    grams: (m) => m.proteinG,
    known: (m) => m.known.protein,
    target: (t) => t.dailyProteinG,
  },
  {
    macro: 'carbs',
    label: 'carbs',
    grams: (m) => m.carbsG,
    known: (m) => m.known.carbs,
    target: (t) => t.dailyCarbsG,
  },
  {
    macro: 'fat',
    label: 'fat',
    grams: (m) => m.fatTotalG,
    known: (m) => m.known.fat,
    target: (t) => t.dailyFatTotalG,
  },
  {
    macro: 'fiber',
    label: 'fiber',
    grams: (m) => m.fiberG,
    known: (m) => m.known.fiber,
    target: (t) => t.dailyFiberG,
  },
];

export function roundPct(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

export function clampMagnitude(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
