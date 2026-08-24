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

// Explicit, intentional alias map: a metric key here means "no dimension
// row named exactly this metric exists today, so borrow this named
// dimension's row instead." A metric NOT listed here matches a row of the
// same dimension name (no row exists yet for hrv / resting_hr / steps, so
// they stay unmatched until a future task wires that data in).
//
// workouts <- strain: interim and imprecise by design, not an accidental
// string match. Whoop Strain is a daily cardio-load score, not a workout
// log (see wearable-snapshot.ts, "Whoop native only"). No fabricated value
// renders through this alias -- buildContributorRows only ever surfaces
// the strain row's real source-attribution -- but the "Workouts" label
// pointing at a Strain-sourced row can overstate precision to a reader.
// Replace this entry once a real workouts/exercise-log dimension exists;
// do not add further aliases onto 'strain' without revisiting the label.
//
// body_composition <- metabolic: accurate, no caveat -- metabolic rows are
// body composition/weight data (Hume, Apple Health), so this alias is a
// rename, not a reinterpretation.
export const METRIC_DIMENSION_ALIAS: Readonly<Partial<Record<ContributorMetric, string>>> = {
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
