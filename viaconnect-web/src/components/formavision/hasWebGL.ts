// WebGL capability probe for FormaVision (Prompt 210b, task P1-T4).
//
// hasWebGL answers a single question: can this browser give us a real WebGL
// rendering context right now. The 3D avatar is gated on a true result so that a
// machine with WebGL disabled, blocklisted, or simply unavailable (SSR, a node
// test runner, a locked-down corporate browser) falls back to the 2D floor
// rather than mounting a Canvas that can only fail. The probe is deliberately
// cheap and side-effect free: it builds a throwaway canvas, asks for a context,
// then lets it be garbage collected.

// Try webgl2 first, then webgl, then the experimental alias some older browsers
// still expose. Any thrown error (no document, no canvas support, a hostile
// getContext) is swallowed and reported as "no WebGL" so a probe failure can
// never crash the caller.
export function hasWebGL(): boolean {
  // No DOM (SSR or the node test runner) means no canvas and therefore no WebGL.
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') {
      return false;
    }
    const context =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return context !== null && context !== undefined;
  } catch {
    return false;
  }
}
