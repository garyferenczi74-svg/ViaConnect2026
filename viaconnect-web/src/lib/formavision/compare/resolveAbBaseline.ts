// Prompt Brief 2: resolve the A/B compare baseline for FormaVision.
//
// Two modes, both parametric BodyParamVector sources (no photographic reconstruction):
//   last_scan      - the scan immediately before latest (the default)
//   protocol_start - the last scan at or before protocol start; if none is on
//                    file, fall back to the genuine first scan
//
// Comparable only when baseline and latest are distinct scans. A single scan,
// or a protocol start that is the current scan, is an honest non-compare.
// UNKNOWN is not invented here: this only picks which scan pair the delta
// lib and the wipe mesh consume.

import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type { CircumferenceMeasurements } from '@/lib/body-tracker/circumference';

export type AbBaselineMode = 'last_scan' | 'protocol_start';
export type AbBaselineKind = 'last_scan' | 'protocol_start' | 'first_scan_fallback';

export interface AbScanPoint {
  recordedAt: string;
  composition: CompositionSnapshot;
  circumferences: CircumferenceMeasurements | null;
}

export interface ResolveAbBaselineInput {
  // Oldest first. The caller pairs composition + circumference already.
  scans: AbScanPoint[];
  mode: AbBaselineMode;
  protocolStartedAt?: string | null;
}

export interface AbBaselineResult {
  baseline: AbScanPoint | null;
  latest: AbScanPoint | null;
  kind: AbBaselineKind | null;
  comparable: boolean;
}

function isSameScan(a: AbScanPoint, b: AbScanPoint): boolean {
  const aId = a.composition.entryId;
  const bId = b.composition.entryId;
  if (aId.length > 0 && bId.length > 0) {
    return aId === bId;
  }
  return a.recordedAt === b.recordedAt;
}

function emptyResult(latest: AbScanPoint | null): AbBaselineResult {
  return { baseline: null, latest, kind: null, comparable: false };
}

function withBaseline(
  baseline: AbScanPoint,
  latest: AbScanPoint,
  kind: AbBaselineKind,
): AbBaselineResult {
  return {
    baseline,
    latest,
    kind,
    comparable: !isSameScan(baseline, latest),
  };
}

/**
 * Pair composition snapshots (oldest first) with circumference history.
 * Match by recordedAt when possible; otherwise fall back to the same index.
 * A missing circumference row stays null (UNKNOWN), never an empty-zero object.
 */
export function pairScanPoints(
  snapshots: CompositionSnapshot[],
  circEntries: Array<{ recordedAt: string; measurements: CircumferenceMeasurements }>,
): AbScanPoint[] {
  return snapshots.map((snap, i) => {
    const byTime = circEntries.find((e) => e.recordedAt === snap.recordedAt);
    if (byTime) {
      return {
        recordedAt: snap.recordedAt,
        composition: snap,
        circumferences: byTime.measurements,
      };
    }
    const byIndex = circEntries[i];
    const indexTakenByTime = Boolean(
      byIndex && snapshots.some((s) => s.recordedAt === byIndex.recordedAt),
    );
    return {
      recordedAt: snap.recordedAt,
      composition: snap,
      circumferences: indexTakenByTime ? null : (byIndex?.measurements ?? null),
    };
  });
}

/**
 * Pure baseline picker. Never fabricates a scan. last_scan is the default
 * product path; protocol_start falls back to first when no protocol date is
 * on file or no scan sits at or before that date.
 */
export function resolveAbBaseline(input: ResolveAbBaselineInput): AbBaselineResult {
  const scans = input.scans;
  if (scans.length === 0) {
    return emptyResult(null);
  }
  const latest = scans[scans.length - 1];
  if (scans.length < 2) {
    return emptyResult(latest);
  }

  if (input.mode === 'last_scan') {
    return withBaseline(scans[scans.length - 2], latest, 'last_scan');
  }

  const first = scans[0];
  const startedAt = input.protocolStartedAt ?? null;
  if (startedAt === null || startedAt.length === 0) {
    return withBaseline(first, latest, 'first_scan_fallback');
  }

  const protocolMs = Date.parse(startedAt);
  if (!Number.isFinite(protocolMs)) {
    return withBaseline(first, latest, 'first_scan_fallback');
  }

  let chosen = first;
  let foundAtOrBefore = false;
  for (const scan of scans) {
    const t = Date.parse(scan.recordedAt);
    if (Number.isFinite(t) && t <= protocolMs) {
      chosen = scan;
      foundAtOrBefore = true;
    }
  }

  return withBaseline(
    chosen,
    latest,
    foundAtOrBefore ? 'protocol_start' : 'first_scan_fallback',
  );
}
