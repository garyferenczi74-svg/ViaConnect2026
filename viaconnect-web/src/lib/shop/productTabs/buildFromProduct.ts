/**
 * Prompt 215a/215b: always produce five section bodies for any shop product.
 * Description is narrative-only; long-scroll category blocks are moved.
 */

import type { ShopProduct } from '@/lib/shop/queries';
import { annotateShopIngredientJson } from '@/lib/supplements/confirmedBioavailability';
import { normalizeProductCopy } from './lexicon';
import { buildTabsForProduct } from './contentSeed';
import { resolveFormulationBySlug } from './resolveSlug';
import {
  formatDescriptionNarrative,
  splitLongScrollDescription,
  type ParityLogRow,
} from './dedupeDescription';
import type { ProductTabContent } from './types';
import { PRODUCT_TAB_KEYS } from './types';

function fromShopProduct(product: ShopProduct): ProductTabContent[] {
  const slug = product.slug ?? product.sku ?? 'unknown';
  const rawDesc =
    product.description || product.summary || `${product.name} details are being finalized.`;
  const split = splitLongScrollDescription(rawDesc);
  const ingredients = annotateShopIngredientJson(
    slug,
    product.name,
    product.ingredients ?? [],
  );
  const ingListFromRecord =
    ingredients.length > 0
      ? ingredients
          .map((i) => {
            const dose =
              i.dose != null ? `${i.dose}${i.unit ?? 'mg'}` : 'amount on label';
            const note = i.bioavailability_note ? ` ${i.bioavailability_note}` : '';
            return `- **${i.name}:** ${dose}${i.role ? ` (${i.role})` : ''}.${note}`;
          })
          .join('\n')
      : null;

  const ingBody =
    split.ingredientBreakdown && split.ingredientBreakdown.trim().length > 0
      ? split.ingredientBreakdown
      : ingListFromRecord ??
        '- Formulation ingredients are being finalized from the product record.';

  const now = new Date().toISOString();
  const mk = (
    tabKey: ProductTabContent['tabKey'],
    bodyMd: string,
    gate: ProductTabContent['gateStatus'],
  ): ProductTabContent => ({
    productSlug: slug,
    tabKey,
    bodyMd,
    gateStatus: gate,
    lastVerifiedAt: gate === 'approved' ? now : null,
    provenance: [
      { source: 'shop_product', slug },
      ...(split.moved.length ? [{ source: '215b_dedupe', moved: split.moved }] : []),
    ],
  });

  const whoFromSplit = split.whoBenefits?.trim();
  const whoBody = whoFromSplit
    ? normalizeProductCopy(
        `## Who Benefits & What Makes This Different?\n\n${whoFromSplit}`,
      )
    : normalizeProductCopy(
        `## Who Benefits & What Makes This Different?\n\n` +
          `**Who benefits:** People seeking targeted support with ${product.name}.\n\n` +
          `**What makes this different:** Via Cura formulates with bioactive nutrient forms and delivery technologies designed for Maximum Bioavailability. Built For Your Biology.\n\n` +
          `This section is being finalized with Marshall-gated copy.`,
      );

  const formFromSplit = split.formulation?.trim();
  const formBody = formFromSplit
    ? normalizeProductCopy(
        `## Formulation\n\nFormat: **${product.format ?? 'as labeled'}**\n\n${formFromSplit}`,
      )
    : normalizeProductCopy(
        `## Formulation\n\nFormat: **${product.format ?? 'as labeled'}**\n\n${ingBody}`,
      );

  return [
    mk(
      'full_description',
      formatDescriptionNarrative(product.name, split.description),
      product.description || product.summary ? 'approved' : 'pending',
    ),
    mk(
      'ingredient_breakdown',
      normalizeProductCopy(`## Ingredient Breakdown\n\n${ingBody}`),
      ingredients.length > 0 || Boolean(split.ingredientBreakdown) ? 'approved' : 'pending',
    ),
    mk('who_benefits', whoBody, whoFromSplit ? 'approved' : 'pending'),
    mk(
      'formulation',
      formBody,
      ingredients.length > 0 || Boolean(formFromSplit) ? 'approved' : 'pending',
    ),
    mk(
      'genetic_compatibility',
      normalizeProductCopy(
        `## Genetic Compatibility\n\nPersonalized scoring is computed server-side by Elysium and explained by Hannah.`,
      ),
      'approved',
    ),
  ];
}

