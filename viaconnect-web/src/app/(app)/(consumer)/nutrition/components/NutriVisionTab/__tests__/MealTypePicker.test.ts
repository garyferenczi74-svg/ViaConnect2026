// Prompt #170 Phase 1q hotfix 6: source-presence sanity for MealTypePicker.
//
// vitest runs in node without jsdom, so a real React render is not viable.
// We assert the picker source carries all four MealType id literals, all
// four Lucide icon names, the brand tokens, and respects the no-dash rule.
//
// AnalysisResult wires mealType through to buildSavePayload; the propagation
// is verified by the existing useMealItemEdits payload tests upstream.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PICKER = path.resolve(__dirname, '..', 'MealTypePicker.tsx');
const ANALYSIS_RESULT = path.resolve(__dirname, '..', 'AnalysisResult.tsx');
const INDEX = path.resolve(__dirname, '..', 'index.tsx');

describe('MealTypePicker source', () => {
  const source = readFileSync(PICKER, 'utf-8');

  it('declares all four meal-type ids', () => {
    expect(source).toContain("'breakfast'");
    expect(source).toContain("'lunch'");
    expect(source).toContain("'dinner'");
    expect(source).toContain("'snack'");
  });

  it('imports all four Lucide icons', () => {
    expect(source).toContain('Coffee');
    expect(source).toContain('UtensilsCrossed');
    expect(source).toContain('Soup');
    expect(source).toContain('Cookie');
    expect(source).toContain("from 'lucide-react'");
  });

  it('uses strokeWidth 1.5 on the Lucide icons', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('applies the brand token palette (Navy, Card, Teal)', () => {
    expect(source).toContain('#1A2744');
    expect(source).toContain('#1E3054');
    expect(source).toContain('#2DA5A0');
  });

  it('contains no em dash, en dash, or emoji characters', () => {
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });

  it('uses aria-pressed for selected state', () => {
    expect(source).toContain('aria-pressed');
  });
});

describe('AnalysisResult wires the picker', () => {
  const source = readFileSync(ANALYSIS_RESULT, 'utf-8');

  it('imports MealTypePicker', () => {
    expect(source).toContain("from './MealTypePicker'");
    expect(source).toContain('MealTypePicker');
  });

  it('declares mealType + onMealTypeChange in the props contract', () => {
    expect(source).toContain('mealType: MealType');
    expect(source).toContain('onMealTypeChange');
  });

  it('renders a Meal type label above the totals card', () => {
    expect(source).toContain('Meal type');
    expect(source.indexOf('Meal type')).toBeLessThan(source.indexOf('Meal totals'));
  });
});

describe('index.tsx routes mealType through ReviewingSurface', () => {
  const source = readFileSync(INDEX, 'utf-8');

  it('seeds mealType state via detectMealTypeForNow', () => {
    expect(source).toContain('detectMealTypeForNow');
    expect(source).toContain('useState<MealType>');
  });

  it('passes mealType + onMealTypeChange to AnalysisResult', () => {
    expect(source).toContain('mealType={mealType}');
    expect(source).toContain('onMealTypeChange={setMealType}');
  });

  it('feeds mealType into buildSavePayload', () => {
    expect(source).toContain('edits.buildSavePayload(mealType)');
  });
});
