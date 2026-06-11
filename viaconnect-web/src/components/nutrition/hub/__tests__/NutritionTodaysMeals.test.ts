// Prompt 183 Task 4 (2026-06-10): source as text contract tests for the read
// only Today's Meals accordion. Same convention the other hub tests use
// (readFileSync + assert on the source); full visual sign off happens at the
// Vercel preview. These lock the five rows, the Meal / Macros columns, the
// hydration volume framing, the PlasmaGauge reuse, the read only contract (no
// write calls), the data hook reuse, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'NutritionTodaysMeals.tsx');
const HELPERS = path.resolve(__dirname, '..', 'nutritionTodaysMeals.helpers.ts');

describe('NutritionTodaysMeals source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('declares all five rows in order Breakfast, Lunch, Dinner, Snack, Hydration', () => {
    expect(source).toContain("label: 'Breakfast'");
    expect(source).toContain("label: 'Lunch'");
    expect(source).toContain("label: 'Dinner'");
    expect(source).toContain("label: 'Snack'");
    expect(source).toContain('label="Hydration"');

    const iBreakfast = source.indexOf("label: 'Breakfast'");
    const iLunch = source.indexOf("label: 'Lunch'");
    const iDinner = source.indexOf("label: 'Dinner'");
    const iSnack = source.indexOf("label: 'Snack'");
    expect(iBreakfast).toBeLessThan(iLunch);
    expect(iLunch).toBeLessThan(iDinner);
    expect(iDinner).toBeLessThan(iSnack);
    const iHydration = source.indexOf('label="Hydration"');
    expect(iSnack).toBeLessThan(iHydration);
  });

  it('delegates the per type gauge score to mealTypeAggregateScore', () => {
    expect(source).toContain('mealTypeAggregateScore(meals)');
  });

  it('lists exactly Protein, Carbs, Fat, Fiber, Sugar in the Macros column', () => {
    expect(source).toContain('label="Protein"');
    expect(source).toContain('label="Carbs"');
    expect(source).toContain('label="Fat"');
    expect(source).toContain('label="Fiber"');
    expect(source).toContain('label="Sugar"');
    // No separate Total column in the macros grid.
    expect(source).not.toContain('label="Total"');
  });

  it('reuses PlasmaGauge for the per type and hydration gauges', () => {
    expect(source).toContain("import { PlasmaGauge } from '@/components/gauges/PlasmaGauge'");
    expect(source).toContain('<PlasmaGauge');
  });

  it('reuses useUserMeals with the same args DailyTotalsTab passes', () => {
    expect(source).toContain("import { useUserMeals } from '@/hooks/useUserMeals'");
    expect(source).toContain('useUserMeals(userId ?? null, { days: 7, includeLegacy: true })');
  });

  it('reuses useHydrationToday for the hydration volumes', () => {
    expect(source).toContain("import { useHydrationToday } from '@/components/hydration/useHydrationToday'");
    expect(source).toContain('useHydrationToday()');
  });

  it('drives the hydration row with volume, not kcal', () => {
    // Hydration header total is a volume label, and the hydration panel reads
    // total_ml / target_ml off the hook rather than calories.
    expect(source).toContain('formatVolumeLabel(hydrationTotalMl)');
    expect(source).toContain('hydrationToday?.total_ml');
    expect(source).toContain('hydrationToday?.target_ml');
    expect(source).toContain('Remaining');
  });

  it('expands in flow via framer motion height auto, not an overlay', () => {
    expect(source).toContain("from 'framer-motion'");
    expect(source).toContain("height: 'auto'");
    // No absolute / fixed positioned expansion layer.
    expect(source).not.toContain('absolute inset-0');
  });

  it('reuses the exact meal type accent dots from MealHistory', () => {
    expect(source).toContain("dot: '#FFB347'"); // breakfast
    expect(source).toContain("dot: '#2DA5A0'"); // lunch
    expect(source).toContain("dot: '#B75E18'"); // dinner
    expect(source).toContain("dot: '#7C6FE0'"); // snack
  });

  it('reuses the exact meal type gradients from TodaysMealsSummary', () => {
    expect(source).toContain('from-amber-600/40 via-orange-600/20 to-amber-700/30');
    expect(source).toContain('from-purple-500/40 via-purple-600/20 to-purple-700/30');
    expect(source).toContain('from-indigo-500/40 via-indigo-600/20 to-violet-600/30');
    expect(source).toContain('from-rose-500/40 via-pink-500/20 to-pink-600/30');
    expect(source).toContain('from-sky-600/40 via-blue-500/20 to-sky-700/30');
  });

  it('mirrors the existing empty state copy', () => {
    expect(source).toContain('logged yet today.');
  });

  it('uses Lucide strokeWidth 1.5 only', () => {
    expect(source).toContain("from 'lucide-react'");
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('strokeWidth={2}');
    expect(source).not.toContain('strokeWidth={1}');
  });

  it('performs ZERO writes (read only contract)', () => {
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
    expect(source).not.toContain('.upsert(');
    // No fetch with a POST or DELETE method.
    expect(source).not.toMatch(/method:\s*['"]POST['"]/i);
    expect(source).not.toMatch(/method:\s*['"]DELETE['"]/i);
    expect(source).not.toContain('fetch(');
    // It does not import or render the delete/edit summary (a passing mention
    // in a comment explaining why it is NOT reused is allowed).
    expect(source).not.toMatch(/import[^\n]*TodaysMealsSummary/);
    expect(source).not.toContain('<TodaysMealsSummary');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('nutritionTodaysMeals.helpers source', () => {
  const source = readFileSync(HELPERS, 'utf-8');

  it('reuses calorieWeightedMealQualityScore rather than authoring new scoring', () => {
    expect(source).toContain("import { calorieWeightedMealQualityScore } from '@/lib/gordon/daily-aggregate'");
  });

  it('performs no reads or writes (pure transforms only)', () => {
    expect(source).not.toContain('createClient');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
