// Prompt 175h Section 2.5 (2026-06-05): Hannah timing engine.
//
// Each Hannah recommendation is the product of a small set of pure
// rules. The class lists ship with the engine and any change to them
// must be deliberate, so the tests pin both the class-detection
// surface and the engine-level recommendation surface.
//
// Coverage:
//   * classifyIngredient: each class has at least one positive
//     example AND a negative (unrelated ingredient does NOT trigger).
//   * detectDominantClass: priority order (iron > calming >
//     stimulating > fat_soluble) when multiple classes hit.
//   * splitByFrequency: once_daily / twice_daily / three_daily yield
//     the correct slot set per class.
//   * recommendTiming: integration-level pin on each class so the
//     route layer can call it confidently.
//   * detectConflicts: iron with calcium and iron with caffeine
//     each surface a spacing flag; clean cases yield empty.

import { describe, it, expect } from 'vitest';
import {
  classifyIngredient,
  nameLooksLikeCaffeine,
  nameLooksLikeCalcium,
} from '@/lib/caq/supplements/timing/rules';
import {
  detectDominantClass,
  splitByFrequency,
  recommendTiming,
  detectConflicts,
} from '@/lib/caq/supplements/timing/engine';
import { matchRuleKey, matchRuleKeyForIngredients } from '@/lib/caq/supplements/timing/matchKey';
import { resolveBucketWindows, bucketForTime } from '@/lib/caq/supplements/timing/timeWindows';
import type { TimingRule } from '@/lib/caq/supplements/timing/types';

describe('classifyIngredient', () => {
  it('classifies stimulating ingredients as stimulating', () => {
    expect(classifyIngredient('B-Complex 100')).toBe('stimulating');
    expect(classifyIngredient('Caffeine Anhydrous')).toBe('stimulating');
    expect(classifyIngredient('Rhodiola Rosea')).toBe('stimulating');
    expect(classifyIngredient('L-Tyrosine')).toBe('stimulating');
  });

  it('classifies calming ingredients as calming', () => {
    expect(classifyIngredient('Magnesium Glycinate')).toBe('calming');
    expect(classifyIngredient('L-Theanine')).toBe('calming');
    expect(classifyIngredient('Melatonin')).toBe('calming');
    expect(classifyIngredient('Ashwagandha Root Extract')).toBe('calming');
  });

  it('classifies fat-soluble ingredients as fat_soluble', () => {
    expect(classifyIngredient('Vitamin D3')).toBe('fat_soluble');
    expect(classifyIngredient('Mixed Tocopherols (Vitamin E)')).toBe('fat_soluble');
    expect(classifyIngredient('Fish Oil EPA + DHA')).toBe('fat_soluble');
    expect(classifyIngredient('CoQ10')).toBe('fat_soluble');
  });

  it('classifies iron ingredients as iron', () => {
    expect(classifyIngredient('Iron Bisglycinate')).toBe('iron');
    expect(classifyIngredient('Ferrous Sulfate')).toBe('iron');
  });

  it('returns null for unrelated ingredients', () => {
    expect(classifyIngredient('Microcrystalline Cellulose')).toBeNull();
    expect(classifyIngredient('Magnesium Stearate')).toBeNull();
  });
});

describe('detectDominantClass', () => {
  it('returns general for an empty list', () => {
    expect(detectDominantClass([])).toBe('general');
  });

  it('returns the only class when ingredients are homogeneous', () => {
    expect(detectDominantClass([{ name: 'Vitamin D3' }])).toBe('fat_soluble');
    expect(detectDominantClass([{ name: 'Melatonin' }])).toBe('calming');
  });

  it('iron beats fat_soluble when both hit (multi with iron + vitamin C)', () => {
    // Vitamin C alone does not classify; pair with iron to test the
    // priority order against another fat-soluble member.
    const result = detectDominantClass([
      { name: 'Ferrous Bisglycinate' },
      { name: 'Vitamin D3' },
    ]);
    expect(result).toBe('iron');
  });

  it('calming beats fat_soluble (Mg + D3 multivitamin)', () => {
    const result = detectDominantClass([
      { name: 'Magnesium Glycinate' },
      { name: 'Vitamin D3' },
    ]);
    expect(result).toBe('calming');
  });

  it('calming beats stimulating (Mg + B12 combo)', () => {
    const result = detectDominantClass([
      { name: 'Magnesium Glycinate' },
      { name: 'B12 (Methylcobalamin)' },
    ]);
    expect(result).toBe('calming');
  });
});

