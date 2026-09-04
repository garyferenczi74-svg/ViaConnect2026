import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BODY_SOLID_DEFAULTS,
  isPicassoWireframeDrawMode,
  isSolidHumanDrawMode,
  makeBodySolidMaterial,
} from '../bodySolidMaterial';
import { makeBodyWireframeMaterial } from '../bodyWireframeMaterial';
import { FORMA_VISION_HEX } from '../formaVisionTokens';

describe('makeBodySolidMaterial', () => {
  it('is a lit solid MeshStandardMaterial, not additive wireframe', () => {
    const solid = makeBodySolidMaterial();
    expect(solid.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(isSolidHumanDrawMode(solid.material)).toBe(true);
    expect(isPicassoWireframeDrawMode(solid.material)).toBe(false);
    expect(solid.material.wireframe).toBe(false);
    expect(solid.material.blending).toBe(THREE.NormalBlending);
    expect(solid.material.side).toBe(THREE.FrontSide);
    expect(solid.material.depthWrite).toBe(true);
    expect(solid.uniforms.uLineIntensity.value).toBe(BODY_SOLID_DEFAULTS.lineIntensity);
    expect(solid.uniforms.uFillOpacity.value).toBe(1);
    expect(solid.uniforms.uMorph.value).toBe(1);
    solid.dispose();
  });

  it('does not use ZOZO purple and stays in the teal/navy family', () => {
    const solid = makeBodySolidMaterial();
    const hex = `#${(solid.material as THREE.MeshStandardMaterial).color.getHexString()}`;
    expect(hex.toLowerCase()).not.toContain('6d597a');
    expect(hex.toLowerCase()).not.toContain('8b5cf6');
    const teal = new THREE.Color(FORMA_VISION_HEX.teal);
    const card = new THREE.Color(FORMA_VISION_HEX.card);
    expect(solid.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    const color = (solid.material as THREE.MeshStandardMaterial).color;
    expect(color.getHex()).not.toBe(0);
    expect(teal.getHex()).toBe(new THREE.Color('#2da5a0').getHex());
    expect(card.getHex()).toBe(new THREE.Color('#1e3054').getHex());
    solid.dispose();
  });

  it('keeps the wipe / highlight setter surface without throwing', () => {
    const solid = makeBodySolidMaterial();
    solid.setWipe(2, 0.4, 390);
    expect(solid.uniforms.uWipeMode.value).toBe(2);
    expect(solid.uniforms.uWipeT.value).toBe(0.4);
    solid.setHighlight(0.5, 0.8);
    expect(solid.uniforms.uHighlightIntensity.value).toBe(0.8);
    solid.setMorph(0);
    expect(solid.uniforms.uMorph.value).toBe(0);
    solid.setOverlayMix(1);
    expect(solid.uniforms.uOverlayMix.value).toBe(1);
    solid.dispose();
  });

  it('classifies the legacy additive wireframe as Picasso draw mode', () => {
    const wire = makeBodyWireframeMaterial();
    expect(isPicassoWireframeDrawMode(wire.material)).toBe(true);
    expect(isSolidHumanDrawMode(wire.material)).toBe(false);
    wire.dispose();
  });
});
