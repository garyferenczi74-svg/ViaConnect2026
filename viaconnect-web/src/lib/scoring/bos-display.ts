/**
 * Shared Bio Optimization Score display guards.
 *
 * One read path: GET /api/bos/current (bio_optimization_history).
 * This module does not recompute score math. It only decides what is
 * safe to show: a finite persisted score with named contributors, or
 * an honest empty state.
 *
 * Contract (Brief 13 / Brief 24 P0):
 *   - never the string "NaN"
 *   - never fake 0 as a score when the value is uncomputable
 *   - uncomputable copy is "Not enough data yet"
 *   - stale computed_at is a visible stale state, not silent
 *   - a finite persisted score is not shown without named contributors
 *   - CAQ / labs / other real sources must be named when they produced the score
 */

import type {
  AccuracyPill,
  BosNamedContributor,
  BosNamedContributorKey,
  BOSCurrentResponse,
} from './types';

export const BOS_INSUFFICIENT_DATA_COPY = 'Not enough data yet';

export type { BosNamedContributor, BosNamedContributorKey };

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

// ---------------------------------------------------------------------------
// Brief 24 contributor honesty
// ---------------------------------------------------------------------------

const ENGAGEMENT_CONTRIBUTOR_LABELS: Record<
  Exclude<BosNamedContributorKey, 'caq' | 'labs' | 'genetics'>,
  string
> = {
  nutrition: 'Nutrition',
  supplements: 'Supplements',
  body_tracker: 'Body Tracker',
  wearable: 'Wearable Data',
  plug_ins: 'Plug Ins',
  helix_challenges: 'Helix Challenges',
};

const WEARABLE_DEVICE_LABELS: Record<string, string> = {
  whoop: 'Whoop',
  oura: 'Oura',
  hume: 'Hume Body Pod',
  hume_body_pod: 'Hume Body Pod',
  apple_health: 'Apple Health XML',
  apple_health_xml: 'Apple Health XML',
  health_kit: 'Apple Health XML',
  healthkit: 'Apple Health XML',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasRealTimestamp(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

/**
 * Wearable is named only when present with a real last-sync or Hume/Apple XML
 * ingest. Linked-only is not enough. Brief 56: do not mint HRV / RHR from
 * wearable_daily_vitals. native_health_bridge stays off. Coming soon never feeds.
 */
export function isRealWearableContributor(wearable: unknown): boolean {
  if (!isRecord(wearable) || wearable.present !== true) return false;
  if (hasRealTimestamp(wearable.last_engaged_at)) return true;
  if (wearable.xml_ingest === true || wearable.hume_xml === true || wearable.apple_xml === true) {
    return true;
  }
  return false;
}

export function wearableContributorLabel(wearable: unknown): string {
  if (!isRecord(wearable) || !Array.isArray(wearable.device_types)) {
    return ENGAGEMENT_CONTRIBUTOR_LABELS.wearable;
  }
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const item of wearable.device_types) {
    if (typeof item !== 'string') continue;
    const mapped = WEARABLE_DEVICE_LABELS[item.trim().toLowerCase()];
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      labels.push(mapped);
    }
  }
  if (labels.length === 0) return ENGAGEMENT_CONTRIBUTOR_LABELS.wearable;
  return joinNamedLabels(labels);
}

