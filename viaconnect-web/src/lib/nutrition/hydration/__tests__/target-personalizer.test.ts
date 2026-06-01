/**
 * Prompt 170o Phase 1 Phase D: unit tests for target personalization.
 */

import { describe, it, expect } from 'vitest';
import { personalizeHydrationTarget } from '../target-personalizer';

describe('personalizeHydrationTarget', () => {
  it('returns body_weight_kg * 33 default with no adjustments', () => {
    expect(personalizeHydrationTarget({ body_weight_kg: 60, custom_target_ml_per_day: null })).toBe(1980);
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null })).toBe(2310);
    expect(personalizeHydrationTarget({ body_weight_kg: 80, custom_target_ml_per_day: null })).toBe(2640);
  });

  it('falls back to 1890 ml when body_weight_kg is missing', () => {
    expect(personalizeHydrationTarget({ body_weight_kg: null, custom_target_ml_per_day: null })).toBe(1890);
  });

  it('custom_target_ml_per_day supersedes computed defaults', () => {
    expect(personalizeHydrationTarget({ body_weight_kg: 80, custom_target_ml_per_day: 2500 })).toBe(2500);
    expect(personalizeHydrationTarget({ body_weight_kg: null, custom_target_ml_per_day: 3000 })).toBe(3000);
  });

  it('applies activity multipliers per spec 4.2', () => {
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, activity_level: 'sedentary' })).toBe(2310);
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, activity_level: 'light' })).toBe(2541);
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, activity_level: 'moderate' })).toBe(2772);
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, activity_level: 'intense' })).toBe(3234);
  });

  it('applies climate multipliers per spec 4.3', () => {
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, climate_level: 'cool' })).toBe(2310);
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, climate_level: 'moderate' })).toBe(2310);
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, climate_level: 'warm' })).toBe(2541);
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, climate_level: 'hot' })).toBe(2772);
  });

  it('applies pregnancy bonus 300 ml per spec 4.5', () => {
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, pregnant: true })).toBe(2610);
  });

  it('applies lactation bonus 700 ml per spec 4.5', () => {
    expect(personalizeHydrationTarget({ body_weight_kg: 70, custom_target_ml_per_day: null, lactating: true })).toBe(3010);
  });

  it('composes multipliers + bonuses multiplicatively for multipliers and additively for bonuses', () => {
    const result = personalizeHydrationTarget({
      body_weight_kg: 70,
      custom_target_ml_per_day: null,
      activity_level: 'moderate',
      climate_level: 'warm',
      pregnant: true,
    });
    expect(result).toBe(Math.round(70 * 33 * 1.2 * 1.1 + 300));
  });

  it('custom override bypasses all activity/climate/pregnancy adjustments', () => {
    expect(personalizeHydrationTarget({
      body_weight_kg: 70,
      custom_target_ml_per_day: 2500,
      activity_level: 'intense',
      climate_level: 'hot',
      pregnant: true,
      lactating: true,
    })).toBe(2500);
  });
});
