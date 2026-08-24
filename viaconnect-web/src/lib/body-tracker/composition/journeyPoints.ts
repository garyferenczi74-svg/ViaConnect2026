// Prompt 210l: a Time Machine / 3D journey point is a composition record,
// not a weight-only log. Weight-only dates must not look like completed photo scans.

import type { CompositionSnapshot, RegionMap } from './types';

function regionHasValue(map: RegionMap | null | undefined): boolean {
  if (!map) return false;
  return Object.values(map).some((v) => v !== null && v !== undefined);
}

/** True when this snapshot is a FormaVision / photo-scan row. */
export function isCompletedPhotoScan(snap: CompositionSnapshot): boolean {
  if (snap.scanId) return true;
  return snap.source === 'scan';
}

/** True when the row is only a weight/girth log with no composition numbers. */
export function isWeightOnlySnapshot(snap: CompositionSnapshot): boolean {
  if (isCompletedPhotoScan(snap)) return false;
  if (snap.totalBodyFatPct !== null && snap.totalBodyFatPct !== undefined) return false;
  if (snap.totalMuscleMassLbs !== null && snap.totalMuscleMassLbs !== undefined) return false;
  if (snap.skeletalMuscleMassLbs !== null && snap.skeletalMuscleMassLbs !== undefined) return false;
  if (regionHasValue(snap.regionFatPct)) return false;
  if (regionHasValue(snap.regionMuscleLbs)) return false;
  return true;
}

/** Journey / 3D timeline: photo scans + manual composition. Exclude weight-only dates. */
export function isJourneyCompositionPoint(snap: CompositionSnapshot): boolean {
  return !isWeightOnlySnapshot(snap);
}
