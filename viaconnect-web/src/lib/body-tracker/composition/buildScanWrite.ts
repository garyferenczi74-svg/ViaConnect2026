// Pure function: derive + ids -> insert payloads for body_tracker_entries and body_tracker_segmental_fat.
// Honest model: only total_body_fat_pct is written from a photo scan.
// Regional fat, visceral fat, and body water are UNKNOWN - never written as 0, never included.

import type { ScanDerived } from './types';

export function buildScanWrite(args: {
  userId: string;
  scanId: string;
  scanDate: string;
  derived: ScanDerived;
}): { entry: Record<string, unknown>; segFat: Record<string, unknown> } {
  const { userId, scanId, scanDate, derived } = args;

  const entry: Record<string, unknown> = {
    user_id: userId,
    scan_id: scanId,
    source: 'scan',
    device_name: 'FormaVision',
    entry_date: scanDate,
    confidence: derived.confidence,
  };

  // entry_id is filled by the route after the entry insert returns its id.
  // Only write total_body_fat_pct - all other segmental fields are UNKNOWN from a photo scan.
  const segFat: Record<string, unknown> = {
    user_id: userId,
    total_body_fat_pct: derived.totalBodyFatPct,
  };

  return { entry, segFat };
}
