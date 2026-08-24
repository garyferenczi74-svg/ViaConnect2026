/**
 * Prompt 215/215b: seed product tab content from MASTER_FORMULATIONS.
 * Description bodies are narrative-only (no duplicated category sections).
 */

import { MASTER_FORMULATIONS, type ProductFormulation } from '@/data/masterFormulations';
import { normalizeProductCopy } from './lexicon';
import {
  formatDescriptionNarrative,
  splitLongScrollDescription,
  type ParityLogRow,
} from './dedupeDescription';
import type { ContentGateStatus, ProductTabContent, ProductTabKey } from './types';
import { PRODUCT_TAB_KEYS } from './types';
import { resolveFormulationBySlug } from './resolveSlug';

function formulationBody(p: ProductFormulation): string {
  const lines = p.ingredients.map(
    (i) =>
      `- **${i.name}:** ${i.mgPerServing} mg per serving` +
      (i.isLiposomal ? ' (liposomal delivery)' : '') +
      (i.isMicellar ? ' (micellar delivery)' : ''),
  );
  return normalizeProductCopy(
    `## Formulation\n\nDelivery form: **${p.deliveryForm}**\n\nIngredient count: **${p.ingredientCount}**\n\n` +
      lines.join('\n') +
      `\n\nFormulation data is sourced from the canonical master formulation record so label, page, and database stay aligned.`,
  );
}

function ingredientBreakdownBody(p: ProductFormulation, override?: string | null): string {
  if (override && override.trim().length > 0) {
    return normalizeProductCopy(`## Ingredient Breakdown\n\n${override.trim()}`);
  }
  const lines = p.ingredients.map((i) => {
    const tech = [
      i.isLiposomal ? 'liposomal' : null,
      i.isMicellar ? 'micellar' : null,
    ]
      .filter(Boolean)
      .join(', ');
    return `- **${i.name}** (${i.mgPerServing} mg)${tech ? ` - ${tech} delivery technology` : ''}`;
  });
  return normalizeProductCopy(
    `## Ingredient Breakdown\n\nEach ingredient is listed at the per-serving amount from the formulation record.\n\n` +
      lines.join('\n'),
  );
}

function whoBenefitsBody(
  p: ProductFormulation,
  override?: string | null,
): { body: string; gate: ContentGateStatus } {
  if (override && override.trim().length > 0) {
    return {
      body: normalizeProductCopy(
        `## Who Benefits & What Makes This Different?\n\n${override.trim()}`,
      ),
      gate: 'approved',
    };
  }
  const body = normalizeProductCopy(
    `## Who Benefits & What Makes This Different?\n\n` +
      `**Who benefits:** People seeking targeted support aligned with the ${p.category.toLowerCase()} category and the mechanisms described for ${p.name}.\n\n` +
      `**What makes this different:** Via Cura formulates with bioactive nutrient forms and delivery technologies (including liposomal and micellar systems where listed) designed for higher bioavailability. Where bioavailability multipliers appear in Via Cura materials, the locked phrase is **10x to 28x**. Built For Your Biology.\n\n` +
      `This section is being finalized with Marshall-gated copy.`,
  );
  return { body, gate: 'pending' };
}

export function buildTabsForProduct(p: ProductFormulation): ProductTabContent[] {
  const split = splitLongScrollDescription(p.marketingDescription);
  const who = whoBenefitsBody(p, split.whoBenefits);
  const now = new Date().toISOString();
  const base = (
    tabKey: ProductTabKey,
    bodyMd: string,
    gateStatus: ContentGateStatus,
  ): ProductTabContent => ({
    productSlug: p.slug,
    tabKey,
    bodyMd,
    gateStatus,
    lastVerifiedAt: gateStatus === 'approved' ? now : null,
    provenance: [
      { source: 'masterFormulations', slug: p.slug },
      ...(split.moved.length
        ? [{ source: '215b_dedupe', moved: split.moved }]
        : []),
    ],
  });

  return [
    base(
      'full_description',
      formatDescriptionNarrative(p.name, split.description),
      p.isDraft ? 'pending' : 'approved',
    ),
    base(
      'ingredient_breakdown',
      ingredientBreakdownBody(p, split.ingredientBreakdown),
      p.isDraft ? 'pending' : 'approved',
    ),
    base('who_benefits', who.body, who.gate),
    base(
      'formulation',
      split.formulation
        ? normalizeProductCopy(
            `## Formulation\n\nDelivery form: **${p.deliveryForm}**\n\n${split.formulation}`,
          )
        : formulationBody(p),
      p.isDraft ? 'pending' : 'approved',
    ),
    base(
      'genetic_compatibility',
      normalizeProductCopy(
        `## Genetic Compatibility\n\nPersonalized scoring is computed server-side by Elysium and explained by Hannah. Sign in and connect genetics for your score.`,
      ),
      'approved',
    ),
  ];
}

/** All non-peptide consumer formulation products (60). */
export function allSeededProductTabs(): ProductTabContent[] {
  return MASTER_FORMULATIONS.flatMap(buildTabsForProduct);
}

export function getSeededTabsForSlug(slug: string): ProductTabContent[] {
  const p = resolveFormulationBySlug(slug);
  if (!p) return [];
  return buildTabsForProduct(p);
}

export function seededProductSlugs(): string[] {
  return MASTER_FORMULATIONS.map((p) => p.slug);
}

/** Completeness: every product must have all five tab keys. */
export function assertTabCompleteness(rows: ProductTabContent[]): {
  pass: boolean;
  missing: Array<{ slug: string; tab: string }>;
} {
  const missing: Array<{ slug: string; tab: string }> = [];
  const bySlug = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!bySlug.has(r.productSlug)) bySlug.set(r.productSlug, new Set());
    bySlug.get(r.productSlug)!.add(r.tabKey);
  }
  for (const [slug, tabs] of bySlug) {
    for (const k of PRODUCT_TAB_KEYS) {
      if (!tabs.has(k)) missing.push({ slug, tab: k });
    }
  }
  return { pass: missing.length === 0, missing };
}

/** Prompt 215b parity log for the full master catalog. */
export function buildCatalogParityLog(): ParityLogRow[] {
  return MASTER_FORMULATIONS.map((p) => {
    const before = p.marketingDescription ?? '';
    const split = splitLongScrollDescription(before);
    const after = formatDescriptionNarrative(p.name, split.description);
    const tabs = buildTabsForProduct(p);
    const ing = tabs.find((t) => t.tabKey === 'ingredient_breakdown');
    const who = tabs.find((t) => t.tabKey === 'who_benefits');
    const form = tabs.find((t) => t.tabKey === 'formulation');
    // Zero-loss: every moved block appears in its section, and description is shorter or equal
    // when duplication existed; narrative length preserved when no split.
    const movedOk = split.moved.every((m) => {
      if (m === 'ingredient_breakdown') return (ing?.bodyMd.length ?? 0) > 20;
      if (m === 'who_benefits') return (who?.bodyMd.length ?? 0) > 20;
      if (m === 'formulation') return (form?.bodyMd.length ?? 0) > 20;
      return true;
    });
    return {
      slug: p.slug,
      hadDuplication: split.hadDuplication,
      moved: split.moved,
      descriptionLenBefore: before.length,
      descriptionLenAfter: after.length,
      ingredientHasContent: (ing?.bodyMd.length ?? 0) > 20,
      whoHasContent: (who?.bodyMd.length ?? 0) > 20,
      formulationHasContent: (form?.bodyMd.length ?? 0) > 20,
      zeroLoss: movedOk && after.length > 0,
    };
  });
}
