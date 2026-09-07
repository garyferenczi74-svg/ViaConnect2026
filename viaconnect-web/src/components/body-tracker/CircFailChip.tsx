'use client';

import { CIRC_FAIL_COPY, type CircFailReason } from '@/lib/arnold/scanning/circFailReason';

interface CircFailChipProps {
  reason: CircFailReason;
  className?: string;
}

/**
 * Honest photo-measurement fail chip. Shows the real CV/height reason.
 * Never invents cm, girths, or Muscle lbs.
 */
export function CircFailChip({ reason, className }: CircFailChipProps) {
  return (
    <span
      data-testid="scan-circ-fail-chip"
      data-reason={reason}
      className={`inline-flex max-w-full items-center rounded-full border border-[#B75E18]/40 bg-[#B75E18]/10 px-2.5 py-1 text-[11px] leading-snug text-white/75 ${className ?? ''}`}
    >
      {CIRC_FAIL_COPY[reason]}
    </span>
  );
}
