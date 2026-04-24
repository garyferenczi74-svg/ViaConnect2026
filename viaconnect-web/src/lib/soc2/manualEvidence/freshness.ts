// Prompt #122 P6: Freshness classifier.
//
// Pure function. Buckets a manual-evidence row into one of six states so
// the admin UI can surface expiry + signoff gaps without the dashboard
// rendering logic re-doing date math. The thresholds mirror SOC 2 auditor
// expectations: a control artifact older than a year is stale by default
// even without an explicit valid_until.

import type { FreshnessState, ManualEvidenceRow, ManualEvidenceRowWithFreshness } from './types';

export const EXPIRING_SOON_DAYS = 30;
export const STALE_DAYS_WITHOUT_EXPIRY = 365;

export interface FreshnessOpts {
  /** Reference "today"; injectable for deterministic tests. */
  now?: Date;
  /** Override the "expiring soon" window. */
  expiringSoonDays?: number;
  /** Override the stale-without-expiry window. */
  staleWithoutExpiryDays?: number;
}

/**
 * Classify a single row. Precedence, first match wins:
 *   1. archived                         → 'archived'
 *   2. valid_until in the past          → 'expired'
 *   3. valid_until within window        → 'expiring_soon'
 *   4. signoff_at unset                 → 'needs_signoff'
 *   5. no valid_until AND older than
 *      the stale threshold              → 'stale'
 *   6. else                             → 'fresh'
 */
export function classifyFreshness(row: ManualEvidenceRow, opts: FreshnessOpts = {}): { state: FreshnessState; daysUntilExpiry: number | null } {
  const now = opts.now ?? new Date();
  const expiringSoonDays = opts.expiringSoonDays ?? EXPIRING_SOON_DAYS;
  const staleDays = opts.staleWithoutExpiryDays ?? STALE_DAYS_WITHOUT_EXPIRY;

  if (row.archived) {
    return { state: 'archived', daysUntilExpiry: null };
  }

  const daysUntilExpiry = row.validUntil
    ? daysBetween(now, new Date(row.validUntil))
    : null;

  if (row.validUntil) {
    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      return { state: 'expired', daysUntilExpiry };
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= expiringSoonDays) {
      return { state: 'expiring_soon', daysUntilExpiry };
    }
  }

  if (!row.signoffAt) {
    return { state: 'needs_signoff', daysUntilExpiry };
  }

  if (!row.validUntil) {
    const uploadedDaysAgo = daysBetween(new Date(row.uploadedAt), now);
    if (uploadedDaysAgo >= staleDays) {
      return { state: 'stale', daysUntilExpiry: null };
    }
  }

  return { state: 'fresh', daysUntilExpiry };
}

/** Batch classify; convenience for admin list rendering. */
export function classifyMany(rows: readonly ManualEvidenceRow[], opts: FreshnessOpts = {}): ManualEvidenceRowWithFreshness[] {
  return rows.map((r) => {
    const { state, daysUntilExpiry } = classifyFreshness(r, opts);
    return { ...r, freshness: state, daysUntilExpiry };
  });
}

/** Aggregate counts by state. Useful for the dashboard strip. */
export interface FreshnessCounts {
  fresh: number;
  expiring_soon: number;
  expired: number;
  stale: number;
  needs_signoff: number;
  archived: number;
  total: number;
}

export function countByFreshness(rows: readonly ManualEvidenceRowWithFreshness[]): FreshnessCounts {
  const c: FreshnessCounts = {
    fresh: 0, expiring_soon: 0, expired: 0, stale: 0,
    needs_signoff: 0, archived: 0, total: rows.length,
  };
  for (const r of rows) c[r.freshness]++;
  return c;
}

/**
 * Filter down to rows that require attention: everything that isn't fresh
 * and isn't archived. Admin dashboard landing defaults to this view.
 */
export function needsAttention(rows: readonly ManualEvidenceRowWithFreshness[]): ManualEvidenceRowWithFreshness[] {
  return rows.filter((r) => r.freshness !== 'fresh' && r.freshness !== 'archived');
}

/**
 * Integer days between two dates. Positive = b is after a, negative = b is before a.
 * Uses UTC midnight to avoid DST drift.
 */
function daysBetween(a: Date, b: Date): number {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((bUtc - aUtc) / 86_400_000);
}
