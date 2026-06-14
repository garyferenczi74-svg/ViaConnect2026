// Prompt 186 Phase 4: the golden-meal regression suite.
//
// These tests run the REAL nutrition engine code (ranking, canonical
// extraction, portionToGrams, scaling, aggregation, Atwater) against
// RECORDED FoodData Central responses (fdc-recorded-fixtures.ts). No live
// API calls. Any future change to the nutrition engine must keep these
// green; extend this suite (do not bypass it) in follow-up prompts.
//
// Test 1 is the exact meal from Prompt 186 Section 1 with Gary's acceptance
// bands. The recorded search lists keep the production decoys (Oil avocado,
// Croissants apple, egg white) so a ranking regression fails loudly.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const cacheSelect = vi.fn();
const cacheUpsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: cacheSelect }) }) }),
      upsert: cacheUpsert,
    }),
  }),
}));

import { FDC_RECORDED_SEARCHES, FDC_RECORDED_DETAILS } from '../fdc-recorded-fixtures';
import { lookupFood } from '../../usda-client';
import { aggregate, type AggregatedItem } from '../../aggregate';
import type { ParsedItem } from '../../parsed-meal-schema';
import { computeMealKcal, reconcileMealKcal, KCAL_RECONCILE_TOLERANCE } from '../../compute-meal-kcal';

function fixtureFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const u = new URL(String(input));
    if (u.pathname.endsWith('/foods/search')) {
      const q = u.searchParams.get('query') ?? '';
      const rec = FDC_RECORDED_SEARCHES[q];
      if (!rec) return new Response(JSON.stringify({ totalHits: 0, foods: [] }), { status: 200 });
      return new Response(JSON.stringify(rec), { status: 200 });
    }
    const m = u.pathname.match(/\/food\/(\d+)$/);
    if (m) {
      const d = FDC_RECORDED_DETAILS[Number(m[1])];
      if (d) return new Response(JSON.stringify(d), { status: 200 });
      return new Response(JSON.stringify({ error: 'fixture missing detail ' + m[1] }), { status: 404 });
    }
    return new Response('bad fixture route', { status: 500 });
  });
}

beforeEach(() => {
  cacheSelect.mockReset();
  cacheSelect.mockResolvedValue({ data: null, error: null });
  cacheUpsert.mockClear();
  process.env.USDA_FDC_API_KEY = 'TESTKEY';
  globalThis.fetch = fixtureFetch() as unknown as typeof fetch;
});

// Mirrors the channel fallback: a USDA miss uses the AI estimate. The values
// here are pinned (recorded from the production Gemini estimator, which the
// Phase 1 reconstruction proved accurate) so the suite stays deterministic.
async function resolveLikeTheRoutes(
  items: ParsedItem[],
  pinnedEstimates: Record<string, AggregatedItem['nutrients']>,
): Promise<AggregatedItem[]> {
  const out: AggregatedItem[] = [];
  for (const item of items) {
    const usda = await lookupFood(item.name, item.quantity, item.unit, undefined, item.preparation).catch(() => null);
    if (usda && usda.meta.plausibilityFlagged !== true) {
      out.push({ parsed: item, nutrients: usda });
    } else {
      const pinned = pinnedEstimates[item.name];
      if (!pinned) throw new Error(`fixture gap: no USDA match and no pinned estimate for ${item.name}`);
      out.push({ parsed: item, nutrients: pinned });
    }
  }
  return out;
}

// Recorded production reality: the FDC search index returns Foundation
// 748967 (whole egg) as the ranked winner for "egg" but its detail endpoint
// 404s (live FDC inconsistency, reproduced 2026-06-11). The engine treats
// that as a clean miss and the channel falls back to the AI estimator. The
// pinned values below are USDA-aligned 2-large-egg numbers, matching what
// the production estimator returned in the Phase 1 reconstruction.
const PINNED_EGG_ESTIMATE: AggregatedItem['nutrients'] = {
  calories: 148, protein_g: 12.4, carbs_g: 1.0, total_fat_g: 10.0,
  saturated_fat_g: 3.3, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 0.2,
  fiber_g: 0, source: 'gemini_fallback',
};

