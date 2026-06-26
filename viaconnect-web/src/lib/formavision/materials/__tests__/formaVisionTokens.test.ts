import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  FORMA_VISION_HEX,
  FORMA_VISION_COLORS,
  makeTokenColor,
} from '../formaVisionTokens';

describe('formaVisionTokens', () => {
  it('locks the four brand hex values to the exact spec', () => {
    expect(FORMA_VISION_HEX.navy).toBe('#1A2744');
    expect(FORMA_VISION_HEX.card).toBe('#1E3054');
    expect(FORMA_VISION_HEX.teal).toBe('#2DA5A0');
    expect(FORMA_VISION_HEX.orange).toBe('#B75E18');
  });

  it('exposes exactly four tokens and no others', () => {
    expect(Object.keys(FORMA_VISION_HEX).sort()).toEqual([
      'card',
      'navy',
      'orange',
      'teal',
    ]);
  });

  it('provides THREE.Color instances for each token', () => {
    expect(FORMA_VISION_COLORS.navy).toBeInstanceOf(THREE.Color);
    expect(FORMA_VISION_COLORS.teal).toBeInstanceOf(THREE.Color);
    expect(FORMA_VISION_COLORS.orange).toBeInstanceOf(THREE.Color);
    expect(FORMA_VISION_COLORS.card).toBeInstanceOf(THREE.Color);
  });

  it('makeTokenColor returns a fresh Color equal to the hex token', () => {
    const a = makeTokenColor('teal');
    const b = makeTokenColor('teal');
    expect(a).toBeInstanceOf(THREE.Color);
    // Fresh object each call so materials never share a mutable color.
    expect(a).not.toBe(b);
    expect(a.getHexString()).toBe(new THREE.Color('#2DA5A0').getHexString());
  });

  it('teal color matches a THREE.Color built from the same hex', () => {
    expect(FORMA_VISION_COLORS.teal.getHexString()).toBe(
      new THREE.Color(FORMA_VISION_HEX.teal).getHexString(),
    );
  });
});
