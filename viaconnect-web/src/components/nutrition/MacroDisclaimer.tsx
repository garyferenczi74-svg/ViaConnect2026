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
//
// Prompt 177h (2026-06-07): opt-in collapsible variant for the Daily Macros
// card on /nutrition. Default stays expanded so the Body Tracker mount is
// unchanged. When collapsible is true, the component renders a single
// tappable header (Info icon + label + chevron) and reveals the full,
// unchanged disclaimer text inside an aria-controls panel on expand.
// =============================================================================

'use client';

import { useId, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { MACRO_DISCLAIMER_TEXT } from './macro-disclaimer-text';

// Re-export so existing callers (compliance memo references the const from
// this file) continue to compile.
export { MACRO_DISCLAIMER_TEXT };

export interface MacroDisclaimerProps {
  /**
   * Prompt 177h (2026-06-07): when true the disclaimer renders as a
   * collapsible disclosure (collapsed by default, full text revealed
   * on tap). When false the disclaimer renders as the always-expanded
   * paragraph the Body Tracker goal card still uses. The disclaimer
   * text itself is identical in both variants per the compliance lock
   * in macro-disclaimer-text.ts.
   */
  collapsible?: boolean;
}

export function MacroDisclaimer({ collapsible = false }: MacroDisclaimerProps = {}) {
  if (!collapsible) {
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

  return <CollapsibleMacroDisclaimer />;
}

function CollapsibleMacroDisclaimer() {
  const [open, setOpen] = useState(false);
  // useId gives us a stable per instance pair for aria-controls + the
  // panel id without colliding when two cards mount the component on the
  // same page.
  const rawId = useId();
  const panelId = `macro-disclaimer-${rawId}`;

  return (
    <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02]" role="note">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px] leading-relaxed text-white/65 transition-colors hover:text-white/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-lg"
      >
        <Info
          className="h-3.5 w-3.5 flex-shrink-0 text-white/40"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="flex-1">About these daily targets</span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-white/45 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="px-3 pb-2.5 pt-0 text-[11px] leading-relaxed text-white/55"
        >
          {MACRO_DISCLAIMER_TEXT}
        </div>
      ) : null}
    </div>
  );
}

export default MacroDisclaimer;
