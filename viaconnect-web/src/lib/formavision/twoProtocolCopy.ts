// Theme 5 — two-protocol honesty copy.
// Photo estimate (formavision_photo) vs Guided 4-pose (4pose_v1).
// Consumer surfaces never print raw protocol ids. Photo path never claims
// regional fat, visceral, water, lean, muscle lbs, or Navy BF.

import {
  FORMAVISION_PHOTO_PROTOCOL,
  GUIDED_4POSE_PROTOCOL,
} from '@/lib/scan/scanProtocols';

export { FORMAVISION_PHOTO_PROTOCOL, GUIDED_4POSE_PROTOCOL };

export const PHOTO_ESTIMATE_LABEL = 'Photo estimate';
export const GUIDED_4POSE_LABEL = 'Guided 4-pose';
export const UNKNOWN_PROTOCOL_LABEL = 'Body scan';

export const PHOTO_WHAT_YOU_GET =
  'A body-fat range estimate and optional girths. Muscle impression is a 1–5 overlay only.';

export const PHOTO_WHAT_YOU_DO_NOT_GET =
  'Photos are discarded after analysis. This path does not fill regional fat, visceral fat, body water, lean mass, muscle lbs, or Navy body fat.';

export const READY_UNAVAILABLE_PHOTO_DISCARDED =
  '3D Ready needs a Guided 4-pose scan. Photo estimate photos are discarded after analysis and cannot build a 3D body.';

export const READY_UNAVAILABLE_GENERIC = '3D avatar unavailable.';

export const MUSCLE_ANALYSIS_PHOTO_ONLY_EMPTY =
  'Photo estimate does not fill muscle mass (lbs). Log Data for full Muscle Analysis.';

export const BODY_COMP_SCAN_PANEL_DESCRIPTION =
  'Photo estimate: body-fat range from your photos. Not a DEXA or scale reading.';

export const BODY_COMP_SAVE_TOAST = 'BF estimate saved.';

export const BODY_SCAN_RESULTS_MUSCLE_IMPRESSION_TITLE = 'Muscle impression';

export const BODY_SCAN_RESULTS_NOT_MUSCLE_LBS =
  'This is a 1–5 scan impression, not Muscle Analysis mass (lbs).';

export const SCAN_HISTORY_PHOTOS_DISCARDED = 'Photos are not stored after analysis.';

export type ReadyUnavailableReason = 'photo-discarded' | 'generic';

export function consumerProtocolLabel(protocol: string): string {
  if (protocol === FORMAVISION_PHOTO_PROTOCOL) return PHOTO_ESTIMATE_LABEL;
  if (protocol === GUIDED_4POSE_PROTOCOL) return GUIDED_4POSE_LABEL;
  return UNKNOWN_PROTOCOL_LABEL;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function isPhotoSourcedBodyFat(input: {
  isEstimated?: boolean;
  deviceName?: string | null;
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  scanId?: string | null;
}): boolean {
  if (input.isEstimated === true) return true;
  const device = typeof input.deviceName === 'string' ? input.deviceName.trim().toLowerCase() : '';
  if (device === 'formavision') return true;
  const min = finiteNumber(input.estimatedBodyFatMin);
  const max = finiteNumber(input.estimatedBodyFatMax);
  if (min !== null && max !== null) return true;
  return typeof input.scanId === 'string' && input.scanId.length > 0;
}

/** Body Comp BF chip when the latest fat is photo-sourced. Never a bare clinical %. */
export function formatPhotoSourcedBfChip(input: {
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  totalBodyFatPct?: number | null;
  isEstimated?: boolean;
  deviceName?: string | null;
  scanId?: string | null;
}): string | null {
  if (!isPhotoSourcedBodyFat(input)) return null;
  const min = finiteNumber(input.estimatedBodyFatMin);
  const max = finiteNumber(input.estimatedBodyFatMax);
  if (min !== null && max !== null) {
    return `est. ${min.toFixed(1)}–${max.toFixed(1)}%`;
  }
  const mid = finiteNumber(input.totalBodyFatPct);
  if (mid !== null) return `est. ${mid.toFixed(1)}%`;
  return null;
}

export function photoSourcedBfStatusValue(input: {
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  totalBodyFatPct?: number | null;
}): number | null {
  const min = finiteNumber(input.estimatedBodyFatMin);
  const max = finiteNumber(input.estimatedBodyFatMax);
  if (min !== null && max !== null) return (min + max) / 2;
  return finiteNumber(input.totalBodyFatPct);
}

export function hasSegmentalMuscleLbs(input: {
  regionMuscleLbs?: {
    right_arm: number | null;
    left_arm: number | null;
    trunk: number | null;
    right_leg: number | null;
    left_leg: number | null;
  } | null;
  totalMuscleMassLbs?: number | null;
  skeletalMuscleMassLbs?: number | null;
}): boolean {
  const total = finiteNumber(input.totalMuscleMassLbs);
  if (total !== null && total > 0) return true;
  const skeletal = finiteNumber(input.skeletalMuscleMassLbs);
  if (skeletal !== null && skeletal > 0) return true;
  const regions = input.regionMuscleLbs;
  if (!regions) return false;
  return Object.values(regions).some((v) => {
    const n = finiteNumber(v);
    return n !== null && n > 0;
  });
}

/** Photo BF present and zero muscle lbs — honest Muscle Analysis empty. */
export function isPhotoOnlyMuscleEmpty(input: {
  isEstimated?: boolean;
  deviceName?: string | null;
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  totalBodyFatPct?: number | null;
  scanId?: string | null;
  regionMuscleLbs?: {
    right_arm: number | null;
    left_arm: number | null;
    trunk: number | null;
    right_leg: number | null;
    left_leg: number | null;
  } | null;
  totalMuscleMassLbs?: number | null;
  skeletalMuscleMassLbs?: number | null;
} | null): boolean {
  if (!input) return false;
  if (!isPhotoSourcedBodyFat(input)) return false;
  const hasPhotoBf =
    finiteNumber(input.estimatedBodyFatMin) !== null ||
    finiteNumber(input.estimatedBodyFatMax) !== null ||
    finiteNumber(input.totalBodyFatPct) !== null;
  if (!hasPhotoBf) return false;
  return !hasSegmentalMuscleLbs(input);
}

export function historyHasDiscardedPhotoScan(
  scans: ReadonlyArray<{ protocol: string }> | null,
): boolean {
  if (!scans) return false;
  return scans.some((scan) => scan.protocol === FORMAVISION_PHOTO_PROTOCOL);
}

export function selectReadyUnavailableReason(input: {
  historyResolved: boolean;
  readyFrblSessionId: string | null | undefined;
  hasDiscardedPhotoScan: boolean;
}): ReadyUnavailableReason {
  const hasSession =
    typeof input.readyFrblSessionId === 'string' && input.readyFrblSessionId.length > 0;
  if (input.historyResolved && !hasSession && input.hasDiscardedPhotoScan) {
    return 'photo-discarded';
  }
  return 'generic';
}

export function readyUnavailableCopy(reason: ReadyUnavailableReason): string {
  return reason === 'photo-discarded'
    ? READY_UNAVAILABLE_PHOTO_DISCARDED
    : READY_UNAVAILABLE_GENERIC;
}
