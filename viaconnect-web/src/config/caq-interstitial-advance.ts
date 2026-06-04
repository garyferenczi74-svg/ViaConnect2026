// =============================================================================
// Prompt 173c Phase B + Prompt 173d (2026-06-04): interstitial advance + button
// surface constants.
//
// 173d Section 1 supersedes the 173c reading-time-aware formula. Auto-advance
// is now a fixed 8 second switch (8000 ms) driven by ONE constant. The old
// base_ms / words_per_second / min_ms / max_ms constants and the
// computeAdvanceDelayMs + countInterstitialWords helpers are retired.
//
// Everything else from 173c Section 1.2 still stands and the wiring is
// unchanged: tap to advance, subtle progress fill, pause on interaction,
// prefers-reduced-motion respect, settings toggle to disable globally,
// screen reader friendly progress bar (aria-hidden).
//
// 173d Sections 2 + 3 expose the Continue button surface as a single
// shared component. The tint opacity is a tunable constant here so a
// Kelsey-driven contrast pass can raise the white opacity without
// touching the button component itself.
// =============================================================================

// Fixed 8 second switch (173d Section 1). 8000 ms sits comfortably above
// the read time of the longest interstitial so the user is never rushed.
export const INTERSTITIAL_AUTO_ADVANCE_MS = 8000;

// Progress fill update tick. The bar interpolates linearly; we redraw at
// ~ 30 fps so the motion reads as continuous without burning CPU.
export const INTERSTITIAL_PROGRESS_TICK_MS = 33;

// Continue button surface tint. The number is the percent opacity of the
// white tint (e.g. 10 -> bg-white/10). The InterstitialContinueButton
// component uses this constant in its Tailwind class string + a compile-
// time mirror guard.
//
// Patched 2026-06-04 per Gary: the button surface + label now match the
// FeaturePreviewCard on the same interstitial. The tint dropped from 45
// (the prior light-glass-with-navy-label posture from 173d Section 3) to
// 10 so the surface reads as the same translucent lens the card uses, and
// the label switched from navy to white in the component.
//
// CONTRAST POSTURE (white label):
//   * supports-[backdrop-filter]: white label over bg-white/10 on the
//     hero video reads cleanly because the underlying dark navy
//     dominates the blurred frame.
//   * supports-[not(backdrop-filter)] + prefers-reduced-transparency +
//     prefers-contrast:more all fall back to a solid Card #1E3054
//     surface in the component so the white label never sits over a
//     near-transparent pane.
export const INTERSTITIAL_BUTTON_TINT_OPACITY = 10;

// Backwards-compat alias for callers that still imported the old constants
// object. Keeps existing imports working until a follow-up tidies them.
export const INTERSTITIAL_ADVANCE = {
  auto_advance_ms: INTERSTITIAL_AUTO_ADVANCE_MS,
  progress_tick_ms: INTERSTITIAL_PROGRESS_TICK_MS,
} as const;
