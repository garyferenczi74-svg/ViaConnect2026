// Prompt 192 Task 2: macro_gap detector (daily + weekly).
//
// Daily: examines the last completed local day and reports the single
// deepest covered shortfall under 80 percent of target. Weekly: reports the
// DOMINANT recurring gap across the 7 day window as ONE insight, never one
// per macro. A day is covered for a macro only when every scored meal that
// day could determine it (Prompt 177d known flags); UNKNOWN days are
// excluded from gap math entirely and surface as reduced coverage.

import { makeFingerprint } from '../fingerprint';
import type { DetectorInput, InsightFact, InsightSeverity, TrackedMacro } from '../types';
import {
  clampMagnitude,
  MACRO_DEFS,
  mealsByDate,
  roundPct,
  scoredMeals,
  yesterdayLocal,
  type MacroDef,
} from './shared';

const GAP_THRESHOLD_PCT = 80;
const WEEKLY_MIN_GAP_DAYS = 3;

interface DayMacroReading {
  covered: boolean;
  actualG: number;
  attainmentPct: number;
}

function readDayMacro(
  meals: ReadonlyArray<ReturnType<typeof scoredMeals>[number]>,
  def: MacroDef,
  targetG: number,
): DayMacroReading {
  const covered = meals.length > 0 && meals.every((m) => def.known(m));
  if (!covered) return { covered: false, actualG: 0, attainmentPct: 0 };
  const actualG = meals.reduce((sum, m) => sum + def.grams(m), 0);
  return { covered: true, actualG, attainmentPct: roundPct(actualG, targetG) };
}

function dailySeverity(attainmentPct: number): InsightSeverity {
  return attainmentPct < 50 ? 'attention' : 'info';
}

export function detectMacroGap(input: DetectorInput): InsightFact[] {
  const targets = input.targets;
  if (!targets) return [];
  const meals = scoredMeals(input);
  if (meals.length === 0) return [];

  const byDate = mealsByDate(meals);
  const facts: InsightFact[] = [];

  // Daily: deepest covered shortfall on the last completed day.
  const yDate = yesterdayLocal(input);
  const yMeals = byDate.get(yDate) ?? [];
  if (yMeals.length > 0) {
    const coveredMacros: TrackedMacro[] = [];
    let worst: { def: MacroDef; reading: DayMacroReading; targetG: number } | null = null;
    for (const def of MACRO_DEFS) {
      const targetG = def.target(targets);
      if (targetG <= 0) continue;
      const reading = readDayMacro(yMeals, def, targetG);
      if (!reading.covered) continue;
      coveredMacros.push(def.macro);
      if (reading.attainmentPct >= GAP_THRESHOLD_PCT) continue;
      if (!worst || reading.attainmentPct < worst.reading.attainmentPct) {
        worst = { def, reading, targetG };
      }
    }
    if (worst) {
      const { def, reading, targetG } = worst;
      const confidence = yMeals.length >= 3 ? 'high' : yMeals.length === 2 ? 'medium' : 'low';
      facts.push({
        type: 'macro_gap',
        horizon: 'daily',
        severity: dailySeverity(reading.attainmentPct),
        confidence,
        factFingerprint: makeFingerprint('macro_gap', 'daily', {
          scope: 'daily',
          macro: def.macro,
          attainmentBucket: Math.floor(reading.attainmentPct / 10) * 10,
        }),
        snapshot: {
          scope: 'daily',
          date: yDate,
          macro: def.macro,
          actualG: Math.round(reading.actualG),
          targetG: Math.round(targetG),
          attainmentPct: reading.attainmentPct,
          mealsCount: yMeals.length,
          coveredMacros,
          magnitudePct: clampMagnitude(100 - reading.attainmentPct),
        },
        productSuggestion: null,
      });
    }
  }

  // Weekly: one insight for the dominant recurring gap.
  const dates = Array.from(byDate.keys()).sort();
  let dominant:
    | {
        def: MacroDef;
        gapDays: number;
        coveredDays: number;
        avgAttainmentPct: number;
        targetG: number;
      }
    | null = null;
  for (const def of MACRO_DEFS) {
    const targetG = def.target(targets);
    if (targetG <= 0) continue;
    let coveredDays = 0;
    let gapDays = 0;
    let attainmentSum = 0;
    for (const date of dates) {
      const reading = readDayMacro(byDate.get(date) ?? [], def, targetG);
      if (!reading.covered) continue;
      coveredDays += 1;
      attainmentSum += reading.attainmentPct;
      if (reading.attainmentPct < GAP_THRESHOLD_PCT) gapDays += 1;
    }
    if (gapDays < WEEKLY_MIN_GAP_DAYS) continue;
    const avgAttainmentPct = coveredDays > 0 ? Math.round(attainmentSum / coveredDays) : 0;
    const beats =
      !dominant ||
      gapDays > dominant.gapDays ||
      (gapDays === dominant.gapDays && avgAttainmentPct < dominant.avgAttainmentPct);
    if (beats) {
      dominant = { def, gapDays, coveredDays, avgAttainmentPct, targetG };
    }
  }
  if (dominant) {
    facts.push({
      type: 'macro_gap',
      horizon: 'weekly',
      severity: dominant.gapDays >= 5 ? 'attention' : 'info',
      confidence: dominant.coveredDays >= 6 ? 'high' : dominant.coveredDays >= 4 ? 'medium' : 'low',
      factFingerprint: makeFingerprint('macro_gap', 'weekly', {
        scope: 'weekly',
        macro: dominant.def.macro,
        gapDays: dominant.gapDays,
      }),
      snapshot: {
        scope: 'weekly',
        macro: dominant.def.macro,
        gapDays: dominant.gapDays,
        coveredDays: dominant.coveredDays,
        windowDays: 7,
        avgAttainmentPct: dominant.avgAttainmentPct,
        targetG: Math.round(dominant.targetG),
        magnitudePct: clampMagnitude(100 - dominant.avgAttainmentPct),
      },
      productSuggestion: null,
    });
  }

  return facts;
}
