/**
 * Winner declaration evaluation (Prompt #138a §6.4).
 *
 * Five conditions, ALL must hold to be eligible for promotion:
 *   1. ≥5,000 visitors per variant
 *   2. ≥14 days runtime
 *   3. 95% one-sided binomial confidence vs. control
 *   4. ≥1pp absolute lift in CAQ-start rate
 *   5. Steve approval before promotion (handled outside this module —
 *      this returns "eligible" not "promote")
 *
 * Approximate two-proportion z-test for #3 (Wald test, one-sided). With
 * n_min=5000 the normal approximation is well-justified; for tighter
 * numerical rigor a beta-binomial would be marginally better but adds
 * dependency surface for negligible behavior change.
 */

import { WINNER_THRESHOLDS } from "./types";

export interface VariantOutcome {
  slotId: string;
  visitors: number; // unique visitors with at least one impression
  caqStarts: number; // unique visitors who clicked CAQ-start
}

export interface WinnerCheckArgs {
  controlSlotId: string;
  variantOutcomes: VariantOutcome[]; // includes control + each variant
  testStartedAt: Date;
  now?: Date;
}

export interface VariantEvaluation {
  slotId: string;
  visitors: number;
  caqStarts: number;
  conversionRate: number;
  liftAbsolutePoints: number; // vs. control (in percentage points)
  zScore: number; // null for control
  pValue: number; // null for control
  meetsSampleSize: boolean;
  meetsConfidence: boolean;
  meetsLift: boolean;
}

export interface WinnerCheckResult {
  runtimeDays: number;
  meetsRuntime: boolean;
  control: VariantEvaluation;
  variants: VariantEvaluation[];
  /** The single best-eligible variant slot_id, or null if none. */
  eligibleWinnerSlotId: string | null;
  notes: string[];
}

export function evaluateWinner(args: WinnerCheckArgs): WinnerCheckResult {
  const now = args.now ?? new Date();
  const runtimeDays = Math.floor((now.getTime() - args.testStartedAt.getTime()) / (24 * 60 * 60 * 1000));
  const meetsRuntime = runtimeDays >= WINNER_THRESHOLDS.min_runtime_days;
  const notes: string[] = [];

  const control = args.variantOutcomes.find((v) => v.slotId === args.controlSlotId);
  if (!control) {
    return {
      runtimeDays,
      meetsRuntime,
      control: emptyEvaluation(args.controlSlotId),
      variants: [],
      eligibleWinnerSlotId: null,
      notes: [`Control slot "${args.controlSlotId}" missing from variantOutcomes.`],
    };
  }

  const controlEval = scoreEvaluation(control, control);
  const variantEvals = args.variantOutcomes
    .filter((v) => v.slotId !== args.controlSlotId)
    .map((v) => scoreEvaluation(v, control));

  if (!meetsRuntime) {
    notes.push(`Runtime ${runtimeDays}d below threshold ${WINNER_THRESHOLDS.min_runtime_days}d.`);
  }

  let eligibleWinnerSlotId: string | null = null;
  if (meetsRuntime) {
    const eligible = variantEvals
      .filter((e) => e.meetsSampleSize && e.meetsConfidence && e.meetsLift)
      .filter((e) => controlEval.meetsSampleSize)
      .sort((a, b) => b.liftAbsolutePoints - a.liftAbsolutePoints);
    eligibleWinnerSlotId = eligible[0]?.slotId ?? null;
  }

  return {
    runtimeDays,
    meetsRuntime,
    control: controlEval,
    variants: variantEvals,
    eligibleWinnerSlotId,
    notes,
  };
}

function scoreEvaluation(target: VariantOutcome, control: VariantOutcome): VariantEvaluation {
  const meetsSampleSize = target.visitors >= WINNER_THRESHOLDS.min_visitors_per_variant;
  const conversionRate = target.visitors > 0 ? target.caqStarts / target.visitors : 0;
  const controlRate = control.visitors > 0 ? control.caqStarts / control.visitors : 0;
  const liftAbsolutePoints = (conversionRate - controlRate) * 100;
  const meetsLift = liftAbsolutePoints >= WINNER_THRESHOLDS.min_absolute_lift_percentage_points;

  let zScore = 0;
  let pValue = 1;
  if (target.slotId !== control.slotId && target.visitors > 0 && control.visitors > 0) {
    const p1 = conversionRate;
    const p2 = controlRate;
    const n1 = target.visitors;
    const n2 = control.visitors;
    const pooled = (target.caqStarts + control.caqStarts) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    if (se > 0) {
      zScore = (p1 - p2) / se;
      // One-sided upper tail. Z~1.645 ≈ 95% confidence.
      pValue = 1 - normalCdf(zScore);
    }
  }
  const meetsConfidence = pValue <= 1 - WINNER_THRESHOLDS.confidence_level;

  return {
    slotId: target.slotId,
    visitors: target.visitors,
    caqStarts: target.caqStarts,
    conversionRate,
    liftAbsolutePoints,
    zScore,
    pValue,
    meetsSampleSize,
    meetsConfidence,
    meetsLift,
  };
}

function emptyEvaluation(slotId: string): VariantEvaluation {
  return {
    slotId,
    visitors: 0,
    caqStarts: 0,
    conversionRate: 0,
    liftAbsolutePoints: 0,
    zScore: 0,
    pValue: 1,
    meetsSampleSize: false,
    meetsConfidence: false,
    meetsLift: false,
  };
}

/**
 * Normal CDF via Abramowitz & Stegun 7.1.26 approximation (max error ~7.5e-8).
 * Adequate for hypothesis testing at the precision the Wald test allows.
 */
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  const erf =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}
