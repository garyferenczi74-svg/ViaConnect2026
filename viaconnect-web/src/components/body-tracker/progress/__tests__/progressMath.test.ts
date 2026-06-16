import { describe, it, expect } from 'vitest';
import { computeProgressToGoal, axisTickLabel } from '../progressMath';

describe('computeProgressToGoal', () => {
  it('loss goal halfway', () => {
    const r = computeProgressToGoal({ startLb: 200, currentLb: 190, goalLb: 180 });
    expect(r).not.toBeNull();
    expect(r!.pct).toBe(50);
    expect(r!.lbsToGo).toBe(10);
    expect(r!.direction).toBe('loss');
  });
  it('gain goal quarter', () => {
    const r = computeProgressToGoal({ startLb: 150, currentLb: 155, goalLb: 170 });
    expect(r!.pct).toBe(25);
    expect(r!.lbsToGo).toBe(15);
    expect(r!.direction).toBe('gain');
  });
  it('clamps 0..100 and never negative lbsToGo', () => {
    const past = computeProgressToGoal({ startLb: 200, currentLb: 175, goalLb: 180 });
    expect(past!.pct).toBe(100);
    expect(past!.lbsToGo).toBe(0);
  });
  it('returns null when currentLb is missing (fail-open empty state)', () => {
    expect(computeProgressToGoal({ startLb: 200, currentLb: null, goalLb: 180 })).toBeNull();
  });
  it('returns null when start equals goal (no movement defined)', () => {
    expect(computeProgressToGoal({ startLb: 180, currentLb: 180, goalLb: 180 })).toBeNull();
  });
});

describe('axisTickLabel', () => {
  it('formats within one year as MMM D', () => {
    expect(axisTickLabel('2026-03-05', false)).toBe('Mar 5');
  });
  it('appends the year when the projected endpoint crosses into a new year', () => {
    expect(axisTickLabel('2027-01-15', true)).toBe("Jan 15 '27");
  });
});
