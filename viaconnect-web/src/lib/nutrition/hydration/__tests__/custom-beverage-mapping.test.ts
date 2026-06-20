import { describe, it, expect } from 'vitest';
import { deriveCustomBeverageDefaults, BEVERAGE_CATEGORIES, CAFFEINE_CATEGORIES } from '../custom-beverage-mapping';

describe('deriveCustomBeverageDefaults', () => {
  it('maps every category to the spec kind/coefficient/alcohol', () => {
    expect(deriveCustomBeverageDefaults('milk')).toEqual({ hydration_source_kind: 'dairy', hydration_coefficient: 1.30, is_alcoholic: false });
    expect(deriveCustomBeverageDefaults('juice')).toEqual({ hydration_source_kind: 'juice_smoothie', hydration_coefficient: 1.20, is_alcoholic: false });
    expect(deriveCustomBeverageDefaults('functional')).toEqual({ hydration_source_kind: 'juice_smoothie', hydration_coefficient: 1.20, is_alcoholic: false });
    expect(deriveCustomBeverageDefaults('alcohol')).toEqual({ hydration_source_kind: 'alcohol_low', hydration_coefficient: 1.00, is_alcoholic: true });
    expect(deriveCustomBeverageDefaults('water')).toEqual({ hydration_source_kind: 'pure_water', hydration_coefficient: 1.00, is_alcoholic: false });
  });
  it('offers the 9 categories and never high_water_food', () => {
    expect(BEVERAGE_CATEGORIES).toHaveLength(9);
    expect(BEVERAGE_CATEGORIES).not.toContain('high_water_food');
  });
  it('limits the caffeine field to coffee, tea, sports_energy', () => {
    expect([...CAFFEINE_CATEGORIES].sort()).toEqual(['coffee', 'sports_energy', 'tea']);
  });
});
