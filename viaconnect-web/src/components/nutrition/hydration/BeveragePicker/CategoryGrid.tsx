// Prompt 172e Phase B: CategoryGrid component.
//
// Renders the 9 category cards per spec section 10. Each card is a button
// that emits onSelect(category) when tapped. The icon mapping and the label
// microcopy key come from category-icons.ts so the JSX has no inline
// conditionals.
//
// Mobile first: 2 column grid on phones, 3 on tablets and up. Tap targets
// at least 56px tall so the iPhone SE ergonomic floor is honored.

'use client';

import {
  getHydrationMicrocopy,
  type HydrationMicrocopyKey,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import { BEVERAGE_CATEGORIES, type BeverageCategory } from './BeveragePicker.types';
import { CATEGORY_ICONS, CATEGORY_MICROCOPY_KEYS } from './category-icons';

export interface CategoryGridProps {
  onSelect: (category: BeverageCategory) => void;
  variant: HydrationMicrocopyVariant;
}

export function CategoryGrid({ onSelect, variant }: CategoryGridProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Beverage categories"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {BEVERAGE_CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat];
        const labelKey = CATEGORY_MICROCOPY_KEYS[cat] as HydrationMicrocopyKey;
        const label = getHydrationMicrocopy(labelKey, variant);
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            aria-label={label}
            className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 px-3 py-3 text-center transition-colors hover:border-[#2DA5A0]/30 hover:bg-[#1E3054]/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
          >
            <Icon className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-sm font-medium text-white">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
