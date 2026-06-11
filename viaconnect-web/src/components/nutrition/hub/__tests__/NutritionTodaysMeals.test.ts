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

  it('lists exactly Protein, Carbs, Fat, Fiber, Sugar in grams in the Macros column', () => {
    // Prompt 183b: macros are built as rows, each value in grams (gramsLabel),
    // omitting any whose value is missing (fail open).
    expect(source).toContain("macroRow('Protein', totals.protein)");
    expect(source).toContain("macroRow('Carbs', totals.carbs)");
    expect(source).toContain("macroRow('Fat', totals.fat)");
    expect(source).toContain("macroRow('Fiber', totals.fiber)");
    expect(source).toContain("macroRow('Sugar', totals.sugar)");
    expect(source).toContain('return { label, value: gramsLabel(grams) };');
    // No separate Total row in the macros grid.
    expect(source).not.toContain("macroRow('Total'");
  });

  it('reuses PlasmaGauge for the per type and hydration gauges', () => {
    expect(source).toContain("import { PlasmaGauge } from '@/components/gauges/PlasmaGauge'");
    expect(source).toContain('<PlasmaGauge');
  });

  it('Prompt 183a/183b: the per meal type gauge uses the teal hub metric', () => {
    // The per-meal-type gauge moved from mealscore (green) to the teal hub
    // finish. Prompt 183b grew it to 132 so the kcal sits inside the orb.
    expect(source).toContain('metric="plasmateal"');
    expect(source).toContain('size={132}');
    expect(source).not.toContain('metric="mealscore"');
  });

  it('Prompt 183b: shows a 40x40 teal Utensils badge above the title', () => {
    expect(source).toContain('Utensils');
    expect(source).toContain('width: 40, height: 40, borderRadius: 12');
    expect(source).toContain("backgroundColor: 'rgba(45,165,160,0.12)'");
    // Replicated locally; Row 1's BadgeChip is neither imported nor rendered (a
    // passing mention in a comment explaining the local replica is allowed).
    expect(source).not.toMatch(/import[^\n]*BadgeChip/);
    expect(source).not.toContain('<BadgeChip');
  });

  it('Prompt 183b: the expanded inner is a compact flex row, not a vertical stack', () => {
    // gap 30, padding 18, top aligned items. The wrap lets it stack on mobile.
    expect(source).toContain('flex flex-wrap items-start gap-[30px] p-[18px]');
  });

  it('Prompt 183b: the Meal/Macros grid is contained 1.4fr 1fr with space-between lines', () => {
    expect(source).toContain('sm:grid-cols-[1.4fr_1fr]');
    // Each line right-aligns its value within its own column, not at the page
    // edge: a flex row justified apart.
    expect(source).toContain('flex items-baseline justify-between');
  });

  it('Prompt 183b: the Meal and Macros columns have teal headers with a teal bottom rule', () => {
    expect(source).toContain('<ColumnHeader>Meal</ColumnHeader>');
    expect(source).toContain('<ColumnHeader>Macros</ColumnHeader>');
    expect(source).toContain("color: '#2DA5A0', borderBottom: '1px solid rgba(45,165,160,0.28)'");
    // Faint hairline between lines, none on the last.
    expect(source).toContain("borderBottom: '1px solid rgba(255,255,255,0.05)'");
  });

  it('Prompt 183b: the gauge shows KCAL in the center via displayValue', () => {
    expect(source).toContain('displayValue={kcal}');
    expect(source).toContain('caption="KCAL"');
    expect(source).toContain('valueFontPx={36}');
    // The old separate KCAL label beneath the gauge is gone.
    expect(source).not.toContain(">KCAL</span>");
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

  it('reuses the exact meal type accent codes from MealHistory for the left edge', () => {
    // The existing DATA codes are kept as is; Prompt 183b drives the 4px row
    // left edge with them instead of a full gradient fill.
    expect(source).toContain("dot: '#FFB347'"); // breakfast
    expect(source).toContain("dot: '#2DA5A0'"); // lunch
    expect(source).toContain("dot: '#B75E18'"); // dinner
    expect(source).toContain("dot: '#7C6FE0'"); // snack
    expect(source).toContain("const HYDRATION_DOT = '#5B8DEF'"); // hydration
  });

  it('Prompt 183b: rows use a translucent navy panel with a 4px colored left edge, no gradient fill', () => {
    expect(source).toContain("background: 'rgba(26,39,68,0.5)'");
    expect(source).toContain("border: '1px solid rgba(255,255,255,0.07)'");
    expect(source).toContain('borderLeft: `4px solid ${dot}`');
    // The full per type gradient row FILL is gone.
    expect(source).not.toContain('from-amber-600/40 via-orange-600/20 to-amber-700/30');
    expect(source).not.toContain('from-sky-600/40 via-blue-500/20 to-sky-700/30');
    expect(source).not.toContain('bg-gradient-to-br px-3');
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
