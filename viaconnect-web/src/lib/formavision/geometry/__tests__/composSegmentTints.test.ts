// Tests for the canonical 5-region -> avatar segment tint (Prompt 210b, OV-T2).
//
// The contract: the tint is sourced from the canonical 5-region RegionMap (the SAME
// data the metric cards read) through the SAME getSegmentStatus ->
// getOvalColorFromStatus -> OVAL_HEX path, so the 3D tint agrees with the cards. A
// null (UNKNOWN) region stays neutral (omitted, no guessed color). The segment key
// space is pinned to OV-T1's SEGMENT_INDEX so the tint can never drift from geometry.

import { describe, it, expect } from 'vitest';
import { buildSegmentTints } from '../composSegmentTints';
import { SEGMENT_INDEX, type SegmentName } from '../buildBodyGeometry';
import type { RegionMap } from '@/lib/body-tracker/composition/types';
import {
  OVAL_HEX,
  getOvalColorFromStatus,
} from '@/lib/body-tracker/heatmap-colors';
import { getSegmentStatus } from '@/lib/body-tracker/calculations';

const ALL_SEGMENTS = Object.keys(SEGMENT_INDEX) as SegmentName[];

const FULL_FAT: RegionMap = {
  right_arm: 10, // male arm: low band -> green
  left_arm: 22, // male arm: > high(25)? no, standard..high -> see helper
  trunk: 30, // male trunk: > high(28) -> Very High -> red
  right_leg: 18, // male leg: standard band -> yellow
  left_leg: 11, // male leg: < low(14) -> green
};

describe('buildSegmentTints', () => {
  it('returns an empty (all neutral) record for a null region', () => {
    expect(buildSegmentTints(null, 'fat', 'male')).toEqual({});
  });

  it('maps a known fat region to the card status color for that segment', () => {
    const tints = buildSegmentTints(FULL_FAT, 'fat', 'male');
    // Each segment color must equal exactly what the card status path yields.
    for (const segment of ALL_SEGMENTS) {
      const segType = segment.includes('arm') ? 'arm' : segment.includes('leg') ? 'leg' : 'trunk';
      const expected = OVAL_HEX[getOvalColorFromStatus(getSegmentStatus(FULL_FAT[segment]!, segType, 'fat', 'male'))];
      expect(tints[segment]).toBe(expected);
    }
  });

  it('leaves a null (UNKNOWN) region neutral (omitted, never a guessed color)', () => {
    const region: RegionMap = {
      right_arm: 10,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    };
    const tints = buildSegmentTints(region, 'fat', 'male');
    expect(tints.right_arm).toBe(OVAL_HEX.green);
    expect(tints.left_arm).toBeUndefined();
    expect(tints.trunk).toBeUndefined();
    expect(tints.right_leg).toBeUndefined();
    expect(tints.left_leg).toBeUndefined();
  });

  it('maps a known muscle region to the card status color for that segment', () => {
    const region: RegionMap = {
      right_arm: 12, // male arm muscle: standard..high -> yellow/teal bucket
      left_arm: null,
      trunk: 65, // male trunk muscle: > standard(60) -> High..VeryHigh
      right_leg: null,
      left_leg: 5, // male leg muscle: < veryLow(12) -> Very Low -> green
    };
    const tints = buildSegmentTints(region, 'muscle', 'male');
    expect(tints.right_arm).toBe(
      OVAL_HEX[getOvalColorFromStatus(getSegmentStatus(12, 'arm', 'muscle', 'male'))],
    );
    expect(tints.trunk).toBe(
      OVAL_HEX[getOvalColorFromStatus(getSegmentStatus(65, 'trunk', 'muscle', 'male'))],
    );
    expect(tints.left_leg).toBe(
      OVAL_HEX[getOvalColorFromStatus(getSegmentStatus(5, 'leg', 'muscle', 'male'))],
    );
    expect(tints.left_arm).toBeUndefined();
    expect(tints.right_leg).toBeUndefined();
  });

  it('only ever emits keys from OV-T1 SEGMENT_INDEX (drift-proof)', () => {
    const tints = buildSegmentTints(FULL_FAT, 'fat', 'female');
    for (const key of Object.keys(tints)) {
      expect(ALL_SEGMENTS).toContain(key as SegmentName);
    }
  });

  it('agrees with the heat-map color helper the cards use for the same region value (3D == cards)', () => {
    // A single low-fat arm: the tint must be exactly OVAL_HEX of the card status,
    // proving the 3D tint and the cards never diverge for the same RegionMap value.
    const region: RegionMap = { right_arm: 9, left_arm: null, trunk: null, right_leg: null, left_leg: null };
    const status = getSegmentStatus(9, 'arm', 'fat', 'male');
    const tints = buildSegmentTints(region, 'fat', 'male');
    expect(tints.right_arm).toBe(OVAL_HEX[getOvalColorFromStatus(status)]);
  });
});