describe('splitByFrequency', () => {
  it('once_daily picks the best slot for the class', () => {
    expect(splitByFrequency('calming', 'once_daily')).toEqual(['evening']);
    expect(splitByFrequency('stimulating', 'once_daily')).toEqual(['morning']);
    expect(splitByFrequency('iron', 'once_daily')).toEqual(['morning']);
    expect(splitByFrequency('fat_soluble', 'once_daily')).toEqual(['morning']);
    expect(splitByFrequency('general', 'once_daily')).toEqual(['morning']);
  });

  it('twice_daily yields morning + evening regardless of class', () => {
    expect(splitByFrequency('calming', 'twice_daily')).toEqual(['morning', 'evening']);
    expect(splitByFrequency('stimulating', 'twice_daily')).toEqual(['morning', 'evening']);
  });

  it('three_daily yields all three slots', () => {
    expect(splitByFrequency('general', 'three_daily')).toEqual(['morning', 'afternoon', 'evening']);
  });

  it('weekly + as_needed fall back to the once_daily best slot', () => {
    expect(splitByFrequency('calming', 'weekly')).toEqual(['evening']);
    expect(splitByFrequency('iron', 'as_needed')).toEqual(['morning']);
  });
});

describe('recommendTiming', () => {
  it('B-complex once daily is morning, no food required', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'B-Complex' }],
      frequency: 'once_daily',
    });
    expect(r.times).toEqual(['morning']);
    expect(r.with_food).toBe(false);
    expect(r.detectedClass).toBe('stimulating');
  });

  it('magnesium glycinate once daily is evening', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Magnesium Glycinate' }],
      frequency: 'once_daily',
    });
    expect(r.times).toEqual(['evening']);
    expect(r.detectedClass).toBe('calming');
  });

  it('vitamin D3 once daily is with food in the morning', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Vitamin D3' }],
      frequency: 'once_daily',
    });
    expect(r.times).toEqual(['morning']);
    expect(r.with_food).toBe(true);
    expect(r.detectedClass).toBe('fat_soluble');
  });

  it('multivitamin with D3 carries with_food even when class is not fat_soluble', () => {
    const r = recommendTiming({
      ingredients: [
        { name: 'Magnesium Glycinate' },
        { name: 'Vitamin D3' },
      ],
      frequency: 'once_daily',
    });
    expect(r.detectedClass).toBe('calming');
    expect(r.with_food).toBe(true);
  });

  it('iron + user has calcium surfaces a spacing conflict', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Iron Bisglycinate' }],
      frequency: 'once_daily',
      userSupplements: [{ name: 'Calcium Citrate' }],
    });
    expect(r.detectedClass).toBe('iron');
    expect(r.conflicts.some((c) => /calcium/i.test(c))).toBe(true);
  });

  it('iron alone with no conflicts yields an empty conflicts list', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Iron Bisglycinate' }],
      frequency: 'once_daily',
      userSupplements: [],
    });
    expect(r.conflicts).toEqual([]);
  });

  it('iron + user has coffee surfaces a caffeine spacing conflict', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Iron Bisglycinate' }],
      frequency: 'once_daily',
      userSupplements: [{ name: 'Coffee Bean Extract' }],
    });
    expect(r.conflicts.some((c) => /caffeine/i.test(c))).toBe(true);
  });

  it('twice-daily formula splits morning + evening regardless of class', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Vitamin D3' }],
      frequency: 'twice_daily',
    });
    expect(r.times).toEqual(['morning', 'evening']);
  });
});

describe('detectConflicts standalone', () => {
  it('returns empty when there are no user supplements', () => {
    expect(detectConflicts([{ name: 'Iron Bisglycinate' }], undefined)).toEqual([]);
    expect(detectConflicts([{ name: 'Iron Bisglycinate' }], [])).toEqual([]);
  });

  it('does not surface a calcium conflict for non-iron ingredients', () => {
    expect(
      detectConflicts([{ name: 'Vitamin D3' }], [{ name: 'Calcium Citrate' }]),
    ).toEqual([]);
  });
});

describe('rules pattern helpers', () => {
  it('nameLooksLikeCaffeine matches caffeine-bearing names', () => {
    expect(nameLooksLikeCaffeine('Coffee Bean Extract')).toBe(true);
    expect(nameLooksLikeCaffeine('Green Tea Extract')).toBe(true);
    expect(nameLooksLikeCaffeine('Magnesium Glycinate')).toBe(false);
  });

  it('nameLooksLikeCalcium matches calcium salts', () => {
    expect(nameLooksLikeCalcium('Calcium Citrate')).toBe(true);
    expect(nameLooksLikeCalcium('Calcium Malate')).toBe(true);
    expect(nameLooksLikeCalcium('Magnesium Glycinate')).toBe(false);
  });
});

// Prompt 185a slice 3 (2026-06-09): match_key matcher, Layer 1 rule seeding,
// Layer 2 CAQ adjustments, and timezone window anchoring.

