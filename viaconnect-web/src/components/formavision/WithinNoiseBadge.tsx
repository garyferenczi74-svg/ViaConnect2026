'use client';

/**
 * src/components/formavision/WithinNoiseBadge.tsx
 *
 * Prompt 211b Workstream 2 -- within-noise badge and tooltip.
 *
 * Renders the inline WITHIN_NOISE badge next to a delta row. This is a
 * pure presentational component with no IO. It wraps the canonical
 * withinNoiseCopy and WITHIN_NOISE_INLINE_LABEL from the MDC engine.
 *
 * Rules:
 *   - Never a failure state. The badge is teal-toned (precision context), not red.
 *   - The copy is always from withinNoiseCopy (single canonical source).
 *   - Lucide icons at 1.5 stroke.
 *   - Responsive: fits in table cells and side-by-side with a value.
 *   - Accessible: aria-label on the badge; aria-describedby links to the tooltip.
 *   - No em or en dashes, no emojis.
 */

import { Info } from 'lucide-react';
import { useState } from 'react';
import {
  WITHIN_NOISE_INLINE_LABEL,
  withinNoiseCopy,
  withinNoiseAriaLabel,
} from '@/lib/formavision/noise/mdcEngine';

export interface WithinNoiseBadgeProps {
  /** The metric label used in the within-noise copy, e.g. "waist" or "body fat". */
  metricLabel: string;
  /** Optional CSS className for the badge wrapper. */
  className?: string;
}

/**
 * Inline badge rendered next to a delta that is classified as WITHIN_NOISE.
 *
 * Shows the short inline label with an info icon. On hover / focus, a tooltip
 * expands with the full Hannah-toned within-noise copy.
 *
 * Contract: this component is ONLY rendered when classification === 'WITHIN_NOISE'.
 * The caller is responsible for the conditional.
 */
export function WithinNoiseBadge({ metricLabel, className }: WithinNoiseBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const copy = withinNoiseCopy({ metricLabel });
  const ariaLabel = withinNoiseAriaLabel(metricLabel);
  const tooltipId = `within-noise-tooltip-${metricLabel.replace(/\s+/g, '-')}`;

  return (
    <span className={`relative inline-flex items-center gap-1 ${className ?? ''}`}>
      {/* Inline badge pill */}
      <span
        role="img"
        aria-label={ariaLabel}
        aria-describedby={tooltipId}
        data-testid="within-noise-badge"
        className="inline-flex items-center gap-1 rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-2 py-0.5 text-[10px] font-medium text-[#2DA5A0]"
      >
        <Info
          className="h-3 w-3 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        {WITHIN_NOISE_INLINE_LABEL}
      </span>

      {/* Info button to expand the tooltip */}
      <button
        type="button"
        aria-label={`More about ${ariaLabel}`}
        aria-expanded={tooltipOpen}
        aria-controls={tooltipId}
        onClick={() => setTooltipOpen((v) => !v)}
        onBlur={() => setTooltipOpen(false)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#2DA5A0]/60 transition-colors hover:text-[#2DA5A0]"
      >
        <span className="sr-only">What does within precision mean?</span>
        <Info className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* Tooltip: full within-noise copy */}
      {tooltipOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          data-testid="within-noise-tooltip"
          className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[90vw] rounded-xl border border-[#2DA5A0]/30 bg-[#1A2744] px-3 py-2.5 text-xs leading-relaxed text-white/80 shadow-lg"
        >
          {copy}
        </span>
      )}
    </span>
  );
}
