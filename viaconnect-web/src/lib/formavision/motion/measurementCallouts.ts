// Measurement callout anchors for the FormaVision avatar (Prompt 210b, OV-T4).
//
// The Measurements overlay shows one callout per measured circumference: a small dot
// on the body at the region's cross-section level and side, a leader line to a label,
// and the label with the region name and value. This module is the pure mapping from
// the circumference MEASUREMENT_KEYS to body anchor points and labels. It REUSES the
// shared region->level source (ringLoopForRegion for the ring-backed trunk and leg
// regions, framingForRegion for the arm levels the camera also uses) so the callouts
// sit exactly where the ring and camera already agree; it never defines a second
// levels map.
//
// The callout SET is derived from MEASUREMENT_KEYS so it cannot drift from the data.
// shoulderWidth is a width rather than a circumference, so it is rendered as a neutral
// callout at the shoulder level (documented choice: included, not omitted, so the
// Measurements view shows every tracked field). Left and right paired regions resolve
// to the correct side. Pure and deterministic so the anchor mapping is unit testable.

import { MEASUREMENT_KEYS, type MeasurementKey } from '@/lib/body-tracker/circumference';
import { ringLoopForRegion } from '@/lib/formavision/geometry/ringLoopForRegion';
import { framingForRegion } from './regionFraming';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

export type CalloutSide = 'left' | 'right' | 'center';

// How each measurement key resolves to a body anchor: which ring region drives its
// level (and its surface loop, when ring-backed), and which side it sits on. armLevel
// names the framingForRegion key for the bicep / forearm heights (no ring exists for
// the arms in the param vector, so the shared camera level is used).
interface CalloutSpec {
  side: CalloutSide;
  // A geometry ring id for ring-backed regions (neck, chest, waist, hip, thigh, calf).
  ringId?: string;
  // A framingForRegion key for the arm levels (bicep, forearm) and shoulder width.
  framingKey?: string;
}

const CALLOUT_SPECS: Record<MeasurementKey, CalloutSpec> = {
  neck: { side: 'center', ringId: 'neck' },
  shoulderWidth: { side: 'center', framingKey: 'shoulder' },
  chest: { side: 'center', ringId: 'chest' },
  waist: { side: 'center', ringId: 'waist' },
  hip: { side: 'center', ringId: 'hip' },
  rightBicep: { side: 'right', framingKey: 'bicep' },
  leftBicep: { side: 'left', framingKey: 'bicep' },
  rightForearm: { side: 'right', framingKey: 'forearm' },
  leftForearm: { side: 'left', framingKey: 'forearm' },
  rightQuadriceps: { side: 'right', ringId: 'rThigh' },
  leftQuadriceps: { side: 'left', ringId: 'lThigh' },
  rightCalf: { side: 'right', ringId: 'rCalf' },
  leftCalf: { side: 'left', ringId: 'lCalf' },
};

export interface CalloutAnchor {
  key: MeasurementKey;
  side: CalloutSide;
  // World-space anchor point on or beside the body surface at the region level.
  x: number;
  y: number;
  z: number;
}

// Half-width fallback for arm callouts: the param vector carries no arm ring loop, so
// the dot sits a little outside the trunk on the correct side at the shared level.
const ARM_SIDE_OFFSET = 0.26;

// Resolve a single measurement key to its body anchor from the current param vector.
export function calloutAnchorFor(
  param: BodyParamVector,
  key: MeasurementKey,
): CalloutAnchor {
  const spec = CALLOUT_SPECS[key];

  if (spec.ringId) {
    // Ring-backed region: take the real cross-section loop and pick a surface point.
    // Center regions anchor at the front of the loop (max z); side regions anchor at
    // the loop's left or right extreme (min or max x).
    const loop = ringLoopForRegion(param, spec.ringId);
    const y = loop.y;
    if (spec.side === 'center') {
      const front = loop.points.reduce((a, b) => (b.z > a.z ? b : a), loop.points[0]);
      return { key, side: spec.side, x: 0, y, z: front.z };
    }
    const sideExtreme =
      spec.side === 'right'
        ? loop.points.reduce((a, b) => (b.x > a.x ? b : a), loop.points[0])
        : loop.points.reduce((a, b) => (b.x < a.x ? b : a), loop.points[0]);
    return { key, side: spec.side, x: sideExtreme.x, y, z: sideExtreme.z };
  }

  // Arm or width region: use the shared camera level for the height and a side offset.
  const framingKey = spec.framingKey ?? 'chest';
  const y = framingForRegion(framingKey).targetY;
  if (spec.side === 'center') {
    return { key, side: spec.side, x: 0, y, z: 0.16 };
  }
  const x = spec.side === 'right' ? ARM_SIDE_OFFSET : -ARM_SIDE_OFFSET;
  return { key, side: spec.side, x, y, z: 0 };
}

// The full ordered callout set, one per measurement key, drift-proof from
// MEASUREMENT_KEYS. The render layer pairs each with its value and label.
export function calloutAnchors(param: BodyParamVector): CalloutAnchor[] {
  return MEASUREMENT_KEYS.map((key) => calloutAnchorFor(param, key));
}

// The label side for reflow: center regions lean to the left column on a narrow
// screen so they never sit over the body. Right regions go right, left go left.
export function labelSideFor(side: CalloutSide): 'left' | 'right' {
  return side === 'right' ? 'right' : 'left';
}
