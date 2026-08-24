/**
 * Gary lock 23-24 Aug 2026: Ingredient Breakdown uses confirmed data only.
 * Annotate existing formulation rows only. Never add marketing-bullet actives.
 * this_sku human PK = 0. Class literature only where the active is on the SKU list.
 */

export type BioavailabilityEvidenceType =
  | 'this_sku'
  | 'class_not_this_sku'
  | 'not_stated';

export interface ConfirmedBioavailability {
  bioavailability_note: string;
  evidence_type: BioavailabilityEvidenceType;
  pmid: string | null;
}

export const LISTED_VIA_CURA_SLUGS = [
  'radiance-plus',
  'creatine-hcl-plus',
  'balance-gut-repair',
  'flex-joint-inflammation',
  'desire-female-hormonal',
  'iron-red-blood-cell-support',
  'menobalance-plus',
  'replenish-nad',
  'grow-pre-natal-formula',
  'focus-nootropic-formula',
  'sproutables-children-gummies',
] as const;

export type ListedViaCuraSlug = (typeof LISTED_VIA_CURA_SLUGS)[number];

/** Approved class lines. Never labeled this_sku. No em/en dashes. */
export const CLASS_LIPOSOMAL_VITAMIN_C =
  'Maximum Bioavailability: about 1.4x AUC0-4h class (PMID 27375360, other-brand liquid). Not this SKU human PK.';

export const CLASS_LIPOSOMAL_COQ10 =
  'Maximum Bioavailability: about 1.23x AUC0-24 class (DOI 10.3389/fnut.2025.1605033). Not this SKU human PK.';

export const CLASS_LIPOSOMAL_CURCUMIN =
  'Maximum Bioavailability: same-class oral liposomes no significant AUC gain (Flory / NCT03530436). Not this SKU human PK.';

export const NOT_STATED_NOTE =
  'Maximum Bioavailability for this ingredient is not stated. No this-SKU human PK.';

/** Class notes attach only when that active is already on the formulation. */
const VITAMIN_C_CLASS_SLUGS = new Set<string>([
  'iron-red-blood-cell-support',
  'grow-pre-natal-formula',
]);

const COQ10_CLASS_SLUGS = new Set<string>([
  'radiance-plus',
  'replenish-nad',
  'focus-nootropic-formula',
]);

const CURCUMIN_CLASS_SLUGS = new Set<string>([
  'balance-gut-repair',
  'flex-joint-inflammation',
]);

/** Marketing-bullet actives that must never be inserted on these SKUs. */
export const FORBIDDEN_GHOST_ACTIVES: Record<string, RegExp> = {
  'iron-red-blood-cell-support': /\b(iron salt|ferrous|ferric|iron bisglycinate|iron \(as)\b/i,
  'menobalance-plus': /curcumin|coq10|ubiquinol|coenzyme q10/i,
  'replenish-nad': /curcumin/i,
  'creatine-hcl-plus': /coq10|ubiquinol|coenzyme q10/i,
  'grow-pre-natal-formula': /algal|dha|epa|omega-3/i,
  'radiance-plus': /liposomal\s+(vitamin\s*c|ascorbic)/i,
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[™®]/g, '').replace(/\s+/g, ' ').trim();
}

export function isListedViaCuraSku(slug: string, name?: string): boolean {
  if (LISTED_VIA_CURA_SLUGS.includes(slug as ListedViaCuraSlug)) return true;
  const n = norm(name ?? '');
  if (!n) return false;
  return (
    n.startsWith('radiance+') ||
    n.startsWith('creatine hcl+') ||
    n.startsWith('balance+') ||
    n.startsWith('flex+') ||
    n.startsWith('desire+') ||
    n.startsWith('iron+') ||
    n.startsWith('menobalance+') ||
    n.startsWith('replenish nad+') ||
    n.startsWith('grow+') ||
    n.startsWith('focus+') ||
    n.startsWith('sproutables children gummies')
  );
}

function isLiposomalVitaminC(ingredientName: string): boolean {
  const n = norm(ingredientName);
  if (!/(vitamin c|ascorbic)/.test(n)) return false;
  if (n.includes('micellar') && !n.includes('liposomal')) return false;
  return n.includes('liposomal');
}

function isCoq10Ubiquinol(ingredientName: string): boolean {
  const n = norm(ingredientName);
  if (/ubiquinone/.test(n) && !/ubiquinol/.test(n)) return false;
  return /coq10|ubiquinol|coenzyme q10/.test(n);
}

function isCurcumin(ingredientName: string): boolean {
  return /curcumin/.test(norm(ingredientName));
}

export function isForbiddenGhostActive(slug: string, ingredientName: string): boolean {
  const re = FORBIDDEN_GHOST_ACTIVES[slug];
  return Boolean(re && re.test(ingredientName));
}

export function resolveIngredientBioavailability(
  slug: string,
  ingredientName: string,
  productName?: string,
): ConfirmedBioavailability {
  const listed = isListedViaCuraSku(slug, productName);
  if (!listed) {
    return {
      bioavailability_note: NOT_STATED_NOTE,
      evidence_type: 'not_stated',
      pmid: null,
    };
  }

  if (isForbiddenGhostActive(slug, ingredientName)) {
    return {
      bioavailability_note: NOT_STATED_NOTE,
      evidence_type: 'not_stated',
      pmid: null,
    };
  }

  if (VITAMIN_C_CLASS_SLUGS.has(slug) && isLiposomalVitaminC(ingredientName)) {
    return {
      bioavailability_note: CLASS_LIPOSOMAL_VITAMIN_C,
      evidence_type: 'class_not_this_sku',
      pmid: '27375360',
    };
  }

  if (COQ10_CLASS_SLUGS.has(slug) && isCoq10Ubiquinol(ingredientName)) {
    return {
      bioavailability_note: CLASS_LIPOSOMAL_COQ10,
      evidence_type: 'class_not_this_sku',
      pmid: null,
    };
  }

  if (CURCUMIN_CLASS_SLUGS.has(slug) && isCurcumin(ingredientName)) {
    return {
      bioavailability_note: CLASS_LIPOSOMAL_CURCUMIN,
      evidence_type: 'class_not_this_sku',
      pmid: null,
    };
  }

  return {
    bioavailability_note: NOT_STATED_NOTE,
    evidence_type: 'not_stated',
    pmid: null,
  };
}

export function applyConfirmedBioavailability<
  T extends {
    slug: string;
    name: string;
    ingredients: Array<{ name: string }>;
  },
>(products: T[]): T[] {
  return products.map((p) => {
    if (!isListedViaCuraSku(p.slug, p.name)) return p;
    const kept = p.ingredients.filter((ing) => !isForbiddenGhostActive(p.slug, ing.name));
    return {
      ...p,
      ingredients: kept.map((ing) => ({
        ...ing,
        ...resolveIngredientBioavailability(p.slug, ing.name, p.name),
      })),
    };
  });
}

export function annotateShopIngredientJson<
  T extends { name: string },
>(slug: string, productName: string, ingredients: T[]): Array<T & ConfirmedBioavailability> {
  if (!isListedViaCuraSku(slug, productName)) return ingredients as Array<T & ConfirmedBioavailability>;
  return ingredients
    .filter((ing) => !isForbiddenGhostActive(slug, ing.name))
    .map((ing) => ({
      ...ing,
      ...resolveIngredientBioavailability(slug, ing.name, productName),
    }));
}
