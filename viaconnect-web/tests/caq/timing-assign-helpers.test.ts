// Prompt 185a slice 3b (2026-06-09): unit tests for the pure helpers in the
// Hannah timing orchestration. The DB-touching paths (assignHannahTiming,
// ensureScheduleForUser) are integration-verified on localhost; these pin the
// pure mapping logic the assignment depends on.

import { describe, it, expect } from 'vitest';
import {
  mapFrequency,
  mealToBucket,
  buildIngredientNames,
  symptomScore,
} from '@/lib/caq/supplements/timing/assignTiming';

describe('mapFrequency', () => {
  it('maps common regimen frequency strings to engine frequencies', () => {
    expect(mapFrequency('daily')).toBe('once_daily');
    expect(mapFrequency('Once daily')).toBe('once_daily');
    expect(mapFrequency('twice daily')).toBe('twice_daily');
    expect(mapFrequency('2x/day')).toBe('twice_daily');
    expect(mapFrequency('three times daily')).toBe('three_daily');
    expect(mapFrequency('weekly')).toBe('weekly');
    expect(mapFrequency('as needed')).toBe('as_needed');
    expect(mapFrequency(null)).toBe('once_daily');
    expect(mapFrequency('')).toBe('once_daily');
  });
});

describe('mealToBucket', () => {
  it('maps meal labels to time buckets', () => {
    expect(mealToBucket('Breakfast')).toBe('morning');
    expect(mealToBucket('lunch')).toBe('afternoon');
    expect(mealToBucket('Dinner')).toBe('evening');
    expect(mealToBucket('')).toBeNull();
    expect(mealToBucket('Brunch')).toBeNull();
  });
});

describe('buildIngredientNames', () => {
  it('uses key_ingredients first, then the supplement name', () => {
    expect(
      buildIngredientNames({ id: '1', supplement_name: 'My Mag', key_ingredients: ['Magnesium Glycinate'], frequency: 'daily' }),
    ).toEqual(['Magnesium Glycinate', 'My Mag']);
  });

  it('falls back to the supplement name when key_ingredients is empty or null', () => {
    expect(
      buildIngredientNames({ id: '1', supplement_name: 'Vitamin D3', key_ingredients: [], frequency: null }),
    ).toEqual(['Vitamin D3']);
    expect(
      buildIngredientNames({ id: '1', supplement_name: 'Iron', key_ingredients: null, frequency: null }),
    ).toEqual(['Iron']);
  });
});

describe('symptomScore', () => {
  it('reads the score from a {score, description} field', () => {
    expect(symptomScore({ fatigue_severity: { score: 7, description: 'x' } }, 'fatigue_severity')).toBe(7);
  });

  it('returns 0 for missing or malformed fields', () => {
    expect(symptomScore({}, 'fatigue_severity')).toBe(0);
    expect(symptomScore({ fatigue_severity: 'nope' }, 'fatigue_severity')).toBe(0);
  });
});
