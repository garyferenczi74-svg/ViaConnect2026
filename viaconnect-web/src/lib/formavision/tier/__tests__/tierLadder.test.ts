// Tests for the render-tier step-down ladder (Prompt 210b, P7-T1).
//
// stepTierDown is the pure, sticky ladder the provider uses on each budget-miss:
// cinematic -> lite -> 2d, never stepping up and never past the 2d floor. The 2d
// step is where the avatar hands off to the existing 2D SegmentalHeatMap floor.

import { describe, it, expect } from 'vitest';
import { stepTierDown, isFloorTier } from '../tierLadder';

describe('stepTierDown', () => {
  it('steps cinematic -> lite -> 2d in order', () => {
    expect(stepTierDown('cinematic')).toBe('lite');
    expect(stepTierDown('lite')).toBe('2d');
  });

  it('is sticky at the 2d floor (never steps up, never past 2d)', () => {
    expect(stepTierDown('2d')).toBe('2d');
  });

  it('reaches the floor in exactly two steps from cinematic and stays there', () => {
    const afterOne = stepTierDown('cinematic');
    const afterTwo = stepTierDown(afterOne);
    const afterThree = stepTierDown(afterTwo);
    expect(afterOne).toBe('lite');
    expect(afterTwo).toBe('2d');
    expect(afterThree).toBe('2d');
  });

  it('isFloorTier is true only for 2d', () => {
    expect(isFloorTier('2d')).toBe(true);
    expect(isFloorTier('lite')).toBe(false);
    expect(isFloorTier('cinematic')).toBe(false);
  });
});
