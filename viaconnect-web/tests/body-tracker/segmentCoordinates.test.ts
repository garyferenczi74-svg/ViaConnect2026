// Prompt #153 MT-05: coordinate sanity tests for the SVG-based
// Segmental Body Fat Analysis pill positions. These tests guard the
// trunk-stack-too-tight bug (the original failure mode) and the
// left/right-pair mirroring invariant.

import { describe, it, expect } from 'vitest';
import {
  COORDINATES_BY_SEX,
  MALE_COORDINATES,
  FEMALE_COORDINATES,
} from '@/lib/body-tracker/segmentCoordinates';
import {
  ALL_SEGMENTS,
  FIGURE_VIEWBOX,
  type SegmentId,
  type Sex,
} from '@/lib/body-tracker/segments';

const SEXES: readonly Sex[] = ['male', 'female'];

describe('segment coordinate maps', () => {
  it.each(SEXES)('%s map covers all 13 segments', (sex) => {
    const map = COORDINATES_BY_SEX[sex];
    for (const id of ALL_SEGMENTS) {
      expect(map[id], `${sex} map missing segment ${id}`).toBeDefined();
    }
  });

  it.each(SEXES)('%s coordinates fall inside viewBox', (sex) => {
    const map = COORDINATES_BY_SEX[sex];
    for (const id of ALL_SEGMENTS) {
      const c = map[id];
      const halfW = c.pillWidth / 2;
      const halfH = c.pillHeight / 2;
      expect(c.x - halfW, `${sex} ${id} clips off left edge`).toBeGreaterThanOrEqual(0);
      expect(c.x + halfW, `${sex} ${id} clips off right edge`).toBeLessThanOrEqual(FIGURE_VIEWBOX.width);
      expect(c.y - halfH, `${sex} ${id} clips off top edge`).toBeGreaterThanOrEqual(0);
      expect(c.y + halfH, `${sex} ${id} clips off bottom edge`).toBeLessThanOrEqual(FIGURE_VIEWBOX.height);
    }
  });

  it.each(SEXES)('%s left/right pairs are mirrored across centerline', (sex) => {
    const map = COORDINATES_BY_SEX[sex];
    const pairs: Array<[SegmentId, SegmentId]> = [
      ['left_upper_arm', 'right_upper_arm'],
      ['left_forearm',   'right_forearm'],
      ['left_thigh',     'right_thigh'],
      ['left_calf',      'right_calf'],
    ];
    const cx = FIGURE_VIEWBOX.width / 2;
    for (const [l, r] of pairs) {
      const dl = cx - map[l].x;
      const dr = map[r].x - cx;
      expect(Math.abs(dl - dr), `${sex} ${l}/${r} not mirrored across centerline`).toBeLessThan(1);
      expect(map[l].y, `${sex} ${l}/${r} y values diverge`).toBe(map[r].y);
    }
  });

  it.each(SEXES)('%s trunk pills are vertically separated by at least 36 units', (sex) => {
    const map = COORDINATES_BY_SEX[sex];
    const trunk: SegmentId[] = ['head', 'face', 'neck', 'chest', 'abdomen'];
    for (let i = 1; i < trunk.length; i++) {
      const delta = map[trunk[i]].y - map[trunk[i - 1]].y;
      expect(
        delta,
        `${sex} ${trunk[i - 1]} -> ${trunk[i]} delta of ${delta} is below the 36-unit floor`,
      ).toBeGreaterThanOrEqual(36);
    }
  });

  it('male and female centerline x is identical for trunk pills', () => {
    const trunk: SegmentId[] = ['head', 'face', 'neck', 'chest', 'abdomen'];
    for (const id of trunk) {
      expect(MALE_COORDINATES[id].x).toBe(FEMALE_COORDINATES[id].x);
    }
  });
});
