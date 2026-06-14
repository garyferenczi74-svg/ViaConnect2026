// Prompt 194 Task A: unit tests for the single shared calorie function.
//
// The invariant under test: a meal's displayed calories are a pure,
// deterministic function of that meal's stored macros via ONE formula,
// kcal = round(4*protein + 4*netCarb + 9*fat) where netCarb is total carbs
// minus fiber, clamped at 0 (fiber contributes 0 kcal). The field evidence is
// two cards: Screenshot A showed 595 kcal next to 0 g fat (internally
// contradictory), Screenshot B showed a correct meal. The macro-derived value
// always wins; an advisory USDA/Gemini number can only flag a divergence,
// never override.

import { describe, it, expect } from 'vitest';
import {
  computeMealKcal,
  isMacroBearing,
  reconcileMealKcal,
  KCAL_RECONCILE_TOLERANCE,
  type MealMacros,
} from '../compute-meal-kcal';

describe('computeMealKcal', () => {
  it('Screenshot B (correct meal) computes 400 exactly', () => {
    const macros: MealMacros = { proteinG: 19, carbsG: 20, fatG: 28, fiberG: 2 };
    expect(computeMealKcal(macros)).toBe(400);
  });

  it('Screenshot A macros as stored compute 208, not the contradictory 595 the card showed', () => {
    const macros: MealMacros = { proteinG: 34, carbsG: 19, fatG: 0, fiberG: 1 };
    expect(computeMealKcal(macros)).toBe(208);
  });

  it('treats a null fat as 0 (Screenshot A with fat absent still computes 208)', () => {
    const macros: MealMacros = { proteinG: 34, carbsG: 19, fatG: null, fiberG: 1 };
    expect(computeMealKcal(macros)).toBe(208);
  });

  it('returns 0 when all macros are null', () => {
    const macros: MealMacros = { proteinG: null, carbsG: null, fatG: null, fiberG: null };
    expect(computeMealKcal(macros)).toBe(0);
  });

  it('coalesces a null fiber to 0 (no correction applied)', () => {
    // 4*10 + 4*20 + 9*5 - 0 = 165.
    const macros: MealMacros = { proteinG: 10, carbsG: 20, fatG: 5, fiberG: null };
    expect(computeMealKcal(macros)).toBe(165);
  });

  it('removes fiber from the carb pool (net carbs), dropping 4 kcal per gram of fiber', () => {
    const noFiber: MealMacros = { proteinG: 10, carbsG: 20, fatG: 5, fiberG: 0 };
    const withFiber: MealMacros = { proteinG: 10, carbsG: 20, fatG: 5, fiberG: 6 };
    // 6 g fiber leaves the carb pool: netCarb = 20 - 6 = 14, removing 24 kcal
    // versus the no-fiber case (165 - 24 = 141). Fiber itself contributes 0.
    expect(computeMealKcal(noFiber)).toBe(165);
    expect(computeMealKcal(withFiber)).toBe(141);
  });

  it('clamps net carbs at 0 so fiber can never drive the carb term negative', () => {
    // Fiber (8 g) exceeds total carbs (5 g): netCarb = max(0, 5 - 8) = 0, so
    // the carb term is 0 rather than negative. kcal = 4*10 + 0 + 0 = 40.
    const macros: MealMacros = { proteinG: 10, carbsG: 5, fatG: 0, fiberG: 8 };
    expect(computeMealKcal(macros)).toBe(40);
  });

  it('keeps full precision through the sum and rounds only at the end', () => {
    // 4*10.04 + 4*10.04 + 9*10.04 = 170.68, rounds to 171. Rounding each
    // macro first would give 170, so this proves the final-round contract.
    const macros: MealMacros = { proteinG: 10.04, carbsG: 10.04, fatG: 10.04, fiberG: 0 };
    expect(computeMealKcal(macros)).toBe(171);
  });
});

describe('isMacroBearing', () => {
  it('is false when protein, carbs, and fat are all null (calories-only entry)', () => {
    expect(isMacroBearing({ proteinG: null, carbsG: null, fatG: null, fiberG: null })).toBe(false);
  });

  it('is false when only fiber is set (fiber alone does not count)', () => {
    expect(isMacroBearing({ proteinG: null, carbsG: null, fatG: null, fiberG: 3 })).toBe(false);
  });

  it('is true when protein is set', () => {
    expect(isMacroBearing({ proteinG: 34, carbsG: null, fatG: null, fiberG: null })).toBe(true);
  });

  it('is true when carbs is set', () => {
    expect(isMacroBearing({ proteinG: null, carbsG: 19, fatG: null, fiberG: null })).toBe(true);
  });

  it('is true when fat is set', () => {
    expect(isMacroBearing({ proteinG: null, carbsG: null, fatG: 28, fiberG: null })).toBe(true);
  });

  it('is true when a macro is set to 0 (0 is a known value, not absence)', () => {
    expect(isMacroBearing({ proteinG: null, carbsG: null, fatG: 0, fiberG: null })).toBe(true);
  });
});

describe('reconcileMealKcal', () => {
  it('Screenshot A: advisory 595 against stored 208 diverges by 387', () => {
    const macros: MealMacros = { proteinG: 34, carbsG: 19, fatG: 0, fiberG: 1 };
    const result = reconcileMealKcal(macros, 595);
    expect(result.storedKcal).toBe(208);
    expect(result.advisoryKcal).toBe(595);
    expect(result.divergence).toBe(387);
    expect(result.diverged).toBe(true);
  });

  it('does not diverge when the advisory is within the tolerance of stored', () => {
    const macros: MealMacros = { proteinG: 34, carbsG: 19, fatG: 0, fiberG: 1 };
    // stored is 208; 209 is exactly at the rounding-only tolerance boundary of 1.
    const result = reconcileMealKcal(macros, 208 + KCAL_RECONCILE_TOLERANCE);
    expect(result.storedKcal).toBe(208);
    expect(result.divergence).toBe(KCAL_RECONCILE_TOLERANCE);
    expect(result.diverged).toBe(false);
  });

  it('diverges once the advisory exceeds the tolerance by one', () => {
    const macros: MealMacros = { proteinG: 34, carbsG: 19, fatG: 0, fiberG: 1 };
    const result = reconcileMealKcal(macros, 208 + KCAL_RECONCILE_TOLERANCE + 1);
    expect(result.divergence).toBe(KCAL_RECONCILE_TOLERANCE + 1);
    expect(result.diverged).toBe(true);
  });

  it('reports no divergence when the advisory is null', () => {
    const macros: MealMacros = { proteinG: 34, carbsG: 19, fatG: 0, fiberG: 1 };
    const result = reconcileMealKcal(macros, null);
    expect(result.storedKcal).toBe(208);
    expect(result.advisoryKcal).toBeNull();
    expect(result.divergence).toBeNull();
    expect(result.diverged).toBe(false);
  });

  it('always reports storedKcal as the macro-derived value (advisory never overrides)', () => {
    const macros: MealMacros = { proteinG: 19, carbsG: 20, fatG: 28, fiberG: 2 };
    // Screenshot B macros derive 400 regardless of what the advisory claims.
    expect(reconcileMealKcal(macros, 999).storedKcal).toBe(400);
    expect(reconcileMealKcal(macros, 0).storedKcal).toBe(400);
    expect(reconcileMealKcal(macros, null).storedKcal).toBe(400);
  });
});
