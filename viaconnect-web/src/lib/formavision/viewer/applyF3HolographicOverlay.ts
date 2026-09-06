import { HOLOGRAPHIC_F3_LINE_HEX } from '@/lib/formavision/materials/bodyHolographicMaterial';

// Brand overlay on the live Meshy mesh. Keep albedo/texture (the scan visual).
// Cyan emissive + sheen only. Do not stamp a navy solid. Do not additive-shard.

export const F3_OVERLAY_LINE_HEX = HOLOGRAPHIC_F3_LINE_HEX;
export const F3_EMISSIVE_SCALE = 0.28;
export const F3_METALLIC = 0.22;
export const F3_ROUGHNESS = 0.32;

export interface ModelViewerPbr {
  setMetallicFactor(value: number): void;
  setRoughnessFactor(value: number): void;
}

export interface ModelViewerMaterial {
  pbrMetallicRoughness?: ModelViewerPbr;
  setEmissiveFactor?(factor: readonly [number, number, number]): void;
  setDoubleSided?(value: boolean): void;
}

export interface ModelViewerModel {
  materials: ReadonlyArray<ModelViewerMaterial>;
}

export function hexToRgbUnit(hex: string): readonly [number, number, number] {
  const raw = hex.trim().replace('#', '');
  const n = Number.parseInt(raw, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function applyF3HolographicOverlay(
  model: ModelViewerModel | null | undefined,
): number {
  if (!model || model.materials.length === 0) return 0;

  const [er, eg, eb] = hexToRgbUnit(F3_OVERLAY_LINE_HEX);
  let applied = 0;

  for (const material of model.materials) {
    const pbr = material.pbrMetallicRoughness;
    if (!pbr) continue;
    pbr.setMetallicFactor(F3_METALLIC);
    pbr.setRoughnessFactor(F3_ROUGHNESS);
    material.setDoubleSided?.(false);
    material.setEmissiveFactor?.([
      er * F3_EMISSIVE_SCALE,
      eg * F3_EMISSIVE_SCALE,
      eb * F3_EMISSIVE_SCALE,
    ]);
    applied += 1;
  }

  return applied;
}
