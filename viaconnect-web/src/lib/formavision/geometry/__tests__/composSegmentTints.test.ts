// Tests for the composition -> 5-segment tint reduction (Prompt 210b, OV-T2).
//
// The contract: tints reuse the SAME OvalColor statuses the 2D heat map renders
// (so 3D and 2D agree), an absent/UNKNOWN segment stays neutral (omitted, no
// guessed color), and several body parts under one segment reduce to the WORST
// status. The segment key space is pinned to OV-T1's SEGMENT_INDEX so the picker,
// the geometry and the tint can never drift.

import { describe, it, expect } from 'vitest';
import { buildSegmentTints, type SegmentChild } from '../composSegmentTints';
import { SEGMENT_INDEX, type SegmentName } from '../buildBodyGeometry';
import { OVAL_HEX, getOvalColorFromStatus, getOvalColorFromChange } from '@/lib/body-tracker/heatmap-colors';

const ALL_SEGMENTS = Object.keys(SEGMENT_INDEX) as SegmentName[];

// One child per segment, plus a second trunk child for the worst-status case.
const CHILDREN: SegmentChild[] = [
  { key: 'r_arm', segment: 'right_arm' },
  { key: 'l_arm', segment: 'left_arm' },
  { key: 'trunk', segment: 'trunk' },
  { key: 'chest', segment: 'trunk' },
  { key: 'r_leg', segment: 'right_leg' },
  { key: 'l_leg', segment: 'left_leg' },
];

describe('buildSegmentTints', () => {
  it('maps a known status to its heat-map hex for the right segment', () => {
    const tints = buildSegmentTints({ r_arm: 'green', l_leg: 'red' }, CHILDREN);
    expect(tints.right_arm).toBe(OVAL_HEX.green);
    expect(tints.left_leg).toBe(OVAL_HEX.red);
  });

  it('leaves an absent / UNKNOWN segment neutral (no tint, never a guessed color)', () => {
    const tints = buildSegmentTints({ r_arm: 'yellow' }, CHILDREN);
    // Only the segment with a present status is set; the rest stay undefined.
    expect(tints.right_arm).toBe(OVAL_HEX.yellow);
    expect(tints.left_arm).toBeUndefined();
    expect(tints.trunk).toBeUndefined();
    expect(tints.right_leg).toBeUndefined();
    expect(tints.left_leg).toBeUndefined();
  });

  it('reduces several children of one segment to the worst status (red beats yellow beats green)', () => {
    // trunk has two children: chest red, trunk green -> red wins.
    const tints = buildSegmentTints({ trunk: 'green', chest: 'red' }, CHILDREN);
    expect(tints.trunk).toBe(OVAL_HEX.red);

    const tints2 = buildSegmentTints({ trunk: 'green', chest: 'yellow' }, CHILDREN);
    expect(tints2.trunk).toBe(OVAL_HEX.yellow);
  });

  it('only ever emits keys from OV-T1 SEGMENT_INDEX (drift-proof)', () => {
    const tints = buildSegmentTints(
      { r_arm: 'green', l_arm: 'green', trunk: 'green', r_leg: 'green', l_leg: 'green' },
      CHILDREN,
    );
    for (const key of Object.keys(tints)) {
      expect(ALL_SEGMENTS).toContain(key as SegmentName);
    }
  });

  it('agrees with the 2D heat-map color source for the same status (fat + muscle helpers)', () => {
    // Fat: a low fat percentile is green via getOvalColorFromStatus; the tint must
    // be exactly OVAL_HEX of that same OvalColor, i.e. the 2D and 3D never diverge.
    const fatGreen = getOvalColorFromStatus('Low');
    const fatTints = buildSegmentTints({ r_arm: fatGreen }, CHILDREN);
    expect(fatTints.right_arm).toBe(OVAL_HEX[fatGreen]);

    // Muscle: a positive change is green for muscle via getOvalColorFromChange.
    const muscleGreen = getOvalColorFromChange(2.5, 'muscle');
    const muscleTints = buildSegmentTints({ l_leg: muscleGreen }, CHILDREN);
    expect(muscleTints.left_leg).toBe(OVAL_HEX[muscleGreen]);
  });
});
