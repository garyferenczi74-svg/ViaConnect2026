// Optimistic composition snapshot from a just-persisted FormaVision analyze.
// Used so the 3D avatar and "Your scans" can update before history refetch
// returns. Persist remains the 210l spine; this is display-only.

import type { BodyScanResult } from '@/lib/body-tracker/composition/runFormaVisionAnalyze';
import type { CompositionSnapshot, RegionMap } from '@/lib/body-tracker/composition/types';

const EMPTY_REGION: RegionMap = {
  right_arm: null,
  left_arm: null,
  trunk: null,
  right_leg: null,
  left_leg: null,
};

function midpoint(min: number, max: number): number | null {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return Math.round(((min + max) / 2) * 10) / 10;
}

export function snapshotFromPhotoScanSummary(scan: {
  id: string;
  date: string;
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  estimatedWhrMin?: number | null;
  estimatedWhrMax?: number | null;
}): CompositionSnapshot | null {
  const min = scan.estimatedBodyFatMin;
  const max = scan.estimatedBodyFatMax;
  if (typeof min !== 'number' || typeof max !== 'number') return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const totalBodyFatPct = midpoint(min, max);
  if (totalBodyFatPct === null) return null;
  const whrMin = scan.estimatedWhrMin;
  const whrMax = scan.estimatedWhrMax;
  const hasWhr =
    typeof whrMin === 'number' &&
    typeof whrMax === 'number' &&
    Number.isFinite(whrMin) &&
    Number.isFinite(whrMax);
  return {
    entryId: scan.id,
    source: 'scan',
    recordedAt: scan.date,
    deviceName: 'FormaVision',
    totalBodyFatPct,
    regionFatPct: { ...EMPTY_REGION },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { ...EMPTY_REGION },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    scanId: scan.id,
    estimatedBodyFatMin: min,
    estimatedBodyFatMax: max,
    estimatedWhrMin: hasWhr ? whrMin : null,
    estimatedWhrMax: hasWhr ? whrMax : null,
    isEstimated: true,
  };
}

export function snapshotFromScanResult(result: BodyScanResult): CompositionSnapshot {
  const { estimates } = result;
  const totalBodyFatPct = midpoint(
    estimates.estimated_body_fat_min,
    estimates.estimated_body_fat_max,
  );
  return {
    entryId: result.scanId,
    source: 'scan',
    recordedAt: result.scanDate,
    deviceName: 'FormaVision',
    totalBodyFatPct,
    regionFatPct: { ...EMPTY_REGION },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { ...EMPTY_REGION },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    scanId: result.scanId,
    estimatedBodyFatMin: estimates.estimated_body_fat_min,
    estimatedBodyFatMax: estimates.estimated_body_fat_max,
    estimatedWhrMin: estimates.estimated_whr_min,
    estimatedWhrMax: estimates.estimated_whr_max,
    isEstimated: true,
  };
}
