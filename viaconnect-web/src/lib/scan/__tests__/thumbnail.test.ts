/**
 * Prompt 231: unit coverage for computeThumbDimensions, the pure sizing
 * logic generateThumbnail relies on. generateThumbnail itself needs canvas
 * + createImageBitmap, neither of which exist under vitest's node
 * environment (no jsdom in this repo - see vitest.config.ts). That DOM path
 * is exercised by Playwright / the manual device matrix instead; this suite
 * covers everything about thumbnail sizing that can be verified without a
 * real canvas.
 */
import { describe, it, expect } from 'vitest';
import { computeThumbDimensions } from '../thumbnail';

describe('computeThumbDimensions', () => {
  it('downscales a landscape image, preserving aspect ratio', () => {
    const result = computeThumbDimensions(1920, 1080, 256);
    expect(result.width).toBe(256);
    expect(result.height).toBe(144);
  });

  it('downscales a portrait image (the common captured-still shape), preserving aspect ratio', () => {
    const result = computeThumbDimensions(1080, 1920, 256);
    expect(result.width).toBe(144);
    expect(result.height).toBe(256);
  });

  it('leaves an already-smaller image unchanged (only rounds)', () => {
    const result = computeThumbDimensions(120.4, 90.6, 256);
    expect(result.width).toBe(120);
    expect(result.height).toBe(91);
  });

  it('leaves a square image exactly at maxEdge unchanged', () => {
    const result = computeThumbDimensions(256, 256, 256);
    expect(result).toEqual({ width: 256, height: 256 });
  });

  it('never produces a zero-size dimension for a thin aspect ratio', () => {
    const result = computeThumbDimensions(4000, 1, 256);
    expect(result.width).toBe(256);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('falls back to a maxEdge square for invalid (zero/negative) input rather than a zero-size canvas', () => {
    expect(computeThumbDimensions(0, 1080, 256)).toEqual({ width: 256, height: 256 });
    expect(computeThumbDimensions(1080, 0, 256)).toEqual({ width: 256, height: 256 });
    expect(computeThumbDimensions(-10, -20, 256)).toEqual({ width: 256, height: 256 });
  });

  it('respects a custom maxEdge', () => {
    const result = computeThumbDimensions(1080, 1920, 128);
    expect(result.width).toBe(72);
    expect(result.height).toBe(128);
  });
});
