/**
 * Prompt 219e: Dashboard Log Your Meal replaces Quick Log; shared My Nutrition paths.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Prompt 219e dashboard Log Your Meal', () => {
  it('dashboard mounts shared Log Your Meal section, not QuickLogsSurface', () => {
    const page = readFileSync(
      join(root, 'src/app/(app)/(consumer)/dashboard/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/DashboardLogYourMealSection/);
    expect(page).not.toMatch(/QuickLogsSurface/);
    expect(page).not.toMatch(/handleSaveMeal/);
    expect(page).not.toMatch(/Log macros in grams/);
  });

  it('shared actions list NutriVision, Log a Full Meal, Hydration in order', () => {
    const src = readFileSync(
      join(root, 'src/components/nutrition/LogYourMealActions.tsx'),
      'utf8',
    );
    const n = src.indexOf('NutriVision');
    const f = src.indexOf('Log a Full Meal');
    const h = src.indexOf('Hydration');
    expect(n).toBeGreaterThan(-1);
    expect(f).toBeGreaterThan(n);
    expect(h).toBeGreaterThan(f);
    expect(src).toMatch(/\/nutrition\/photo-ai/);
    expect(src).toMatch(/\/nutrition\/log-meal/);
    expect(src).toMatch(/\/wellness-analytics\/hydration/);
  });

  it('dashboard section reuses NutritionTodaysMeals and DailyMacrosCard', () => {
    const src = readFileSync(
      join(root, 'src/components/dashboard/DashboardLogYourMealSection.tsx'),
      'utf8',
    );
    expect(src).toMatch(/LogYourMealActions/);
    expect(src).toMatch(/NutritionTodaysMeals/);
    expect(src).toMatch(/DailyMacrosCard/);
    expect(src).toMatch(/Log Your Meal/);
    // No local nutrition math
    expect(src).not.toMatch(/caloriesKcal\s*\+|proteinG\s*\+|generateTargets/);
  });

  it('NutritionHub consumes the same LogYourMealActions component', () => {
    const hub = readFileSync(
      join(root, 'src/components/nutrition/hub/NutritionHub.tsx'),
      'utf8',
    );
    expect(hub).toMatch(/LogYourMealActions/);
    expect(hub).not.toMatch(/GlassPill/);
  });

  it('parity: both surfaces read meals via useUserMeals (Gordon path)', () => {
    const meals = readFileSync(
      join(root, 'src/components/nutrition/hub/NutritionTodaysMeals.tsx'),
      'utf8',
    );
    const macros = readFileSync(
      join(root, 'src/components/nutrition/DailyMacrosCard.tsx'),
      'utf8',
    );
    expect(meals).toMatch(/useUserMeals/);
    expect(macros).toMatch(/useUserMeals/);
    expect(macros).toMatch(/useNutritionTargets/);
  });

  it('no orphan quick-log table: dashboard meal write was always /api/nutrition/meals', () => {
    // Historical QuickLogsSurface saved through parent handleSaveMeal to
    // POST /api/nutrition/meals (Gordon). No separate quick_log table.
    const quick = readFileSync(
      join(root, 'src/components/dashboard/QuickLogsSurface.tsx'),
      'utf8',
    );
    expect(quick).toMatch(/onSaveMeal/);
    expect(quick).not.toMatch(/from\(['\"]quick_log/);
    expect(quick).not.toMatch(/\.from\(['\"]meal_logs/);
  });
});
