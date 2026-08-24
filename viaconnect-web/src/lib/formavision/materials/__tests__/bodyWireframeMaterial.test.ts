import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  makeBodyWireframeMaterial,
  addBarycentricAttribute,
} from '../bodyWireframeMaterial';
import { makeCellTexture } from '../cellTexture';
import { FORMA_VISION_HEX } from '../formaVisionTokens';

describe('makeBodyWireframeMaterial', () => {
  it('returns a THREE.ShaderMaterial', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.material).toBeInstanceOf(THREE.ShaderMaterial);
    m.dispose();
  });

  it('exposes the teal, navy and card token colors as uniforms', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.uniforms.uTeal.value).toBeInstanceOf(THREE.Color);
    expect(m.uniforms.uTeal.value.getHexString()).toBe(
      new THREE.Color(FORMA_VISION_HEX.teal).getHexString(),
    );
    expect(m.uniforms.uNavy.value.getHexString()).toBe(
      new THREE.Color(FORMA_VISION_HEX.navy).getHexString(),
    );
    expect(m.uniforms.uCard.value.getHexString()).toBe(
      new THREE.Color(FORMA_VISION_HEX.card).getHexString(),
    );
    m.dispose();
  });

  it('exposes a uScanY uniform that starts hidden (outside 0..1)', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.uniforms.uScanY).toBeDefined();
    expect(m.uniforms.uScanY.value).toBeLessThan(0);
    m.dispose();
  });

  it('exposes a uMorph uniform that starts fully revealed', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.uniforms.uMorph).toBeDefined();
    expect(m.uniforms.uMorph.value).toBe(1);
    m.dispose();
  });

  it('setScan(0.5) updates uScanY to 0.5', () => {
    const m = makeBodyWireframeMaterial();
    m.setScan(0.5);
    expect(m.uniforms.uScanY.value).toBe(0.5);
    m.dispose();
  });

  it('setMorph clamps to 0..1', () => {
    const m = makeBodyWireframeMaterial();
    m.setMorph(0.3);
    expect(m.uniforms.uMorph.value).toBe(0.3);
    m.setMorph(5);
    expect(m.uniforms.uMorph.value).toBe(1);
    m.setMorph(-2);
    expect(m.uniforms.uMorph.value).toBe(0);
    m.dispose();
  });

  it('exposes a selected-region highlight that starts cleared (off)', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.uniforms.uHighlightY).toBeDefined();
    expect(m.uniforms.uHighlightY.value).toBeLessThan(0);
    expect(m.uniforms.uHighlightIntensity).toBeDefined();
    expect(m.uniforms.uHighlightIntensity.value).toBe(0);
    expect(m.uniforms.uHighlightRange).toBeDefined();
    expect(m.uniforms.uHighlightRange.value).toBeGreaterThan(0);
    m.dispose();
  });

  it('setHighlight sets the level, intensity and optional range', () => {
    const m = makeBodyWireframeMaterial();
    m.setHighlight(0.72, 0.4);
    expect(m.uniforms.uHighlightY.value).toBe(0.72);
    expect(m.uniforms.uHighlightIntensity.value).toBe(0.4);
    // Range is left at its default when not passed.
    expect(m.uniforms.uHighlightRange.value).toBeGreaterThan(0);
    m.setHighlight(0.5, 0.6, 0.1);
    expect(m.uniforms.uHighlightRange.value).toBe(0.1);
    m.dispose();
  });

  it('setHighlight clamps a negative intensity to zero and clears off-band', () => {
    const m = makeBodyWireframeMaterial();
    m.setHighlight(-1, -3);
    expect(m.uniforms.uHighlightY.value).toBe(-1);
    expect(m.uniforms.uHighlightIntensity.value).toBe(0);
    m.dispose();
  });

  it('exposes a 5-entry segment tint array and overlay mix with safe defaults', () => {
    const m = makeBodyWireframeMaterial();
    expect(Array.isArray(m.uniforms.uSegmentTint.value)).toBe(true);
    expect(m.uniforms.uSegmentTint.value).toHaveLength(5);
    // Default tints are neutral navy so the overlay shows nothing.
    const navy = new THREE.Color(FORMA_VISION_HEX.navy).getHexString();
    for (const c of m.uniforms.uSegmentTint.value as THREE.Color[]) {
      expect(c.getHexString()).toBe(navy);
    }
    // Overlay off by default: the wireframe is pure teal (look unchanged at mix 0).
    expect(m.uniforms.uOverlayMix.value).toBe(0);
    m.dispose();
  });

  it('setSegmentTints copies the colors and falls back to neutral for null entries', () => {
    const m = makeBodyWireframeMaterial();
    const red = new THREE.Color('#ff0000');
    const green = new THREE.Color('#00ff00');
    // Provide only two tints; the remaining three fall back to neutral navy.
    m.setSegmentTints([red, green]);
    const tints = m.uniforms.uSegmentTint.value as THREE.Color[];
    expect(tints[0].getHexString()).toBe('ff0000');
    expect(tints[1].getHexString()).toBe('00ff00');
    const navy = new THREE.Color(FORMA_VISION_HEX.navy).getHexString();
    expect(tints[2].getHexString()).toBe(navy);
    expect(tints[4].getHexString()).toBe(navy);
    m.dispose();
  });

  it('setOverlayMix clamps to 0..1', () => {
    const m = makeBodyWireframeMaterial();
    m.setOverlayMix(0.4);
    expect(m.uniforms.uOverlayMix.value).toBe(0.4);
    m.setOverlayMix(5);
    expect(m.uniforms.uOverlayMix.value).toBe(1);
    m.setOverlayMix(-2);
    expect(m.uniforms.uOverlayMix.value).toBe(0);
    m.dispose();
  });

  it('A/B wipe uniforms default off so the current-body path is unchanged', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.uniforms.uWipeMode.value).toBe(0);
    expect(m.uniforms.uWipeT.value).toBe(0.5);
    expect(m.uniforms.uViewportWidth.value).toBe(1);
    m.dispose();
  });

  it('setWipe writes mode, clamped t, and a minimum viewport width of 1', () => {
    const m = makeBodyWireframeMaterial();
    m.setWipe(1, 0.25, 390);
    expect(m.uniforms.uWipeMode.value).toBe(1);
    expect(m.uniforms.uWipeT.value).toBe(0.25);
    expect(m.uniforms.uViewportWidth.value).toBe(390);
    m.setWipe(2, 4, 0);
    expect(m.uniforms.uWipeMode.value).toBe(2);
    expect(m.uniforms.uWipeT.value).toBe(1);
    expect(m.uniforms.uViewportWidth.value).toBe(1);
    m.setWipe(0, Number.NaN, Number.NaN);
    expect(m.uniforms.uWipeMode.value).toBe(0);
    expect(m.uniforms.uWipeT.value).toBe(0.5);
    expect(m.uniforms.uViewportWidth.value).toBe(1);
    m.dispose();
  });

  it('fragment shader discards on the wipe split when mode is on', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.material.fragmentShader).toContain('uWipeMode');
    expect(m.material.fragmentShader).toContain('discard');
    m.dispose();
  });

  it('is configured for additive transparent emissive rendering', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.material.transparent).toBe(true);
    expect(m.material.depthWrite).toBe(false);
    expect(m.material.blending).toBe(THREE.AdditiveBlending);
    m.dispose();
  });

  it('owns and disposes its texture when none is supplied', () => {
    const m = makeBodyWireframeMaterial();
    expect(() => m.dispose()).not.toThrow();
  });

  it('does not dispose a caller-supplied texture', () => {
    const tex = makeCellTexture();
    let disposed = false;
    tex.addEventListener('dispose', () => {
      disposed = true;
    });
    const m = makeBodyWireframeMaterial({ cellTexture: tex });
    m.dispose();
    expect(disposed).toBe(false);
    tex.dispose();
  });

  it('fragment shader contains the fresnel rim term', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.material.fragmentShader).toContain('fresnel');
    expect(m.material.fragmentShader).toContain('edgeFactor');
    m.dispose();
  });

  it('fragment shader marks the bloom seam for a later postprocessing pass', () => {
    const m = makeBodyWireframeMaterial();
    expect(m.material.fragmentShader).toContain('BLOOM SEAM');
    m.dispose();
  });
});

describe('addBarycentricAttribute', () => {
  it('adds a 3-component aBary attribute matching the vertex count', () => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(9 * 3); // three triangles worth
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    addBarycentricAttribute(geo);
    const bary = geo.getAttribute('aBary');
    expect(bary.itemSize).toBe(3);
    expect(bary.count).toBe(9);
    // First triangle corners are the three unit barycentric vectors.
    expect([bary.getX(0), bary.getY(0), bary.getZ(0)]).toEqual([1, 0, 0]);
    expect([bary.getX(1), bary.getY(1), bary.getZ(1)]).toEqual([0, 1, 0]);
    expect([bary.getX(2), bary.getY(2), bary.getZ(2)]).toEqual([0, 0, 1]);
    geo.dispose();
  });
});
