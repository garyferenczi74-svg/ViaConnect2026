// Optimistic composition snapshot from a just-persisted FormaVision analyze.
// Used so the 3D avatar and "Your scans" can update before history refetch
// returns. Persist remains the 210l spine; this is display-only.

import type { BodyScanResult } from '@/lib/body-tracker/composition/runFormaVisionAnalyze';
import type { CompositionSnapshot, RegionMap } from '@/lib/body-tracker/composition/types';
import { finiteEstimateNumber } from '@/lib/scan/scanSummary';

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

type PhotoScanEstimateFields = {
  estimatedBodyFatMin?: unknown;
  estimatedBodyFatMax?: unknown;
  estimatedWhrMin?: unknown;
  estimatedWhrMax?: unknown;
  estimated_body_fat_min?: unknown;
  estimated_body_fat_max?: unknown;
  estimated_whr_min?: unknown;
  estimated_whr_max?: unknown;
};

export function snapshotFromPhotoScanSummary(scan: {
  id: string;
  date: string;
} & PhotoScanEstimateFields): CompositionSnapshot | null {
  const min = finiteEstimateNumber(scan.estimatedBodyFatMin ?? scan.estimated_body_fat_min);
  const max = finiteEstimateNumber(scan.estimatedBodyFatMax ?? scan.estimated_body_fat_max);
  // One real bound is enough to morph. Do not invent a missing side.
  const totalBodyFatPct =
    min !== null && max !== null ? midpoint(min, max) : (min ?? max);
  if (totalBodyFatPct === null) return null;
  const whrMin = finiteEstimateNumber(scan.estimatedWhrMin ?? scan.estimated_whr_min);
  const whrMax = finiteEstimateNumber(scan.estimatedWhrMax ?? scan.estimated_whr_max);
  const hasWhr = whrMin !== null && whrMax !== null;
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
