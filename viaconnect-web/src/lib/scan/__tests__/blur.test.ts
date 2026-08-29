import { describe, it, expect } from 'vitest';
import { varianceOfLaplacian, isBlurred } from '../blur';

function checker(w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = ((x + y) % 2) * 255;
  return g;
}
function flat(w: number, h: number): Float32Array { return new Float32Array(w * h).fill(128); }

describe('blur', () => {
  it('sharp (high-frequency) beats flat', () => {
    expect(varianceOfLaplacian(checker(16, 16), 16, 16)).toBeGreaterThan(varianceOfLaplacian(flat(16, 16), 16, 16));
  });
  it('isBlurred flags a flat frame', () => {
    expect(isBlurred(varianceOfLaplacian(flat(16, 16), 16, 16))).toBe(true);
  });
});
