// Tests for the WebGL capability probe (Prompt 210b, task P1-T4).
//
// Runs in the node environment (no DOM), so the probe must report ssr / false
// here, and must also report false when a stubbed document yields no context,
// and true only when a stubbed canvas hands back a real-looking context.
// Fresh-canvas-per-type is load-bearing: iOS Safari returns null for webgl on
// a canvas that already failed webgl2.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { hasWebGL, probeWebGL } from '../hasWebGL';

const originalDocument = (globalThis as { document?: unknown }).document;

afterEach(() => {
  (globalThis as { document?: unknown }).document = originalDocument;
  vi.restoreAllMocks();
});

describe('hasWebGL', () => {
  it('returns false in a node environment with no document', () => {
    expect(typeof document === 'undefined').toBe(true);
    expect(probeWebGL()).toBe('ssr');
    expect(hasWebGL()).toBe(false);
  });

  it('returns false when getContext yields no context', () => {
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ getContext: () => null }),
    };
    expect(probeWebGL()).toBe('unavailable');
    expect(hasWebGL()).toBe(false);
  });

  it('returns true when a webgl2 context is available', () => {
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({
        getContext: (kind: string) => (kind === 'webgl2' ? {} : null),
      }),
    };
    expect(probeWebGL()).toBe('available');
    expect(hasWebGL()).toBe(true);
  });

  it('returns true when only webgl1 is available', () => {
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({
        getContext: (kind: string) => (kind === 'webgl' ? {} : null),
      }),
    };
    expect(hasWebGL()).toBe(true);
  });

  it('tries each context type on a fresh canvas so a webgl2-null canvas cannot poison webgl1', () => {
    let created = 0;
    (globalThis as { document?: unknown }).document = {
      createElement: () => {
        created += 1;
        const canvasId = created;
        return {
          getContext: (kind: string) => {
            // Same-canvas Safari bug: canvas 1 fails webgl2 and would also fail
            // webgl. A fresh canvas (2+) can still produce webgl1.
            if (canvasId === 1) return null;
            if (kind === 'webgl') return {};
            return null;
          },
        };
      },
    };
    expect(hasWebGL()).toBe(true);
    expect(created).toBeGreaterThan(1);
  });

  it('retries without antialias when MSAA getContext returns null', () => {
    let created = 0;
    (globalThis as { document?: unknown }).document = {
      createElement: () => {
        created += 1;
        return {
          getContext: (_kind: string, attrs?: { antialias?: boolean }) => {
            if (attrs && attrs.antialias === false) return {};
            return null;
          },
        };
      },
    };
    expect(hasWebGL()).toBe(true);
    expect(created).toBeGreaterThan(1);
  });

  it('passes failIfMajorPerformanceCaveat false so low-power GPUs still count', () => {
    const getContext = vi.fn((_kind: string, attrs?: { failIfMajorPerformanceCaveat?: boolean }) => {
      if (attrs && attrs.failIfMajorPerformanceCaveat === false) return {};
      return null;
    });
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ getContext }),
    };
    expect(hasWebGL()).toBe(true);
    expect(getContext).toHaveBeenCalledWith(
      'webgl2',
      expect.objectContaining({ failIfMajorPerformanceCaveat: false }),
    );
  });

  it('on iPhone UA tries webgl first so the advisory probe is not webgl2-poisoned', () => {
    const getContext = vi.fn((kind: string) => (kind === 'webgl' ? {} : null));
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ getContext }),
    };
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    });
    try {
      expect(hasWebGL()).toBe(true);
      expect(getContext.mock.calls[0]?.[0]).toBe('webgl');
      expect(getContext.mock.calls.map((c) => c[0])).not.toContain('webgl2');
    } finally {
      vi.unstubAllGlobals();
    }
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
    expect(probeWebGL()).toBe('unavailable');
  });
});
