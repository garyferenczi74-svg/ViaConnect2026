// Cross-scan asymmetry trend decision (Prompt #169e Phase 1, section 3.2).
//
// PURE decision module, no I/O. Given the per-scan asymmetry_report blobs already
// persisted on body_photo_sessions (newest first), it decides which paired
// measurements show a CLINICALLY NOTABLE, SUSTAINED imbalance to surface on the
// consumer Insights tab and (as clinical context) the practitioner Body Scan tab.
//
// THE RULE (section 3.2, item 3):
//   A paired measurement whose left/right delta EXCEEDS 10 percent AND is
//   SUSTAINED across 2 OR MORE scans.
//
//   * "exceeds 10 percent": strict, the magnitude must be > 10. Exactly 10.0 does
//     NOT trigger (boundary tested in asymmetry-trend.test.ts).
//   * "sustained across 2 or more scans": the SAME paired measurement is over the
//     threshold in at least 2 of the scans considered. A single over-threshold
//     scan does NOT trigger; two (or more) do.
//
// This is INFORMATIONAL, never a diagnosis. The copy that renders these is
// non-alarming and slot-driven in the UI; this module only makes the decision and
// hands back the magnitude/direction so the UI can phrase it.

import type { AsymmetryCheck, AsymmetryReport } from '@/lib/arnold/scanning/types';

/** A paired measurement's signed delta, sustained over time is decided here. */
export const ASYMMETRY_TREND_THRESHOLD_PCT = 10;
export const ASYMMETRY_TREND_MIN_SCANS = 2;

/** Which side a sustained imbalance favors, from the most recent over-threshold scan. */
export type AsymmetryDominantSide = 'left' | 'right';

export interface AsymmetryTrend {
  /** Paired-measurement name, e.g. "Bicep circumference". */
  name: string;
  /** Number of considered scans in which this pair exceeded the 10 percent threshold. */
  sustainedCount: number;
  /** Total scans that had a (measured) reading for this pair. */
  observedCount: number;
  /**
   * Largest over-threshold magnitude (absolute deltaPct) seen across the
   * sustained scans, for the UI to phrase the size of the gap. Always > 10.
   */
  maxDeltaPct: number;
  /** Signed deltaPct from the MOST RECENT scan that exceeded the threshold. */
  latestDeltaPct: number;
  /** Larger side from the most recent over-threshold scan (right when positive). */
  dominantSide: AsymmetryDominantSide;
}

/**
 * Treat a single check as over-threshold when it is MEASURED and its signed
 * percent delta magnitude EXCEEDS the threshold. The not-measured guard in the
 * analyzer yields deltaPct === 0 (and balanceRatioPct === 0), so an unmeasured
 * pair is never counted; a strict `> threshold` keeps exactly 10.0 out.
 */
function isOverThreshold(check: AsymmetryCheck, thresholdPct: number): boolean {
  // Defensive: tolerate older persisted reports that predate the deltaPct field
  // by deriving the unsigned magnitude from balanceRatioPct when needed.
  const measured = check.balanceRatioPct > 0;
  if (!measured) return false;
  const magnitude = deltaPctMagnitude(check);
  return magnitude > thresholdPct;
}

/**
 * Unsigned percent gap for a check. Prefers the signed deltaPct added in #169e;
 * falls back to (100 - balanceRatioPct) for reports persisted before that field
 * existed (the two are equal by construction).
 */
function deltaPctMagnitude(check: AsymmetryCheck): number {
  if (typeof check.deltaPct === 'number' && Number.isFinite(check.deltaPct)) {
    return Math.abs(check.deltaPct);
  }
  return Math.round((100 - check.balanceRatioPct) * 10) / 10;
}

/** Signed percent gap for a check, falling back when deltaPct is absent. */
function signedDeltaPct(check: AsymmetryCheck): number {
  if (typeof check.deltaPct === 'number' && Number.isFinite(check.deltaPct)) {
    return check.deltaPct;
  }
  // Without a sign we cannot recover direction; default to right-larger framing.
  return deltaPctMagnitude(check);
}

/**
 * Decide the sustained, clinically notable asymmetry trends across a series of
 * scans. `reports` MUST be ordered NEWEST FIRST (the order body_photo_sessions is
 * read in the Insights tab). Returns one AsymmetryTrend per paired measurement
 * that exceeds the threshold in `minScans` or more of the considered scans,
 * sorted by sustainedCount desc then maxDeltaPct desc (most notable first).
 */
export function detectSustainedAsymmetryTrends(
  reports: Array<AsymmetryReport | null | undefined>,
  opts: { thresholdPct?: number; minScans?: number } = {},
): AsymmetryTrend[] {
  const thresholdPct = opts.thresholdPct ?? ASYMMETRY_TREND_THRESHOLD_PCT;
  const minScans = opts.minScans ?? ASYMMETRY_TREND_MIN_SCANS;

  // Accumulate per paired-measurement name across all scans.
  const acc = new Map<string, {
    sustainedCount: number;
    observedCount: number;
    maxDeltaPct: number;
    latestSignedDeltaPct: number | null; // from the most recent over-threshold scan
  }>();

  // reports are newest-first; iterate in that order so the FIRST over-threshold
  // hit we record for a name is the latest one.
  for (const report of reports) {
    if (!report || !Array.isArray(report.checks)) continue;
    for (const check of report.checks) {
      const measured = check.balanceRatioPct > 0;
      const entry = acc.get(check.name) ?? {
        sustainedCount: 0,
        observedCount: 0,
        maxDeltaPct: 0,
        latestSignedDeltaPct: null,
      };
      if (measured) entry.observedCount += 1;
      if (isOverThreshold(check, thresholdPct)) {
        entry.sustainedCount += 1;
        const mag = deltaPctMagnitude(check);
        if (mag > entry.maxDeltaPct) entry.maxDeltaPct = mag;
        if (entry.latestSignedDeltaPct === null) {
          entry.latestSignedDeltaPct = signedDeltaPct(check);
        }
      }
      acc.set(check.name, entry);
    }
  }

  const trends: AsymmetryTrend[] = [];
  for (const [name, entry] of acc) {
    if (entry.sustainedCount < minScans) continue;
    const latest = entry.latestSignedDeltaPct ?? 0;
    trends.push({
      name,
      sustainedCount: entry.sustainedCount,
      observedCount: entry.observedCount,
      maxDeltaPct: Math.round(entry.maxDeltaPct * 10) / 10,
      latestDeltaPct: Math.round(latest * 10) / 10,
      dominantSide: latest >= 0 ? 'right' : 'left',
    });
  }

  trends.sort((a, b) =>
    b.sustainedCount - a.sustainedCount ||
    b.maxDeltaPct - a.maxDeltaPct ||
    a.name.localeCompare(b.name),
  );
  return trends;
}
