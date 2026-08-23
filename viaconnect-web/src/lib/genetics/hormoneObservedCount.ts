// HormoneIQ observed count: DUTCH / HormoneIQ mapping markers only.
// Gary: HormoneIQ is DUTCH mapping, not a SNP panel and not generic hormone
// names. A row increments the badge only when provenance is DUTCH, HormoneIQ,
// or an explicit hormone_iq / DUTCH source table. Quest (or any other lab)
// estradiol does not count just because the name is hormone-like.
// NEVER user_variants SNP length.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import { normalizeBiomarkerKey } from '@/lib/kb/hormones/matchLabMarkers';

export interface HormoneMarkerSourceRow {
  name: string;
  source_type?: string | null;
  lab_name?: string | null;
  source_filename?: string | null;
  /** True when the row was read from an explicit DUTCH / hormone_iq table. */
  fromHormoneIqTable?: boolean;
  value?: number | null;
  unit?: string | null;
  measured_at?: string | null;
}

const DUTCH_OR_HORMONE_IQ_SOURCE =
  /dutch|hormone[_-\s]?iq|hormoneiq|precision\s*analytical/i;

export function isDutchOrHormoneIqSource(
  sourceType: string | null | undefined,
  labName: string | null | undefined,
  sourceFilename: string | null | undefined,
): boolean {
  return DUTCH_OR_HORMONE_IQ_SOURCE.test(
    `${sourceType ?? ''} ${labName ?? ''} ${sourceFilename ?? ''}`,
  );
}

export function isHormoneObservedRow(row: HormoneMarkerSourceRow): boolean {
  const name = row.name?.trim();
  if (!name) return false;
  if (row.fromHormoneIqTable === true) return true;
  return isDutchOrHormoneIqSource(row.source_type, row.lab_name, row.source_filename);
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
