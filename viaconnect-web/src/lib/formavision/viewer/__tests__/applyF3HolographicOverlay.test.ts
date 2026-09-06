import { describe, expect, it } from 'vitest';
import {
  F3_EMISSIVE_SCALE,
  F3_METALLIC,
  F3_ROUGHNESS,
  applyF3HolographicOverlay,
  hexToRgbUnit,
  type ModelViewerMaterial,
} from '../applyF3HolographicOverlay';

function fakeMaterial(): ModelViewerMaterial & {
  baseCalls: number;
  metallic: number | null;
  roughness: number | null;
  emissive: number[] | null;
  doubleSided: boolean | null;
} {
  const state = {
    baseCalls: 0,
    metallic: null as number | null,
    roughness: null as number | null,
    emissive: null as number[] | null,
    doubleSided: null as boolean | null,
    pbrMetallicRoughness: {
      setBaseColorFactor() {
        state.baseCalls += 1;
      },
      setMetallicFactor(value: number) {
        state.metallic = value;
      },
      setRoughnessFactor(value: number) {
        state.roughness = value;
      },
    },
    setEmissiveFactor(factor: readonly [number, number, number]) {
      state.emissive = [...factor];
    },
    setDoubleSided(value: boolean) {
      state.doubleSided = value;
    },
  };
  return state;
}

describe('applyF3HolographicOverlay', () => {
  it('adds cyan sheen on topology and never stamps a navy solid over Meshy albedo', () => {
    const material = fakeMaterial();
    expect(applyF3HolographicOverlay({ materials: [material] })).toBe(1);
    expect(material.baseCalls).toBe(0);
    expect(material.metallic).toBe(F3_METALLIC);
    expect(material.roughness).toBe(F3_ROUGHNESS);
    expect(material.doubleSided).toBe(false);
    const cyan = hexToRgbUnit('#2EE6D6');
    expect(material.emissive?.[1]).toBeCloseTo(cyan[1] * F3_EMISSIVE_SCALE, 5);
    expect(material.emissive?.[1]).toBeGreaterThan(material.emissive?.[0] ?? 1);
  });

  it('no-ops without materials so Ready can keep the honest notice', () => {
    expect(applyF3HolographicOverlay(null)).toBe(0);
    expect(applyF3HolographicOverlay({ materials: [] })).toBe(0);
  });
});
