// MOTION-SPEC for the FormaVision labeled 2D floor ↔ 3D handoff.
//
// Proud, not flashy. Floor paints immediately (never blank) as loading or
// hard-failure only. 3D is the Brief 58 scan-morph mesh — this file only
// times the CSS/WebGL opacity crossfade. Do not SVG→mesh the illustration.
// Do not paint a stock person as the Ready result.

export const FORMAVISION_MOTION_SPEC = {
  enterPlateMs: 180,
  enterPlateEasing: 'ease-out',
  floorPaintMs: 0,
  // Brief 60 F2 half-morph overlap (anatomical → particle grid).
  halfMorphMs: 280,
  ready3dMs: 420,
  ready3dEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  settleMs: 200,
  settleEasing: 'ease-out',
  fallbackReverseMs: 240,
  sexToggleMs: 200,
} as const;

// Brief 60 F1→F3 window: enter + crossfade + settle = 800ms.
// Half-morph (280ms) overlaps the 420ms crossfade and does not add.
export function brief60F1ToF3Ms(): number {
  return (
    FORMAVISION_MOTION_SPEC.enterPlateMs +
    FORMAVISION_MOTION_SPEC.ready3dMs +
    FORMAVISION_MOTION_SPEC.settleMs
  );
}

export const BRIEF_60_F1_TO_F3_TOLERANCE_MS = 40;

export type FloorPlateView = 'front' | 'rear';

export function defaultFloorView(): FloorPlateView {
  // Brief 58 hero camera is rear ¾. Scrub/orbit is not a floor view control.
  return 'rear';
}

export type Floor3dPhase = 'floor' | 'to3d' | 'toFloor';

export interface Floor3dCrossfadeInput {
  liveCanvasHasPainted: boolean;
  recovering: boolean;
  fellBack: boolean;
  reducedMotion?: boolean;
  hasReadyScanData?: boolean;
  presentReadyWithoutPaint?: boolean;
}

export interface Floor3dCrossfade {
  floorOpacity: number;
  morph3d: number;
  durationMs: number;
  easing: string;
  phase: Floor3dPhase;
}

export function resolveFloor3dCrossfade(
  input: Floor3dCrossfadeInput,
): Floor3dCrossfade {
  // Hide a broken / recovering canvas only when there is no Ready scan.
  // Ready + BF/girths must keep morph3d compositable — opacity:0 on the
  // r3f mount deadlocks first-paint on phone WebKit (#182/#183/#184).
  // Gary 2026-09-03: Ready never paints a covering floor, even before
  // useFrame reports. present-ready-mesh lifts the shroud without
  // stamping canvasHasPainted.
  if (input.hasReadyScanData || input.presentReadyWithoutPaint) {
    return {
      floorOpacity: 0,
      morph3d: 1,
      durationMs: input.reducedMotion
        ? FORMAVISION_MOTION_SPEC.floorPaintMs
        : FORMAVISION_MOTION_SPEC.ready3dMs,
      easing: FORMAVISION_MOTION_SPEC.ready3dEasing,
      phase: 'to3d',
    };
  }
  if (input.fellBack || input.recovering) {
    return {
      floorOpacity: 1,
      morph3d: 0,
      durationMs:
        input.reducedMotion
          ? FORMAVISION_MOTION_SPEC.floorPaintMs
          : FORMAVISION_MOTION_SPEC.fallbackReverseMs,
      easing: 'ease-out',
      phase: 'toFloor',
    };
  }
  if (!input.liveCanvasHasPainted) {
    return {
      floorOpacity: 1,
      morph3d: 1,
      durationMs: FORMAVISION_MOTION_SPEC.floorPaintMs,
      easing: 'ease-out',
      phase: 'floor',
    };
  }
  return {
    floorOpacity: 0,
    morph3d: 1,
    durationMs: input.reducedMotion
      ? FORMAVISION_MOTION_SPEC.floorPaintMs
      : FORMAVISION_MOTION_SPEC.ready3dMs,
    easing: FORMAVISION_MOTION_SPEC.ready3dEasing,
    phase: 'to3d',
  };
}

export function floorMotionTransition(
  durationMs: number,
  easing: string,
): string | undefined {
  if (durationMs <= 0) return undefined;
  return `opacity ${durationMs}ms ${easing}`;
}
