// Prompt 192 Task 2: micronutrient_gap detector (weekly).
//
// Works over the 7 day rolling window using fully scored days only. A day
// is covered for a nutrient only when the day is fully scored AND the
// nutrient key is present in the day totals; a missing key is UNKNOWN, not
// 0. This is the ONLY insight type allowed a productSuggestion, and only
// when the gap recurs on at least 5 of the last 7 scored days (spec
// acceptance: a 4 of 7 case yields NO suggestion).
//
// Reference intakes are general adult reference values (NIH DRI high end
// across adult groups), used as a fixed comparison line, never as a
// personalized prescription. Copy must speak to logged intake vs the
// general reference, never to a deficiency diagnosis.

import { makeFingerprint } from '../fingerprint';
import type { DetectorInput, InsightFact, ProductSuggestion } from '../types';
import { clampMagnitude } from './shared';

interface MicronutrientRef {
  label: string;
  unit: string;
  reference: number;
}

const MICRONUTRIENT_REFERENCE: Record<string, MicronutrientRef> = {
  iron_mg: { label: 'iron', unit: 'mg', reference: 18 },
  magnesium_mg: { label: 'magnesium', unit: 'mg', reference: 420 },
  potassium_mg: { label: 'potassium', unit: 'mg', reference: 3400 },
  calcium_mg: { label: 'calcium', unit: 'mg', reference: 1000 },
  zinc_mg: { label: 'zinc', unit: 'mg', reference: 11 },
  vitamin_c_mg: { label: 'vitamin C', unit: 'mg', reference: 90 },
  vitamin_d_mcg: { label: 'vitamin D', unit: 'mcg', reference: 20 },
};

const GAP_FRACTION = 0.7;
const MIN_GAP_DAYS = 3;
const MIN_COVERED_DAYS = 3;
const SUGGESTION_MIN_GAP_DAYS = 5;

export function detectMicronutrientGap(input: DetectorInput): InsightFact[] {
  const days = input.micronutrientDays.filter((d) => d.fullyScored);
  if (days.length === 0) return [];

  let winner:
    | {
        key: string;
        ref: MicronutrientRef;
        gapDays: number;
        coveredDays: number;
        avgIntake: number;
        avgAttainmentPct: number;
      }
    | null = null;

  for (const [key, ref] of Object.entries(MICRONUTRIENT_REFERENCE)) {
    let coveredDays = 0;
    let gapDays = 0;
    let intakeSum = 0;
    for (const day of days) {
      const value = day.totals[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      coveredDays += 1;
      intakeSum += value;
      if (value < ref.reference * GAP_FRACTION) gapDays += 1;
    }
    if (coveredDays < MIN_COVERED_DAYS || gapDays < MIN_GAP_DAYS) continue;
    const avgIntake = Math.round((intakeSum / coveredDays) * 10) / 10;
    const avgAttainmentPct = Math.round((avgIntake / ref.reference) * 100);
    const beats =
      !winner ||
      gapDays > winner.gapDays ||
      (gapDays === winner.gapDays && avgAttainmentPct < winner.avgAttainmentPct);
    if (beats) {
      winner = { key, ref, gapDays, coveredDays, avgIntake, avgAttainmentPct };
    }
  }

  if (!winner) return [];
  const w = winner;

  let productSuggestion: ProductSuggestion | null = null;
  if (w.gapDays >= SUGGESTION_MIN_GAP_DAYS) {
    const candidate = input.productCandidates.find((c) => c.nutrientKeys.includes(w.key));
    if (candidate) {
      productSuggestion = {
        slug: candidate.slug,
        name: candidate.name,
        reason: `logged ${w.ref.label} intake came in under the general adult reference on ${w.gapDays} of the last ${w.coveredDays} fully logged days`,
      };
    }
  }

  const confidence =
    w.coveredDays >= 6 && w.gapDays >= SUGGESTION_MIN_GAP_DAYS
      ? 'high'
      : w.coveredDays >= 5
        ? 'medium'
        : 'low';

  return [
    {
      type: 'micronutrient_gap',
      horizon: 'weekly',
      severity: w.gapDays >= 6 ? 'attention' : 'info',
      confidence,
      factFingerprint: makeFingerprint('micronutrient_gap', 'weekly', {
        nutrientKey: w.key,
        gapDays: w.gapDays,
      }),
      snapshot: {
        nutrientKey: w.key,
        nutrientLabel: w.ref.label,
        unit: w.ref.unit,
        gapDays: w.gapDays,
        coveredDays: w.coveredDays,
        windowDays: 7,
        avgIntake: w.avgIntake,
        referenceIntake: w.ref.reference,
        refBasis: 'general adult reference intake',
        magnitudePct: clampMagnitude(100 - w.avgAttainmentPct),
      },
      productSuggestion,
    },
  ];
}
