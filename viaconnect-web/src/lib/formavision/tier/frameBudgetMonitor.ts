// Pure frame-budget sampler for the runtime tier step-down (Prompt 210b, P7-T1).
//
// This is the accumulate/decide core of the runtime monitor, kept free of
// react-three-fiber and the clock so every branch is unit-testable with plain
// numbers. The r3f wrapper (FrameBudgetMonitor in FormaVisionCanvas) feeds it the
// wall-clock duration between consecutive RENDERED frames (via useFrame, which under
// frameloop="demand" fires only on frames the loop already produced) and forwards a
// true result up to the provider as a single budget-miss.
//
// DEMAND-LOOP NUANCE: there is no continuous fps to read. Frames are produced only
// during a morph / scrub / orbit / intro, so the gap between two rendered frames is
// the real frame duration ONLY while a sequence is actively running. A gap larger
// than idleGapMs is the loop having been idle (no interaction, tab hidden,
// offscreen), not a slow frame, so it is discarded and resets the run. A step is
// recommended only after a SUSTAINED window of consecutive over-budget frames
// (hysteresis), and exactly once per window (no thrash); the provider makes the
// step sticky.

// A rendered frame slower than this (ms) is "over budget". 34ms is just slower than
// 30fps: a healthy 60fps frame (about 16.7ms) is comfortably under, so a capable
// device never trips it, while sustained sub-30fps jank does.
export const DEFAULT_FRAME_BUDGET_MS = 34;

// A gap larger than this (ms) is a demand-loop idle gap, not frame cost: discarded,
// and it resets the run so the next active sequence is measured cleanly. Catastrophic
// but continuous frames (34-250ms) still count; only true idle gaps are dropped.
export const DEFAULT_IDLE_GAP_MS = 250;

// Consecutive over-budget frames required before a step is recommended. About 20
// frames of sustained jank (roughly 0.7s at 30fps) is a strong, non-transient signal
// and gives the hysteresis that prevents thrashing on a momentary hitch.
export const DEFAULT_OVER_BUDGET_WINDOW = 20;

export interface FrameBudgetSamplerOptions {
  budgetMs?: number;
  idleGapMs?: number;
  windowSize?: number;
}

export interface FrameBudgetSampler {
  // Feed one inter-frame delta (ms). Returns true exactly once when a sustained
  // over-budget window completes, then resets so the next window must refill from
  // zero. Idle gaps and non-positive / non-finite deltas never signal.
  sample(deltaMs: number): boolean;
  // Clear an in-progress streak (used when the tier changes so the new density gets
  // a clean measurement window).
  reset(): void;
  // Current consecutive over-budget count, for introspection / tests.
  consecutiveOverBudget(): number;
}

export function createFrameBudgetSampler(
  options: FrameBudgetSamplerOptions = {},
): FrameBudgetSampler {
  const budgetMs = options.budgetMs ?? DEFAULT_FRAME_BUDGET_MS;
  const idleGapMs = options.idleGapMs ?? DEFAULT_IDLE_GAP_MS;
  const windowSize = Math.max(1, options.windowSize ?? DEFAULT_OVER_BUDGET_WINDOW);

  let consecutive = 0;

  function reset(): void {
    consecutive = 0;
  }

  function sample(deltaMs: number): boolean {
    // Guard against bogus deltas (a paused clock, a backwards timestamp): ignore
    // them entirely so they neither advance nor reset the streak.
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return false;
    }

    // A large gap is the demand loop having been idle, not a slow frame. Drop it and
    // restart the run so the next continuous sequence is measured on its own.
    if (deltaMs > idleGapMs) {
      consecutive = 0;
      return false;
    }

    // A good frame breaks any partial streak (hysteresis: the window must be a run of
    // consecutive over-budget frames, never a tally of scattered ones).
    if (deltaMs <= budgetMs) {
      consecutive = 0;
      return false;
    }

    // Over budget within an active sequence.
    consecutive += 1;
    if (consecutive >= windowSize) {
      // Emit one signal, then require a fresh full window before emitting again. The
      // provider steps one tier per signal, so a still-struggling device walks the
      // ladder one rung at a time (cinematic -> lite -> 2d) rather than all at once.
      consecutive = 0;
      return true;
    }
    return false;
  }

  return {
    sample,
    reset,
    consecutiveOverBudget: () => consecutive,
  };
}