/**
 * Always returns exactly five sections in PRODUCT_TAB_KEYS order.
 * Description is de-duplicated narrative only.
 */
export function buildFiveSections(
  product: ShopProduct,
  slugOverride?: string,
): ProductTabContent[] {
  const slug = slugOverride ?? product.slug ?? product.sku ?? '';
  const formulation = resolveFormulationBySlug(slug);
  const seeded = formulation ? buildTabsForProduct(formulation) : [];
  const fallback = fromShopProduct(product);

  // Prefer product.description when present (after de-dupe), else seed narrative
  const productDesc = (product.description ?? '').trim();
  const splitProduct = productDesc
    ? splitLongScrollDescription(productDesc)
    : null;

  const merged = PRODUCT_TAB_KEYS.map((key) => {
    const seed = seeded.find((s) => s.tabKey === key);
    const fb = fallback.find((s) => s.tabKey === key)!;

    if (key === 'full_description' && splitProduct) {
      return {
        ...fb,
        bodyMd: formatDescriptionNarrative(product.name, splitProduct.description),
        gateStatus: 'approved' as const,
      };
    }

    // If description carried ingredient text and seed/fallback is thin, prefer moved content
    if (key === 'ingredient_breakdown' && splitProduct?.ingredientBreakdown) {
      const body = normalizeProductCopy(
        `## Ingredient Breakdown\n\n${splitProduct.ingredientBreakdown}`,
      );
      if (body.length > (seed?.bodyMd.length ?? 0) && body.length > (fb.bodyMd.length ?? 0)) {
        return { ...fb, bodyMd: body, gateStatus: 'approved' as const };
      }
    }

    if (key === 'who_benefits' && splitProduct?.whoBenefits) {
      return {
        ...fb,
        bodyMd: normalizeProductCopy(
          `## Who Benefits & What Makes This Different?\n\n${splitProduct.whoBenefits}`,
        ),
        gateStatus: 'approved' as const,
      };
    }

    if (key === 'formulation' && (product.ingredients?.length ?? 0) > 0) {
      return fb;
    }

    return seed ?? fb;
  });

  return merged;
}

/** DOM completeness helper: labels in order (215b). */
export function expectedSectionHeaders(): readonly string[] {
  return [
    'Description',
    'Ingredient Breakdown',
    'Who Benefits & What Makes This Different?',
    'Formulation',
    'Genetic Compatibility',
  ];
}

/** Parity log for a single product after buildFiveSections. */
export function parityLogForProduct(
  product: ShopProduct,
  slugOverride?: string,
): ParityLogRow {
  const slug = slugOverride ?? product.slug ?? product.sku ?? '';
  const before = product.description || product.summary || '';
  const split = splitLongScrollDescription(before);
  const sections = buildFiveSections(product, slug);
  const desc = sections.find((s) => s.tabKey === 'full_description');
  const ing = sections.find((s) => s.tabKey === 'ingredient_breakdown');
  const who = sections.find((s) => s.tabKey === 'who_benefits');
  const form = sections.find((s) => s.tabKey === 'formulation');
  return {
    slug,
    hadDuplication: split.hadDuplication,
    moved: split.moved,
    descriptionLenBefore: before.length,
    descriptionLenAfter: desc?.bodyMd.length ?? 0,
    ingredientHasContent: (ing?.bodyMd.length ?? 0) > 20,
    whoHasContent: (who?.bodyMd.length ?? 0) > 20,
    formulationHasContent: (form?.bodyMd.length ?? 0) > 20,
    zeroLoss:
      (desc?.bodyMd.length ?? 0) > 0 &&
      (ing?.bodyMd.length ?? 0) > 20 &&
      (who?.bodyMd.length ?? 0) > 20 &&
      (form?.bodyMd.length ?? 0) > 20,
  };
}
