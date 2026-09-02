// Landing-page avatar girths. Overlay (live Results) wins, then any finite
// measured circ, then an explicit BF→girth estimate from composition history.
//
// Close/Done clears scanResult, so overlay is gone. Live ScanExperience never
// passes BodyScanResult into this landing overlay. History fallback is what
// keeps the mesh morphed after refresh.
//
// NO-FABRICATION: scanToParamVector is not called here and still must not
// invent girth from BF. Empty / all-null measurements are absent, not zeros.

import { anyCircumferencePresent } from '@/lib/body-tracker/composition/scanSpineContract';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';
import { isReadyFormaVisionScan, type ScanSummary } from '@/lib/scan/scanSummary';

export function historySnapshotCanEstimateGirths(
  snapshot: CompositionSnapshot | null,
): boolean {
  if (!snapshot) return false;
  const mid = snapshot.totalBodyFatPct;
  const hasMid = typeof mid === 'number' && Number.isFinite(mid) && mid > 0;
  const min = snapshot.estimatedBodyFatMin;
  const max = snapshot.estimatedBodyFatMax;
  const hasRange =
    typeof min === 'number' &&
    typeof max === 'number' &&
    Number.isFinite(min) &&
    Number.isFinite(max);
  if (!hasMid && !hasRange) return false;
  return Boolean(snapshot.isEstimated || snapshot.source === 'scan' || snapshot.scanId);
}

export function pickReadyPhotoSnapshot(
  scans: readonly ScanSummary[] | null | undefined,
): CompositionSnapshot | null {
  if (!scans) return null;
  for (const scan of scans) {
    if (!isReadyFormaVisionScan(scan)) continue;
    const fromScan = snapshotFromPhotoScanSummary(scan);
    if (fromScan && historySnapshotCanEstimateGirths(fromScan)) return fromScan;
  }
  return null;
}

export function pickHistorySnapshotForAvatar(
  latest: CompositionSnapshot | null,
  journeySnapshots: readonly CompositionSnapshot[] = [],
  readyPhoto: CompositionSnapshot | null = null,
): CompositionSnapshot | null {
  // Your scans Ready photo is the BF SSOT Arnold reads (e.g. 31%). Prefer it
  // for girth estimate so a leaner/template-BF composition latest cannot pin
  // the mesh to the sex template. Overlay/measured circs still win later.
  if (historySnapshotCanEstimateGirths(readyPhoto)) return readyPhoto;
  if (historySnapshotCanEstimateGirths(latest)) return latest;
  for (let i = journeySnapshots.length - 1; i >= 0; i -= 1) {
    const snap = journeySnapshots[i];
    if (historySnapshotCanEstimateGirths(snap)) return snap;
  }
  return readyPhoto ?? latest;
}

export function resolveAvatarCircumferences(args: {
  overlay: CircumferenceMeasurements | null;
  measured: CircumferenceMeasurements | null;
  historySnapshot: CompositionSnapshot | null;
  sex: Sex;
  unit: MeasurementUnit;
}): CircumferenceMeasurements | null {
  if (anyCircumferencePresent(args.overlay)) return args.overlay;
  if (anyCircumferencePresent(args.measured)) return args.measured;
  if (!historySnapshotCanEstimateGirths(args.historySnapshot)) return null;
  return estimateCircumferencesFromComposition(args.historySnapshot, args.sex, args.unit);
}
