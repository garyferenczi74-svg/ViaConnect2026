// Prompt 172e Phase B: BeveragePicker pure state machine tests.
//
// These tests cover the picker's logical contract: view transitions,
// volume clamp, search filtering, recents derivation, and safety mode
// suppression. The React component layer is a thin shell; the contract
// these tests pin is what the user actually experiences.

import { describe, it, expect } from 'vitest';
import {
  buildInitialState,
  openCategory,
  openBeverage,
  backToDefault,
  backToCategory,
  setSearchQuery,
  setVolume,
  clampVolume,
  incrementVolume,
  decrementVolume,
  filterByCategory,
  searchCatalog,
  resolveRecents,
  resolveFavorites,
  findRowById,
  deriveRecentSlugsFromEvents,
  shouldShowKcal,
  shouldShowSugar,
  shouldShowCaffeine,
  shouldShowAbv,
  shouldShowAlcoholDrinkCount,
  shouldShowDiureticCopy,
  shouldShowVolumeNumber,
  shouldShowDefaultComparison,
  backDestination,
  VOLUME_MIN_ML,
  VOLUME_MAX_ML,
  VOLUME_STEP_ML,
  SEARCH_RESULT_LIMIT,
  RECENTS_ROW_LIMIT,
  FAVORITES_ROW_LIMIT,
} from '../picker-state';
import type {
  BeverageCatalogRow,
  BeverageCategory,
} from '../BeveragePicker.types';

function row(overrides: Partial<BeverageCatalogRow> = {}): BeverageCatalogRow {
  return {
    id: 'row-1',
    slug: 'water_still',
    category: 'water',
    hydration_source_kind: 'pure_water',
    display_name: 'Still Water',
    default_volume_ml: 240,
    hydration_coefficient: 1.0,
    caffeine_mg_per_serving: 0,
    kcal_per_serving: 0,
    sugar_g: 0,
    sodium_mg: 5,
    potassium_mg: 0,
    magnesium_mg: 0,
    is_alcoholic: false,
    abv: null,
    evidence_source: 'Maughan 2016',
    requires_claim_review: false,
    is_active: true,
    sort_order: 10,
    ...overrides,
  };
}

describe('buildInitialState', () => {
  it('starts on the default view with no selection', () => {
    const s = buildInitialState();
    expect(s.view).toBe('default');
    expect(s.selectedCategory).toBeNull();
    expect(s.selectedBeverageId).toBeNull();
    expect(s.volumeMl).toBe(0);
    expect(s.searchQuery).toBe('');
    expect(s.recentSlugs).toEqual([]);
    expect(s.favoriteSlugs).toEqual([]);
  });

  it('seeds recents and favorites from args', () => {
    const s = buildInitialState({
      recentSlugs: ['water_still'],
      favoriteSlugs: ['coffee_drip'],
    });
    expect(s.recentSlugs).toEqual(['water_still']);
    expect(s.favoriteSlugs).toEqual(['coffee_drip']);
  });
});

describe('view transitions', () => {
  it('openCategory moves to category view and clears beverage selection', () => {
    const s0 = buildInitialState();
    const s1 = openCategory(s0, 'coffee');
    expect(s1.view).toBe('category');
    expect(s1.selectedCategory).toBe('coffee');
    expect(s1.selectedBeverageId).toBeNull();
    expect(s1.volumeMl).toBe(0);
  });

  it('openBeverage moves to beverage view and seeds default volume', () => {
    const s0 = buildInitialState();
    const r = row({ id: 'r-100', default_volume_ml: 355, category: 'coffee' });
    const s1 = openBeverage(s0, r);
    expect(s1.view).toBe('beverage');
    expect(s1.selectedCategory).toBe('coffee');
    expect(s1.selectedBeverageId).toBe('r-100');
    expect(s1.volumeMl).toBe(355);
  });

  it('backToDefault resets selection and search', () => {
    let s = buildInitialState();
    s = openCategory(s, 'milk');
    s = openBeverage(s, row({ id: 'r-200', category: 'milk', default_volume_ml: 240 }));
    s = setSearchQuery(s, 'oat');
    const reset = backToDefault(s);
    expect(reset.view).toBe('default');
    expect(reset.selectedCategory).toBeNull();
    expect(reset.selectedBeverageId).toBeNull();
    expect(reset.volumeMl).toBe(0);
    expect(reset.searchQuery).toBe('');
  });

  it('backToCategory drops the beverage selection but keeps the category', () => {
    let s = buildInitialState();
    s = openCategory(s, 'tea');
    s = openBeverage(s, row({ id: 'r-tea', category: 'tea', default_volume_ml: 240 }));
    const back = backToCategory(s);
    expect(back.view).toBe('category');
    expect(back.selectedCategory).toBe('tea');
    expect(back.selectedBeverageId).toBeNull();
    expect(back.volumeMl).toBe(0);
  });

  it('backToCategory from beverage with no category falls back to default', () => {
    const s0 = buildInitialState();
    const forced = { ...s0, view: 'beverage' as const, selectedCategory: null };
    const back = backToCategory(forced);
    expect(back.view).toBe('default');
  });

  it('backDestination maps view to its back target', () => {
    expect(backDestination('beverage')).toBe('category');
    expect(backDestination('category')).toBe('default');
    expect(backDestination('default')).toBe('default');
  });
});

