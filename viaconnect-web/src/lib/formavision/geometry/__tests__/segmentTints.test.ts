import { describe, it, expect } from 'vitest';
import { segmentTintArray, shouldShowOverlay } from '../segmentTints';
import { SEGMENT_INDEX } from '../buildBodyGeometry';

describe('segmentTintArray', () => {
  it('orders the colors by SEGMENT_INDEX', () => {
    const arr = segmentTintArray({
      right_arm: '#ff0000',
      left_arm: '#00ff00',
      trunk: '#0000ff',
      right_leg: '#ffff00',
      left_leg: '#ff00ff',
    });
    expect(arr).toHaveLength(5);
    expect(arr[SEGMENT_INDEX.right_arm]?.getHexString()).toBe('ff0000');
    expect(arr[SEGMENT_INDEX.left_arm]?.getHexString()).toBe('00ff00');
    expect(arr[SEGMENT_INDEX.trunk]?.getHexString()).toBe('0000ff');
    expect(arr[SEGMENT_INDEX.right_leg]?.getHexString()).toBe('ffff00');
    expect(arr[SEGMENT_INDEX.left_leg]?.getHexString()).toBe('ff00ff');
  });

  it('maps a null or missing segment to null (UNKNOWN, no guessed tint)', () => {
    const arr = segmentTintArray({ trunk: '#123456', right_arm: null });
    expect(arr[SEGMENT_INDEX.right_arm]).toBeNull();
    expect(arr[SEGMENT_INDEX.left_arm]).toBeNull();
    expect(arr[SEGMENT_INDEX.trunk]?.getHexString()).toBe('123456');
  });

  it('returns all null for a null or empty record', () => {
    expect(segmentTintArray(null).every((c) => c === null)).toBe(true);
    expect(segmentTintArray(undefined).every((c) => c === null)).toBe(true);
    expect(segmentTintArray({}).every((c) => c === null)).toBe(true);
  });
});

describe('shouldShowOverlay (apply-by-tab gate)', () => {
  const tints = { trunk: '#00ff00' } as const;

  it('shows on bodyFat or muscleMass with tints', () => {
    expect(shouldShowOverlay('bodyFat', tints)).toBe(true);
    expect(shouldShowOverlay('muscleMass', tints)).toBe(true);
  });

  it('hides on the measurements tab even with tints', () => {
    expect(shouldShowOverlay('measurements', tints)).toBe(false);
  });

  it('hides when tints are null or absent', () => {
    expect(shouldShowOverlay('bodyFat', null)).toBe(false);
    expect(shouldShowOverlay('muscleMass', undefined)).toBe(false);
  });

  it('hides when the tab is undefined', () => {
    expect(shouldShowOverlay(undefined, tints)).toBe(false);
  });
});
