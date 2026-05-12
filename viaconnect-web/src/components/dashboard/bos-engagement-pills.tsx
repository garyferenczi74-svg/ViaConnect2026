'use client';

// BOSEngagementPills: row of 6 engagement pills.
// 3-column grid on mobile (two rows of 3), 6-column at sm+ for a
// single row per #162 layout. Each pill comes from /api/bos/current
// engagement_pills array.

import type { EngagementPill as EngagementPillData } from '@/lib/scoring/types';
import { EngagementPill } from './engagement-pill';

export interface BOSEngagementPillsProps {
  pills: EngagementPillData[];
  preCompute?: boolean;
}

export function BOSEngagementPills({ pills, preCompute = false }: BOSEngagementPillsProps) {
  return (
    <ul
      role="list"
      aria-label="Daily engagement"
      className="grid grid-cols-3 gap-2 sm:grid-cols-6"
    >
      {pills.map((pill) => (
        <li key={pill.key} className="min-w-0">
          <EngagementPill pill={pill} preCompute={preCompute} />
        </li>
      ))}
    </ul>
  );
}
