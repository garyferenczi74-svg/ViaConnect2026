// Client-safe scan list types. Keep this file free of server imports so
// 'use client' history UI can type the /api/scan/history payload.

import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';

export type ScanCaptureStatus = 'uploading' | 'ready' | 'partial' | 'delete_pending' | 'deleted';

export interface ScanSummary {
  id: string;
  date: string;
  protocol: string;
  captureStatus: ScanCaptureStatus | null;
  poses: Record<PoseId, boolean>;
  // Honest photo-scan estimate range from body_tracker_photo_scans. Absent on
  // 4-pose guided rows (no analyze numbers on that table). Never invent 0.
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  estimatedWhrMin?: number | null;
  estimatedWhrMax?: number | null;
}

export function isReadyFormaVisionScan(scan: ScanSummary): boolean {
  return scan.protocol === FORMAVISION_PHOTO_PROTOCOL && scan.captureStatus === 'ready';
}

/** Coerce a real estimate number. Strings from numeric columns stay numbers; junk stays null. */
export function finiteEstimateNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function scanSummaryHasEstimateRange(scan: ScanSummary): boolean {
  const min = finiteEstimateNumber(scan.estimatedBodyFatMin);
  const max = finiteEstimateNumber(scan.estimatedBodyFatMax);
  return min !== null && max !== null;
}

/** Honest Ready-row range for Your scans. Null when the row has no estimate. */
export function formatScanEstimateBfRange(scan: ScanSummary): string | null {
  const min = finiteEstimateNumber(scan.estimatedBodyFatMin);
  const max = finiteEstimateNumber(scan.estimatedBodyFatMax);
  if (min === null || max === null) return null;
  return `${min.toFixed(1)}–${max.toFixed(1)}%`;
}

export function hasAnyPresentPose(poses: Record<PoseId, boolean>): boolean {
  return POSE_ORDER.some((pose) => poses[pose]);
}

/**
 * SSOT: formavision_photo never shows the FRBL grid (photos discarded after
 * analyze). No ImageOff, no signed-URL chase, no pose-present mapping.
 * Guided 4pose_v1 always uses the grid.
 */
export function scanHistoryShowsFrblGrid(scan: Pick<ScanSummary, 'protocol'>): boolean {
  return scan.protocol !== FORMAVISION_PHOTO_PROTOCOL;
}
