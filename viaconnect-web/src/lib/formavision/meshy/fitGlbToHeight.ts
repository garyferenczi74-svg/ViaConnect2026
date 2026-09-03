export interface FitBox {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export interface FitTransform {
  scale: number;
  position: readonly [number, number, number];
}

export const DEFAULT_VISUAL_HEIGHT_M = 1.75;

/** Visual framing only. Does not invent a measured height from the mesh. */
export function resolveVisualHeightM(heightCm: number | null | undefined): number {
  if (typeof heightCm === 'number' && Number.isFinite(heightCm) && heightCm > 80 && heightCm < 250) {
    return heightCm / 100;
  }
  return DEFAULT_VISUAL_HEIGHT_M;
}

/**
 * Scale a Meshy GLB so it reads head-to-toe in the existing plate camera.
 * Origin after fit: feet on y = 0, xz centered. Not a metrology step.
 */
export function computeFitTransform(box: FitBox, targetHeightM: number): FitTransform {
  const width = box.max[0] - box.min[0];
  const height = box.max[1] - box.min[1];
  const depth = box.max[2] - box.min[2];
  const span = Math.max(width, height, depth, 0.001);
  const safeTarget = targetHeightM > 0.5 && targetHeightM < 2.5 ? targetHeightM : DEFAULT_VISUAL_HEIGHT_M;
  const scale = safeTarget / (height > 0.001 ? height : span);
  const centerX = (box.min[0] + box.max[0]) / 2;
  const minY = box.min[1];
  const centerZ = (box.min[2] + box.max[2]) / 2;
  return {
    scale,
    position: [-centerX * scale, -minY * scale, -centerZ * scale],
  };
}