describe('golden meal 1: the Prompt 186 Section 1 reference meal', () => {
  it('computes within the acceptance bands end to end', async () => {
    const items: ParsedItem[] = [
      { name: 'egg', quantity: 2, unit: 'whole' },
      { name: 'avocado', quantity: 0.5, unit: 'whole' },
      { name: 'sourdough bread', quantity: 1, unit: 'slice' },
      { name: 'apple', quantity: 1, unit: 'whole' },
    ];
    const resolved = await resolveLikeTheRoutes(items, { egg: PINNED_EGG_ESTIMATE });
    const analysis = aggregate(resolved);
    // 3 of 4 from USDA recordings; the egg goes through the estimator after
    // the recorded detail 404 (same shape as the original golden meal, which
    // displayed Medium confidence 75 percent).
    expect(resolved.filter((i) => i.nutrients.source === 'usda')).toHaveLength(3);
    expect(analysis.confidence).toBeCloseTo(0.75, 2);

    // Acceptance bands from Prompt 186 Phase 4.
    expect(analysis.calories).toBeGreaterThanOrEqual(360);
    expect(analysis.calories).toBeLessThanOrEqual(460);
    expect(analysis.total_fat_g).toBeGreaterThanOrEqual(14);
    expect(analysis.total_fat_g).toBeLessThanOrEqual(24);
    expect(analysis.protein_g).toBeGreaterThanOrEqual(13);
    expect(analysis.protein_g).toBeLessThanOrEqual(18);
    expect(analysis.sugar_g).toBeGreaterThanOrEqual(14);
    expect(analysis.sugar_g).toBeLessThanOrEqual(21);
    expect(analysis.carbs_g).toBeGreaterThanOrEqual(38);
    expect(analysis.carbs_g).toBeLessThanOrEqual(50);

    // Prompt 194: Atwater consistency is now near-exact via the shared helper,
    // not a loose 20 percent ratio band. The value a meal card displays is the
    // STORED kcal, which the routes derive from the meal's macros through
    // computeMealKcal (the only producer). analysis.calories is the advisory
    // USDA / estimate sum the route reconciles against; it never wins. So the
    // canonical assertion is that the stored kcal the route would persist
    // equals computeMealKcal of the same macros within the 1 kcal tolerance
    // (here exact, since both come from the one helper). This closes the last
    // acceptance number 4 loose end: no site computes Atwater independently.
    const mealMacros = {
      proteinG: analysis.protein_g,
      carbsG: analysis.carbs_g,
      fatG: analysis.total_fat_g,
      fiberG: analysis.fiber_g,
    };
    const recon = reconcileMealKcal(mealMacros, analysis.calories);
    const derivedKcal = computeMealKcal(mealMacros);
    expect(Math.abs(recon.storedKcal - derivedKcal)).toBeLessThanOrEqual(KCAL_RECONCILE_TOLERANCE);
    // The stored value is the macro-derived figure, not the raw USDA sum.
    expect(recon.storedKcal).toBe(derivedKcal);

    // The production decoys must have lost the ranking.
    const matched = resolved.map((i) => i.nutrients.meta?.matchedName ?? '');
    expect(matched.join(' | ')).not.toMatch(/Oil, avocado|Croissants|egg white|egg yolk/);
  });
});

