// Prompt 192 Task 4: pure view helpers for the Nutrition Insights surfaces
// (the My Nutrition hub tile and the /nutrition/insights page). No React, no
// network, no clock reads: every instant is injected so the helpers are unit
// testable under the node environment.

import type {
  InsightConfidence,
  InsightHorizon,
  InsightSeverity,
  InsightType,
  ProductSuggestion,
} from '@/lib/nutrition/insights/types';

// Client side projection of one GET /api/nutrition/insights row.
export interface InsightRow {
  id: string;
  insight_type: InsightType;
  horizon: InsightHorizon;
  title: string;
  body: string;
  severity: InsightSeverity;
  confidence: InsightConfidence;
  data_snapshot: Record<string, unknown>;
  product_suggestion: ProductSuggestion | null;
  status: string;
  generated_at: string;
  expires_at: string;
}

// Canonical chip order for the eight insight types, mirroring the engine's
// type union (lib/nutrition/insights/types.ts).
export const INSIGHT_TYPE_ORDER: ReadonlyArray<InsightType> = [
  'macro_gap',
  'micronutrient_gap',
  'meal_timing_pattern',
  'hydration_correlation',
  'supplement_meal_alignment',
  'quality_trend',
  'consistency_streak',
  'score_mover',
];

// Human labels for the eight insight types (filter chips and card headers).
export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  macro_gap: 'Macros',
  micronutrient_gap: 'Micronutrients',
  meal_timing_pattern: 'Meal Timing',
  hydration_correlation: 'Hydration',
  supplement_meal_alignment: 'Supplements',
  quality_trend: 'Quality',
  consistency_streak: 'Consistency',
  score_mover: 'Score Movers',
};

/**
 * Relative timestamp for a generated_at instant: "just now", "Nm ago",
 * "Nh ago", "Nd ago". Fails open to an empty string on garbage input, and a
 * future instant clamps to "just now" rather than going negative.
 */
export function relativeTimestamp(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso);
  const nowMs = now.getTime();
  if (!Number.isFinite(then) || !Number.isFinite(nowMs)) return '';
  const elapsedMs = Math.max(0, nowMs - then);
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface SnapshotRow {
  label: string;
  value: string;
}

// snake_case key to a plain sentence-case label: window_days -> Window days.
function humanizeKey(key: string): string {
  const words = key.replace(/_+/g, ' ').trim();
  if (words === '') return '';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Integers keep their locale separators; non integers round to one decimal.
function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '';
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10;
  return rounded.toLocaleString('en-US');
}

// A primitive's display string, or null when the value has no plain rendering
// (objects, arrays, empty strings, null, undefined).
function formatPrimitive(value: unknown): string | null {
  if (typeof value === 'number') {
    const formatted = formatNumber(value);
    return formatted === '' ? null : formatted;
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  return null;
}

/**
 * data_snapshot to plain "label: value" rows. Never raw JSON: snake_case keys
 * are humanized, numbers are formatted, primitive arrays join with commas,
 * one level of nesting flattens into combined labels, and anything deeper is
 * omitted. Window and date fields pass through as their string values.
 */
export function snapshotToRows(
  snapshot: Record<string, unknown> | null | undefined,
): SnapshotRow[] {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return [];
  const rows: SnapshotRow[] = [];
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === null || value === undefined) continue;
    const primitive = formatPrimitive(value);
    if (primitive !== null) {
      rows.push({ label: humanizeKey(key), value: primitive });
      continue;
    }
    if (Array.isArray(value)) {
      const parts = value
        .map((item) => formatPrimitive(item))
        .filter((item): item is string => item !== null);
      if (parts.length > 0) rows.push({ label: humanizeKey(key), value: parts.join(', ') });
      continue;
    }
    if (typeof value === 'object') {
      // Flatten exactly one level; nested objects inside it are omitted.
      for (const [innerKey, innerValue] of Object.entries(value as Record<string, unknown>)) {
        const inner = formatPrimitive(innerValue);
        if (inner !== null) {
          rows.push({ label: humanizeKey(`${key}_${innerKey}`), value: inner });
        }
      }
    }
  }
  return rows;
}

/**
 * The insight a single-slot surface should show: severity 'attention' first,
 * then newest by generated_at. Among multiple attention rows the newest wins.
 */
export function topInsight(insights: ReadonlyArray<InsightRow>): InsightRow | null {
  if (insights.length === 0) return null;
  const newestFirst = [...insights].sort(
    (a, b) => (Date.parse(b.generated_at) || 0) - (Date.parse(a.generated_at) || 0),
  );
  return newestFirst.find((i) => i.severity === 'attention') ?? newestFirst[0];
}

/**
 * Count chip for the hub tile. null when only the rendered top insight
 * exists; "N active" for a known count; "N+ active" when the read had a next
 * page, so the chip never understates an open ended count.
 */
export function activeCountChip(count: number, hasMore: boolean): string | null {
  if (hasMore) return `${count}+ active`;
  if (count > 1) return `${count} active`;
  return null;
}

/** 429 refresh envelope to user copy: retryAfterSeconds up to whole minutes. */
export function formatRetryAfter(retryAfterSeconds: number): string {
  const seconds = Number.isFinite(retryAfterSeconds) ? Math.max(0, retryAfterSeconds) : 0;
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Try again in ${minutes}m`;
}
