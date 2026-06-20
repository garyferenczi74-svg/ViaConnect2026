import type { HydrationSourceKind } from './types';

export type BeverageCategory =
  | 'water' | 'coffee' | 'tea' | 'juice' | 'pop'
  | 'sports_energy' | 'milk' | 'functional' | 'alcohol';

export const BEVERAGE_CATEGORIES: readonly BeverageCategory[] = [
  'water', 'coffee', 'tea', 'juice', 'pop', 'sports_energy', 'milk', 'functional', 'alcohol',
] as const;

export const CAFFEINE_CATEGORIES: readonly BeverageCategory[] = ['coffee', 'tea', 'sports_energy'] as const;

interface Derived { hydration_source_kind: HydrationSourceKind; hydration_coefficient: number; is_alcoholic: boolean }

const MAP: Record<BeverageCategory, Derived> = {
  water: { hydration_source_kind: 'pure_water', hydration_coefficient: 1.0, is_alcoholic: false },
  coffee: { hydration_source_kind: 'coffee_tea', hydration_coefficient: 1.0, is_alcoholic: false },
  tea: { hydration_source_kind: 'coffee_tea', hydration_coefficient: 1.0, is_alcoholic: false },
  juice: { hydration_source_kind: 'juice_smoothie', hydration_coefficient: 1.2, is_alcoholic: false },
  pop: { hydration_source_kind: 'soda', hydration_coefficient: 1.0, is_alcoholic: false },
  sports_energy: { hydration_source_kind: 'sports_drink', hydration_coefficient: 1.0, is_alcoholic: false },
  milk: { hydration_source_kind: 'dairy', hydration_coefficient: 1.3, is_alcoholic: false },
  functional: { hydration_source_kind: 'juice_smoothie', hydration_coefficient: 1.2, is_alcoholic: false },
  alcohol: { hydration_source_kind: 'alcohol_low', hydration_coefficient: 1.0, is_alcoholic: true },
};

export function deriveCustomBeverageDefaults(category: BeverageCategory): Derived {
  return MAP[category];
}