describe('search', () => {
  it('updates searchQuery on setSearchQuery', () => {
    const s0 = buildInitialState();
    const s1 = setSearchQuery(s0, 'coffee');
    expect(s1.searchQuery).toBe('coffee');
  });

  it('searchCatalog returns case insensitive substring matches', () => {
    const catalog = [
      row({ id: '1', slug: 'water_still', display_name: 'Still Water' }),
      row({ id: '2', slug: 'coffee_drip', display_name: 'Drip Coffee', category: 'coffee' }),
      row({ id: '3', slug: 'coffee_decaf', display_name: 'Decaf Coffee', category: 'coffee' }),
      row({ id: '4', slug: 'tea_green', display_name: 'Green Tea', category: 'tea' }),
    ];
    // Prompt 177n (2026-06-09): both Drip Coffee and Decaf Coffee match
    // on display_name substring (score 70). With equal sort_order ties
    // resolve by display_name so the order is alphabetical: Decaf
    // before Drip.
    const results = searchCatalog(catalog, 'coff');
    expect(results.map((r) => r.id)).toEqual(['3', '2']);
  });

  it('searchCatalog returns category matches so "cof" surfaces Espresso Shot', () => {
    // Prompt 177n (2026-06-09): mirrors the search_beverages RPC
    // behavior validated against production. Typing "cof" surfaces the
    // coffee family even when the display_name does not contain the
    // typed prefix, because category='coffee' matches.
    const catalog = [
      row({ id: '1', slug: 'water_still', display_name: 'Still Water' }),
      row({ id: '2', slug: 'coffee_espresso', display_name: 'Espresso Shot', category: 'coffee' }),
      row({ id: '3', slug: 'coffee_drip', display_name: 'Drip Coffee', category: 'coffee' }),
    ];
    const results = searchCatalog(catalog, 'cof');
    // Drip Coffee matches by display_name substring (score 70); Espresso
    // Shot matches by category substring (score 50). Name match wins.
    expect(results.map((r) => r.id)).toEqual(['3', '2']);
  });

  it('searchCatalog ranks display_name prefix above substring', () => {
    const catalog = [
      row({ id: '1', slug: 'a', display_name: 'Iced Coffee', category: 'coffee' }),
      row({ id: '2', slug: 'b', display_name: 'Coffee Drip', category: 'coffee' }),
    ];
    const results = searchCatalog(catalog, 'coffee');
    // 'Coffee Drip' starts with 'coffee' (score 100); 'Iced Coffee'
    // contains it (score 70).
    expect(results.map((r) => r.id)).toEqual(['2', '1']);
  });

  it('searchCatalog returns empty for empty or whitespace query', () => {
    const catalog = [row()];
    expect(searchCatalog(catalog, '')).toEqual([]);
    expect(searchCatalog(catalog, '   ')).toEqual([]);
  });

  it('searchCatalog caps at SEARCH_RESULT_LIMIT', () => {
    const catalog = Array.from({ length: 30 }, (_, i) =>
      row({ id: `r-${i}`, slug: `water_${i}`, display_name: `Water Variant ${i}` }),
    );
    const results = searchCatalog(catalog, 'water');
    expect(results.length).toBe(SEARCH_RESULT_LIMIT);
  });
});