function joinNamedLabels(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

export interface BosContributorEvidence {
  caqCompleted?: boolean;
  labsPresent?: boolean;
  geneticsPresent?: boolean;
  wearable?: unknown;
  engagement?: Partial<
    Record<
      Exclude<BosNamedContributorKey, 'caq' | 'labs' | 'genetics'>,
      { last_engaged_at?: string | null } | undefined
    >
  >;
}

/**
 * Collect named sources that actually produced a Bio Optimization Score.
 * Wearable presence without ingest evidence is ignored. Does not invent Connected.
 */
export function collectNamedBosContributors(
  evidence: BosContributorEvidence,
): BosNamedContributor[] {
  const out: BosNamedContributor[] = [];
  if (evidence.caqCompleted === true) {
    out.push({ key: 'caq', label: 'CAQ' });
  }
  if (evidence.labsPresent === true) {
    out.push({ key: 'labs', label: 'Labs' });
  }
  if (evidence.geneticsPresent === true) {
    out.push({ key: 'genetics', label: 'Genetics' });
  }

  const engagementOrder: Exclude<BosNamedContributorKey, 'caq' | 'labs' | 'genetics'>[] = [
    'nutrition',
    'supplements',
    'body_tracker',
    'wearable',
    'plug_ins',
    'helix_challenges',
  ];
  for (const key of engagementOrder) {
    if (key === 'wearable') continue;
    const row = evidence.engagement?.[key];
    if (row && hasRealTimestamp(row.last_engaged_at)) {
      out.push({ key, label: ENGAGEMENT_CONTRIBUTOR_LABELS[key] });
    }
  }

  if (isRealWearableContributor(evidence.wearable)) {
    out.push({ key: 'wearable', label: wearableContributorLabel(evidence.wearable) });
  } else if (hasRealTimestamp(evidence.engagement?.wearable?.last_engaged_at)) {
    out.push({ key: 'wearable', label: ENGAGEMENT_CONTRIBUTOR_LABELS.wearable });
  }

  return out;
}

export function contributorsFromAccuracyPills(
  pills: readonly Pick<AccuracyPill, 'key' | 'label' | 'state'>[] | null | undefined,
): BosNamedContributor[] {
  if (!Array.isArray(pills)) return [];
  const out: BosNamedContributor[] = [];
  for (const pill of pills) {
    if (pill.state !== 'complete') continue;
    if (pill.key === 'caq' || pill.key === 'labs' || pill.key === 'genetics') {
      out.push({ key: pill.key, label: pill.label || (pill.key === 'caq' ? 'CAQ' : pill.key === 'labs' ? 'Labs' : 'Genetics') });
    }
  }
  return out;
}

/**
 * Honest display score. Finite persisted values (including a real 0) pass
 * through only when at least one named contributor exists. Missing
 * contributors become null, never an invented 0.
 */
export function toHonestDisplayBosScore(
  value: unknown,
  contributors: readonly BosNamedContributor[] | null | undefined,
): number | null {
  const n = toDisplayBosScore(value);
  if (n === null) return null;
  if (!Array.isArray(contributors) || contributors.length === 0) return null;
  return n;
}

export function formatBosContributorLine(
  contributors: readonly BosNamedContributor[] | null | undefined,
): string | null {
  if (!Array.isArray(contributors) || contributors.length === 0) return null;
  return `From ${joinNamedLabels(contributors.map((c) => c.label))}`;
}

export interface HonestBosDisplay {
  score: number | null;
  contributors: BosNamedContributor[];
  contributorLine: string | null;
}

/**
 * Card-level honesty. Prefers the API contributor list. If that list is
 * empty, accuracy pills that are complete (CAQ / Labs / Genetics) still
 * count as named sources so a real CAQ/labs score is not silent.
 */
export function resolveHonestBosDisplay(
  data: Pick<BOSCurrentResponse, 'score'> & {
    contributors?: readonly BosNamedContributor[] | null;
    accuracy_pills?: readonly Pick<AccuracyPill, 'key' | 'label' | 'state'>[] | null;
  },
): HonestBosDisplay {
  let contributors = Array.isArray(data.contributors) ? [...data.contributors] : [];
  if (contributors.length === 0) {
    contributors = contributorsFromAccuracyPills(data.accuracy_pills);
  }
  const score = toHonestDisplayBosScore(data.score, contributors);
  if (score === null) {
    return { score: null, contributors: [], contributorLine: null };
  }
  return {
    score,
    contributors,
    contributorLine: formatBosContributorLine(contributors),
  };
}
