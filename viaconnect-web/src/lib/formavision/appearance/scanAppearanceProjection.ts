// Typed appearance boundary for the FormaVision 3D avatar.
//
// Architecture: four views + available measurements -> fitted parametric
// human mesh -> shape morphs -> appearance/texture projection where
// technically available -> real-time rotatable WebGL avatar.
//
// What exists today and may drive the mesh:
//   sex, estimated BF range, optional WHR, overlay/measured girths, and
//   BF-derived estimate girths (explicit, never silently invented inside
//   scanToParamVector).
//
// What does NOT exist today:
//   a server-side appearance / photogrammetry model that can project the
//   four uploaded photos onto the mesh as a personalized texture.
//   Pose landmarks are capture-QA only and are not a morph driver.
//
// Do not fake a personalized texture. The live material stays the
// scan-derived procedural plasma-teal cell-grain already owned by
// bodyWireframeMaterial.

export const SCAN_APPEARANCE_MODES = ['procedural', 'photo_projection'] as const;
export type ScanAppearanceMode = (typeof SCAN_APPEARANCE_MODES)[number];

export const PHOTO_PROJECTION_BLOCKER = 'missing_backend_appearance_model' as const;
export type PhotoProjectionBlocker = typeof PHOTO_PROJECTION_BLOCKER;

export const PHOTO_PROJECTION_REQUIRED_INPUTS = [
  'front',
  'right',
  'back',
  'left',
] as const;

export interface PhotoProjectionState {
  available: false;
  reason: PhotoProjectionBlocker;
  requiredInputs: readonly typeof PHOTO_PROJECTION_REQUIRED_INPUTS[number][];
  nextDependency: string;
}

export interface ScanAppearanceProjection {
  mode: Extract<ScanAppearanceMode, 'procedural'>;
  photoProjection: PhotoProjectionState;
}

export const PHOTO_PROJECTION_NEXT_DEPENDENCY =
  'Server-side appearance model that consumes the four persisted scan views and returns mesh UVs / albedo. Not shipped. Until then the avatar uses the procedural plasma-teal material.';

export function resolveScanAppearanceProjection(): ScanAppearanceProjection {
  return {
    mode: 'procedural',
    photoProjection: {
      available: false,
      reason: PHOTO_PROJECTION_BLOCKER,
      requiredInputs: PHOTO_PROJECTION_REQUIRED_INPUTS,
      nextDependency: PHOTO_PROJECTION_NEXT_DEPENDENCY,
    },
  };
}
