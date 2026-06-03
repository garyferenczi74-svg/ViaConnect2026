// Prompt 172e Phase B: FavoritesRow component.
//
// Renders user favorites as a horizontally scrolling row of beverage chips.
// Each chip shows the display_name only; per beverage numerics live one level
// deeper in BeverageList. Empty state is suppressed entirely so users with no
// favorites yet do not see a placeholder card.

'use client';

import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import type { BeverageCatalogRow } from './BeveragePicker.types';

export interface FavoritesRowProps {
  favorites: ReadonlyArray<BeverageCatalogRow>;
  onSelect: (row: BeverageCatalogRow) => void;
  variant: HydrationMicrocopyVariant;
}

export function FavoritesRow({ favorites, onSelect, variant }: FavoritesRowProps): JSX.Element | null {
  if (favorites.length === 0) return null;
  const heading = getHydrationMicrocopy('picker.favorites_label', variant);

  return (
    <section aria-label={heading} className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-white/55">
        {heading}
      </h3>
      <div className="flex flex-wrap gap-2">
        {favorites.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row)}
            aria-label={row.display_name}
            className="inline-flex h-9 items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-white transition-colors hover:border-[#2DA5A0]/30 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
          >
            {row.display_name}
          </button>
        ))}
      </div>
    </section>
  );
}
