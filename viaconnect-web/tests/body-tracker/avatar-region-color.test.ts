// Tests for the additive regional-color seam in the avatar mesh generator
// (ViaConnect Prompt #169e(a)). Proves that segmentColor is backward compatible
// (no region map => legacy whole-body tint, solid mode unchanged) and that a
// region color map overrides per region in heatmap mode. The region->bucket map
// here is asserted to match the pure service's regionForKind.

import { describe, it, expect } from 'vitest';
import {
  segmentColor,
  regionForSegment,
  type AvatarSegmentSpec,
  type AvatarRegionColorMap,
} from '@/lib/arnold/scanning/avatarMeshGenerator';
import { regionForKind } from '@/lib/body-tracker/regional-fat-distribution';

function seg(kind: AvatarSegmentSpec['kind']): AvatarSegmentSpec {
  return {
    kind,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    radii: [1, 1, 1],
    side: 'center',
    label: kind,
  };
}

describe('segmentColor backward compatibility', () => {
  it('solid mode (heatmap=false) always returns the base teal, even with a map', () => {
    const map: AvatarRegionColorMap = { trunk: 'hsl(20, 50%, 50%)' };
    expect(segmentColor(seg('torso'), 25, false)).toBe('#2DA5A0');
    expect(segmentColor(seg('torso'), 25, false, map)).toBe('#2DA5A0');
  });

  it('heatmap mode with NO map keeps the legacy whole-body tint', () => {
    // Same as the pre-overlay behavior: one hue from the single bodyFat value.
    const a = segmentColor(seg('torso'), 25, true);
    const b = segmentColor(seg('thigh'), 25, true);
    // Legacy tint ignores the segment, so every segment is identical.
    expect(a).toBe(b);
    expect(a).toMatch(/^hsl\(/);
  });
});

describe('segmentColor regional override (heatmap + map)', () => {
  const map: AvatarRegionColorMap = {
    trunk: 'hsl(20, 60%, 50%)',
    arms: 'hsl(170, 60%, 50%)',
    legs: 'hsl(90, 60%, 50%)',
    head_neck: 'hsl(150, 60%, 50%)',
  };

  it('colors each segment by its region from the map', () => {
    expect(segmentColor(seg('torso'), 25, true, map)).toBe(map.trunk);
    expect(segmentColor(seg('upper_arm'), 25, true, map)).toBe(map.arms);
    expect(segmentColor(seg('thigh'), 25, true, map)).toBe(map.legs);
    expect(segmentColor(seg('head'), 25, true, map)).toBe(map.head_neck);
  });

  it('falls back to the legacy tint when the region is absent from the map', () => {
    const partial: AvatarRegionColorMap = { trunk: 'hsl(20, 60%, 50%)' };
    const legsColor = segmentColor(seg('thigh'), 25, true, partial);
    expect(legsColor).toMatch(/^hsl\(/);
    expect(legsColor).not.toBe(partial.trunk);
  });
});

describe('regionForSegment matches the pure service regionForKind', () => {
  const kinds: AvatarSegmentSpec['kind'][] = [
    'head', 'neck', 'torso', 'upper_arm', 'forearm', 'thigh', 'calf', 'hand', 'foot', 'joint',
  ];
  it('agrees on every kind (the two duplicated switches stay in sync)', () => {
    for (const k of kinds) {
      expect(regionForSegment(seg(k))).toBe(regionForKind(k));
    }
  });
});
