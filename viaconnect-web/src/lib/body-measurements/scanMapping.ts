// Prompt 179c: pure mapping from a body_scan_measurements row (girths in cm) to a
// body_tracker_circumference column payload (cm). Only canonical girths flow
// (DD-2); a girth with no canonical key (under_bust, waist_navel) is ignored; a
// null or non-positive girth produces no entry, so an unknown site is the absence
// of a value, never a 0. PURE, no IO.

import { SCAN_GIRTH_TO_SITE, SITE_TO_COLUMN } from './sites';

export type ScanGirthRow = Record<string, unknown>;

// Returns { circumference_column: cm_value } for the canonical sites the scan
// actually measured.
export function mapScanRowToCircumferenceCm(scanRow: ScanGirthRow): Record<string, number> {
  const out: Record<string, number> = {};
  for (const girthField of Object.keys(SCAN_GIRTH_TO_SITE)) {
    const site = SCAN_GIRTH_TO_SITE[girthField];
    const raw = scanRow[girthField];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      out[SITE_TO_COLUMN[site]] = Math.round(raw * 10) / 10;
    }
  }
  return out;
}

export function mappedSiteCount(payload: Record<string, number>): number {
  return Object.keys(payload).length;
}
