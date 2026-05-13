'use client';

// BOSAccuracyRow: header + 3 accuracy pills (CAQ, Labs, Genetics).
//
// Header string lives in bos-row-copy.ts (JSX free) so it can be
// asserted in pure Vitest tests. The descriptive sentence beneath the
// header was removed per Gary directive 2026-05-12; the header sits
// directly above the pill row now.
//
// The 3 pills sit in a left-packed flex row (flex-wrap gap-2) so they
// hug the left edge at their natural widths rather than each occupying
// a third of the row. On narrow screens the row wraps; pills never
// stretch to fill space, so the visual rhythm stays tight.

import type { AccuracyPill as AccuracyPillData } from '@/lib/scoring/types';
import { AccuracyPill } from './accuracy-pill';
import { ACCURACY_ROW_HEADER } from './bos-row-copy';

export interface BOSAccuracyRowProps {
  pills: AccuracyPillData[];
}

export { ACCURACY_ROW_HEADER };

export function BOSAccuracyRow({ pills }: BOSAccuracyRowProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
        {ACCURACY_ROW_HEADER}
      </p>
      <ul
        role="list"
        aria-label="Diagnostic accuracy levers"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        {pills.map((pill) => (
          <li key={pill.key}>
            <AccuracyPill pill={pill} />
          </li>
        ))}
      </ul>
    </div>
  );
}
