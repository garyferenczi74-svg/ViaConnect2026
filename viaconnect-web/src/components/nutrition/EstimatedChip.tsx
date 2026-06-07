'use client';

// Prompt 177d Phase B (2026-06-07): visible Estimated marker on text-channel
// meals. Renders next to the meal's quality tier wherever a per-meal score is
// surfaced (Today's Meals card, Daily Macros, Today's Meals expanded view).
//
// Triggers on any of:
//   - score_breakdown.prompt_177d_meta (set by analyze-text route on save)
//   - score_breakdown.prompt_177d_repair (set by the 2026-06-07 5-row repair)
// so newly-saved text meals and the historically repaired rows both surface
// the marker without a second pass over the data.

import { Info } from 'lucide-react';

const TEAL = '#2DA5A0';

export interface EstimatedChipProps {
  readonly scoreBreakdown: unknown;
  readonly source: string;
  readonly size?: 'sm' | 'md';
}

interface Prompt177dMeta {
  reconciliation?: { passed?: boolean };
  known_nutrients?: Record<string, boolean>;
}

function shouldShowEstimated(
  scoreBreakdown: unknown,
  source: string,
): { show: boolean; reconciliationFailed: boolean } {
  if (source !== 'full_manual') return { show: false, reconciliationFailed: false };
  if (!scoreBreakdown || typeof scoreBreakdown !== 'object') {
    return { show: false, reconciliationFailed: false };
  }
  const sb = scoreBreakdown as Record<string, unknown>;
  const meta =
    (sb.prompt_177d_meta as Prompt177dMeta | undefined) ??
    (sb.prompt_177d_repair as Prompt177dMeta | undefined);
  if (!meta) return { show: false, reconciliationFailed: false };
  const reconciliationFailed = meta.reconciliation?.passed === false;
  return { show: true, reconciliationFailed };
}

/**
 * Estimated marker for a text-channel meal. Defaults to the small inline
 * pill (sm); pass size="md" for use under a section header where the chip
 * stands alone.
 */
export function EstimatedChip({
  scoreBreakdown,
  source,
  size = 'sm',
}: EstimatedChipProps): JSX.Element | null {
  const { show, reconciliationFailed } = shouldShowEstimated(scoreBreakdown, source);
  if (!show) return null;

  const tooltip = reconciliationFailed
    ? 'Estimated from typed input. Macros and stated calories did not reconcile within 20 percent; treat the score as a rough guide.'
    : 'Estimated from typed input. Sodium was not determinable, so the score excludes sodium from its math.';

  const isMd = size === 'md';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${isMd ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]'}`}
      style={{
        backgroundColor: 'rgba(45, 165, 160, 0.12)',
        color: TEAL,
      }}
      title={tooltip}
      aria-label={tooltip}
    >
      <Info size={isMd ? 12 : 10} strokeWidth={1.5} aria-hidden="true" />
      Estimated
    </span>
  );
}

export default EstimatedChip;
