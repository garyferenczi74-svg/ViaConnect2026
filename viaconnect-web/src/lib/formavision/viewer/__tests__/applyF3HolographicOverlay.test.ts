import { describe, expect, it } from 'vitest';
import {
  F3_OVERLAY_FILL_OPACITY,
  applyF3HolographicOverlay,
  hexToRgbUnit,
  type ModelViewerMaterial,
} from '../applyF3HolographicOverlay';
import { isHolographicFillInRange } from '@/lib/formavision/materials/bodyHolographicMaterial';

function fakeMaterial(): ModelViewerMaterial & {
  base: number[] | null;
  emissive: number[] | null;
  alpha: string | null;
  doubleSided: boolean | null;
} {
  const state = {
    base: null as number[] | null,
    emissive: null as number[] | null,
    alpha: null as string | null,
    doubleSided: null as boolean | null,
    pbrMetallicRoughness: {
      setBaseColorFactor(factor: readonly [number, number, number, number]) {
        state.base = [...factor];
      },
      setMetallicFactor() {
        return;
      },
      setRoughnessFactor() {
        return;
      },
    },
    setEmissiveFactor(factor: readonly [number, number, number]) {
      state.emissive = [...factor];
    },
    setAlphaMode(mode: 'OPAQUE' | 'MASK' | 'BLEND') {
      state.alpha = mode;
    },
    setDoubleSided(value: boolean) {
      state.doubleSided = value;
    },
  };
  return state;
}

describe('applyF3HolographicOverlay', () => {
  it('tints live mesh materials navy+cyan on topology, not a shard field', () => {
    const material = fakeMaterial();
    expect(applyF3HolographicOverlay({ materials: [material] })).toBe(1);
    expect(material.base).not.toBeNull();
    expect(material.base?.[3]).toBe(F3_OVERLAY_FILL_OPACITY);
    expect(isHolographicFillInRange(material.base?.[3] ?? 0)).toBe(true);
    expect(material.alpha).toBe('BLEND');
    expect(material.doubleSided).toBe(false);
    expect(material.emissive).not.toBeNull();
    const cyan = hexToRgbUnit('#2EE6D6');
    expect(material.emissive?.[1]).toBeGreaterThan(material.emissive?.[0] ?? 1);
    expect(material.emissive?.[1]).toBeCloseTo(cyan[1] * 0.38, 5);
    expect(JSON.stringify(material.base)).not.toMatch(/0\.9[0-9].*0\.1[0-9].*0\.9/);
  });

  it('no-ops without materials so Ready can keep the honest notice', () => {
    expect(applyF3HolographicOverlay(null)).toBe(0);
    expect(applyF3HolographicOverlay({ materials: [] })).toBe(0);
  });
});
