'use client';

/**
 * src/components/formavision/ConsistencyTip.tsx
 *
 * Prompt 211a Workstream 4 (Part 2): the consistency TIP surface.
 *
 * Names the user's OWN best scan conditions from THEIR history ("your clearest
 * scans are mornings by the window"). The tip text comes from buildConsistencyTip
 * (pure, W4-1), which returns null honestly on thin history. This component
 * renders nothing when the tip is null, so it is NEVER a generic template and
 * never shown before there is enough personal history to say something true.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
 *   only (Teal #2DA5A0 / Navy #1E3054), Instrument Sans. Desktop AND mobile
 *   responsive, w-full on mobile.
 */

import { Lightbulb } from 'lucide-react';

export interface ConsistencyTipProps {
  /** The tip from buildConsistencyTip, or null when history is too thin. */
  tip: string | null;
  className?: string;
}

export function ConsistencyTip({ tip, className }: ConsistencyTipProps) {
  // Honest: no tip on thin history -> render nothing. Never a generic default.
  if (tip === null || tip.length === 0) return null;

  return (
    <div
      data-testid="consistency-tip"
      className={`flex w-full items-start gap-2.5 rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/10 p-3 text-xs leading-relaxed text-white/75 ${
        className ?? ''
      }`}
    >
      <Lightbulb size={16} strokeWidth={1.5} className="mt-0.5 flex-none text-[#2DA5A0]" aria-hidden="true" />
      <p data-testid="consistency-tip-text">{tip}</p>
    </div>
  );
}
