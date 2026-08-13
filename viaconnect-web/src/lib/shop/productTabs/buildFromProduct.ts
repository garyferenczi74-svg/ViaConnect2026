/**
 * Prompt 215a: always produce five section bodies for any shop product.
 * Prefer MASTER_FORMULATIONS via slug resolve; fall back to ShopProduct fields.
 */

import type { ShopProduct } from '@/lib/shop/queries';
import { normalizeProductCopy } from './lexicon';
import { buildTabsForProduct } from './contentSeed';
import { resolveFormulationBySlug } from './resolveSlug';
import type { ProductTabContent } from './types';
import { PRODUCT_TAB_KEYS } from './types';

function fromShopProduct(product: ShopProduct): ProductTabContent[] {
  const slug = product.slug ?? product.sku ?? 'unknown';
  const desc = normalizeProductCopy(
    product.description || product.summary || `${product.name} details are being finalized.`,
  );
  const ingredients = product.ingredients ?? [];
  const ingList =
    ingredients.length > 0
      ? ingredients
          .map((i) => {
            const dose =
              i.dose != null ? `${i.dose}${i.unit ?? 'mg'}` : 'amount on label';
            return `- **${i.name}:** ${dose}${i.role ? ` (${i.role})` : ''}`;
          })
          .join('\n')
      : '- Formulation ingredients are being finalized from the product record.';

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
    provenance: [{ source: 'shop_product', slug }],
  });

  return [
    mk(
      'full_description',
      normalizeProductCopy(`## Full Description\n\n${desc}`),
      product.description || product.summary ? 'approved' : 'pending',
    ),
    mk(
      'ingredient_breakdown',
      normalizeProductCopy(`## Ingredient Breakdown\n\n${ingList}`),
      ingredients.length > 0 ? 'approved' : 'pending',
    ),
    mk(
      'who_benefits',
      normalizeProductCopy(
        `## Who Benefits & What Makes This Different?\n\n` +
          `**Who benefits:** People seeking targeted support with ${product.name}.\n\n` +
          `**What makes this different:** Via Cura formulates with bioactive nutrient forms and delivery technologies designed for higher bioavailability. Where bioavailability multipliers appear, the locked phrase is **10x to 28x**. Built For Your Biology.\n\n` +
          `This section is being finalized with Marshall-gated copy.`,
      ),
      'pending',
    ),
    mk(
      'formulation',
      normalizeProductCopy(
        `## Formulation\n\nFormat: **${product.format ?? 'as labeled'}**\n\n${ingList}`,
      ),
      ingredients.length > 0 ? 'approved' : 'pending',
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
 * Never returns empty array for a valid product page.
 */
export function buildFiveSections(
  product: ShopProduct,
  slugOverride?: string,
): ProductTabContent[] {
  const slug = slugOverride ?? product.slug ?? product.sku ?? '';
  const formulation = resolveFormulationBySlug(slug);
  const seeded = formulation ? buildTabsForProduct(formulation) : [];
  const fallback = fromShopProduct(product);

  // Prefer product.description for full_description when richer than seed marketing
  const productDesc = (product.description ?? '').trim();
  const merged = PRODUCT_TAB_KEYS.map((key) => {
    const seed = seeded.find((s) => s.tabKey === key);
    const fb = fallback.find((s) => s.tabKey === key)!;
    if (key === 'full_description' && productDesc.length > (seed?.bodyMd.length ?? 0)) {
      return {
        ...fb,
        bodyMd: normalizeProductCopy(`## Full Description\n\n${productDesc}`),
        gateStatus: 'approved' as const,
      };
    }
    if (key === 'formulation' && (product.ingredients?.length ?? 0) > 0) {
      // Prefer live product record ingredients so page and DB cannot drift
      return fb;
    }
    return seed ?? fb;
  });

  return merged;
}

/** DOM completeness helper: labels in order. */
export function expectedSectionHeaders(): readonly string[] {
  return [
    'Full Description',
    'Ingredient Breakdown',
    'Who Benefits & What Makes This Different?',
    'Formulation',
    'Genetic Compatibility',
  ];
}