describe('volume', () => {
  it('clampVolume floors at VOLUME_MIN_ML', () => {
    expect(clampVolume(0)).toBe(VOLUME_MIN_ML);
    expect(clampVolume(-100)).toBe(VOLUME_MIN_ML);
    expect(clampVolume(20)).toBe(VOLUME_MIN_ML);
  });

  it('clampVolume ceilings at VOLUME_MAX_ML', () => {
    expect(clampVolume(1500)).toBe(VOLUME_MAX_ML);
    expect(clampVolume(VOLUME_MAX_ML)).toBe(VOLUME_MAX_ML);
  });

  it('clampVolume rounds non integer input', () => {
    expect(clampVolume(240.4)).toBe(240);
    expect(clampVolume(240.6)).toBe(241);
  });

  it('clampVolume handles NaN by returning the floor', () => {
    expect(clampVolume(Number.NaN)).toBe(VOLUME_MIN_ML);
  });

  it('setVolume applies clamp', () => {
    const s0 = buildInitialState();
    expect(setVolume(s0, 0).volumeMl).toBe(VOLUME_MIN_ML);
    expect(setVolume(s0, 2000).volumeMl).toBe(VOLUME_MAX_ML);
    expect(setVolume(s0, 240).volumeMl).toBe(240);
  });

  it('incrementVolume defaults to VOLUME_STEP_ML and clamps to ceiling', () => {
    const s = { ...buildInitialState(), volumeMl: 240 };
    const stepped = incrementVolume(s);
    expect(stepped.volumeMl).toBe(240 + VOLUME_STEP_ML);
    const atMax = incrementVolume({ ...s, volumeMl: VOLUME_MAX_ML });
    expect(atMax.volumeMl).toBe(VOLUME_MAX_ML);
  });

  it('decrementVolume defaults to VOLUME_STEP_ML and clamps to floor', () => {
    const s = { ...buildInitialState(), volumeMl: 240 };
    const stepped = decrementVolume(s);
    expect(stepped.volumeMl).toBe(240 - VOLUME_STEP_ML);
    const atMin = decrementVolume({ ...s, volumeMl: VOLUME_MIN_ML });
    expect(atMin.volumeMl).toBe(VOLUME_MIN_ML);
  });

  it('incrementVolume accepts a custom step (oz mode)', () => {
    const s = { ...buildInitialState(), volumeMl: 240 };
    expect(incrementVolume(s, { step: 30 }).volumeMl).toBe(270);
  });
});

describe('filterByCategory', () => {
  it('returns only rows in the requested category, preserving order', () => {
    const catalog = [
      row({ id: '1', category: 'water', sort_order: 10 }),
      row({ id: '2', category: 'coffee', sort_order: 10 }),
      row({ id: '3', category: 'water', sort_order: 20 }),
      row({ id: '4', category: 'coffee', sort_order: 20 }),
    ];
    const water = filterByCategory(catalog, 'water');
    expect(water.map((r) => r.id)).toEqual(['1', '3']);
    const coffee = filterByCategory(catalog, 'coffee');
    expect(coffee.map((r) => r.id)).toEqual(['2', '4']);
  });

  it('returns empty for a category with no rows', () => {
    const catalog = [row({ category: 'water' })];
    expect(filterByCategory(catalog, 'alcohol' as BeverageCategory)).toEqual([]);
  });
});

