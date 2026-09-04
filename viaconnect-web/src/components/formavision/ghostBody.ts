// Pure ghost-body wiring for FormaVision (Prompt 210b, P5-T1b).
//
// Phase 5 "Projected Future Self" shows a translucent GHOST of the user's projected
// body beside or over the solid current avatar. The ghost is the SAME parametric
// body the current avatar uses (mountBodyGeometry, identical topology), built from
// the projected BodyParamVector produced by projectFutureSelfVector (P5-T1a) and
// dimmed so the solid current body still reads as primary.
//
// This module is the pure, react-free seam so the gate and the ghost material
// treatment can be unit tested in the node runner, exactly as mountBodyGeometry is
// (the GPU never has to run to prove the wiring is correct). The thin GPU binding
// lives in GhostMesh.tsx.

import type { BuildOptions } from '@/lib/formavision/geometry/buildBodyGeometry';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import type { BodyWireframeOptions } from '@/lib/formavision/materials/bodyWireframeMaterial';
import { mountBodyGeometry, type MountedBody } from './mountBodyGeometry';

// The ghost gate. Render the ghost ONLY when it is explicitly enabled AND a projected
// vector is present. A null or absent vector renders nothing: the ghost is a pure
// projection of passed-in data and never fabricates a body. The default props
// (showGhost undefined, ghostVector undefined) are the ghost-off floor.
export function shouldRenderGhost(
  showGhost: boolean | undefined,
  ghostVector: BodyParamVector | null | undefined,
): boolean {
  return showGhost === true && ghostVector != null;
}

// Ghost material treatment: the SAME teal-on-navy wireframe material as the current
// body, only dimmer, so the solid avatar stays primary and the ghost reads as a faint
// "where you're heading" overlay. These are the existing material options
// (fillOpacity / lineIntensity / rimIntensity), so there is NO new color, NO new
// uniform, and the material itself is untouched (it stays additive + transparent for
// any value of these knobs). Kept here as the single, cleanly swappable place to tune
// the ghost look for the Gary localhost eyeball pass.
export const GHOST_MATERIAL_OPTIONS: BodyWireframeOptions = {
  // Far fainter fill than the Phase 1 body default so the solid avatar shows through.
  fillOpacity: 0.18,
  // Dimmer wireframe than the Phase 1 body default so the ghost lines read as secondary.
  lineIntensity: 0.85,
  // Softer silhouette rim than the Phase 1 body default.
  rimIntensity: 0.7,
};

// Build the ghost body from the projected vector using the SAME geometry builder and
// the SAME build options as the current body, so the ghost is identical topology (one
// mesh that overlays cleanly), just the projected shape, wearing the dimmed ghost
// material. The returned handle owns its disposables (the mountBodyGeometry contract);
// the caller disposes it on hide and on unmount.
export function mountGhostBody(
  ghostVector: BodyParamVector,
  buildOptions?: BuildOptions,
): MountedBody {
  return mountBodyGeometry(ghostVector, {
    build: buildOptions,
    look: 'wireframe',
    material: GHOST_MATERIAL_OPTIONS,
  });
}
