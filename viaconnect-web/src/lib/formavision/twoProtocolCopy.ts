// Theme 5 — two-protocol honesty copy.
// Photo estimate (formavision_photo) vs Guided 4-pose (4pose_v1).
// Consumer surfaces never print raw protocol ids. Photo path never claims
// regional fat, visceral, water, lean, muscle lbs, or Navy BF.

import {
  FORMAVISION_PHOTO_PROTOCOL,
  GUIDED_4POSE_PROTOCOL,
} from '@/lib/scan/scanProtocols';
import { READY_UNAVAILABLE_VISUAL_FAILED } from '@/lib/formavision/retainFrbl';

export { FORMAVISION_PHOTO_PROTOCOL, GUIDED_4POSE_PROTOCOL };
export { READY_UNAVAILABLE_VISUAL_FAILED, HYBRID_COSETTLE_COPY } from '@/lib/formavision/retainFrbl';

export const PHOTO_ESTIMATE_LABEL = 'Photo estimate';
export const GUIDED_4POSE_LABEL = 'Guided 4-pose';
export const UNKNOWN_PROTOCOL_LABEL = 'Body scan';

export const PHOTO_WHAT_YOU_GET =
  'A body-fat range estimate and optional girths. Muscle impression is a 1–5 overlay only.';

/** Limits that stay true on both discard and retain. */
export const PHOTO_WHAT_YOU_DO_NOT_GET_LIMITS =
  'This path does not fill regional fat, visceral fat, body water, lean mass, muscle lbs, or Navy body fat.';

/** Default / retain-off Analyze explainer. Discard honesty. */
export const PHOTO_WHAT_YOU_DO_NOT_GET =
  `Photos are discarded after analysis. ${PHOTO_WHAT_YOU_DO_NOT_GET_LIMITS}`;

/** Retain opt-in Analyze explainer. Must not claim discarded. */
export const PHOTO_WHAT_YOU_DO_NOT_GET_RETAINED =
  `Photos stay stored for 3D and re-measure. ${PHOTO_WHAT_YOU_DO_NOT_GET_LIMITS}`;

export function photoWhatYouDoNotGet(retainOptIn: boolean): string {
  return retainOptIn ? PHOTO_WHAT_YOU_DO_NOT_GET_RETAINED : PHOTO_WHAT_YOU_DO_NOT_GET;
}

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

/** Muscle Analysis headings when segmental lbs exist (Manual / DEXA / scale). */
export const MUSCLE_ANALYSIS_MASS_TITLE = 'Muscle Analysis';
export const MUSCLE_ANALYSIS_MASS_SUBTITLE = 'Segmental muscle mass breakdown';

/** Photo-only empty: do not read like a mass analysis. */
export const MUSCLE_ANALYSIS_PHOTO_ONLY_TITLE = BODY_SCAN_RESULTS_MUSCLE_IMPRESSION_TITLE;
export const MUSCLE_ANALYSIS_PHOTO_ONLY_SUBTITLE =
  'Photo estimate did not measure muscle mass.';

export const SCAN_HISTORY_PHOTOS_DISCARDED = 'Photos are not stored after analysis.';

/** Retained FRBL history caption — not the discard “not stored” line. */
export const SCAN_HISTORY_PHOTOS_RETAINED = 'Photos kept for 3D and re-measure.';

export function scanHistoryPhotoCaption(scan: {
  protocol: string;
  photosRetained?: boolean | null;
}): string | null {
  if (scan.protocol !== FORMAVISION_PHOTO_PROTOCOL) return null;
  return scan.photosRetained === true
    ? SCAN_HISTORY_PHOTOS_RETAINED
    : SCAN_HISTORY_PHOTOS_DISCARDED;
}

/** Lex Theme 5 — BodyScanResults footer. No “clinical”. */
export const BODY_SCAN_RESULTS_RELIABLE_READING =
  'These are AI estimates from photos. For a more reliable reading, use a smart scale, a DEXA scan, or enter measurements manually.';

/** Lex Theme 5 — uploader privacy strip. History uses discard vs retain captions. */
export const PHOTO_UPLOADER_PRIVACY_STRIP =
  'Photos are used only to calculate measurements. They are not kept as your body photos or used as the Ready 3D body.';

export const PHOTO_RETAKE_FOR_BEST_RESULTS = 'Retake for best results.';

/** Lex Theme 5 — uploader quality banner. Same “best results” language as retake chip. */
export const PHOTO_FLAGGED_PHOTOS_FOR_BEST_RESULTS =
  'Measurements from low-quality views will be marked low-confidence. Retake the flagged photos for best results.';

