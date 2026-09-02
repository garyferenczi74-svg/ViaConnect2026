// WebGL capability probe for FormaVision (Prompt 210b, task P1-T4).
//
// hasWebGL answers a single question: can this browser give us a real WebGL
// rendering context right now. It is an advisory signal for tests, e2e stubs,
// and diagnostics. It is NOT a mount gate: a false result must not latch the
// 2D SegmentalHeatMap floor (SSR is always false; iOS Safari / some Chrome
// flags false-negative). FormaVision3DAvatar mounts the canvas and falls back
// only after a confirmed render / context-lost failure.
//
// Probe robustness:
//   - Each context type is requested on a FRESH canvas. Safari (and some
//     Chrome flags) return null for getContext('webgl') on a canvas that
//     already failed getContext('webgl2').
//   - failIfMajorPerformanceCaveat is explicitly false so a software or
//     low-power GPU still counts as "WebGL exists".
//   - Any thrown error is swallowed and reported as unavailable.

export type WebGLProbeResult = 'ssr' | 'available' | 'unavailable';

const GL_CONTEXT_IDS = ['webgl2', 'webgl', 'experimental-webgl'] as const;

const PROBE_ATTRIBUTES: WebGLContextAttributes = {
  failIfMajorPerformanceCaveat: false,
};

function contextFromFreshCanvas(contextId: (typeof GL_CONTEXT_IDS)[number]): unknown {
  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') {
    return null;
  }
  return canvas.getContext(contextId, PROBE_ATTRIBUTES);
}

export function probeWebGL(): WebGLProbeResult {
  if (typeof document === 'undefined') {
    return 'ssr';
  }

  try {
    for (const contextId of GL_CONTEXT_IDS) {
      const context = contextFromFreshCanvas(contextId);
      if (context) {
        return 'available';
      }
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export function hasWebGL(): boolean {
  return probeWebGL() === 'available';
}
