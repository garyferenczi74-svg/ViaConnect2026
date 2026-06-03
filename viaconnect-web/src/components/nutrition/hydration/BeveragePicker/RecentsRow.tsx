// Prompt 172e Phase B: RecentsRow component.
//
// Renders last 6 distinct beverages the user logged today (driven by the
// 170o today events list). Empty state surfaces a quiet copy line so users
// know the row is there but has not populated yet; this is intentional per
// spec section 10 (a Favorites + Recents above the categories pattern).

'use client';

import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import type { BeverageCatalogRow } from './BeveragePicker.types';

export interface RecentsRowProps {
  recents: ReadonlyArray<BeverageCatalogRow>;
  onSelect: (row: BeverageCatalogRow) => void;
  variant: HydrationMicrocopyVariant;
}

export function RecentsRow({ recents, onSelect, variant }: RecentsRowProps): JSX.Element {
  const heading = getHydrationMicrocopy('picker.recents_label', variant);

  return (
    <section aria-label={heading} className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-white/55">
        {heading}
      </h3>
      {recents.length === 0 ? (
        <p className="text-[12px] text-white/45">
          {getHydrationMicrocopy('picker.no_recents', variant)}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {recents.map((row) => (
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
      )}
    </section>
  );
}
