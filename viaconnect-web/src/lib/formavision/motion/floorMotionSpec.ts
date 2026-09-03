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
  ready3dMs: 420,
  ready3dEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  settleMs: 200,
  fallbackReverseMs: 240,
  sexToggleMs: 200,
} as const;

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
  const showFloor =
    !input.liveCanvasHasPainted || input.recovering || input.fellBack;
  if (showFloor) {
    const reversing = input.recovering || input.fellBack;
    const durationMs =
      input.reducedMotion || !reversing
        ? FORMAVISION_MOTION_SPEC.floorPaintMs
        : FORMAVISION_MOTION_SPEC.fallbackReverseMs;
    return {
      floorOpacity: 1,
      morph3d: 0,
      durationMs,
      easing: 'ease-out',
      phase: reversing ? 'toFloor' : 'floor',
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
