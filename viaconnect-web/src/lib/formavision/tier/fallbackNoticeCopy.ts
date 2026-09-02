// Honest 2D-floor notice copy. The generic "This device could not start WebGL"
// sentence is reserved for a confirmed no-context probe. A later createRenderer
// / scene / context-lost failure while getContext still works must surface the
// real error — never that false-negative.

import type { WebGLAvailability } from './avatarSurfaceDecision';

export const GENERIC_WEBGL_UNAVAILABLE_DETAIL =
  'This device could not start WebGL. The outline below is a 2D fallback, not a body morph.';

export const LATER_INIT_FALLBACK_SUFFIX =
  'The outline below is a 2D fallback, not a body morph.';

export const LATER_INIT_FALLBACK_DETAIL =
  `The 3D avatar failed after WebGL started. ${LATER_INIT_FALLBACK_SUFFIX}`;

const CONTEXT_UNAVAILABLE_MARKERS = [
  'webgl context unavailable',
  'error creating webgl context',
  'could not start webgl',
] as const;

export type FallbackWebGLSignal = WebGLAvailability;

export function isWebGLContextUnavailableMessage(reason: string): boolean {
  const normalized = reason.toLowerCase();
  return CONTEXT_UNAVAILABLE_MARKERS.some((marker) => normalized.includes(marker));
}

export function errorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return '3D avatar failed to initialize';
}

// SVG floor is only honest when a fresh-canvas probe cannot get a context.
// SSR / unknown / available stay on the 3D mount (remount on a live-canvas miss).
export function shouldLatchFallback2d(webgl: FallbackWebGLSignal): boolean {
  return webgl === 'unavailable';
}

export function formatFallbackNoticeDetail(
  reason: string | null | undefined,
  webgl: FallbackWebGLSignal = 'unknown',
): string {
  const trimmed = reason?.trim() ?? '';
  if (webgl === 'available') {
    if (trimmed && !isWebGLContextUnavailableMessage(trimmed)) {
      return `${trimmed} ${LATER_INIT_FALLBACK_SUFFIX}`;
    }
    return LATER_INIT_FALLBACK_DETAIL;
  }
  if (trimmed && !isWebGLContextUnavailableMessage(trimmed)) {
    return `${trimmed} ${LATER_INIT_FALLBACK_SUFFIX}`;
  }
  return GENERIC_WEBGL_UNAVAILABLE_DETAIL;
}
