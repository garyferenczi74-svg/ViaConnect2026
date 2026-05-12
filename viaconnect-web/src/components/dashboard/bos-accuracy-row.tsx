'use client';

// BOSAccuracyRow: header + descriptive sentence + 3 accuracy pills
// (CAQ, Labs, Genetics).
//
// Per #161e §6.4 the descriptive sentence is rendered VERBATIM:
//   "CAQ improves accuracy to 72%, Labs improves accuracy to 86%,
//    unlock Genetics improves accuracy to 96%."
// Header: "Improved Accuracy" (#161e §2.5)
//
// Both strings are imported from bos-row-copy.ts so the canonical
// text can be asserted in pure Vitest tests without rendering JSX.
//
// The 3 pill grid uses grid-cols-3 gap-2 at every breakpoint so the
// row reads identically on mobile (380px) and desktop. Pills size
// themselves via flex content; truncation handled inside the
// AccuracyPill component for cells around 110px wide.

import type { AccuracyPill as AccuracyPillData } from '@/lib/scoring/types';
import { AccuracyPill } from './accuracy-pill';
import {
  ACCURACY_ROW_HEADER,
  ACCURACY_ROW_DESCRIPTION,
} from './bos-row-copy';

export interface BOSAccuracyRowProps {
  pills: AccuracyPillData[];
}

export { ACCURACY_ROW_HEADER, ACCURACY_ROW_DESCRIPTION };

export function BOSAccuracyRow({ pills }: BOSAccuracyRowProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
        {ACCURACY_ROW_HEADER}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-white/65 sm:text-sm">
        {ACCURACY_ROW_DESCRIPTION}
      </p>
      <ul
        role="list"
        aria-label="Diagnostic accuracy levers"
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {pills.map((pill) => (
          <li key={pill.key} className="min-w-0">
            <AccuracyPill pill={pill} />
          </li>
        ))}
      </ul>
    </div>
  );
}
