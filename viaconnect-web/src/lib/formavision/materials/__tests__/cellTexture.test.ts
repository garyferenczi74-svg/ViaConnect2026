import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { makeCellTexture } from '../cellTexture';

describe('makeCellTexture', () => {
  it('returns a THREE.DataTexture at the default 64x64 size', () => {
    const tex = makeCellTexture();
    expect(tex).toBeInstanceOf(THREE.DataTexture);
    expect(tex.image.width).toBe(64);
    expect(tex.image.height).toBe(64);
    tex.dispose();
  });

  it('honors a custom size', () => {
    const tex = makeCellTexture({ size: 32 });
    expect(tex.image.width).toBe(32);
    expect(tex.image.height).toBe(32);
    tex.dispose();
  });

  it('uses RepeatWrapping so the grain tiles', () => {
    const tex = makeCellTexture();
    expect(tex.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex.wrapT).toBe(THREE.RepeatWrapping);
    tex.dispose();
  });

  it('packs RGBA byte data of the expected length', () => {
    const tex = makeCellTexture({ size: 16 });
    const data = tex.image.data as Uint8Array;
    expect(data.length).toBe(16 * 16 * 4);
    tex.dispose();
  });

  it('produces a non-uniform grain (a bright center and dark edges exist)', () => {
    const tex = makeCellTexture({ size: 16, cells: 2 });
    const data = tex.image.data as Uint8Array;
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
    expect(max).toBeGreaterThan(min);
    tex.dispose();
  });

  it('dispose() does not throw', () => {
    const tex = makeCellTexture();
    expect(() => tex.dispose()).not.toThrow();
  });
});
