'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import type { MorningChipView } from '@/lib/dashboard/morning-card/contributors';
import {
  MORNING_CONTRIBUTOR_DISAGREE,
  MORNING_CONTRIBUTOR_PENDING_NOTE,
} from '@/lib/dashboard/morning-card/copy';

export interface MorningContributorListProps {
  chip: MorningChipView;
}

export function MorningContributorList({ chip }: MorningContributorListProps) {
  return (
    <div
      data-contributor-list={chip.key}
      className="rounded-xl border border-white/10 bg-[#1A2744]/80 p-3 sm:p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {chip.label} contributors
      </p>
      <ul className="mt-2 space-y-2">
        {chip.contributors.map((row) => (
          <li
            key={row.id}
            data-contributor-id={row.id}
            data-source-status={row.sourceStatus}
            data-display-value={row.displayValue}
            className="flex min-h-[44px] items-center justify-between gap-2"
          >
            <Link
              href={row.href}
              className="text-sm text-[#2DA5A0] hover:underline"
            >
              {row.name}
            </Link>
            <span className="flex items-center gap-2">
              <span className="font-mono text-sm text-white">{row.displayValue}</span>
              {row.sourceStatus === 'disagree' ? (
                <span className="rounded-full bg-[#B75E18]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B75E18] ring-1 ring-inset ring-[#B75E18]/30">
                  {MORNING_CONTRIBUTOR_DISAGREE}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {chip.sourceStatus === 'pending' ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-white/50">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          {MORNING_CONTRIBUTOR_PENDING_NOTE}
        </p>
      ) : null}
    </div>
  );
}
