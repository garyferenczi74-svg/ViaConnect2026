// Prompt 172e Phase B: category to Lucide icon mapping.
//
// Spec section 10: each of the nine category cards renders a neutral Lucide
// React icon at strokeWidth 1.5. Icons are picked to read as the category at
// thumbnail scale without becoming evaluative (no health adjacent icons, no
// emojis).
//
// The mapping is exposed as a pure function so the React component layer
// can render without any conditional in the JSX. Hard rules honored:
// strokeWidth 1.5 only, no emojis.

import {
  Coffee,
  CupSoda,
  Dumbbell,
  GlassWater,
  Leaf,
  Milk,
  Sprout,
  Wine,
  Citrus,
  type LucideIcon,
} from 'lucide-react';
import type { BeverageCategory } from './BeveragePicker.types';

/**
 * Suggested neutral icons per spec section 10. Lucide names are stable across
 * the 0.x line; if a name churns the build catches it via TS resolution.
 */
export const CATEGORY_ICONS: Record<BeverageCategory, LucideIcon> = {
  water: GlassWater,
  coffee: Coffee,
  tea: Leaf,
  juice: Citrus,
  pop: CupSoda,
  sports_energy: Dumbbell,
  milk: Milk,
  functional: Sprout,
  alcohol: Wine,
};

export function categoryIcon(category: BeverageCategory): LucideIcon {
  return CATEGORY_ICONS[category];
}

/**
 * Mapping from BeverageCategory to the microcopy key for its label. Kept
 * here to keep the React component layer free of switch statements.
 */
export const CATEGORY_MICROCOPY_KEYS: Record<BeverageCategory, string> = {
  water: 'category.water.label',
  coffee: 'category.coffee.label',
  tea: 'category.tea.label',
  juice: 'category.juice.label',
  pop: 'category.pop.label',
  sports_energy: 'category.sports_energy.label',
  milk: 'category.milk.label',
  functional: 'category.functional.label',
  alcohol: 'category.alcohol.label',
};
