// Seven Connections SSOT chips on the score-first morning card.
// DISPLAY only. These keys do not feed Bio Optimization Score math.
// /api/bos/current remains the SSOT for the numeric score.

import {
  CONTRIBUTOR_METRICS,
  METRIC_LABELS,
  type ContributorMetric,
} from '@/lib/body-tracker/contributor-rows';

export const MORNING_CHIP_KEYS = CONTRIBUTOR_METRICS;

export type MorningChipKey = ContributorMetric;

export const MORNING_CHIP_LABELS = METRIC_LABELS;

/** First five sit under the honesty sentence, above source chips. */
export const MORNING_CHIP_PRIMARY_KEYS = [
  'hrv',
  'sleep',
  'resting_hr',
  'recovery',
  'workouts',
] as const satisfies readonly MorningChipKey[];

/** Body comp. and Steps sit in a centered footer band, with no second heading. */
export const MORNING_CHIP_FOOTER_KEYS = [
  'body_composition',
  'steps',
] as const satisfies readonly MorningChipKey[];

/** Lucide icon component names. UI maps these; this module stays JSX-free. */
export const MORNING_CHIP_ICONS: Record<MorningChipKey, string> = {
  hrv: 'HeartPulse',
  sleep: 'Moon',
  resting_hr: 'Gauge',
  recovery: 'Activity',
  workouts: 'Dumbbell',
  body_composition: 'Droplet',
  steps: 'Footprints',
};

export function isMorningChipKey(value: string): value is MorningChipKey {
  return (MORNING_CHIP_KEYS as readonly string[]).includes(value);
}
