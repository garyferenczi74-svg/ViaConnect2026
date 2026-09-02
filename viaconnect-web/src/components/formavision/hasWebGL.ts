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
//   - Each type also retries without antialias on a fresh canvas. ANGLE
//     SwiftShader often returns null for { antialias: true } while a bare
//     getContext still succeeds — that must not report unavailable.
//   - Any thrown error is swallowed and reported as unavailable.

import {
  SAFE_GL_ATTRIBUTES,
  glAttributeAttempts,
  isSafariWebGLHost,
  webglContextTypeOrder,
} from '@/lib/formavision/gl/acquireWebGLContext';

export type WebGLProbeResult = 'ssr' | 'available' | 'unavailable';

function contextFromFreshCanvas(contextId: string): unknown {
  for (const attributes of glAttributeAttempts(SAFE_GL_ATTRIBUTES)) {
    const canvas = document.createElement('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') {
      return null;
    }
    const context = canvas.getContext(contextId, attributes);
    if (context) return context;
  }
  return null;
}

export function probeWebGL(): WebGLProbeResult {
  if (typeof document === 'undefined') {
    return 'ssr';
  }

  try {
    const order = webglContextTypeOrder(isSafariWebGLHost());
    for (const contextId of order) {
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
