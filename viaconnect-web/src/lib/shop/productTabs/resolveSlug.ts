/**
 * Prompt 215a: resolve shop product slugs to MASTER_FORMULATIONS rows.
 * Production slugs often include -plus- and -and- tokens the master file omits.
 */

import { MASTER_FORMULATIONS, type ProductFormulation } from '@/data/masterFormulations';

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/plus/g, ' ')
    .replace(/\band\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !['the', 'with', 'for', 'and'].includes(t));
}

/**
 * Exact, alias, then token-overlap match. Never returns empty when a reasonable
 * formulation exists for Clean+/Balance+/ACHY+ style URL slugs.
 */
export function resolveFormulationBySlug(slug: string): ProductFormulation | undefined {
  if (!slug) return undefined;
  const direct = MASTER_FORMULATIONS.find((f) => f.slug === slug);
  if (direct) return direct;

  // balance-plus-gut-repair -> balance-gut-repair
  const strippedPlus = slug.replace(/-plus-/g, '-').replace(/-plus$/g, '');
  const strippedAnd = strippedPlus.replace(/-and-/g, '-');
  const byStrip = MASTER_FORMULATIONS.find(
    (f) => f.slug === strippedPlus || f.slug === strippedAnd,
  );
  if (byStrip) return byStrip;

  const slugTokens = new Set(tokens(slug));
  if (slugTokens.size === 0) return undefined;

  let best: ProductFormulation | undefined;
  let bestScore = 0;
  for (const f of MASTER_FORMULATIONS) {
    const ft = tokens(f.slug);
    const overlap = ft.filter((t) => slugTokens.has(t)).length;
    // Prefer high overlap relative to shorter slug token set
    const score = overlap / Math.max(ft.length, 1);
    if (overlap >= 2 && score > bestScore) {
      bestScore = score;
      best = f;
    }
  }

  // Special cases used on live routes
  if (!best) {
    if (slug.includes('clean') && (slug.includes('detox') || slug.includes('liver'))) {
      return MASTER_FORMULATIONS.find((f) => f.slug === 'clean-detox-liver-health');
    }
    if (slug.includes('balance') && slug.includes('gut')) {
      return MASTER_FORMULATIONS.find((f) => f.slug === 'balance-gut-repair');
    }
    if (slug.includes('achy')) {
      return MASTER_FORMULATIONS.find((f) => f.slug.includes('achy'));
    }
  }

  return best;
}

export const SECTION_HASH_IDS = [
  'full-description',
  'ingredient-breakdown',
  'who-benefits',
  'formulation',
  'genetic-compatibility',
] as const;

export type SectionHashId = (typeof SECTION_HASH_IDS)[number];

export const SECTION_HEADERS = [
  'Full Description',
  'Ingredient Breakdown',
  'Who Benefits & What Makes This Different?',
  'Formulation',
  'Genetic Compatibility',
] as const;

export const TAB_KEY_TO_HASH: Record<string, SectionHashId> = {
  full_description: 'full-description',
  ingredient_breakdown: 'ingredient-breakdown',
  who_benefits: 'who-benefits',
  formulation: 'formulation',
  genetic_compatibility: 'genetic-compatibility',
};
