// r3f 8.18 calls gl(canvas). A props-object must not be treated as the canvas
// (that throws getContext-undefined and latches a false "no WebGL" floor).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FORMAVISION_GL_FACTORY_NO_CANVAS_MESSAGE,
  WEBGL_CONTEXT_UNAVAILABLE_MESSAGE,
  createFormaVisionRenderer,
  resolveFormaVisionGlCanvas,
} from '../createFormaVisionRenderer';

const { constructed } = vi.hoisted(() => ({ constructed: [] as unknown[] }));

vi.mock('three', () => ({
  WebGLRenderer: class MockRenderer {
    constructor(params: unknown) {
      constructed.push(params);
    }
  },
}));

beforeEach(() => {
  constructed.length = 0;
});

describe('resolveFormaVisionGlCanvas', () => {
  it('accepts a canvas-like host and r3f defaultProps.canvas', () => {
    const canvas = { getContext: () => ({}) };
    expect(resolveFormaVisionGlCanvas(canvas)).toBe(canvas);
    expect(resolveFormaVisionGlCanvas({ canvas, antialias: true })).toBe(canvas);
    expect(resolveFormaVisionGlCanvas({ antialias: true })).toBeNull();
    expect(resolveFormaVisionGlCanvas(undefined)).toBeNull();
  });
});

describe('createFormaVisionRenderer', () => {
  it('throws a factory-no-canvas error instead of treating props as a canvas', () => {
    expect(() => createFormaVisionRenderer({ antialias: true })).toThrow(
      FORMAVISION_GL_FACTORY_NO_CANVAS_MESSAGE,
    );
  });

  it('throws WebGL context unavailable only when getContext returns null', () => {
    const canvas = { getContext: () => null };
    expect(() => createFormaVisionRenderer(canvas)).toThrow(WEBGL_CONTEXT_UNAVAILABLE_MESSAGE);
  });

  it('keeps the 3D renderer when getContext succeeds, including via defaultProps', () => {
    const context = { kind: 'webgl2' };
    const canvas = { getContext: () => context };
    const renderer = createFormaVisionRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    expect(renderer).toBeDefined();
    expect(constructed).toHaveLength(1);
    expect(constructed[0]).toEqual(
      expect.objectContaining({
        canvas,
        context,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default',
      }),
    );
  });
});
