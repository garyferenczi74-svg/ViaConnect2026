// =============================================================================
// Prompt 173 Phase 6 (rebuild on main 2026-06-03): MacroDisclaimer.
//
// ONE place the Daily Macros disclaimer text lives, mounted on every macro
// surface (Nutrition Log Daily Macros card today; Body Tracker goal card
// when Phase 7 lands).
//
// Copy taken verbatim from docs/prompt-173/compliance-memo.md Section 1 (the
// branch compliance memo from the parked feat/prompt-173 work; this is the
// canonical reference until Gary's review pass updates the wording). Hannah
// validated the tone; Gary signs off on the exact words before public ship.
// No em-dashes or en-dashes.
// =============================================================================

'use client';

import { Info } from 'lucide-react';

export const MACRO_DISCLAIMER_TEXT =
  'These daily targets are general wellness estimates for healthy adults, not medical, dietetic, or clinical advice, and are not a substitute for care from a qualified professional. They have not been evaluated to diagnose, treat, cure, or prevent any health condition, and they may not fit every situation, including pregnancy, breastfeeding, or a diagnosed medical condition. Please talk with a qualified healthcare or nutrition professional before making significant changes to your diet.';

export function MacroDisclaimer() {
  return (
    <p
      className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-white/55"
      role="note"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40" strokeWidth={1.5} aria-hidden="true" />
      <span>{MACRO_DISCLAIMER_TEXT}</span>
    </p>
  );
}

export default MacroDisclaimer;
