/**
 * Prompt 215: seed product tab content from MASTER_FORMULATIONS.
 * Used as runtime fallback when product_content table is empty/unmigrated,
 * and as the source for migration SQL generation / completeness tests.
 * Peptides are excluded (214d).
 */

import { MASTER_FORMULATIONS, type ProductFormulation } from '@/data/masterFormulations';
import { normalizeProductCopy } from './lexicon';
import type { ContentGateStatus, ProductTabContent, ProductTabKey } from './types';
import { PRODUCT_TAB_KEYS } from './types';

function formulationBody(p: ProductFormulation): string {
  const lines = p.ingredients.map(
    (i) => `- **${i.name}:** ${i.mgPerServing} mg per serving` +
      (i.isLiposomal ? ' (liposomal delivery)' : '') +
      (i.isMicellar ? ' (micellar delivery)' : ''),
  );
  return normalizeProductCopy(
    `## Formulation\n\nDelivery form: **${p.deliveryForm}**\n\nIngredient count: **${p.ingredientCount}**\n\n` +
      lines.join('\n') +
      `\n\nFormulation data is sourced from the canonical master formulation record so label, page, and database stay aligned.`,
  );
}

function ingredientBreakdownBody(p: ProductFormulation): string {
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

function whoBenefitsBody(p: ProductFormulation): { body: string; gate: ContentGateStatus } {
  // Template draft: PENDING until Marshall approval (honest interim on live UI)
  const body = normalizeProductCopy(
    `## Who Benefits and What Makes This Different?\n\n` +
      `**Who benefits:** People seeking targeted support aligned with the ${p.category.toLowerCase()} category and the mechanisms described for ${p.name}.\n\n` +
      `**What makes this different:** Via Cura formulates with bioactive nutrient forms and delivery technologies (including liposomal and micellar systems where listed) designed for higher bioavailability. Where bioavailability multipliers appear in Via Cura materials, the locked phrase is **10x to 28x**. Built For Your Biology.\n\n` +
      `This section is being finalized with Marshall-gated copy. Content below is a structural draft pending approval.`,
  );
  return { body, gate: 'pending' };
}

export function buildTabsForProduct(p: ProductFormulation): ProductTabContent[] {
  const who = whoBenefitsBody(p);
  const now = new Date().toISOString();
  const base = (tabKey: ProductTabKey, bodyMd: string, gateStatus: ContentGateStatus): ProductTabContent => ({
    productSlug: p.slug,
    tabKey,
    bodyMd,
    gateStatus,
    lastVerifiedAt: gateStatus === 'approved' ? now : null,
    provenance: [{ source: 'masterFormulations', slug: p.slug }],
  });

  return [
    base(
      'full_description',
      normalizeProductCopy(`## Full Description\n\n${p.marketingDescription}`),
      p.isDraft ? 'pending' : 'approved',
    ),
    base('ingredient_breakdown', ingredientBreakdownBody(p), p.isDraft ? 'pending' : 'approved'),
    base('who_benefits', who.body, who.gate),
    base('formulation', formulationBody(p), p.isDraft ? 'pending' : 'approved'),
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
  const p = MASTER_FORMULATIONS.find(
    (f) => f.slug === slug || f.slug === slug.replace(/-plus-/g, '-'),
  );
  // Alias: balance-plus-gut-repair -> balance-gut-repair
  const alias =
    p ??
    MASTER_FORMULATIONS.find((f) => {
      if (slug.includes('balance') && slug.includes('gut') && f.slug.includes('balance-gut'))
        return true;
      if (slug.includes('achy') && f.slug.includes('achy')) return true;
      return false;
    });
  if (!alias) return [];
  return buildTabsForProduct(alias);
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
