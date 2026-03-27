import type { NormalizedDaySummary } from './normalizer';

// ── Types ────────────────────────────────────────────────────────────

export interface HealthScores {
  recovery: number;
  sleep: number;
  strain: number;
  stress: number;
  energy: number;
  geneticOptimization: number;
}

export interface GeneticProfile {
  actn3?: string;       // e.g. 'RR', 'RX', 'XX'
  clock?: string;       // e.g. 'TC', 'CC', 'TT'
  comt?: string;        // e.g. 'Val/Val', 'Val/Met', 'Met/Met'
  maoa?: string;        // e.g. '3R', '3.5R', '4R', '5R'
  completedPanels?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Genetic modifier for ACTN3 — shifts recovery score based on
 * power vs. endurance expression.
 */
function actn3Modifier(variant: string | undefined): number {
  switch (variant) {
    case 'RR': return 5;    // power-dominant: faster recovery signal
    case 'RX': return 2;    // mixed
    case 'XX': return -3;   // endurance-dominant: slower acute recovery
    default: return 0;
  }
}

/**
 * CLOCK chronotype alignment bonus.
 * Rewards or penalises based on chronotype match with actual sleep timing.
 */
function clockChronotypeBonus(variant: string | undefined): number {
  switch (variant) {
    case 'TT': return 5;    // strong morning chronotype — bonus if sleep is good
    case 'TC': return 2;    // moderate
    case 'CC': return -2;   // evening chronotype — sleep is harder to optimise
    default: return 0;
  }
}

/**
 * COMT stress susceptibility modifier.
 * Met/Met = slower catecholamine clearance → higher stress susceptibility.
 */
function comtStressModifier(variant: string | undefined): number {
  switch (variant) {
    case 'Val/Val': return 5;    // warrior: clears stress hormones fast
    case 'Val/Met': return 0;    // balanced
    case 'Met/Met': return -8;   // worrier: higher susceptibility
    default: return 0;
  }
}

/**
 * MAOA stress susceptibility modifier.
 */
function maoaStressModifier(variant: string | undefined): number {
  switch (variant) {
    case '4R':
    case '5R':
      return 3;   // higher activity = better stress clearance
    case '3.5R':
      return 0;
    case '3R':
      return -5;  // lower activity = slower serotonin clearance
    default:
      return 0;
  }
}

// ── Main Computation ─────────────────────────────────────────────────

/**
 * Computes composite health scores from wearable data, genetic profile,
 * and protocol compliance.
 *
 * All scores are clamped to 0-100.
 */
export function computeHealthScores(
  userId: string,
  wearableData: NormalizedDaySummary,
  geneticProfile: GeneticProfile | null,
  complianceRate: number
): HealthScores {
  const gp = geneticProfile ?? {};

  // ── Recovery Score ──────────────────────────────────────────────
  //    HRV ratio + RHR delta + sleep score + ACTN3 genetic modifier
  const hrvBaseline = 50; // population average placeholder
  const rhrBaseline = 65; // population average placeholder

  const hrvRatio = wearableData.hrv_avg != null
    ? (wearableData.hrv_avg / hrvBaseline) * 30
    : 25;

  const rhrDelta = wearableData.resting_hr != null
    ? Math.max(0, (rhrBaseline - wearableData.resting_hr)) * 1.5
    : 10;

  const sleepComponent = wearableData.sleep_score != null
    ? wearableData.sleep_score * 0.3
    : 20;

  const recovery = clamp(
    hrvRatio + rhrDelta + sleepComponent + actn3Modifier(gp.actn3)
  );

  // ── Sleep Score ─────────────────────────────────────────────────
  //    Base from wearable sleep_score + CLOCK chronotype alignment
  const baseSleep = wearableData.sleep_score ?? 50;
  const sleep = clamp(baseSleep + clockChronotypeBonus(gp.clock));

  // ── Strain Score ────────────────────────────────────────────────
  //    From wearable strain_score or active_calories normalized
  let strain: number;
  if (wearableData.strain_score != null) {
    // Terra strain is typically 0-21 (WHOOP scale), normalize to 0-100
    strain = clamp((wearableData.strain_score / 21) * 100);
  } else if (wearableData.active_calories != null) {
    // Normalize active calories: 800 cal ~ 100% strain
    strain = clamp((wearableData.active_calories / 800) * 100);
  } else {
    strain = 0;
  }

  // ── Stress Score ────────────────────────────────────────────────
  //    From wearable (already inverted in normalizer: higher = better)
  //    + COMT/MAOA genetic susceptibility modifiers
  const baseStress = wearableData.stress_score ?? 50;
  const stress = clamp(
    baseStress + comtStressModifier(gp.comt) + maoaStressModifier(gp.maoa)
  );

  // ── Energy Score ────────────────────────────────────────────────
  //    body_battery if available, else (recovery + inverse stress) / 2
  let energy: number;
  if (wearableData.body_battery != null) {
    energy = clamp(wearableData.body_battery);
  } else {
    energy = clamp((recovery + stress) / 2);
  }

  // ── Genetic Optimization Score ──────────────────────────────────
  //    panelScore + complianceScore + biometricScore + engagementScore
  const completedPanels = gp.completedPanels ?? 0;
  const panelScore = Math.min(30, completedPanels * 5);
  const complianceScore = Math.min(30, complianceRate * 0.3);
  const biometricScore = Math.min(20, (recovery + sleep) / 10);
  const engagementScore = Math.min(20, 15); // placeholder
  const geneticOptimization = clamp(
    panelScore + complianceScore + biometricScore + engagementScore
  );

  return {
    recovery,
    sleep,
    strain,
    stress,
    energy,
    geneticOptimization,
  };
}
