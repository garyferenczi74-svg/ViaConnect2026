// Pure easing functions for the FormaVision motion foundation (Prompt 210b, P2-T1).
//
// These are the only easing curves the Phase 2 motion tasks reuse. They are kept
// pure (no time, no state) so the animation runner can stay framework light: the
// runner produces a linear 0..1 fraction and an easing maps it to an eased 0..1.
// Inputs are clamped to 0..1 so a runner that slightly overshoots the final frame
// never produces a value outside the curve's intended range.

// Clamp a raw fraction into the 0..1 domain the curves are defined on.
function clamp01(t: number): number {
  if (t < 0) {
    return 0;
  }
  if (t > 1) {
    return 1;
  }
  return t;
}

// Ease in then out on a cubic curve. f(0) = 0, f(0.5) = 0.5, f(1) = 1, with a
// gentle start and finish. This is the default for the intro sweep.
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  if (x < 0.5) {
    return 4 * x * x * x;
  }
  const f = -2 * x + 2;
  return 1 - (f * f * f) / 2;
}

// Ease out on a cubic curve: fast start, settling finish. Used where the wake of
// the sweep should decelerate into its final lit value.
export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  const f = 1 - x;
  return 1 - f * f * f;
}

// Linear identity, kept for callers that want the eased-lerp shape without a curve.
export function linear(t: number): number {
  return clamp01(t);
}

export type EasingFn = (t: number) => number;
