'use client';

// BOSEngagementRow: header + descriptive sentence + 6 engagement pills.
//
// Per #161e §6.5 the descriptive sentence is rendered VERBATIM:
//   "Log nutrition, track supplements, record body measurements,
//    sync wearables, connect plug-ins, and complete Helix Challenges.
//    Each lever adds points to your score over time."
// Header: "How can I improve my score?" (#161e §2.6)
//
// Both strings are imported from bos-row-copy.ts so the canonical
// text can be asserted in pure Vitest tests without rendering JSX.
//
// The pill grid is grid-cols-3 on all viewports so 6 pills render as
// two rows of 3, each cell roughly 110px wide at 380px viewport. The
// content inside EngagementPill truncates and conditionally hides the
// velocity micro line at very narrow widths.

import type { EngagementPill as EngagementPillData } from '@/lib/scoring/types';
import { EngagementPill } from './engagement-pill';
import {
  ENGAGEMENT_ROW_HEADER,
  ENGAGEMENT_ROW_DESCRIPTION,
} from './bos-row-copy';

export interface BOSEngagementRowProps {
  pills: EngagementPillData[];
  /** When the user has no compute yet, render the pills disabled. */
  preCompute?: boolean;
}

export { ENGAGEMENT_ROW_HEADER, ENGAGEMENT_ROW_DESCRIPTION };

export function BOSEngagementRow({ pills, preCompute = false }: BOSEngagementRowProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
        {ENGAGEMENT_ROW_HEADER}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-white/65 sm:text-sm">
        {ENGAGEMENT_ROW_DESCRIPTION}
      </p>
      <ul
        role="list"
        aria-label="Daily engagement levers"
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {pills.map((pill) => (
          <li key={pill.key} className="min-w-0">
            <EngagementPill pill={pill} preCompute={preCompute} />
          </li>
        ))}
      </ul>
    </div>
  );
}
