// Prompt 204c lab engine (2026-06-18): deterministic biomarker status. The model
// is NOT used to decide status; this is pure rules against the applicable range.
//
// Tiers: optimal (within the range), monitor (out of range by a small margin),
// consult (out of range by a large margin, route to professional care), unknown
// (no value or no applicable range; never shown as a number).
//
// Decision Gate 4 (concerning-value policy): the consult threshold is a
// CONSERVATIVE, deterministic heuristic, a value more than MONITOR_MARGIN times
// the range width beyond a boundary. It is intentionally cautious and is NOT a
// per-marker critical-value table; sourcing true per-analyte critical thresholds
// is a clinical follow-up. The applicable range is the report's PRINTED range
// when present, else a canonical standard range; no range is ever invented here.

export type StatusTier = 'optimal' | 'monitor' | 'consult' | 'unknown';
export type StatusDirection = 'within' | 'below' | 'above' | 'unknown';

export interface Range {
  low: number;
  high: number;
}

export interface BiomarkerStatus {
  tier: StatusTier;
  direction: StatusDirection;
}

// How far beyond a range boundary (as a fraction of the range width) still counts
// as monitor rather than consult.
const MONITOR_MARGIN = 0.5;

/** The range status is judged against: the printed range if usable, else canonical. */
export function applicableRange(
  printed: Range | null | undefined,
  canonical: Range | null | undefined,
): Range | null {
  if (printed && Number.isFinite(printed.low) && Number.isFinite(printed.high) && printed.high > printed.low) {
    return printed;
  }
  if (canonical && Number.isFinite(canonical.low) && Number.isFinite(canonical.high) && canonical.high > canonical.low) {
    return canonical;
  }
  return null;
}

export function determineStatus(value: number | null, range: Range | null): BiomarkerStatus {
  if (value === null || !Number.isFinite(value) || range === null) {
    return { tier: 'unknown', direction: 'unknown' };
  }
  if (value >= range.low && value <= range.high) {
    return { tier: 'optimal', direction: 'within' };
  }
  const width = range.high - range.low;
  const direction: StatusDirection = value < range.low ? 'below' : 'above';
  const deviation = value < range.low ? range.low - value : value - range.high;
  const tier: StatusTier = deviation > MONITOR_MARGIN * width ? 'consult' : 'monitor';
  return { tier, direction };
}
