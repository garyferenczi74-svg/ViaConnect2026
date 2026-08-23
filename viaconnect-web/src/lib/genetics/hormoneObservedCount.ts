// HormoneIQ observed count: DUTCH hormone / metabolite markers from
// lab_biomarkers, lab_results_normalized, and DUTCH / hormone upload
// provenance. NEVER user_variants SNP length.
//
// A DUTCH (or HormoneIQ) upload counts every distinct biomarker on that
// upload, including metabolite names that do not match the hormone-like
// regex. Other lab uploads contribute only hormone-like biomarker names.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import {
  isHormoneLikeBiomarker,
  normalizeBiomarkerKey,
} from '@/lib/kb/hormones/matchLabMarkers';

export interface HormoneMarkerSourceRow {
  name: string;
  source_type?: string | null;
  lab_name?: string | null;
  source_filename?: string | null;
  value?: number | null;
  unit?: string | null;
  measured_at?: string | null;
}

const DUTCH_OR_HORMONE_SOURCE =
  /dutch|hormoneiq|hormone\s*iq|hormone|precision\s*analytical/i;

export function isDutchOrHormoneSource(
  sourceType: string | null | undefined,
  labName: string | null | undefined,
  sourceFilename: string | null | undefined,
): boolean {
  return DUTCH_OR_HORMONE_SOURCE.test(
    `${sourceType ?? ''} ${labName ?? ''} ${sourceFilename ?? ''}`,
  );
}

export function isHormoneObservedRow(row: HormoneMarkerSourceRow): boolean {
  const name = row.name?.trim();
  if (!name) return false;
  return (
    isDutchOrHormoneSource(row.source_type, row.lab_name, row.source_filename) ||
    isHormoneLikeBiomarker(name)
  );
}

/** Distinct hormone / metabolite markers. Never SNP length. */
export function countHormoneMarkers(rows: HormoneMarkerSourceRow[]): number {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!isHormoneObservedRow(row)) continue;
    keys.add(normalizeBiomarkerKey(row.name));
  }
  return keys.size;
}

export interface HubHormoneMarker {
  name: string;
  value: number | null;
  unit: string | null;
  measured_at: string | null;
}

/** Latest reading per distinct hormone / metabolite name. */
export function uniqueHormoneMarkers(
  rows: HormoneMarkerSourceRow[],
): HubHormoneMarker[] {
  const latest = new Map<string, HubHormoneMarker>();
  for (const row of rows) {
    if (!isHormoneObservedRow(row)) continue;
    const key = normalizeBiomarkerKey(row.name);
    if (latest.has(key)) continue;
    latest.set(key, {
      name: row.name.trim(),
      value: typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null,
      unit: typeof row.unit === 'string' ? row.unit : null,
      measured_at: typeof row.measured_at === 'string' ? row.measured_at : null,
    });
  }
  return [...latest.values()];
}
