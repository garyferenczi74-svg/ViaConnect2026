// #170 Phase 1q hotfix 9: source-presence test for the existingMeal +
// pre-fill cross-reference. Confirms QuickLogEntryBlock pre-fills the
// slider state from an existing meal's macros (rather than rendering a
// read-only summary card) and shows a "Loaded from your ..." banner so
// users adjust the prior values and re-save through the existing
// replace-on-save semantics.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT_PATH = path.resolve(
  __dirname,
  '..',
  'QuickLogEntryBlock.tsx',
);

const SURFACE_PATH = path.resolve(
  __dirname,
  '..',
  'QuickLogsSurface.tsx',
);

describe('QuickLogEntryBlock #170 Phase 1q hotfix 9 cross-reference', () => {
  const source = readFileSync(COMPONENT_PATH, 'utf-8');

  it('declares the optional existingMeal prop', () => {
    expect(source).toContain('existingMeal');
  });

  it('initializes sliders from existingMeal macros via initialSliders', () => {
    expect(source).toContain('initialSliders');
    expect(source).toContain('existingMeal.proteinG');
    expect(source).toContain('existingMeal.carbsG');
    expect(source).toContain('existingMeal.fatTotalG');
    expect(source).toContain('existingMeal.fiberG');
    expect(source).toContain('existingMeal.sugarG');
    expect(source).toContain('existingMeal.sodiumMg');
    expect(source).toContain('existingMeal.caloriesKcal');
  });

  it('seeds caloriesAutoCalc false when prefilling from an existing meal', () => {
    expect(source).toContain('useState<boolean>(!existingMeal)');
  });

  it('seeds the meal name from existingMeal.mealName or notes', () => {
    expect(source).toContain('existingMeal?.mealName ?? existingMeal?.notes');
  });

  it('renders the Loaded from your banner when existingMeal is non-null', () => {
    expect(source).toContain('Loaded from your');
    expect(source).toContain('Adjust the sliders to refine, then save to update.');
  });

  it('branches the banner source label between NutriVision and recent', () => {
    expect(source).toContain("existingMeal.source === 'nutrivision' ? 'NutriVision' : 'recent'");
  });

  it('uses the Lucide Sparkles icon at strokeWidth 1.5 for the banner accent', () => {
    expect(source).toContain("import { Sparkles } from 'lucide-react'");
    expect(source).toContain('<Sparkles');
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('keeps all seven macro slider labels in the form', () => {
    const labels = ['Calories', 'Protein', 'Carbs', 'Fat (Total)', 'Fiber', 'Sugar', 'Sodium'];
    for (const label of labels) {
      expect(source).toContain(label);
    }
  });

  it('uses the brand Teal token on the prefill banner accent', () => {
    expect(source).toContain('#2DA5A0');
  });

  it('reverts the hotfix 8 summary card surface', () => {
    expect(source).not.toContain('ExistingMealSummary');
    expect(source).not.toContain('replaceMode');
    expect(source).not.toContain('Replace this meal');
    expect(source).not.toContain('formatLocalClockTime');
  });
});

describe('QuickLogsSurface #170 Phase 1q hotfix 9 plumbing', () => {
  const source = readFileSync(SURFACE_PATH, 'utf-8');

  it('builds an existingByType map for breakfast lunch dinner', () => {
    expect(source).toContain('existingByType');
    expect(source).toContain("'breakfast'");
    expect(source).toContain("'lunch'");
    expect(source).toContain("'dinner'");
  });

  it('passes existingMeal into the QuickLogEntryBlock', () => {
    expect(source).toContain('existingMeal={existingByType.get(openMeal) ?? null}');
  });
});
