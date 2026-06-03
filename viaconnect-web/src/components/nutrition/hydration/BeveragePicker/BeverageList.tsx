// Prompt 172e Phase B: BeverageList component.
//
// Renders the beverages in the selected category as tappable rows. Each row
// shows the display_name and an optional per beverage numeric strip (kcal,
// sugar, caffeine, ABV) when safety mode is off. In safety mode every per
// beverage absolute is suppressed per 170c section 8 and only the name
// renders. The category card layout itself stays identical across modes
// per spec section 8.4 silent UX.
//
// Alcohol entries surface ABV in normal mode only; the alcohol category card
// itself stays visible per spec section 4 Gate 4.

'use client';

import { ChevronRight } from 'lucide-react';
import type { BeverageCatalogRow } from './BeveragePicker.types';
import {
  shouldShowAbv,
  shouldShowCaffeine,
  shouldShowKcal,
  shouldShowSugar,
} from './picker-state';

export interface BeverageListProps {
  beverages: ReadonlyArray<BeverageCatalogRow>;
  onSelect: (row: BeverageCatalogRow) => void;
  safetyMode: boolean;
}

function formatNumeric(label: string, value: string): string {
  return `${label} ${value}`;
}

export function BeverageList({ beverages, onSelect, safetyMode }: BeverageListProps): JSX.Element {
  if (beverages.length === 0) {
    return (
      <p className="text-[12px] text-white/55">No beverages in this category yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {beverages.map((row) => {
        const numerics: string[] = [];
        if (shouldShowKcal(safetyMode) && row.kcal_per_serving > 0) {
          numerics.push(formatNumeric('kcal', String(row.kcal_per_serving)));
        }
        if (shouldShowSugar(safetyMode) && row.sugar_g > 0) {
          numerics.push(formatNumeric('sugar', `${row.sugar_g} g`));
        }
        if (shouldShowCaffeine(safetyMode) && row.caffeine_mg_per_serving > 0) {
          numerics.push(formatNumeric('caffeine', `${row.caffeine_mg_per_serving} mg`));
        }
        if (shouldShowAbv(safetyMode) && row.is_alcoholic && row.abv !== null) {
          numerics.push(formatNumeric('ABV', `${row.abv}%`));
        }
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onSelect(row)}
              aria-label={row.display_name}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-3 text-left transition-colors hover:border-[#2DA5A0]/30 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
            >
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-white">{row.display_name}</span>
                {numerics.length > 0 ? (
                  <span className="text-[11px] text-white/55">{numerics.join(' · ')}</span>
                ) : null}
              </div>
              <ChevronRight className="h-4 w-4 text-white/45" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