describe('resolveRecents and resolveFavorites', () => {
  it('maps slugs to catalog rows in order, dropping unknowns', () => {
    const catalog = [
      row({ id: '1', slug: 'water_still' }),
      row({ id: '2', slug: 'coffee_drip', category: 'coffee' }),
    ];
    const recents = resolveRecents(catalog, ['coffee_drip', 'unknown_slug', 'water_still']);
    expect(recents.map((r) => r.id)).toEqual(['2', '1']);
  });

  it('caps recents at RECENTS_ROW_LIMIT', () => {
    const catalog = Array.from({ length: 10 }, (_, i) =>
      row({ id: `r${i}`, slug: `s${i}` }),
    );
    const recents = resolveRecents(
      catalog,
      catalog.map((r) => r.slug),
    );
    expect(recents.length).toBe(RECENTS_ROW_LIMIT);
  });

  it('caps favorites at FAVORITES_ROW_LIMIT', () => {
    const catalog = Array.from({ length: 10 }, (_, i) =>
      row({ id: `r${i}`, slug: `s${i}` }),
    );
    const favorites = resolveFavorites(
      catalog,
      catalog.map((r) => r.slug),
    );
    expect(favorites.length).toBe(FAVORITES_ROW_LIMIT);
  });
});

describe('findRowById', () => {
  it('returns the row when present', () => {
    const catalog = [row({ id: 'a' }), row({ id: 'b' })];
    expect(findRowById(catalog, 'b')?.id).toBe('b');
  });

  it('returns null for null id', () => {
    expect(findRowById([row()], null)).toBeNull();
  });

  it('returns null for unknown id', () => {
    expect(findRowById([row({ id: 'a' })], 'nope')).toBeNull();
  });
});

describe('deriveRecentSlugsFromEvents', () => {
  it('matches today events to catalog rows by display_name', () => {
    const catalog = [
      row({ id: '1', slug: 'water_still', display_name: 'Still Water' }),
      row({ id: '2', slug: 'coffee_drip', display_name: 'Drip Coffee' }),
    ];
    const events = [
      { beverage_kind: 'coffee_tea', food_name: 'Drip Coffee' },
      { beverage_kind: 'pure_water', food_name: 'Still Water' },
    ];
    expect(deriveRecentSlugsFromEvents(events, catalog)).toEqual([
      'coffee_drip',
      'water_still',
    ]);
  });

  it('drops duplicates and unknown food names', () => {
    const catalog = [row({ id: '1', slug: 'water_still', display_name: 'Still Water' })];
    const events = [
      { beverage_kind: 'pure_water', food_name: 'Still Water' },
      { beverage_kind: 'pure_water', food_name: 'Still Water' },
      { beverage_kind: 'pure_water', food_name: 'Some Custom Drink' },
    ];
    expect(deriveRecentSlugsFromEvents(events, catalog)).toEqual(['water_still']);
  });

  it('is case insensitive on food_name match', () => {
    const catalog = [row({ slug: 'water_still', display_name: 'Still Water' })];
    const events = [{ beverage_kind: 'pure_water', food_name: 'STILL WATER' }];
    expect(deriveRecentSlugsFromEvents(events, catalog)).toEqual(['water_still']);
  });
});

describe('170c safety mode suppression', () => {
  it('hides per beverage kcal in safety mode', () => {
    expect(shouldShowKcal(false)).toBe(true);
    expect(shouldShowKcal(true)).toBe(false);
  });

  it('hides per beverage sugar in safety mode', () => {
    expect(shouldShowSugar(false)).toBe(true);
    expect(shouldShowSugar(true)).toBe(false);
  });

  it('hides per beverage caffeine in safety mode', () => {
    expect(shouldShowCaffeine(false)).toBe(true);
    expect(shouldShowCaffeine(true)).toBe(false);
  });

  it('hides ABV in safety mode', () => {
    expect(shouldShowAbv(false)).toBe(true);
    expect(shouldShowAbv(true)).toBe(false);
  });

  it('hides alcohol drink count summaries in safety mode', () => {
    expect(shouldShowAlcoholDrinkCount(false)).toBe(true);
    expect(shouldShowAlcoholDrinkCount(true)).toBe(false);
  });

  it('hides diuretic threshold copy in safety mode', () => {
    expect(shouldShowDiureticCopy(false)).toBe(true);
    expect(shouldShowDiureticCopy(true)).toBe(false);
  });

  it('keeps the volume number visible in both modes', () => {
    expect(shouldShowVolumeNumber(false)).toBe(true);
    expect(shouldShowVolumeNumber(true)).toBe(true);
  });

  it('keeps the default vs yours comparison visible in both modes', () => {
    expect(shouldShowDefaultComparison(false)).toBe(true);
    expect(shouldShowDefaultComparison(true)).toBe(true);
  });
});
