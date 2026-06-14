// Prompt 194 Task 3: the kcal-equals-macros invariant tripwires.
//
// Prompt 194 made a meal's calories a pure function of its stored macros via
// the single shared helper compute-meal-kcal.ts. The defect these tests lock
// out: a meal card showing a kcal that contradicts its macros (the Screenshot
// A breakfast displayed 595 kcal next to 0 g fat because the calorie value
// came from USDA / Gemini independently of the stored macros). After 194 the
// stored kcal IS computeMealKcal(macros), so that contradiction is structurally
// impossible. These tests assert the invariant at the derive + reconcile layer
// rather than via live API calls, matching the harness convention (pinned
// macro sets, real helper). No network, no Supabase, pure.

import { describe, it, expect } from 'vitest';
import {
  computeMealKcal,
  reconcileMealKcal,
  isMacroBearing,
  KCAL_RECONCILE_TOLERANCE,
  type MealMacros,
} from '../../compute-meal-kcal';
import { aggregate, type AggregatedItem } from '../../aggregate';
import type { NutritionAnalysis } from '../../schema';

// The macro set both meal channels carry into computeMealKcal is the subset of
// the aggregated NutritionAnalysis it reads: protein, total carbohydrate, total
// fat, fiber. One mapping, used for whatever aggregate() returns, so the kcal a
// card shows is always derived from the same fields the rollup sums.
function macrosFromAnalysis(a: NutritionAnalysis): MealMacros {
  return {
    proteinG: a.protein_g,
    carbsG: a.carbs_g,
    fatG: a.total_fat_g,
    fiberG: a.fiber_g,
  };
}

// Screenshot A breakfast: 2 whole eggs, sausage, slice of bread. These are the
// per-channel macro totals a correct resolver produces for the plate; both the
// TEXT path (Log a meal) and the PHOTO path (NutriVision) must land on the same
// macros for the same food, and the kcal each presents is derived from those
// macros by the one helper. Values are USDA-aligned and pinned so the test is
// deterministic; the point under test is the derive identity, not the lookup.
const SCREENSHOT_A_BREAKFAST: MealMacros = {
  proteinG: 28.4,
  carbsG: 18.0,
  fatG: 41.2,
  fiberG: 1.2,
};

