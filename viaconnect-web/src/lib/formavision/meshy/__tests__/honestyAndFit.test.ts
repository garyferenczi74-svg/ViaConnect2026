import { describe, expect, it } from 'vitest';
import { computeFitTransform, resolveVisualHeightM } from '../fitGlbToHeight';
import { MESHY_VISUAL_DISCLAIMER, meshyStatusLabel } from '../honestyCopy';
import { buildMeshyCreateBody } from '../meshyClient';

describe('honesty copy', () => {
  it('states the GLB is not a measurement-grade scan', () => {
    expect(MESHY_VISUAL_DISCLAIMER.toLowerCase()).toContain('not a measurement-grade');
    expect(meshyStatusLabel('succeeded')).toBe(MESHY_VISUAL_DISCLAIMER);
    expect(meshyStatusLabel('skipped_no_key')).toBeNull();
  });
});

describe('visual framing', () => {
  it('uses session height when already present, otherwise a display default', () => {
    expect(resolveVisualHeightM(180)).toBe(1.8);
    expect(resolveVisualHeightM(null)).toBe(1.75);
  });

  it('puts feet on y=0 after fit', () => {
    const fit = computeFitTransform(
      { min: [-1, 2, -1], max: [1, 4, 1] },
      1.75,
    );
    expect(fit.scale).toBeCloseTo(0.875);
    expect(fit.position[1]).toBeCloseTo(-1.75);
  });
});

describe('Meshy create knobs', () => {
  it('remeshes to a phone-loadable polycount with 2k texture and no ultra', () => {
    const body = buildMeshyCreateBody(['https://img/front.jpg']);
    expect(body.should_remesh).toBe(true);
    expect(body.target_polycount).toBe(20_000);
    expect(body.texture_resolution).toBe('2k');
    expect(body.ultra_mode).toBe(false);
    expect(body.enable_pbr).toBe(false);
    expect(body.target_formats).toEqual(['glb']);
    expect(body.pose_mode).toBe('a-pose');
    expect(body.ai_model).toBe('meshy-7');
  });
});
