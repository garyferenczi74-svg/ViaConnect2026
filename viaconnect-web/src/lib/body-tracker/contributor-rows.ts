// Prompt 230 Task 7: 7-MetricKey contributor rows for the Connections
// ScoreDetailPanel. Maps each of the 7 wearable MetricKeys (Task 1,
// src/lib/wearables/types.ts DEFAULT_PRECEDENCE) to the DimensionSourceRow
// that currently supplies it.
//
// scoreDetailFromSnapshot still keys rows by the OLD 4 display dims
// (sleep, recovery, strain, metabolic), so this module accepts aliases:
// workouts <- strain, body_composition <- metabolic. hrv, resting_hr, and
// steps have no matching row today and stay connectedSource: null, which
// renders as "Connect your device" rather than a fabricated value.
//
// A metric only counts as connected when the matched row's
// showRing === true. That is the "has real data" gate, not value alone.

import type { DimensionSourceRow } from './source-disagreement';

export const CONTRIBUTOR_METRICS = [
  'hrv',
  'sleep',
  'resting_hr',
  'recovery',
  'workouts',
  'body_composition',
  'steps',
] as const;

export type ContributorMetric = (typeof CONTRIBUTOR_METRICS)[number];

export const METRIC_LABELS: Record<ContributorMetric, string> = {
  hrv: 'HRV',
  sleep: 'Sleep',
  resting_hr: 'Resting HR',
  recovery: 'Recovery',
  workouts: 'Workouts',
  body_composition: 'Body comp.',
  steps: 'Steps',
};

// Alias a metric to the DimensionSourceRow.dimension key that supplies it
// today. A metric not listed here matches a row of the same dimension name
// (no row exists yet for hrv / resting_hr / steps).
const METRIC_DIMENSION_ALIAS: Partial<Record<ContributorMetric, string>> = {
  workouts: 'strain',
  body_composition: 'metabolic',
};

export function dimensionForMetric(metric: ContributorMetric): string {
  return METRIC_DIMENSION_ALIAS[metric] ?? metric;
}

export function matchRowForMetric(
  metric: ContributorMetric,
  rows: DimensionSourceRow[],
): DimensionSourceRow | null {
  const dimension = dimensionForMetric(metric);
  return rows.find((row) => row.dimension === dimension) ?? null;
}

export interface ContributorRow {
  metric: string;
  label: string;
  connectedSource: string | null;
}

export function buildContributorRows(rows: DimensionSourceRow[]): ContributorRow[] {
  return CONTRIBUTOR_METRICS.map((metric) => {
    const matched = matchRowForMetric(metric, rows);
    const connectedSource = matched?.showRing === true ? matched.source : null;
    return {
      metric,
      label: METRIC_LABELS[metric],
      connectedSource,
    };
  });
}
