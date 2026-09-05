// Brief 60 / Gary + Arnold lock: Ready settle is storyboard Frame 3 —
// a designed cyan holographic grid on real human topology.
//
// #188 makeBodySolidMaterial was the anti-shards stamp (opaque MeshStandard).
// That killed F3. This handle supersedes Ready success: continuous quad/tri
// barycentric grid (diagonals hidden), NormalBlending, FrontSide, depthWrite,
// dark translucent fill. Additive barycentric shards (makeBodyWireframeMaterial)
// remain Picasso — FAIL as Ready. Ghost overlays may still request those.

import * as THREE from 'three';
import {
  makeBodyWireframeMaterial,
  type BodyWireframeMaterial,
} from './bodyWireframeMaterial';

// Chrome lock — plasma teal/cyan family. Not a fourth brand token and not
// ZOZO purple. The four FORMA_VISION_HEX values stay untouched.
export const HOLOGRAPHIC_F3_LINE_HEX = '#2EE6D6';

export const FORMAVISION_HOLOGRAPHIC_F3_LOOK = 'holographic-f3' as const;

export const BODY_HOLOGRAPHIC_F3_DEFAULTS = {
  lineIntensity: 1.15,
  rimIntensity: 1.35,
  fillOpacity: 0.32,
  edgeWidth: 0.85,
  cellRepeat: 24,
} as const;

export const HOLOGRAPHIC_F3_FILL_OPACITY_MIN = 0.25;
export const HOLOGRAPHIC_F3_FILL_OPACITY_MAX = 0.4;

const FORBIDDEN_PURPLE_HEX = [
  '#6d597a',
  '#a78bfa',
  '#8b5cf6',
  '#7c3aed',
  '#9b59b6',
  '#b388ff',
] as const;

export function isHolographicF3DrawMode(material: THREE.Material): boolean {
  return (
    material instanceof THREE.ShaderMaterial &&
    material.wireframe === false &&
    material.blending === THREE.NormalBlending &&
    material.depthWrite === true &&
    material.side === THREE.FrontSide &&
    material.transparent === true &&
    material.userData.formavisionLook === FORMAVISION_HOLOGRAPHIC_F3_LOOK
  );
}

export function isChromeTealFamily(hex: string): boolean {
  const normalized = hex.trim().toLowerCase();
  if (FORBIDDEN_PURPLE_HEX.includes(normalized as (typeof FORBIDDEN_PURPLE_HEX)[number])) {
    return false;
  }
  return normalized === HOLOGRAPHIC_F3_LINE_HEX.toLowerCase() || normalized === '#2da5a0';
}

export function isHolographicFillInRange(opacity: number): boolean {
  return (
    Number.isFinite(opacity) &&
    opacity >= HOLOGRAPHIC_F3_FILL_OPACITY_MIN &&
    opacity <= HOLOGRAPHIC_F3_FILL_OPACITY_MAX
  );
}

export function makeBodyHolographicMaterial(): BodyWireframeMaterial {
  const handle = makeBodyWireframeMaterial({
    lineIntensity: BODY_HOLOGRAPHIC_F3_DEFAULTS.lineIntensity,
    rimIntensity: BODY_HOLOGRAPHIC_F3_DEFAULTS.rimIntensity,
    fillOpacity: BODY_HOLOGRAPHIC_F3_DEFAULTS.fillOpacity,
    edgeWidth: BODY_HOLOGRAPHIC_F3_DEFAULTS.edgeWidth,
    cellRepeat: BODY_HOLOGRAPHIC_F3_DEFAULTS.cellRepeat,
  });

  // Designed F3 volume: not additive shards, not THREE.wireframe fragments.
  handle.material.blending = THREE.NormalBlending;
  handle.material.side = THREE.FrontSide;
  handle.material.depthWrite = true;
  handle.material.depthTest = true;
  handle.material.transparent = true;
  handle.material.wireframe = false;
  handle.uniforms.uTeal.value = new THREE.Color(HOLOGRAPHIC_F3_LINE_HEX);
  handle.material.userData.formavisionLook = FORMAVISION_HOLOGRAPHIC_F3_LOOK;
  handle.material.customProgramCacheKey = () => 'formavision-holographic-f3';
  handle.material.needsUpdate = true;

  return handle;
}
