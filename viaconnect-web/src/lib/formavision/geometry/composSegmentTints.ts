// Build the avatar's 5-segment tint record from the composition page's existing
// per-region heat-map statuses (Prompt 210b, OV-T2).
//
// HONESTY + AGREEMENT: this does NOT recompute anything from raw fat or muscle
// percentages. It consumes the SAME OvalColor statuses the page already feeds the
// 2D SegmentalHeatMap (fatRegionStatuses / muscleRegionStatuses), so the 3D tint and
// the 2D floor are guaranteed to agree for the same segment and tab. A segment with
// no present status maps to null (NEUTRAL, no tint) rather than a guessed color.
//
// REGION -> 5-SEGMENT REDUCTION: the page carries finer-grained body parts (neck,
// chest, biceps, forearms, thighs, calves ...), each tagged with the parent segment
// it belongs to (one of the 5 SEGMENT_INDEX segments). Several body parts can fall
// under one segment, so a segment takes the WORST (most attention-needing) status
// among its present child parts: red beats yellow beats green. This mirrors what the
// 2D shows for that area (the most severe child drives the segment summary) and never
// invents a status: if no child part has a present status, the segment stays null.

import { OVAL_HEX, type OvalColor } from '@/lib/body-tracker/heatmap-colors';
import { type SegmentName } from './buildBodyGeometry';
import { type SegmentTintRecord } from './segmentTints';

// One finer-grained body part and the avatar segment it rolls up into.
export interface SegmentChild {
  key: string;
  segment: SegmentName;
}

// Severity ordering for the worst-status reduction: a higher rank wins when more
// than one child part maps to the same segment.
const SEVERITY_RANK: Record<OvalColor, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

// Reduce the page's per-region OvalColor statuses to the 5 avatar segments and
// resolve each to its heat-map hex. statuses is the SAME record the 2D heat map
// consumes (keyed by the page's body-part keys). A segment with no present child
// status stays absent from the record, which the avatar renders as neutral.
export function buildSegmentTints(
  statuses: Record<string, OvalColor>,
  children: readonly SegmentChild[],
): SegmentTintRecord {
  // Worst present OvalColor per segment, or undefined when no child has a status.
  const worst: Partial<Record<SegmentName, OvalColor>> = {};

  for (const child of children) {
    const status = statuses[child.key];
    if (!status) {
      continue;
    }
    const current = worst[child.segment];
    if (current === undefined || SEVERITY_RANK[status] > SEVERITY_RANK[current]) {
      worst[child.segment] = status;
    }
  }

  const tints: SegmentTintRecord = {};
  for (const segment of Object.keys(worst) as SegmentName[]) {
    const color = worst[segment];
    // Present status -> its heat-map hex; the absent segments are simply omitted
    // (left undefined), which the overlay treats as neutral (no tint).
    if (color !== undefined) {
      tints[segment] = OVAL_HEX[color];
    }
  }
  return tints;
}
