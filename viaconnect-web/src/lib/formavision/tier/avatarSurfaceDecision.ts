// Pure mount-vs-fallback decision for the FormaVision avatar plate.
//
// Gary iPhone Safari screenshot (viaconnectapp.com after #172): ScanHistory
// "FormaVision · Ready" + FRBL hide, Male/in, then the bordered plate is the
// BodyCompositionAvatar *children* — SegmentalHeatMap Male Avatar.svg — not a
// canvas. That child wins on mobile www because main's FormaVision3DAvatar
// ran useMemo(() => hasWebGL(), []) during render:
//   - SSR: document missing → false → queueMicrotask(onRenderError) → fellBack
//     so the HTML Safari first-paints IS the SVG (hydration mismatch keeps it)
//   - iOS client: getContext('webgl2') null poisons that canvas; webgl is also
//     null → hasWebGL false again → same latch
// A single false never recovers. This decision must not choose fallback2d for
// SSR / unknown / a lone unavailable probe.
//
// Policy: prefer FormaVision3DAvatar / FormaVisionCanvas whenever WebGL might
// still work. SSR, unknown, and a lone "unavailable" probe are NOT enough to
// choose the 2D SVG. Only a confirmed 3D failure (error boundary / context lost)
// or a runtime ladder step to '2d' (budget miss after 3D actually ran) selects
// the honest fallback floor.

import type { RenderTier } from './types';

export type AvatarSurface = 'formavision3d' | 'fallback2d';

export type WebGLAvailability = 'ssr' | 'unknown' | 'available' | 'unavailable';

export interface AvatarSurfaceDecisionInput {
  renderTier: RenderTier;
  // True only after the 3D subtree actually failed (error boundary / context lost).
  confirmedFailure: boolean;
  webgl: WebGLAvailability;
  // Ready + BF/girths must keep the WebGL plate mounted. The alien floor is
  // not a Ready result even after a confirmed miss or a tier step-down.
  hasReadyScanData?: boolean;
}

export function selectAvatarSurface(input: AvatarSurfaceDecisionInput): AvatarSurface {
  if (input.hasReadyScanData) return 'formavision3d';
  if (input.confirmedFailure) return 'fallback2d';
  if (input.renderTier === '2d') return 'fallback2d';
  return 'formavision3d';
}

// True when the 2D SVG would be chosen even though the probe said WebGL works.
// That combination is a silent false morph and must stay unreachable except
// after a confirmed live-canvas failure (context lost after a successful probe).
export function wouldSelectSvgDespiteWebGL(input: AvatarSurfaceDecisionInput): boolean {
  return input.webgl === 'available' && selectAvatarSurface(input) === 'fallback2d' && !input.confirmedFailure && input.renderTier !== '2d';
}

// Gary 2026-09-03 standing lock: the teal anatomical outline is gone from
// the product path. This must not keep a covering floor over the mesh.
// Never-empty is navy chamber + live 3D, or a text-only notice.
export function shouldPaintPlateFloor(input: {
  liveCanvasHasPainted: boolean;
  hasReadyScanData?: boolean;
  presentReadyWithoutPaint?: boolean;
}): boolean {
  if (
    input.hasReadyScanData ||
    input.presentReadyWithoutPaint ||
    input.liveCanvasHasPainted
  ) {
    return false;
  }
  return false;
}

// Product mounts of FormaVisionAnatomicalFloor / LocalSilhouette are FAIL.
export function shouldMountAnatomicalOutline(): boolean {
  return false;
}
