// Tests for the pure frame-budget sampler (Prompt 210b, P7-T1).
//
// This is the accumulate/decide core of the runtime monitor, separated from r3f so
// every branch is unit-testable with plain numbers and no Canvas / clock. The r3f
// wrapper (FrameBudgetMonitor in FormaVisionCanvas) only feeds it the wall-clock
// delta between consecutive RENDERED frames and forwards a true result up as a
// budget-miss; what is verified live (a Canvas under a real load) is named in the
// task report.
//
// Demand-loop nuance: there is no continuous fps. The sampler is fed a delta only
// when a frame actually rendered. A delta above idleGapMs is a demand-loop idle gap
// (tab hidden, offscreen, or simply no interaction since the last frame), NOT frame
// cost, so it is discarded and resets the run. Only a SUSTAINED window of
// consecutive over-budget frames signals a step-down (hysteresis, no thrash).

import { describe, it, expect } from 'vitest';
import { createFrameBudgetSampler } from '../frameBudgetMonitor';

// Small window for legible tests; production defaults are larger (see the module).
const OPTS = { budgetMs: 34, idleGapMs: 250, windowSize: 3 };

describe('createFrameBudgetSampler', () => {
  it('never signals while frames stay under budget', () => {
    const s = createFrameBudgetSampler(OPTS);
    for (let i = 0; i < 50; i += 1) {
      expect(s.sample(16)).toBe(false);
    }
  });

  it('signals exactly once after a sustained window of over-budget frames', () => {
    const s = createFrameBudgetSampler(OPTS);
    expect(s.sample(40)).toBe(false); // 1 over budget
    expect(s.sample(40)).toBe(false); // 2 over budget
    expect(s.sample(40)).toBe(true); // 3 -> window complete, signal once
  });

  it('requires a fresh full window after a signal (one step per window; supports cinematic -> lite -> 2d laddering)', () => {
    const s = createFrameBudgetSampler(OPTS);
    s.sample(40);
    s.sample(40);
    expect(s.sample(40)).toBe(true); // first signal
    expect(s.sample(40)).toBe(false); // counter reset; new window begins
    expect(s.sample(40)).toBe(false);
    expect(s.sample(40)).toBe(true); // second signal after a full new window
  });

  it('resets the run on a single under-budget frame (hysteresis, no thrash)', () => {
    const s = createFrameBudgetSampler(OPTS);
    expect(s.sample(40)).toBe(false);
    expect(s.sample(40)).toBe(false);
    expect(s.sample(16)).toBe(false); // a good frame breaks the streak
    expect(s.sample(40)).toBe(false); // streak restarts from zero
    expect(s.sample(40)).toBe(false);
    expect(s.sample(40)).toBe(true); // three consecutive again
  });

  it('treats a large delta as a demand-loop idle gap: discarded and resets the run', () => {
    const s = createFrameBudgetSampler(OPTS);
    expect(s.sample(40)).toBe(false);
    expect(s.sample(40)).toBe(false);
    expect(s.sample(5000)).toBe(false); // idle gap (tab/offscreen): not frame cost
    expect(s.sample(40)).toBe(false); // run restarts after the gap
    expect(s.sample(40)).toBe(false);
    expect(s.sample(40)).toBe(true);
  });

  it('ignores non-positive or non-finite deltas without disturbing the streak', () => {
    const s = createFrameBudgetSampler(OPTS);
    expect(s.sample(40)).toBe(false); // streak = 1
    expect(s.sample(0)).toBe(false); // ignored, streak still 1
    expect(s.sample(-10)).toBe(false); // ignored, streak still 1
    expect(s.sample(Number.NaN)).toBe(false); // ignored, streak still 1
    expect(s.sample(40)).toBe(false); // streak = 2
    expect(s.sample(40)).toBe(true); // streak = 3 -> signal
  });

  it('reset() clears an in-progress streak', () => {
    const s = createFrameBudgetSampler(OPTS);
    s.sample(40);
    s.sample(40);
    s.reset();
    expect(s.sample(40)).toBe(false);
    expect(s.sample(40)).toBe(false);
    expect(s.sample(40)).toBe(true);
  });

  it('exposes the consecutive over-budget count for introspection', () => {
    const s = createFrameBudgetSampler(OPTS);
    s.sample(40);
    expect(s.consecutiveOverBudget()).toBe(1);
    s.sample(16);
    expect(s.consecutiveOverBudget()).toBe(0);
  });

  it('uses sane production defaults when no options are given', () => {
    const s = createFrameBudgetSampler();
    // A healthy 60fps frame (about 16.7ms) is well under budget and never signals.
    for (let i = 0; i < 200; i += 1) {
      expect(s.sample(16.7)).toBe(false);
    }
  });
});
