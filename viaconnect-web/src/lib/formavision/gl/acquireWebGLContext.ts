// Safari-safe WebGL context acquisition for FormaVision.
//
// Gary phone + www smoke (main b9ac07b1): the plate was SegmentalHeatMap
// Male Avatar.svg on iPhone Safari AND box Chrome. Two cooperating faults:
//
//   1. Render-time hasWebGL() === false latched BodyCompositionAvatar.fellBack
//      (SSR is always false; iOS Safari also false-negatives). Shared by both
//      clients. Fixed in the mount gate (selectAvatarSurface / client-only
//      FormaVision3DAvatar).
//   2. iPhone Safari only: getContext('webgl2') returning null POISONS that
//      canvas so getContext('webgl') is also null. three.js / r3f do exactly
//      that sequence on the live canvas. Even after the gate is removed, the
//      Canvas constructor would throw and the error boundary would still swap
//      in the SVG. This module is the live-canvas fix.
//
// Policy: on Safari-like hosts (iOS WKWebView + desktop Safari) request WebGL1
// first and never try a second GL type on the same canvas. On other hosts keep
// webgl2-then-webgl (Chrome allows it). failIfMajorPerformanceCaveat is always
// false; powerPreference is default.

export const SAFE_GL_ATTRIBUTES: WebGLContextAttributes = {
  antialias: true,
  alpha: true,
  powerPreference: 'default',
  failIfMajorPerformanceCaveat: false,
};

// iPhone WebKit: an alpha canvas plus a discarded drawing buffer is the
// long-running first-paint miss. Opaque + preserveDrawingBuffer lets the
// first always-loop frame actually composite a body.
export const SAFARI_SAFE_GL_ATTRIBUTES: WebGLContextAttributes = {
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'default',
  failIfMajorPerformanceCaveat: false,
};

export function glAttributesForHost(safariLike: boolean): WebGLContextAttributes {
  return safariLike ? SAFARI_SAFE_GL_ATTRIBUTES : SAFE_GL_ATTRIBUTES;
}

// ANGLE SwiftShader (Arnold box / many VMs) often returns null for
// getContext('webgl'|'webgl2', { antialias: true }) while a bare
// getContext('webgl') on a fresh canvas succeeds. That is not "no WebGL"
// and not a SwiftShader refuse — retry without MSAA on the same canvas.
export const SOFTWARE_SAFE_GL_ATTRIBUTES: WebGLContextAttributes = {
  ...SAFE_GL_ATTRIBUTES,
  antialias: false,
};

export function glAttributeAttempts(
  preferred: WebGLContextAttributes = SAFE_GL_ATTRIBUTES,
): readonly WebGLContextAttributes[] {
  if (preferred.antialias === false) {
    return [preferred];
  }
  return [preferred, { ...preferred, antialias: false }];
}

const SAFARI_ORDER = ['webgl', 'experimental-webgl'] as const;
const STANDARD_ORDER = ['webgl2', 'webgl', 'experimental-webgl'] as const;
// THREE r163+ (current r184) throws if handed a WebGL1 context:
// "WebGL 1 is not supported since r163." The #172 Safari order asked
// webgl first so a failed webgl2 could not poison the live canvas — and
// then passed that WebGL1 context into THREE. Gary #189 phone: flash,
// then dark, paint=pending forever. The live r3f canvas is WebGL2-only.
const LIVE_CANVAS_ORDER = ['webgl2'] as const;

export function isSafariWebGLHost(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  if (!userAgent) return false;
  if (/iP(hone|ad|od)/.test(userAgent)) return true;
  if (/Macintosh/.test(userAgent) && /Mobile/.test(userAgent)) return true;
  if (/Safari/.test(userAgent) && !/Chrome|Chromium|Android|Edg\//.test(userAgent)) {
    return true;
  }
  return false;
}

export function webglContextTypeOrder(
  safariLike: boolean,
): readonly string[] {
  return safariLike ? SAFARI_ORDER : STANDARD_ORDER;
}

export function liveCanvasContextTypeOrder(): readonly string[] {
  return LIVE_CANVAS_ORDER;
}

// THREE r184 rejects WebGLRenderingContext. WebGL2 is the only live context
// we may pass. Node unit tests duck-type a mock object — allow that.
export function shouldPassContextToThreeRenderer(context: unknown): boolean {
  if (context == null || typeof context !== 'object') return false;
  if (typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext) {
    return true;
  }
  if (typeof WebGLRenderingContext !== 'undefined' && context instanceof WebGLRenderingContext) {
    return false;
  }
  return true;
}

export interface AcquireWebGLContextOptions {
  safariLike?: boolean;
  attributes?: WebGLContextAttributes;
  typeOrder?: readonly string[];
}

export interface WebGLContextHost {
  getContext: (contextId: string, attributes?: WebGLContextAttributes) => unknown;
}

export interface AcquiredWebGLContext {
  context: unknown;
  attributes: WebGLContextAttributes;
}

export function acquireWebGLContextResult(
  canvas: WebGLContextHost,
  options: AcquireWebGLContextOptions = {},
): AcquiredWebGLContext | null {
  const safariLike = options.safariLike ?? false;
  const preferred = options.attributes ?? glAttributesForHost(safariLike);
  const order = options.typeOrder ?? webglContextTypeOrder(safariLike);
  for (const attributes of glAttributeAttempts(preferred)) {
    for (const contextId of order) {
      const context = canvas.getContext(contextId, attributes);
      if (context) return { context, attributes };
      // A failed getContext on Safari/WKWebView marks this canvas unusable for
      // every other GL type. Stay on this type and try the next attribute set
      // (antialias:false) rather than collecting a poisoned webgl2-null.
      if (safariLike) break;
    }
  }
  return null;
}

export function acquireWebGLContext(
  canvas: WebGLContextHost,
  options: AcquireWebGLContextOptions = {},
): unknown {
  return acquireWebGLContextResult(canvas, options)?.context ?? null;
}
