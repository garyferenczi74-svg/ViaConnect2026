import { describe, it, expect } from 'vitest';
import { POSES, INTERSTITIAL, PROTOCOL_ID } from '../poses';

describe('POSES', () => {
  it('is ordered front right back left', () => {
    expect(POSES.map((p) => p.id)).toEqual(['front', 'right', 'back', 'left']);
  });
  it('has an interstitial for every pose and the final line', () => {
    expect(INTERSTITIAL.front).toBe('Got it. Turn left for RIGHT.');
    expect(INTERSTITIAL.left).toBe('All four captured.');
  });
  it('pins the protocol id', () => {
    expect(PROTOCOL_ID).toBe('4pose_v1');
  });
});
