'use client';

// BOSAccuracyPills: row of 3 accuracy pills (CAQ, Labs, Genetics).
// 3-column grid on every breakpoint per #162 spec (mobile + desktop
// alike). Each pill comes from /api/bos/current accuracy_pills array.

import type { AccuracyPill as AccuracyPillData } from '@/lib/scoring/types';
import { AccuracyPill } from './accuracy-pill';

export interface BOSAccuracyPillsProps {
  pills: AccuracyPillData[];
}

export function BOSAccuracyPills({ pills }: BOSAccuracyPillsProps) {
  return (
    <ul
      role="list"
      aria-label="Diagnostic accuracy"
      className="grid grid-cols-3 gap-2"
    >
      {pills.map((pill) => (
        <li key={pill.key} className="min-w-0">
          <AccuracyPill pill={pill} />
        </li>
      ))}
    </ul>
  );
}
