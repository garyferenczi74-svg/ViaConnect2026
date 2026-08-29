import { describe, it, expect } from 'vitest';
import { computeFrameMetrics } from '../frameMetrics';

function solidRgba(width: number, height: number, r: number, g: number, b: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = 255;
  }
  return pixels;
}

function checkerboardRgba(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const on = (x + y) % 2 === 0;
      const v = on ? 255 : 0;
      pixels[i * 4] = v;
      pixels[i * 4 + 1] = v;
      pixels[i * 4 + 2] = v;
      pixels[i * 4 + 3] = 255;
    }
  }
  return pixels;
}

describe('computeFrameMetrics', () => {
  it('a flat solid-color frame has zero luminance variance', () => {
    const pixels = solidRgba(8, 8, 100, 100, 100);
    const metrics = computeFrameMetrics(pixels, 8, 8);
    expect(metrics.luminanceVariance).toBe(0);
  });

  it('reports exposure as mean luma over 255', () => {
    const pixels = solidRgba(4, 4, 128, 128, 128);
    const metrics = computeFrameMetrics(pixels, 4, 4);
    expect(metrics.exposure).toBeCloseTo(128 / 255, 5);
  });

  it('a black frame reads exposure near zero', () => {
    const pixels = solidRgba(4, 4, 0, 0, 0);
    const metrics = computeFrameMetrics(pixels, 4, 4);
    expect(metrics.exposure).toBe(0);
  });

  it('a flat frame has zero blur score (no edges to detect)', () => {
    const pixels = solidRgba(8, 8, 200, 200, 200);
    const metrics = computeFrameMetrics(pixels, 8, 8);
    expect(metrics.blurScore).toBe(0);
  });

  it('a high-contrast checkerboard has nonzero luminance variance and a high blur score', () => {
    const pixels = checkerboardRgba(16, 16);
    const metrics = computeFrameMetrics(pixels, 16, 16);
    expect(metrics.luminanceVariance).toBeGreaterThan(1000);
    expect(metrics.blurScore).toBeGreaterThan(1000);
  });

  it('a 1x1 frame does not crash and reports zero blur score', () => {
    const pixels = solidRgba(1, 1, 50, 60, 70);
    const metrics = computeFrameMetrics(pixels, 1, 1);
    expect(metrics.blurScore).toBe(0);
    expect(Number.isFinite(metrics.luminanceVariance)).toBe(true);
  });

  it('a zero-dimension frame returns zeros without dividing by zero', () => {
    const metrics = computeFrameMetrics(new Uint8ClampedArray(0), 0, 0);
    expect(metrics).toEqual({ luminanceVariance: 0, exposure: 0, blurScore: 0 });
  });
});
