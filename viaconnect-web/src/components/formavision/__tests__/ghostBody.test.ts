// Tests for the pure ghost-body seam (Prompt 210b, P5-T1b).
//
// The GhostMesh component is a thin GPU binding (no DOM, no effects in the node
// runner), so the contract is proven here on the pure, react-free seam it is built
// from, mirroring how mountBodyGeometry is unit tested without a GPU:
//   - shouldRenderGhost: the gate. The ghost renders ONLY when explicitly enabled
//     AND a projected vector is present; a null/absent vector renders nothing (no
//     fabricated body). The default props are the ghost-off floor.
//   - mountGhostBody: the ghost is the SAME parametric body (identical topology),
//     just dimmer, and disposes cleanly with no leak.
//   - the current body material is UNAFFECTED by the ghost treatment (the dimming is
//     mount-time options only), so the ghost-off render path stays byte-identical.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import {
  makeBodyWireframeMaterial,
  BODY_WIREFRAME_DEFAULTS,
} from '@/lib/formavision/materials/bodyWireframeMaterial';
import type { BodyParamVector, Sex } from '@/lib/formavision/geometry/types';
import { mountBodyGeometry } from '../mountBodyGeometry';
import { shouldRenderGhost, mountGhostBody, GHOST_MATERIAL_OPTIONS } from '../ghostBody';

function neutralParam(sex: Sex = 'male'): BodyParamVector {
  // scan null + circumferences null -> the sex template fills every ring.
  return scanToParamVector({ snapshot: null, circumferences: null, sex });
}

describe('shouldRenderGhost (the ghost gate)', () => {
  const vec = neutralParam();

  it('renders only when showGhost is true AND a vector is present', () => {
    expect(shouldRenderGhost(true, vec)).toBe(true);
  });

  it('renders nothing when showGhost is false or undefined, regardless of vector', () => {
    expect(shouldRenderGhost(false, vec)).toBe(false);
    expect(shouldRenderGhost(undefined, vec)).toBe(false);
  });

  it('renders nothing when the vector is null or undefined (never fabricates)', () => {
    expect(shouldRenderGhost(true, null)).toBe(false);
    expect(shouldRenderGhost(true, undefined)).toBe(false);
  });

  it('is off for the default props (the ghost-off floor)', () => {
    expect(shouldRenderGhost(undefined, undefined)).toBe(false);
  });
});

describe('mountGhostBody (the projected ghost body)', () => {
  it('builds the SAME topology as the current body for the same vector and build', () => {
    const vec = neutralParam('female');
    const build = { radialSegments: 28, verticalSegments: 28 };
    const body = mountBodyGeometry(vec, { build });
    const ghost = mountGhostBody(vec, build);
    // Same geometry builder + same build options -> identical vertex count (topology).
    expect(ghost.geometry.getAttribute('position').count).toBe(
      body.geometry.getAttribute('position').count,
    );
    // The wireframe contract holds for the ghost too (non-indexed + barycentric).
    expect(ghost.geometry.index).toBeNull();
    expect(ghost.geometry.getAttribute('aBary')).toBeTruthy();
    body.dispose();
    ghost.dispose();
  });

  it('reads as a dimmer secondary body but stays additive + transparent', () => {
    const ghost = mountGhostBody(neutralParam());
    const def = makeBodyWireframeMaterial(); // the current-body defaults
    const ghostFill = ghost.materialHandle.uniforms.uFillOpacity.value as number;
    const ghostLine = ghost.materialHandle.uniforms.uLineIntensity.value as number;
    const defFill = def.uniforms.uFillOpacity.value as number;
    const defLine = def.uniforms.uLineIntensity.value as number;
    // The ghost is secondary: lower fill opacity and dimmer lines than the solid body.
    expect(ghostFill).toBeLessThan(defFill);
    expect(ghostLine).toBeLessThan(defLine);
    // Additive-safe: the ghost material keeps the same transparent + additive blend.
    expect(ghost.materialHandle.material.transparent).toBe(true);
    expect(ghost.materialHandle.material.blending).toBe(THREE.AdditiveBlending);
    expect(ghost.materialHandle.material.depthWrite).toBe(false);
    ghost.dispose();
    def.dispose();
  });

  it('actually disposes geometry and material (no leak on hide or unmount)', () => {
    const ghost = mountGhostBody(neutralParam());
    // Prove real disposal, not just no-throw. three.js (r184) does not expose a
    // `disposed` flag on BufferGeometry or Material; both only dispatch a 'dispose'
    // event from dispose(). This listens for it (the same proof bodyWireframeMaterial
    // uses for its texture), so the assertion verifies the resource was freed.
    let geometryDisposed = false;
    let materialDisposed = false;
    ghost.geometry.addEventListener('dispose', () => {
      geometryDisposed = true;
    });
    ghost.materialHandle.material.addEventListener('dispose', () => {
      materialDisposed = true;
    });
    expect(() => ghost.dispose()).not.toThrow();
    expect(geometryDisposed).toBe(true);
    expect(materialDisposed).toBe(true);
  });
});

describe('the current body material is unaffected by the ghost treatment', () => {
  it('keeps the default material at the current-body opacity and intensity', () => {
    // The ghost dims via mount-time options only; the default material (no options)
    // stays on the live body knobs (Brief 58 Phase 1 plasma defaults).
    const def = makeBodyWireframeMaterial();
    expect(def.uniforms.uFillOpacity.value).toBe(BODY_WIREFRAME_DEFAULTS.fillOpacity);
    expect(def.uniforms.uLineIntensity.value).toBe(BODY_WIREFRAME_DEFAULTS.lineIntensity);
    expect(def.uniforms.uRimIntensity.value).toBe(BODY_WIREFRAME_DEFAULTS.rimIntensity);
    expect(def.material.transparent).toBe(true);
    expect(def.material.blending).toBe(THREE.AdditiveBlending);
    def.dispose();
  });

  it('uses ghost options that are strictly dimmer than the body defaults', () => {
    // The dimming is real (every knob is below the body default) and lives in one
    // cleanly swappable place.
    expect(GHOST_MATERIAL_OPTIONS.fillOpacity).toBeLessThan(BODY_WIREFRAME_DEFAULTS.fillOpacity);
    expect(GHOST_MATERIAL_OPTIONS.lineIntensity).toBeLessThan(BODY_WIREFRAME_DEFAULTS.lineIntensity);
    expect(GHOST_MATERIAL_OPTIONS.rimIntensity).toBeLessThan(BODY_WIREFRAME_DEFAULTS.rimIntensity);
  });
});
