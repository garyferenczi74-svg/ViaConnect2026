// Tests for the WebGL capability probe (Prompt 210b, task P1-T4).
//
// Runs in the node environment (no DOM), so the probe must report false here, and
// must also report false when a stubbed document yields no context, and true only
// when a stubbed canvas hands back a real-looking context. The probe never throws.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { hasWebGL } from '../hasWebGL';

const originalDocument = (globalThis as { document?: unknown }).document;

afterEach(() => {
  (globalThis as { document?: unknown }).document = originalDocument;
  vi.restoreAllMocks();
});

describe('hasWebGL', () => {
  it('returns false in a node environment with no document', () => {
    // The node test runner has no document; the probe must not throw and must
    // report no WebGL so callers fall back to 2D.
    expect(typeof document === 'undefined').toBe(true);
    expect(hasWebGL()).toBe(false);
  });

  it('returns false when getContext yields no context', () => {
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ getContext: () => null }),
    };
    expect(hasWebGL()).toBe(false);
  });

  it('returns true when a webgl context is available', () => {
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({
        getContext: (kind: string) => (kind === 'webgl2' ? {} : null),
      }),
    };
    expect(hasWebGL()).toBe(true);
  });

  it('swallows a hostile getContext and returns false', () => {
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({
        getContext: () => {
          throw new Error('blocked');
        },
      }),
    };
    expect(() => hasWebGL()).not.toThrow();
    expect(hasWebGL()).toBe(false);
  });
});