describe('Prompt 194: Screenshot A breakfast text and photo parity', () => {
  it('derives identical macros and kcal across both channels through the real aggregate path', () => {
    // Channel parity has to survive the shared aggregation, not be asserted by
    // handing one object to both sides. The text route (Log a meal) and the
    // photo route (NutriVision) both feed per-item nutrients into the same
    // aggregate(), then derive kcal from its macros via the one helper. The
    // only thing that legitimately differs between channels is detection ORDER:
    // text parses the sentence left to right, the photo detector can surface
    // the same foods in a different order. Pin the plate once, present it to
    // each channel in a different order, and prove the aggregated macros and
    // the derived kcal come out identical. If aggregate() or computeMealKcal
    // were order sensitive this would diverge; identical input cannot.
    const eggs: AggregatedItem = {
      parsed: { name: 'egg', quantity: 2, unit: 'whole' },
      nutrients: { calories: 143, protein_g: 12.6, carbs_g: 0.8, total_fat_g: 9.5, saturated_fat_g: 3.1, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 0.4, fiber_g: 0, source: 'usda' },
    };
    const sausage: AggregatedItem = {
      parsed: { name: 'sausage', quantity: 1, unit: 'serving' },
      nutrients: { calories: 248, protein_g: 11.0, carbs_g: 1.0, total_fat_g: 21.7, saturated_fat_g: 7.0, trans_fat_g: 0, omega3_g: 0, sugar_g: 0.5, fiber_g: 0, source: 'usda' },
    };
    const bread: AggregatedItem = {
      parsed: { name: 'bread', quantity: 1, unit: 'slice' },
      nutrients: { calories: 79, protein_g: 4.8, carbs_g: 16.2, total_fat_g: 1.0, saturated_fat_g: 0.2, trans_fat_g: 0, omega3_g: 0, sugar_g: 1.5, fiber_g: 1.2, source: 'usda' },
    };

    // Same three items, two detection orders. TEXT reads them in sentence
    // order; PHOTO surfaces them in a different order.
    const textOrder: AggregatedItem[] = [eggs, sausage, bread];
    const photoOrder: AggregatedItem[] = [bread, eggs, sausage];

    const textMacros = macrosFromAnalysis(aggregate(textOrder));
    const photoMacros = macrosFromAnalysis(aggregate(photoOrder));

    const textKcal = computeMealKcal(textMacros);
    const photoKcal = computeMealKcal(photoMacros);

    // Aggregated macros match field for field across the two channels.
    expect(textMacros).toEqual(photoMacros);
    // And so does the kcal each derives from them. netCarb = 18.0 - 1.2 = 16.8,
    // so 4*28.4 + 4*16.8 + 9*32.2 = 470.6, rounds to 471.
    expect(textMacros).toEqual({ proteinG: 28.4, carbsG: 18.0, fatG: 32.2, fiberG: 1.2 });
    expect(textKcal).toBe(471);
    expect(textKcal).toBe(photoKcal);
  });

  it('derives the exact macro-bound kcal integer for the Screenshot A breakfast', () => {
    // Pin the arithmetic, not a self comparison. The stored kcal a card shows
    // is computeMealKcal(stored macros), so the Atwater sum has to land on one
    // known integer for these macros. netCarb = 18.0 - 1.2 = 16.8, so
    // 4*28.4 + 4*16.8 + 9*41.2 = 551.6, rounds to 552. If the coefficients, the
    // net-carb model, or the rounding ever drift, this fails loudly instead of
    // agreeing with itself.
    expect(computeMealKcal(SCREENSHOT_A_BREAKFAST)).toBe(552);
  });

  it('makes the 595-kcal-next-to-0g-fat defect structurally impossible', () => {
    // The defect: a card presenting an advisory kcal (for example 595) beside
    // macros that cannot produce it (0 g fat). After 194 the stored kcal is
    // computeMealKcal(macros), so a zero-fat macro set can never carry a 595
    // kcal value. Prove it: feed the contradictory advisory through reconcile
    // and confirm the stored figure follows the macros, not the advisory.
    const zeroFatMacros: MealMacros = { proteinG: 30, carbsG: 40, fatG: 0, fiberG: 0 };
    const contradictoryAdvisory = 595;
    const recon = reconcileMealKcal(zeroFatMacros, contradictoryAdvisory);

    // netCarb = 40 - 0 = 40, so 4 * 30 + 4 * 40 + 9 * 0 = 280, never 595.
    expect(recon.storedKcal).toBe(280);
    expect(recon.storedKcal).not.toBe(contradictoryAdvisory);
    expect(recon.storedKcal).toBe(computeMealKcal(zeroFatMacros));
    // The advisory diverged and would be logged, but it did not win.
    expect(recon.diverged).toBe(true);
  });

  it('treats the Screenshot A breakfast as macro bearing so it reaches the rollup', () => {
    // The field symptom was a meal showing a kcal whose macros never reached
    // Daily Macros. A meal with any of protein, carbs, or fat non-null is macro
    // bearing and contributes; this breakfast qualifies on all three.
    expect(isMacroBearing(SCREENSHOT_A_BREAKFAST)).toBe(true);
  });
});

describe('Prompt 194: provider kcal divergence is corrected and logged (acceptance 5)', () => {
  it('returns the macro-derived storedKcal when the advisory disagrees', () => {
    // Inject an advisory / provider kcal that diverges from the macro-derived
    // value by more than the tolerance. reconcileMealKcal must keep the
    // macro-derived figure as storedKcal (the advisory never overrides) and
    // flag diverged true (the value the route logs for telemetry).
    const macros: MealMacros = { proteinG: 20, carbsG: 30, fatG: 10, fiberG: 5 };
    const macroDerived = computeMealKcal(macros); // netCarb = 30 - 5 = 25, so 4*20 + 4*25 + 9*10 = 270
    const advisoryThatDisagrees = macroDerived + 120;

    const recon = reconcileMealKcal(macros, advisoryThatDisagrees);

    expect(recon.storedKcal).toBe(macroDerived);
    expect(recon.storedKcal).toBe(270);
    expect(recon.advisoryKcal).toBe(advisoryThatDisagrees);
    expect(recon.diverged).toBe(true);
    expect(recon.divergence).toBe(120);
  });

  it('does not flag divergence when the advisory agrees within tolerance', () => {
    // A provider value inside the 1 kcal band is not a divergence: the stored
    // figure is still the macro-derived one but nothing is logged.
    const macros: MealMacros = { proteinG: 20, carbsG: 30, fatG: 10, fiberG: 5 };
    const macroDerived = computeMealKcal(macros);
    const recon = reconcileMealKcal(macros, macroDerived + KCAL_RECONCILE_TOLERANCE);

    expect(recon.storedKcal).toBe(macroDerived);
    expect(recon.diverged).toBe(false);
  });
});
