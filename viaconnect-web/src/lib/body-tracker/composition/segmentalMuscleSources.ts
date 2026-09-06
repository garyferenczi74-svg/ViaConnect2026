// Theme 3 fold: segmental muscle lbs may be written only from Manual / DEXA /
// InBody. Bathroom scale (and other scales) must never write
// body_tracker_segmental_muscle. Photo vision never claims lbs.

import {
  getDataSource,
  type DataSourceId,
} from '@/lib/body-tracker/manual-input';

export const SEGMENTAL_MUSCLE_SOURCE_DEXA = 'dexa' as const;
export const SEGMENTAL_MUSCLE_SOURCE_INBODY = 'inbody' as const;
export const SEGMENTAL_MUSCLE_SOURCE_MANUAL = 'manual' as const;
/** Theme 3 wrote Manual as opaque `other`. Read-only alias — never a write allow-list member. */
export const SEGMENTAL_MUSCLE_SOURCE_MANUAL_LEGACY = 'other' as const;

export const SEGMENTAL_MUSCLE_ALLOWED_SOURCE_IDS = [
  SEGMENTAL_MUSCLE_SOURCE_DEXA,
  SEGMENTAL_MUSCLE_SOURCE_INBODY,
  SEGMENTAL_MUSCLE_SOURCE_MANUAL,
] as const;

export type SegmentalMuscleSourceId = (typeof SEGMENTAL_MUSCLE_ALLOWED_SOURCE_IDS)[number];

export const SCALE_SOURCE_IDS = ['bathroom_scale', 'smart_scale'] as const;

export function isSegmentalMuscleSourceId(
  sourceId: string | null | undefined,
): sourceId is SegmentalMuscleSourceId {
  return (
    sourceId === SEGMENTAL_MUSCLE_SOURCE_DEXA ||
    sourceId === SEGMENTAL_MUSCLE_SOURCE_INBODY ||
    sourceId === SEGMENTAL_MUSCLE_SOURCE_MANUAL
  );
}

export function isLegacyManualSegmentalSourceId(
  sourceId: string | null | undefined,
): boolean {
  return sourceId === SEGMENTAL_MUSCLE_SOURCE_MANUAL_LEGACY;
}

export function canWriteSegmentalMuscleLbs(
  sourceId: DataSourceId | string | null | undefined,
): boolean {
  return isSegmentalMuscleSourceId(sourceId);
}

export function isScaleSourceId(sourceId: string | null | undefined): boolean {
  return sourceId === 'bathroom_scale' || sourceId === 'smart_scale';
}

export function formatSegmentalMuscleProvenanceChip(
  sourceId: string | null | undefined,
): string | null {
  if (sourceId === SEGMENTAL_MUSCLE_SOURCE_DEXA) return 'DEXA';
  if (sourceId === SEGMENTAL_MUSCLE_SOURCE_INBODY) return 'InBody';
  if (
    sourceId === SEGMENTAL_MUSCLE_SOURCE_MANUAL ||
    isLegacyManualSegmentalSourceId(sourceId)
  ) {
    return 'Manual';
  }
  return null;
}

export function formatCompositionProvenanceChip(
  sourceId: string | null | undefined,
): string | null {
  // Write-allow ids keep DEXA / InBody / Manual chips. Do not alias `other`
  // here — true Other / Estimate stays labeled from DATA_SOURCES.
  if (isSegmentalMuscleSourceId(sourceId)) {
    return formatSegmentalMuscleProvenanceChip(sourceId);
  }
  const src = getDataSource(sourceId as DataSourceId | null);
  return src?.label ?? null;
}

/** Muscle-section chip: legacy `other` → Manual only when lbs are already stored. */
export function formatMuscleSectionProvenanceChip(
  sourceId: string | null | undefined,
  hasMuscleLbs: boolean,
): string | null {
  if (hasMuscleLbs) {
    const muscleChip = formatSegmentalMuscleProvenanceChip(sourceId);
    if (muscleChip) return muscleChip;
  }
  return formatCompositionProvenanceChip(sourceId);
}

export const MUSCLE_SCALE_BLOCKED_COPY =
  'Bathroom scale and smart scale cannot log muscle mass (lbs). Use Manual, DEXA, or InBody.';

export const MUSCLE_BREAKDOWN_TITLE = 'Segmental muscle mass breakdown';

export function showMuscleSegmentalBreakdownTitle(input: {
  manualSourceId?: string | null;
  hasMuscleLbs: boolean;
}): boolean {
  return (
    input.hasMuscleLbs &&
    (isSegmentalMuscleSourceId(input.manualSourceId) ||
      isLegacyManualSegmentalSourceId(input.manualSourceId))
  );
}
