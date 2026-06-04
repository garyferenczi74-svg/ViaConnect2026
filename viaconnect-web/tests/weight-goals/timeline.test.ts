// Prompt 173 Phase 7: timeline projection math.

import { describe, it, expect } from 'vitest';
import { projectWeeksToGoal } from '@/lib/weight-goals/timeline';
import { MACRO_CONFIG } from '@/lib/gordon/macro-config';

describe('projectWeeksToGoal', () => {
  it('returns unavailable when any input is missing or non-positive', () => {
    expect(projectWeeksToGoal(null, 70, 0.5).kind).toBe('unavailable');
    expect(projectWeeksToGoal(80, null, 0.5).kind).toBe('unavailable');
    expect(projectWeeksToGoal(80, 70, null).kind).toBe('unavailable');
    expect(projectWeeksToGoal(0, 70, 0.5).kind).toBe('unavailable');
    expect(projectWeeksToGoal(80, -5, 0.5).kind).toBe('unavailable');
  });

  it('returns at_goal when current is within the maintain band of goal', () => {
    expect(projectWeeksToGoal(80, 80.5, 0.5).kind).toBe('at_goal');
    expect(projectWeeksToGoal(80, 79.5, 0.5).kind).toBe('at_goal');
    expect(projectWeeksToGoal(80, 80 + MACRO_CONFIG.maintain_threshold_kg, 0.5).kind).toBe('at_goal');
  });

  it('returns rate_too_small when the engine rate is effectively zero', () => {
    const r = projectWeeksToGoal(80, 75, 0);
    expect(r.kind).toBe('unavailable');
    if (r.kind === 'unavailable') expect(r.reason).toBe('rate_too_small');
  });

  it('projects Lose weeks at the engine rate when under the cap', () => {
    // 80 kg, goal 75 kg, rate 0.4 kg/week (cap = 0.8 kg/week, so under cap).
    // delta 5 kg / 0.4 = 12.5 -> 13 weeks (ceil).
    const r = projectWeeksToGoal(80, 75, 0.4);
    expect(r.kind).toBe('projection');
    if (r.kind === 'projection') {
      expect(r.data.weeksToGoal).toBe(13);
      expect(r.data.rateWasCapped).toBe(false);
      expect(r.data.direction).toBe('lose');
      expect(r.data.effectiveRateKgPerWeek).toBe(0.4);
    }
  });

  it('projects Gain weeks at the engine rate', () => {
    // 70 kg, goal 75 kg, rate 0.2 kg/week (cap = 0.7, under).
    // delta 5 kg / 0.2 = 25 weeks exactly.
    const r = projectWeeksToGoal(70, 75, 0.2);
    expect(r.kind).toBe('projection');
    if (r.kind === 'projection') {
      expect(r.data.weeksToGoal).toBe(25);
      expect(r.data.direction).toBe('gain');
    }
  });

  it('clamps the rate to weekly_rate_cap_pct of current body weight per week', () => {
    // 80 kg current; cap = 0.8 kg/week. Engine rate 2.0 should clamp.
    const r = projectWeeksToGoal(80, 75, 2.0);
    expect(r.kind).toBe('projection');
    if (r.kind === 'projection') {
      expect(r.data.rateWasCapped).toBe(true);
      // Effective rate is the cap (0.8 kg/week). Delta 5 kg / 0.8 = 6.25 -> 7.
      expect(r.data.effectiveRateKgPerWeek).toBeCloseTo(0.8, 5);
      expect(r.data.weeksToGoal).toBe(7);
    }
  });

  it('always returns at least 1 week when a projection is produced', () => {
    // delta 1.1 kg (just past the maintain band) at a very fast rate should
    // still produce 1 week, not 0.
    const r = projectWeeksToGoal(80, 81.1, 10);
    expect(r.kind).toBe('projection');
    if (r.kind === 'projection') expect(r.data.weeksToGoal).toBeGreaterThanOrEqual(1);
  });
});
