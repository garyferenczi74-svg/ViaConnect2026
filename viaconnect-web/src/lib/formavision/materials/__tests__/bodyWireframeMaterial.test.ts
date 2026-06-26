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
