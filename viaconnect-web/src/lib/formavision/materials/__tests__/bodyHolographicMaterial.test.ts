import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BODY_HOLOGRAPHIC_F3_DEFAULTS,
  HOLOGRAPHIC_F3_LINE_HEX,
  isChromeTealFamily,
  isHolographicF3DrawMode,
  isHolographicFillInRange,
  makeBodyHolographicMaterial,
} from '../bodyHolographicMaterial';
import {
  isPicassoWireframeDrawMode,
  isSolidHumanDrawMode,
  makeBodySolidMaterial,
} from '../bodySolidMaterial';
import { makeBodyWireframeMaterial } from '../bodyWireframeMaterial';

describe('makeBodyHolographicMaterial', () => {
  it('is a designed continuous F3 grid, not additive Picasso or opaque solid', () => {
    const holo = makeBodyHolographicMaterial();
    expect(isHolographicF3DrawMode(holo.material)).toBe(true);
    expect(isPicassoWireframeDrawMode(holo.material)).toBe(false);
    expect(isSolidHumanDrawMode(holo.material)).toBe(false);
    expect(holo.material.wireframe).toBe(false);
    expect(holo.material.blending).toBe(THREE.NormalBlending);
    expect(holo.material.side).toBe(THREE.FrontSide);
    expect(holo.material.depthWrite).toBe(true);
    expect(holo.material.transparent).toBe(true);
    expect(holo.uniforms.uLineIntensity.value).toBe(BODY_HOLOGRAPHIC_F3_DEFAULTS.lineIntensity);
    expect(isHolographicFillInRange(holo.uniforms.uFillOpacity.value as number)).toBe(true);
    expect(holo.uniforms.uMorph.value).toBe(1);
    holo.dispose();
  });

  it('locks Chrome plasma teal and rejects ZOZO purple', () => {
    const holo = makeBodyHolographicMaterial();
    const hex = `#${(holo.uniforms.uTeal.value as THREE.Color).getHexString()}`;
    expect(hex.toLowerCase()).toBe(HOLOGRAPHIC_F3_LINE_HEX.toLowerCase());
    expect(isChromeTealFamily(hex)).toBe(true);
    expect(isChromeTealFamily('#6D597A')).toBe(false);
    expect(isChromeTealFamily('#8B5CF6')).toBe(false);
    holo.dispose();
  });

  it('does not classify solid or additive wireframe as F3', () => {
    const solid = makeBodySolidMaterial();
    const wire = makeBodyWireframeMaterial();
    expect(isHolographicF3DrawMode(solid.material)).toBe(false);
    expect(isHolographicF3DrawMode(wire.material)).toBe(false);
    expect(isPicassoWireframeDrawMode(wire.material)).toBe(true);
    solid.dispose();
    wire.dispose();
  });
});
