"use client";

// Prompt 172 Phase 0 (170c primitive): standardized FDA disclaimer surface.
//
// 170c §6.1 holds the canonical copy. 170c §16 places it on the NutriVision
// result review screen footer + Settings Privacy section + Insights detail
// view + practitioner shared meal view. Phase 0 ships the component; the
// §17.2 wiring lands when each downstream surface composes 170c.
//
// Three slot variants tune placement padding + border:
//   1. card-footer: lives at the bottom of a meal card (172 MealCard).
//   2. screen-footer: lives at the bottom of a full screen (NutriVision).
//   3. modal-inline: lives inline inside a modal (consent, onboarding).
//
// Stateless. No telemetry; the §13 disclaimer impression tracking that lives
// on DSHEADisclaimer is supplement specific and not appropriate here. When
// FDA_DISCLAIMER_RENDERING_ENABLED kill switch is off, returns null.

import { Info } from 'lucide-react';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';

export type FdaDisclaimerSlot = 'card-footer' | 'screen-footer' | 'modal-inline';

export interface FdaDisclaimerProps {
  slot: FdaDisclaimerSlot;
}

// 170c §6.1 verbatim. The standing FDA disclaimer language.
const STANDING_COPY =
  'Nutrition data is for tracking and educational purposes only. It is not medical advice and should not replace guidance from a qualified healthcare practitioner.';

// 170c §6.1 verbatim. The standing AI accuracy disclaimer language.
const AI_ACCURACY_COPY =
  'AI-estimated macros and ingredients have known error margins. Please review and edit as needed before saving.';

function slotClassName(slot: FdaDisclaimerSlot): string {
  // Brand tokens: text uses a muted slate against the Navy or Card surfaces
  // the parent renders; padding is slot specific so each placement reads as
  // a footer or inline note rather than its own region.
  const base = 'text-xs text-slate-400 leading-relaxed';
  switch (slot) {
    case 'card-footer':
      return `${base} mt-3 border-t border-slate-700/60 pt-2 px-3`;
    case 'screen-footer':
      return `${base} mt-4 border-t border-slate-700 px-4 py-3 bg-[#1A2744]`;
    case 'modal-inline':
      return `${base} my-2 px-3 py-2 rounded-md bg-[#1E3054]`;
  }
}

export function FdaDisclaimer({ slot }: FdaDisclaimerProps) {
  if (!isKillSwitchEnabled('FDA_DISCLAIMER_RENDERING_ENABLED')) {
    return null;
  }

  return (
    <div
      role="note"
      aria-label="FDA disclaimer"
      className={slotClassName(slot)}
    >
      <div className="flex items-start gap-2">
        <Info
          className="mt-0.5 flex-shrink-0 text-slate-400"
          size={14}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div>
          <p>{STANDING_COPY}</p>
          <p className="mt-1">{AI_ACCURACY_COPY}</p>
        </div>
      </div>
    </div>
  );
}

export default FdaDisclaimer;