describe('matchRuleKey (Prompt 185a slice 3)', () => {
  it('maps ingredient names to seeded match_keys', () => {
    expect(matchRuleKey('Magnesium Bisglycinate')).toBe('magnesium_glycinate');
    expect(matchRuleKey('Magnesium')).toBe('magnesium_glycinate');
    expect(matchRuleKey('Liposomal Vitamin D3 (Cholecalciferol)')).toBe('vitamin_d3');
    expect(matchRuleKey('Ferrous Sulfate')).toBe('iron');
    expect(matchRuleKey('Methylcobalamin (B12)')).toBe('b_complex');
    expect(matchRuleKey('Melatonin')).toBe('melatonin');
    expect(matchRuleKey('L-Theanine')).toBe('l_theanine');
  });

  it('prefers calcium over vitamin C for calcium ascorbate', () => {
    expect(matchRuleKey('Calcium Ascorbate')).toBe('calcium');
  });

  it('returns null for an unknown ingredient', () => {
    expect(matchRuleKey('Microcrystalline Cellulose')).toBeNull();
  });

  it('matchRuleKeyForIngredients picks the first matching ingredient', () => {
    expect(matchRuleKeyForIngredients(['Inactive Filler', 'Iron Bisglycinate', 'Vitamin C'])).toBe('iron');
    expect(matchRuleKeyForIngredients(['Nothing', 'Also Nothing'])).toBeNull();
  });
});

describe('recommendTiming with a matched rule (Layer 1)', () => {
  const magRule: TimingRule = {
    match_key: 'magnesium_glycinate',
    default_time_of_day: 'evening',
    with_food: null,
    empty_stomach: null,
    fat_soluble: false,
    away_from: [],
    rationale_short: 'Supports relaxation in the evening.',
  };
  const ironRule: TimingRule = {
    match_key: 'iron',
    default_time_of_day: 'morning',
    with_food: false,
    empty_stomach: true,
    fat_soluble: false,
    away_from: ['calcium', 'coffee', 'tea'],
    rationale_short: 'Best on an empty stomach.',
  };

  it('seeds the bucket, reason, and match_key from the rule', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Magnesium Bisglycinate' }],
      frequency: 'once_daily',
      matchedRule: magRule,
    });
    expect(r.times).toEqual(['evening']);
    expect(r.reason).toBe('Supports relaxation in the evening.');
    expect(r.match_key).toBe('magnesium_glycinate');
  });

  it('carries the rule constraint chips (empty_stomach, away_from)', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Iron Bisglycinate' }],
      frequency: 'once_daily',
      matchedRule: ironRule,
    });
    expect(r.empty_stomach).toBe(true);
    expect(r.away_from).toContain('calcium');
    expect(r.match_key).toBe('iron');
  });

  it('infers chips from class when no rule is matched', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Iron Bisglycinate' }],
      frequency: 'once_daily',
    });
    expect(r.match_key).toBeNull();
    expect(r.empty_stomach).toBe(true);
    expect(r.away_from).toContain('coffee');
  });
});

describe('recommendTiming Layer 2 CAQ adjustments', () => {
  it('keeps an activating B-complex out of the evening on sleep difficulty', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'B-Complex' }],
      frequency: 'twice_daily',
      caqSignals: { sleepDifficulty: true },
    });
    expect(r.times).not.toContain('evening');
    expect(r.times).toContain('morning');
  });

  it('moves iron off the morning when morning caffeine is high', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Iron Bisglycinate' }],
      frequency: 'once_daily',
      caqSignals: { highMorningCaffeine: true },
    });
    expect(r.times).not.toContain('morning');
  });

  it('places a low-energy B-complex in the morning via the matched key', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'B-Complex' }],
      frequency: 'once_daily',
      matchedRule: {
        match_key: 'b_complex', default_time_of_day: 'afternoon', with_food: null,
        empty_stomach: null, fat_soluble: false, away_from: [], rationale_short: 'B vitamins.',
      },
      caqSignals: { lowEnergy: true },
    });
    expect(r.times).toEqual(['morning']);
  });

  it('aligns a with-food item to the largest-meal window', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Vitamin D3' }],
      frequency: 'once_daily',
      caqSignals: { largestMealWindow: 'evening' },
    });
    expect(r.with_food).toBe(true);
    expect(r.times).toEqual(['evening']);
  });

  it('leaves the recommendation unchanged when no signals are present', () => {
    const r = recommendTiming({
      ingredients: [{ name: 'Magnesium Glycinate' }],
      frequency: 'once_daily',
    });
    expect(r.times).toEqual(['evening']);
  });
});

describe('resolveBucketWindows + bucketForTime (timezone anchoring)', () => {
  it('falls back to 07:00 / 22:00 defaults', () => {
    const w = resolveBucketWindows(null, null);
    expect(w.morning.start).toBe('07:00');
    expect(w.evening.end).toBe('22:00');
  });

  it('anchors windows to custom wake and wind-down', () => {
    const w = resolveBucketWindows('06:00', '21:00');
    expect(w.morning.start).toBe('06:00');
    expect(w.evening.end).toBe('21:00');
    expect(bucketForTime('06:30', w)).toBe('morning');
    expect(bucketForTime('20:00', w)).toBe('evening');
  });

  it('guards against an inverted window by falling back to defaults', () => {
    const w = resolveBucketWindows('22:00', '06:00');
    expect(w.morning.start).toBe('07:00');
    expect(w.evening.end).toBe('22:00');
  });
});
