// Prompt 207a Task 6: My Beverages chip row.
//
// Renders the user's active custom beverages as chips (sibling style to
// RecentsRow). Tapping a chip fires onLogged with user_beverage_id and
// an empty slug so the parent route resolves kind + coefficient from the
// user_beverages table rather than the catalog.
//
// Visibility is gated at the caller (BeveragePicker.tsx) via
// isCustomBeveragesEnabled(); this component always renders if mounted.

'use client';

import { Bookmark } from 'lucide-react';
import type { BeverageLogIntent } from './BeveragePicker.types';
import type { UserBeverage } from '@/components/hydration/useUserBeverages';

export interface MyBeveragesRowProps {
  beverages: ReadonlyArray<UserBeverage>;
  onLogged: (intent: BeverageLogIntent) => Promise<void> | void;
}

export function MyBeveragesRow({ beverages, onLogged }: MyBeveragesRowProps): JSX.Element {
  const heading = 'My Beverages';

  return (
    <section aria-label={heading} className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-white/55">
        {heading}
      </h3>
      {beverages.length === 0 ? (
        <p className="text-[12px] text-white/45">
          No custom beverages yet. Tap &quot;Create my own&quot; to add one.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {beverages.map((bev) => (
            <button
              key={bev.id}
              type="button"
              onClick={() =>
                void onLogged({
                  beverage_kind: bev.hydration_source_kind as import('./BeveragePicker.types').HydrationSourceKind,
                  volume_ml: bev.default_volume_ml,
                  user_beverage_id: bev.id,
                  slug: '',
                })
              }
              aria-label={bev.display_name}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#2DA5A0]/20 bg-[#2DA5A0]/[0.06] px-3 text-[12px] font-medium text-white transition-colors hover:border-[#2DA5A0]/40 hover:bg-[#2DA5A0]/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
            >
              <Bookmark className="h-3 w-3 text-[#2DA5A0]/70" strokeWidth={1.5} aria-hidden="true" />
              {bev.display_name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
