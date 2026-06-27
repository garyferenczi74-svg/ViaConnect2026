// Pure timeline math for the FormaVision Time Machine (Prompt 210b, P3-T2b).
//
// The scrubber is a normalized position p in [0, 1] over N real scans (the snap
// points). This module turns p into the two adjacent real scans plus a local t,
// and resolves the HONEST readout state (a snap shows a real scan's values; a
// between-scans position is a labeled visual transition, never a fabricated
// measured number). Pure and deterministic: no Date.now, no Math.random, no IO.
//
// Snap positions are EVENLY spaced (index i -> i / (N - 1)). Even spacing keeps
// every scan equally reachable by keyboard and by drag regardless of real-world
// date gaps; the date is shown in the readout so the user still sees when each
// scan happened. (Documented choice: even spacing over date-proportional.)

export interface SnapPosition {
  index: number;
  // Normalized [0, 1] position of this snap on the track.
  p: number;
}

export interface TimelinePosition {
  // The two adjacent real scan indices the position sits between. At a snap they
  // are equal (indexA === indexB) with localT 0.
  indexA: number;
  indexB: number;
  // Local interpolation factor in [0, 1] from scan indexA to scan indexB.
  localT: number;
  // True when the position is exactly on a real scan (within epsilon).
  atSnap: boolean;
  // The index of the nearest real scan (the one whose REAL numbers are safe to
  // show; between scans this is the closer endpoint).
  nearestIndex: number;
}

// Positions within this fraction of a snap count as on the snap (avoids a
// "transitioning" label flickering when the handle is essentially parked).
const SNAP_EPSILON = 1e-4;

// Build N evenly spaced snap positions for N scans. N === 1 yields a single snap
// at p = 0 (the caller disables the scrubber for a single scan).
export function buildSnapPositions(count: number): SnapPosition[] {
  if (count <= 0) return [];
  if (count === 1) return [{ index: 0, p: 0 }];
  const last = count - 1;
  return Array.from({ length: count }, (_, index) => ({
    index,
    p: index / last,
  }));
}

// Map a normalized position p in [0, 1] over `count` evenly spaced scans to the
// adjacent scans + local t. Clamps p into range. count must be >= 1.
export function resolveTimelinePosition(p: number, count: number): TimelinePosition {
  if (count <= 1) {
    return { indexA: 0, indexB: 0, localT: 0, atSnap: true, nearestIndex: 0 };
  }
  const last = count - 1;
  const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
  // Scaled position in scan-index space, e.g. 0..(count-1).
  const scaled = clamped * last;
  const indexA = Math.min(Math.floor(scaled), last - 1);
  const indexB = indexA + 1;
  const localT = scaled - indexA;

  // Snap detection: localT near 0 means on indexA; near 1 means on indexB.
  if (localT <= SNAP_EPSILON) {
    return { indexA, indexB: indexA, localT: 0, atSnap: true, nearestIndex: indexA };
  }
  if (localT >= 1 - SNAP_EPSILON) {
    return { indexA: indexB, indexB, localT: 0, atSnap: true, nearestIndex: indexB };
  }
  const nearestIndex = localT < 0.5 ? indexA : indexB;
  return { indexA, indexB, localT, atSnap: false, nearestIndex };
}

// Snap a normalized position to the nearest scan's normalized position. Used for
// reduced-motion dragging (snap to a real scan, never interpolate continuously).
export function snapPositionToNearestScan(p: number, count: number): number {
  if (count <= 1) return 0;
  const last = count - 1;
  const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
  const nearestIndex = Math.round(clamped * last);
  return nearestIndex / last;
}

// The normalized position of a scan index (for keyboard stepping + play frames).
export function positionForIndex(index: number, count: number): number {
  if (count <= 1) return 0;
  return index / (count - 1);
}

export type ReadoutMode =
  // On a real scan: show that scan's measured values.
  | { kind: 'measured'; scanIndex: number }
  // Between two scans: a labeled visual transition. Numbers shown are the nearest
  // real scan's, explicitly marked as a transition, never presented as measured
  // at this position.
  | { kind: 'transition'; fromIndex: number; toIndex: number; nearestIndex: number };

// Resolve the honest readout mode for a timeline position. This is the contract
// that keeps the NUMBERS real even while the SHAPE interpolates.
export function resolveReadoutMode(pos: TimelinePosition): ReadoutMode {
  if (pos.atSnap) {
    return { kind: 'measured', scanIndex: pos.nearestIndex };
  }
  return {
    kind: 'transition',
    fromIndex: pos.indexA,
    toIndex: pos.indexB,
    nearestIndex: pos.nearestIndex,
  };
}
