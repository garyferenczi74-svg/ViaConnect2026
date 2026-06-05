// =============================================================================
// Prompt 175h Section 2.5 (2026-06-05): Hannah timing class patterns.
//
// Each ingredient name is matched (case-insensitive, partial substring)
// against these pattern lists. The first list that matches wins; the
// engine maps the resulting class to a time-of-day recommendation.
//
// Lists are intentionally exported as plain readonly arrays so they
// are trivially testable and easy to extend without touching the
// engine. Adding a new ingredient is one line.
//
// PHI-free. Product / ingredient names only.
// =============================================================================

import type { TimingClass } from './types';

/**
 * Stimulating / energizing ingredients that lean morning. Avoid evening
 * because they interfere with sleep onset for sensitive users.
 */
export const STIMULATING_PATTERNS: ReadonlyArray<string> = [
  'caffeine',
  'guarana',
  'green tea extract',
  'matcha',
  'yerba mate',
  'b-complex',
  'b complex',
  'b12',
  'cobalamin',
  'methylcobalamin',
  'b6',
  'pyridoxine',
  'b3',
  'niacin',
  'niacinamide',
  'b2',
  'riboflavin',
  'b1',
  'thiamine',
  'thiamin',
  'alpha gpc',
  'alpha-gpc',
  'alpha glyceryl',
  'rhodiola',
  'tyrosine',
  'l-tyrosine',
  'phenylalanine',
  'l-phenylalanine',
  'cdp choline',
  'citicoline',
  'huperzine',
  'panax ginseng',
  'siberian ginseng',
  'eleuthero',
  'cordyceps',
  'lions mane',
];

/**
 * Calming / sleep-supporting ingredients that lean evening. Taken
 * morning these are sedating and sometimes interfere with daytime
 * focus.
 */
export const CALMING_PATTERNS: ReadonlyArray<string> = [
  'magnesium glycinate',
  'magnesium bisglycinate',
  'magnesium threonate',
  'magnesium l-threonate',
  'magnesium taurate',
  'glycine',
  'l-glycine',
  'l-theanine',
  'theanine',
  'melatonin',
  'gaba',
  'valerian',
  'passionflower',
  'passion flower',
  'ashwagandha',
  'chamomile',
  'lemon balm',
  'lavender',
  'kava',
  'reishi',
  '5-htp',
  '5htp',
  'tryptophan',
  'l-tryptophan',
  'apigenin',
];

/**
 * Fat-soluble vitamins and lipid-class compounds that absorb meaningfully
 * better when taken with a meal containing fat. with_food: true.
 */
export const FAT_SOLUBLE_PATTERNS: ReadonlyArray<string> = [
  'vitamin a',
  'retinol',
  'retinyl',
  'beta-carotene',
  'beta carotene',
  'vitamin d',
  'cholecalciferol',
  'd3',
  'vitamin e',
  'tocopherol',
  'mixed tocopherols',
  'tocotrienol',
  'vitamin k',
  'k1',
  'k2',
  'menaquinone',
  'mk-7',
  'mk-4',
  'phylloquinone',
  'omega 3',
  'omega-3',
  'fish oil',
  'cod liver oil',
  'krill oil',
  'algae oil',
  'epa',
  'dha',
  'coq10',
  'ubiquinol',
  'ubiquinone',
  'curcumin',
  'turmeric',
];

/**
 * Iron-class compounds. Morning lean, away from calcium, coffee, tea
 * (each of which inhibits non-heme iron absorption). The engine adds
 * spacing conflicts when the user takes any of those.
 */
export const IRON_PATTERNS: ReadonlyArray<string> = [
  'ferrous',
  'iron bisglycinate',
  'iron glycinate',
  'iron citrate',
  'ferritin',
  'heme iron',
  'iron polysaccharide',
  'carbonyl iron',
  'iron supplement',
];

/**
 * Calcium-class supplements that inhibit iron absorption. Engine
 * surfaces a conflict when the user takes iron AND any of these.
 */
export const CALCIUM_PATTERNS: ReadonlyArray<string> = [
  'calcium carbonate',
  'calcium citrate',
  'calcium malate',
  'calcium ascorbate',
  'calcium',
];

/**
 * Caffeine-bearing supplements that inhibit non-heme iron. The
 * caffeine-class is already in STIMULATING_PATTERNS but called out
 * separately here so the iron-spacing conflict logic can check it
 * without re-matching the stimulating list.
 */
export const CAFFEINE_PATTERNS: ReadonlyArray<string> = [
  'caffeine',
  'guarana',
  'green tea extract',
  'matcha',
  'yerba mate',
  'coffee',
  'black tea',
];

/**
 * Class detection priority. The engine checks each list in order; the
 * first hit wins. Iron takes priority over fat_soluble (an iron + C
 * combo would otherwise read as fat_soluble due to vitamin C). Calming
 * takes priority over fat_soluble (an Mg + D3 combo is timed for sleep
 * support, not for fat absorption).
 */
export const CLASS_PRIORITY: ReadonlyArray<TimingClass> = [
  'iron',
  'calming',
  'stimulating',
  'fat_soluble',
];

function nameContainsAny(name: string, patterns: ReadonlyArray<string>): boolean {
  const lower = name.toLowerCase();
  for (const p of patterns) {
    if (lower.includes(p)) return true;
  }
  return false;
}

/**
 * Classify a single ingredient by name. Returns null when no pattern
 * matches; the engine treats that as 'general'.
 */
export function classifyIngredient(name: string): TimingClass | null {
  if (nameContainsAny(name, IRON_PATTERNS)) return 'iron';
  if (nameContainsAny(name, CALMING_PATTERNS)) return 'calming';
  if (nameContainsAny(name, STIMULATING_PATTERNS)) return 'stimulating';
  if (nameContainsAny(name, FAT_SOLUBLE_PATTERNS)) return 'fat_soluble';
  return null;
}

/**
 * True when a name matches any caffeine pattern. Used by the
 * iron-spacing conflict logic.
 */
export function nameLooksLikeCaffeine(name: string): boolean {
  return nameContainsAny(name, CAFFEINE_PATTERNS);
}

/**
 * True when a name matches any calcium pattern.
 */
export function nameLooksLikeCalcium(name: string): boolean {
  return nameContainsAny(name, CALCIUM_PATTERNS);
}
