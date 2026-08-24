'use client';

// Brief 3: protocol-match chips on the shared meal review card.
// Educational, not diagnostic. Lucide strokeWidth 1.5. Existing chrome.

import { CircleAlert, CircleCheck, Dna } from 'lucide-react';
import type { ProtocolMatchChip } from '@/lib/nutrition/meal-card-contract/types';

interface ProtocolMatchChipsProps {
  readonly chips: readonly ProtocolMatchChip[];
}

function ChipIcon({ kind }: { kind: ProtocolMatchChip['kind'] }) {
  if (kind === 'prefer') {
    return <CircleCheck className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />;
  }
  if (kind === 'watch') {
    return <CircleAlert className="h-3.5 w-3.5 text-[#B75E18]" strokeWidth={1.5} />;
  }
  return <Dna className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />;
}

export function ProtocolMatchChips({ chips }: ProtocolMatchChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-4 backdrop-blur-md sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Protocol match
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.id}
            title={chip.body}
            className="inline-flex max-w-full items-start gap-1.5 rounded-full border border-white/[0.08] bg-white/5 px-2.5 py-1.5 text-[11px] text-white/80"
          >
            <span className="mt-0.5 flex-none">
              <ChipIcon kind={chip.kind} />
            </span>
            <span className="min-w-0">
              <span className="font-medium text-white">{chip.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-white/50">
                {chip.body}
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