describe('golden meal 2: branded packaged food (Cheerios, one basis only)', () => {
  it('scales the per-100g rows by the branded serving grams', async () => {
    const resolved = await resolveLikeTheRoutes(
      [{ name: 'cheerios', quantity: 1, unit: 'serving' }],
      {},
    );
    const n = resolved[0].nutrients;
    expect(n.source).toBe('usda');
    expect(n.meta?.basis).toBe('per_100g');
    // Recorded label: 71.8 kcal per 20 g serving; per-100g rows say 359.
    // One basis: 20 g of the per-100g rows = 71.8, never label + per-100g.
    expect(n.meta?.grams).toBe(20);
    expect(n.calories).toBe(72);
    expect(n.protein_g).toBeCloseTo(2.6, 1);
    expect(n.total_fat_g).toBeCloseTo(1.3, 1);
    expect(n.sugar_g).toBeCloseTo(1.0, 1);
    expect(n.sodium_mg).toBeCloseTo(97.4, 0);
  });
});

describe('golden meal 3: whole avocado alone (high-fat single item)', () => {
  it('lands on a real avocado, not the oil, and stays under the plausibility bounds', async () => {
    const resolved = await resolveLikeTheRoutes(
      [{ name: 'avocado', quantity: 1, unit: 'whole' }],
      {},
    );
    const n = resolved[0].nutrients;
    expect(n.meta?.matchedName).not.toBe('Oil, avocado');
    expect(n.calories).toBeGreaterThanOrEqual(160);
    expect(n.calories).toBeLessThanOrEqual(380);
    expect(n.total_fat_g).toBeGreaterThanOrEqual(14);
    expect(n.total_fat_g).toBeLessThanOrEqual(35);
    expect(n.meta?.plausibilityFlagged).toBe(false);
  });
});

describe('golden meal 4: apple alone (zero-fat item, real sugar)', () => {
  it('reports near-zero fat and double-digit sugar (never the zero-coerced 0)', async () => {
    const resolved = await resolveLikeTheRoutes(
      [{ name: 'apple', quantity: 1, unit: 'whole' }],
      {},
    );
    const n = resolved[0].nutrients;
    // Recorded winner is SR "Apples, raw, without skin" with a real 161 g
    // medium portion: 77 kcal. The lower bound covers the peeled basis.
    expect(n.calories).toBeGreaterThanOrEqual(70);
    expect(n.calories).toBeLessThanOrEqual(130);
    expect(n.total_fat_g).not.toBeNull();
    expect(n.total_fat_g as number).toBeLessThan(1);
    expect(n.sugar_g).toBeGreaterThanOrEqual(14);
    expect(n.sugar_g).toBeLessThanOrEqual(21);
  });
});

describe('golden meal 5: mixed text-channel entry (USDA + estimated item)', () => {
  it('aggregates a USDA item with a pinned estimate, marks the meal mixed, and never zero-fills', async () => {
    const pinnedProteinShake: AggregatedItem['nutrients'] = {
      // Recorded production Gemini estimate for one serving of a whey shake;
      // sugar intentionally unknown to exercise the partial-sum contract.
      calories: 180, protein_g: 25, carbs_g: 8, total_fat_g: 4,
      saturated_fat_g: 1.5, trans_fat_g: 0, omega3_g: 0, sugar_g: null,
      fiber_g: 1, source: 'gemini_fallback',
    };
    const resolved = await resolveLikeTheRoutes(
      [
        { name: 'sourdough bread', quantity: 2, unit: 'slice' },
        { name: 'protein shake', quantity: 1, unit: 'serving' },
      ],
      { 'protein shake': pinnedProteinShake },
    );
    const analysis = aggregate(resolved);
    expect(analysis.data_source).toBe('mixed');
    expect(analysis.confidence).toBeCloseTo(0.5, 1);
    // Bread sugar is known, shake sugar is unknown: the total is a partial
    // sum carrying the marker, not a fake-precise number.
    expect(analysis.nutrient_flags?.partial).toContain('sugar_g');
    expect(analysis.calories).toBeGreaterThanOrEqual(280);
    expect(analysis.calories).toBeLessThanOrEqual(420);
    expect(analysis.protein_g).toBeGreaterThanOrEqual(28);
    expect(analysis.protein_g).toBeLessThanOrEqual(40);
  });
});