export type ReadyUnavailableReason = 'photo-discarded' | 'generic' | 'visual-failed';

export function consumerProtocolLabel(protocol: string): string {
  if (protocol === FORMAVISION_PHOTO_PROTOCOL) return PHOTO_ESTIMATE_LABEL;
  if (protocol === GUIDED_4POSE_PROTOCOL) return GUIDED_4POSE_LABEL;
  return UNKNOWN_PROTOCOL_LABEL;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export type PhotoSourcedBodyFatInput = {
  isEstimated?: boolean;
  deviceName?: string | null;
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  scanId?: string | null;
  protocol?: string | null;
  source?: string | null;
};

const MEASURED_COMPOSITION_SOURCES = new Set([
  'manual',
  'dexa',
  'inbody',
  'bodpod',
  'hydrostatic',
  'scale',
  'smart_scale',
  'bathroom_scale',
  'import',
]);

function normalizedToken(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isMeasuredCompositionSource(source: string): boolean {
  return MEASURED_COMPOSITION_SOURCES.has(source);
}

function isMeasuredCompositionDevice(device: string): boolean {
  if (!device) return false;
  return (
    device === 'manual' ||
    device.includes('dexa') ||
    device.includes('inbody') ||
    device.includes('bodpod') ||
    device.includes('hydrostatic') ||
    device.includes('scale')
  );
}

/**
 * Photo-sourced BF only for formavision_photo / true photo-estimate provenance.
 * scanId alone is not enough — guided 4pose_v1 and some Manual rows also have ids.
 */
export function isPhotoSourcedBodyFat(input: PhotoSourcedBodyFatInput): boolean {
  const protocol = typeof input.protocol === 'string' ? input.protocol.trim() : '';
  if (protocol === FORMAVISION_PHOTO_PROTOCOL) return true;
  if (protocol === GUIDED_4POSE_PROTOCOL) return false;

  const source = normalizedToken(input.source);
  if (isMeasuredCompositionSource(source)) return false;

  const device = normalizedToken(input.deviceName);
  if (isMeasuredCompositionDevice(device)) return false;

  const min = finiteNumber(input.estimatedBodyFatMin);
  const max = finiteNumber(input.estimatedBodyFatMax);
  const hasPhotoRange = min !== null && max !== null;
  const photoDevice = device === 'formavision';

  if (hasPhotoRange && (input.isEstimated === true || photoDevice)) return true;
  if (input.isEstimated === true && photoDevice) return true;
  return false;
}

/** Body Comp BF chip when the latest fat is photo-sourced. Never a bare clinical %. */
export function formatPhotoSourcedBfChip(input: PhotoSourcedBodyFatInput & {
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  totalBodyFatPct?: number | null;
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
export function isPhotoOnlyMuscleEmpty(input: (PhotoSourcedBodyFatInput & {
  totalBodyFatPct?: number | null;
  regionMuscleLbs?: {
    right_arm: number | null;
    left_arm: number | null;
    trunk: number | null;
    right_leg: number | null;
    left_leg: number | null;
  } | null;
  totalMuscleMassLbs?: number | null;
  skeletalMuscleMassLbs?: number | null;
}) | null): boolean {
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
  scans: ReadonlyArray<{ protocol: string; photosRetained?: boolean | null }> | null,
): boolean {
  if (!scans) return false;
  return scans.some(
    (scan) => scan.protocol === FORMAVISION_PHOTO_PROTOCOL && scan.photosRetained !== true,
  );
}

export function selectReadyUnavailableReason(input: {
  historyResolved: boolean;
  readyFrblSessionId: string | null | undefined;
  hasDiscardedPhotoScan: boolean;
  visualFailed?: boolean;
}): ReadyUnavailableReason {
  const hasSession =
    typeof input.readyFrblSessionId === 'string' && input.readyFrblSessionId.length > 0;
  if (input.historyResolved && input.visualFailed === true && hasSession) {
    return 'visual-failed';
  }
  if (input.historyResolved && !hasSession && input.hasDiscardedPhotoScan) {
    return 'photo-discarded';
  }
  return 'generic';
}

export function readyUnavailableCopy(reason: ReadyUnavailableReason): string {
  if (reason === 'photo-discarded') return READY_UNAVAILABLE_PHOTO_DISCARDED;
  if (reason === 'visual-failed') return READY_UNAVAILABLE_VISUAL_FAILED;
  return READY_UNAVAILABLE_GENERIC;
}
