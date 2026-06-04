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

// 173d Section 3 white glass tint. The number is the percent opacity of the
// white tint (e.g. 45 -> bg-white/45). The InterstitialContinueButton
// component uses this constant in its Tailwind class string; Kelsey's
// contrast pass raises this value if the navy label drops below 4.5:1
// against any hero video frame.
//
// CONTRAST FLOOR (locked): navy #1A2744 label MUST hold at least 4.5:1
// against the darkest representative hero video frame.
//
// Backdrop-filter fallback uses a higher opacity (set in the component) so
// engines without supports-[backdrop-filter] never serve an unreadable
// transparent pane.
//
// Reduce-transparency and prefers-contrast:more bumps this toward 90 in the
// component's media-query branches.
export const INTERSTITIAL_BUTTON_TINT_OPACITY = 45;

// Backwards-compat alias for callers that still imported the old constants
// object. Keeps existing imports working until a follow-up tidies them.
export const INTERSTITIAL_ADVANCE = {
  auto_advance_ms: INTERSTITIAL_AUTO_ADVANCE_MS,
  progress_tick_ms: INTERSTITIAL_PROGRESS_TICK_MS,
} as const;
