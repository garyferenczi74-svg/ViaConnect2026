import {
  BODY_HOLOGRAPHIC_F3_DEFAULTS,
  HOLOGRAPHIC_F3_LINE_HEX,
  isHolographicFillInRange,
} from '@/lib/formavision/materials/bodyHolographicMaterial';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';

// F3 brand overlay on the live Meshy GLB (real topology), not a screen-space
// shard grid and not an opaque solid as the Ready stamp.

export const F3_OVERLAY_FILL_HEX = FORMA_VISION_HEX.navy;
export const F3_OVERLAY_LINE_HEX = HOLOGRAPHIC_F3_LINE_HEX;
export const F3_OVERLAY_FILL_OPACITY = BODY_HOLOGRAPHIC_F3_DEFAULTS.fillOpacity;

export interface ModelViewerPbr {
  setBaseColorFactor(factor: readonly [number, number, number, number]): void;
  setMetallicFactor(value: number): void;
  setRoughnessFactor(value: number): void;
}

export interface ModelViewerMaterial {
  pbrMetallicRoughness?: ModelViewerPbr;
  setEmissiveFactor?(factor: readonly [number, number, number]): void;
  setAlphaMode?(mode: 'OPAQUE' | 'MASK' | 'BLEND'): void;
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
  if (!isHolographicFillInRange(F3_OVERLAY_FILL_OPACITY)) return 0;

  const [fr, fg, fb] = hexToRgbUnit(F3_OVERLAY_FILL_HEX);
  const [er, eg, eb] = hexToRgbUnit(F3_OVERLAY_LINE_HEX);
  let applied = 0;

  for (const material of model.materials) {
    const pbr = material.pbrMetallicRoughness;
    if (!pbr) continue;
    pbr.setBaseColorFactor([fr, fg, fb, F3_OVERLAY_FILL_OPACITY]);
    pbr.setMetallicFactor(0.12);
    pbr.setRoughnessFactor(0.38);
    material.setAlphaMode?.('BLEND');
    material.setDoubleSided?.(false);
    material.setEmissiveFactor?.([er * 0.38, eg * 0.38, eb * 0.38]);
    applied += 1;
  }

  return applied;
}
