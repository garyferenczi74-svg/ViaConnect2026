/**
 * Prompt 170f Phase B: per-ingredient allergen flag derivation.
 *
 * Deterministic keyword map for the 9 major allergen classes per spec §6.3
 * + 170m Section 8 allergen vocab. Phase 1.1 supplement adds cascade
 * allergen metadata composition (when ingredient cascade match lands).
 *
 * Recipe.allergen_flags = union over per-ingredient flags.
 */

import type { RecipeAllergen } from './types';

const KEYWORD_MAP: Array<{ kind: RecipeAllergen; patterns: RegExp[] }> = [
  {
    kind: 'peanuts',
    patterns: [/\bpeanut/i, /\bp\.?b\.?\b/i, /\bsatay\b/i, /\bkung pao\b/i],
  },
  {
    kind: 'tree_nuts',
    patterns: [
      /\balmond/i, /\bcashew/i, /\bwalnut/i, /\bpecan/i, /\bpistachio/i,
      /\bhazelnut/i, /\bmacadamia/i, /\bbrazil nut/i, /\bpine nut/i,
    ],
  },
  {
    kind: 'milk',
    patterns: [
      /\bmilk\b/i, /\bcheese\b/i, /\byogurt/i, /\bbutter\b/i, /\bcream\b/i,
      /\bwhey\b/i, /\bcasein\b/i, /\bricotta\b/i, /\bmozzarella\b/i,
      /\bparmesan\b/i, /\bcheddar\b/i, /\blatte\b/i, /\bcappuccino\b/i,
    ],
  },
  {
    kind: 'eggs',
    patterns: [
      /\begg/i, /\bomelet/i, /\bfrittata\b/i, /\bquiche\b/i,
      /\bmayonnaise\b/i, /\bmayo\b/i, /\bcustard\b/i, /\bmeringue\b/i,
    ],
  },
  {
    kind: 'soy',
    patterns: [
      /\btofu\b/i, /\bsoy\b/i, /\bedamame\b/i, /\btempeh\b/i,
      /\bmiso\b/i, /\bsoybean/i,
    ],
  },
  {
    kind: 'wheat',
    patterns: [
      /\bwheat\b/i, /\bbread\b/i, /\bpasta\b/i, /\bnoodle/i,
      /\bcracker/i, /\bbagel/i, /\btoast\b/i, /\btortilla\b/i,
      /\bflour\b/i, /\bpizza crust\b/i, /\bpretzel/i, /\bcroissant\b/i,
    ],
  },
  {
    kind: 'fish',
    patterns: [
      /\bsalmon\b/i, /\btuna\b/i, /\bcod\b/i, /\btilapia\b/i, /\bhalibut\b/i,
      /\bmackerel\b/i, /\bsardine/i, /\banchov/i, /\btrout\b/i,
    ],
  },
  {
    kind: 'shellfish',
    patterns: [
      /\bshrimp\b/i, /\bcrab\b/i, /\blobster\b/i, /\bscallop/i, /\boyster/i,
      /\bclam/i, /\bmussel/i, /\bcalamari\b/i, /\bsquid\b/i,
    ],
  },
  {
    kind: 'sesame',
    patterns: [
      /\bsesame\b/i, /\btahini\b/i, /\bhummus\b/i, /\bza'?atar\b/i,
    ],
  },
  {
    kind: 'gluten',
    patterns: [
      /\bbarley\b/i, /\brye\b/i, /\bseitan\b/i, /\bbeer\b/i,
    ],
  },
];

export function deriveAllergensForIngredient(rawName: string): RecipeAllergen[] {
  const hits = new Set<RecipeAllergen>();
  for (const entry of KEYWORD_MAP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(rawName)) {
        hits.add(entry.kind);
        break;
      }
    }
  }
  // Wheat-containing items also flag gluten per spec §6.3 + 170m §8.
  if (hits.has('wheat')) hits.add('gluten');
  return Array.from(hits).sort();
}

export function deriveAllergensForRecipe(ingredientRawNames: string[]): RecipeAllergen[] {
  const aggregate = new Set<RecipeAllergen>();
  for (const name of ingredientRawNames) {
    for (const flag of deriveAllergensForIngredient(name)) {
      aggregate.add(flag);
    }
  }
  return Array.from(aggregate).sort();
}
