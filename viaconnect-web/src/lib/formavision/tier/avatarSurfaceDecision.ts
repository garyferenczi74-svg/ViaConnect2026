// Pure mount-vs-fallback decision for the FormaVision avatar plate.
//
// Production #172 smoke (www dpl_5bQNe1UubnBbKb6uwGEBd48n4gR6) rendered the
// SegmentalHeatMap Male Avatar.svg (250x400) with zero canvas. The old path
// treated hasWebGL() === false as a hard, sticky floor. That probe is false on
// SSR (no document) and is a known false-negative on iOS Safari / some Chrome
// flags (webgl2-null poisons webgl1 on the same canvas). A single false then
// latched BodyCompositionAvatar.fellBack for the session, so the 3D morph never
// painted.
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
}

export function selectAvatarSurface(input: AvatarSurfaceDecisionInput): AvatarSurface {
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
