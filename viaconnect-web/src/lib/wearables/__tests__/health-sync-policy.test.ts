import { describe, it, expect } from 'vitest';
import { isEmptyHealthBatch, shouldMarkHealthSourceConnected } from '../health-sync-policy';

describe('health-sync connect-after-persist', () => {
  it('does not connect an empty batch', () => {
    expect(isEmptyHealthBatch(0)).toBe(true);
    expect(shouldMarkHealthSourceConnected({ sampleCount: 0, eventInserted: true })).toBe(false);
  });

  it('connects only after a real persist', () => {
    expect(shouldMarkHealthSourceConnected({ sampleCount: 4, eventInserted: false })).toBe(false);
    expect(shouldMarkHealthSourceConnected({ sampleCount: 4, eventInserted: true })).toBe(true);
  });
});
