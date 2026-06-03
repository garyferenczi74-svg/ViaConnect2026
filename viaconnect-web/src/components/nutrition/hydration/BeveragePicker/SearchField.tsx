// Prompt 172e Phase B: SearchField component.
//
// Controlled text input. The parent BeveragePicker owns the query string and
// passes it through. The field renders the clear affordance only when the
// query is non empty. Per spec section 10, results are rendered by the
// parent below the input (not by SearchField itself) so the same query can
// drive the BeverageList sub view as well.

'use client';

import { Search, X } from 'lucide-react';
import { getHydrationMicrocopy, type HydrationMicrocopyVariant } from '@/lib/nutrition/microcopy/hydration';

export interface SearchFieldProps {
  value: string;
  onChange: (next: string) => void;
  variant: HydrationMicrocopyVariant;
}

export function SearchField({ value, onChange, variant }: SearchFieldProps): JSX.Element {
  const placeholder = getHydrationMicrocopy('picker.search_placeholder', variant);
  const clearLabel = getHydrationMicrocopy('action.clear_search', variant);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-9 text-sm text-white placeholder-white/45 focus-visible:border-[#2DA5A0]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel}
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
