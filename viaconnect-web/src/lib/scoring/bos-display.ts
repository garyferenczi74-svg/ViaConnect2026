/**
 * Shared Bio Optimization Score display guards.
 *
 * One read path: GET /api/bos/current (bio_optimization_history).
 * This module does not recompute score math. It only decides what is
 * safe to show: a finite persisted score, or an honest empty state.
 *
 * Contract (Brief 13 / P0):
 *   - never the string "NaN"
 *   - never fake 0 as a score when the value is uncomputable
 *   - uncomputable copy is "Not enough data yet"
 *   - stale computed_at is a visible stale state, not silent
 */

export const BOS_INSUFFICIENT_DATA_COPY = 'Not enough data yet';

/** 7 days. A last-updated date older than this is stale, not current. */
export const BOS_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type BosFreshness = 'missing' | 'fresh' | 'stale';

/**
 * Coerce an unknown API / history value to a displayable BOS.
 * Finite numbers (including a real persisted 0) pass through.
 * NaN, Infinity, blank strings, null, and undefined become null.
 */
export function toDisplayBosScore(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** True when the value can be shown as a Bio Optimization Score. */
export function isComputableBosScore(value: unknown): boolean {
  return toDisplayBosScore(value) !== null;
}

/**
 * Human-readable score. Uncomputable values become
 * "Not enough data yet", never "NaN" and never "0" unless 0 was persisted.
 */
export function formatBosScore(value: unknown): string {
  const n = toDisplayBosScore(value);
  if (n === null) return BOS_INSUFFICIENT_DATA_COPY;
  return String(n);
}

/**
 * Weekly delta from two persisted scores. Null when either score is
 * missing, non-finite, or the dates are the same row (not a week-ago pair).
 * Does not invent 0 when the prior week is absent.
 */
export function computeWeeklyDelta(
  currentScore: unknown,
  priorScore: unknown,
  currentDate?: string | null,
  priorDate?: string | null,
): number | null {
  const current = toDisplayBosScore(currentScore);
  const prior = toDisplayBosScore(priorScore);
  if (current === null || prior === null) return null;
  if (currentDate && priorDate && currentDate === priorDate) return null;
  return current - prior;
}

export function classifyBosFreshness(
  computedAt: string | null | undefined,
  nowMs: number = Date.now(),
): BosFreshness {
  if (!computedAt) return 'missing';
  const t = Date.parse(computedAt);
  if (!Number.isFinite(t)) return 'missing';
  return nowMs - t > BOS_STALE_AFTER_MS ? 'stale' : 'fresh';
}

export function formatBosLastUpdated(
  computedAt: string | null | undefined,
  nowMs: number = Date.now(),
): { freshness: BosFreshness; label: string } {
  const freshness = classifyBosFreshness(computedAt, nowMs);
  if (freshness === 'missing' || !computedAt) {
    return { freshness: 'missing', label: 'Last updated unknown' };
  }
  const parsed = new Date(computedAt);
  const dateLabel = Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
    : 'unknown';
  if (freshness === 'stale') {
    return { freshness, label: `Last updated ${dateLabel} (stale)` };
  }
  return { freshness, label: `Last updated ${dateLabel}` };
}

/** UTC calendar date seven days before `fromDate` (YYYY-MM-DD). */
export function weekAgoDate(fromDate: string): string | null {
  const d = new Date(`${fromDate}T00:00:00.000Z`);
  if (!Number.isFinite(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}
