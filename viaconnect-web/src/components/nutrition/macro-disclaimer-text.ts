// =============================================================================
// Prompt 173 Phase 9 (rebuild on main 2026-06-03): canonical disclaimer text.
//
// Lifted out of MacroDisclaimer.tsx so the regulated string lives in a pure
// TypeScript module. tests/weight-goals/macro-disclaimer.test.ts imports
// from here to lock the four US (FDA/FTC) and Canada (Health Canada) anchor
// phrases against unauthorized edits.
//
// Copy lifted verbatim from docs/prompt-173/compliance-memo.md Section 1.
// Hannah validated the tone; Gary signs off on the exact words before
// public ship. No em-dashes or en-dashes anywhere.
// =============================================================================

export const MACRO_DISCLAIMER_TEXT =
  'These daily targets are general wellness estimates for healthy adults, not medical, dietetic, or clinical advice, and are not a substitute for care from a qualified professional. They have not been evaluated to diagnose, treat, cure, or prevent any health condition, and they may not fit every situation, including pregnancy, breastfeeding, or a diagnosed medical condition. Please talk with a qualified healthcare or nutrition professional before making significant changes to your diet.';
