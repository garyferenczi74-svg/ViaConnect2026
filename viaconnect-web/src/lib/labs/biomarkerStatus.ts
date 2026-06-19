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

// Per-analyte critical (panic) value thresholds, keyed by canonical biomarker
// key. These are the established clinical critical-value thresholds, NOT invented:
// a value at or beyond them routes to consult regardless of any printed range,
// and even when no range was provided. Hannah-verified. `units` lists the
// accepted normalized unit strings so a different-scale value cannot false-fire
// (for example platelets reported as a raw /uL count, not K/uL).
interface CriticalThreshold {
  low?: number;
  high?: number;
  units: string[];
}

// Thresholds and units verified by Hannah against the University of Iowa
// handbook, ARUP, and clinical consensus (conservative, catch-the-dangerous-value).
const CRITICAL_THRESHOLDS: Record<string, CriticalThreshold> = {
  potassium: { low: 2.8, high: 6.0, units: ['mmol/l', 'meq/l'] },
  sodium: { low: 120, high: 160, units: ['mmol/l', 'meq/l'] },
  glucose: { low: 50, high: 450, units: ['mg/dl'] },
  calcium: { low: 6.0, high: 13.0, units: ['mg/dl'] },
  platelets: {
    low: 20, high: 1000,
    units: ['k/ul', 'k/mm3', 'k/cumm', 'thou/ul', '10*3/ul', 'x10^3/ul', '10^3/ul', '10e3/ul', '10x3/ul', 'x10^9/l', '10^9/l'],
  },
};

function normalizeUnit(unit: string | null | undefined): string {
  return (unit ?? '').toLowerCase().replace(/\s+/g, '').replace(/[µμ]/g, 'u');
}

/** True when the value crosses an established critical threshold for its marker. */
export function isCriticalValue(
  biomarkerKey: string,
  value: number | null,
  unit: string | null,
): boolean {
  const t = CRITICAL_THRESHOLDS[biomarkerKey];
  if (!t || value === null || !Number.isFinite(value)) return false;
  if (!t.units.includes(normalizeUnit(unit))) return false;
  if (t.low !== undefined && value <= t.low) return true;
  if (t.high !== undefined && value >= t.high) return true;
  return false;
}

/**
 * Full status for a biomarker: a critical value forces consult (independent of
 * the printed-range heuristic and present even with no range); otherwise the
 * range-based tier applies.
 */
export function statusForBiomarker(
  biomarkerKey: string,
  value: number | null,
  unit: string | null,
  range: Range | null,
): BiomarkerStatus {
  if (isCriticalValue(biomarkerKey, value, unit)) {
    const t = CRITICAL_THRESHOLDS[biomarkerKey];
    const isLow = t.low !== undefined && value !== null && value <= t.low;
    return { tier: 'consult', direction: isLow ? 'below' : 'above' };
  }
  return determineStatus(value, range);
}
