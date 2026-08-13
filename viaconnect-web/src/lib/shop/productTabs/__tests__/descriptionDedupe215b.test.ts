/**
 * Prompt 215b: Description rename + de-dupe + zero-loss parity.
 */

import { describe, it, expect } from 'vitest';
import {
  splitLongScrollDescription,
  assertDescriptionBodyClean,
  formatDescriptionNarrative,
} from '../dedupeDescription';
import { buildTabsForProduct, buildCatalogParityLog, allSeededProductTabs } from '../contentSeed';
import { buildFiveSections, expectedSectionHeaders } from '../buildFromProduct';
import { SECTION_HEADERS, resolveSectionHash } from '../resolveSlug';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';
import type { ShopProduct } from '@/lib/shop/queries';
import { normalizeProductCopy } from '../lexicon';

const LONG_SCROLL = `## Full Description

What does Clean+ do?
Clean+ supports the liver's natural detox pathways with liposomal glutathione and NAC.

## Ingredient Breakdown
- Liposomal Glutathione (200 mg)
- NAC (300 mg)

## Who Benefits & What Makes This Different?
Who benefits: people seeking Phase I/II support.

## Formulation
Delivery form: Capsule
- Liposomal Glutathione: 200 mg
`;

function mockProduct(slug: string, description: string): ShopProduct {
  return {
    id: '1',
    sku: slug,
    slug,
    name: 'Clean+ Detox and Liver Health',
    short_name: 'Clean+',
    summary: null,
    description,
    format: 'Capsule',
    category: 'supplement',
    category_slug: 'advanced-formulas',
    price: 49,
    price_msrp: 49,
    pricing_tier: 'standard',
    image_url: null,
    image_urls: null,
    status_tags: null,
    testing_meta: null,
    snp_targets: null,
    bioavailability_pct: null,
    product_type: 'supplement',
    ingredients: [
      { name: 'Liposomal Glutathione', dose: 200, unit: 'mg', role: null },
      { name: 'NAC', dose: 300, unit: 'mg', role: null },
    ],
    gene_match_score: null,
    requires_practitioner_order: false,
    active: true,
    display_config: null,
  };
}

describe('215b section headers', () => {
  it('first header is Description not Full Description', () => {
    expect(SECTION_HEADERS[0]).toBe('Description');
    expect(expectedSectionHeaders()[0]).toBe('Description');
    expect([...expectedSectionHeaders()]).toEqual([...SECTION_HEADERS]);
    expect(SECTION_HEADERS).not.toContain('Full Description');
  });

  it('deep-link #description and alias #full-description resolve', () => {
    expect(resolveSectionHash('description')).toBe('description');
    expect(resolveSectionHash('#full-description')).toBe('description');
    expect(resolveSectionHash('full_description')).toBe('description');
    expect(resolveSectionHash('genetic-compatibility')).toBe('genetic-compatibility');
  });
});

describe('215b split long-scroll', () => {
  it('extracts narrative only and moves category blocks', () => {
    const split = splitLongScrollDescription(LONG_SCROLL);
    expect(split.hadDuplication).toBe(true);
    expect(split.moved).toEqual(
      expect.arrayContaining(['ingredient_breakdown', 'who_benefits', 'formulation']),
    );
    expect(split.description).toMatch(/Clean\+/);
    expect(split.description).not.toMatch(/Ingredient Breakdown/i);
    expect(split.description).not.toMatch(/Who Benefits/i);
    expect(split.description).not.toMatch(/## Formulation/i);
    expect(split.ingredientBreakdown).toMatch(/Glutathione/);
    expect(split.whoBenefits).toMatch(/Phase/i);
    expect(split.formulation).toMatch(/Capsule|Glutathione/);
  });

  it('formatDescriptionNarrative never uses Full Description heading', () => {
    const body = formatDescriptionNarrative('Clean+', 'Supports liver detox pathways.');
    expect(body).toMatch(/What does Clean\+ do\?/);
    expect(body).not.toMatch(/Full Description/i);
    expect(assertDescriptionBodyClean(body).clean).toBe(true);
  });
});

describe('215b buildFiveSections de-dupe', () => {
  it('Description body has no category markers when product.description is long-scroll', () => {
    const product = mockProduct('clean-plus-detox-and-liver-health', LONG_SCROLL);
    const sections = buildFiveSections(product);
    const desc = sections.find((s) => s.tabKey === 'full_description')!;
    const clean = assertDescriptionBodyClean(desc.bodyMd);
    expect(clean.clean).toBe(true);
    expect(desc.bodyMd).not.toMatch(/Ingredient Breakdown/i);
    expect(desc.bodyMd).not.toMatch(/Full Description/i);
    // Moved content lives in proper sections
    const ing = sections.find((s) => s.tabKey === 'ingredient_breakdown')!;
    expect(ing.bodyMd).toMatch(/Glutathione|NAC/i);
  });
});

describe('215b catalog zero-loss parity', () => {
  it('every master product has clean Description and populated other sections', () => {
    const log = buildCatalogParityLog();
    expect(log).toHaveLength(MASTER_FORMULATIONS.length);
    const losses = log.filter((r) => !r.zeroLoss);
    expect(losses).toEqual([]);
    for (const row of log) {
      expect(row.ingredientHasContent).toBe(true);
      expect(row.whoHasContent).toBe(true);
      expect(row.formulationHasContent).toBe(true);
      expect(row.descriptionLenAfter).toBeGreaterThan(0);
    }
  });

  it('all seeded Description bodies pass cleanliness assert', () => {
    const descRows = allSeededProductTabs().filter((t) => t.tabKey === 'full_description');
    for (const row of descRows) {
      const { clean, violations } = assertDescriptionBodyClean(row.bodyMd);
      expect(clean, `${row.productSlug}: ${violations.join(',')}`).toBe(true);
    }
  });

  it('Marshall lexicon: no em/en dashes in seeded descriptions', () => {
    for (const t of allSeededProductTabs().filter((r) => r.tabKey === 'full_description')) {
      expect(t.bodyMd).not.toMatch(/[\u2013\u2014]/);
      const n = normalizeProductCopy(t.bodyMd);
      expect(n).toBe(t.bodyMd);
    }
  });
});

describe('215b buildTabsForProduct uses narrative only', () => {
  it('clean-detox description does not embed ingredient list heading', () => {
    const p = MASTER_FORMULATIONS.find((f) => f.slug === 'clean-detox-liver-health')!;
    const tabs = buildTabsForProduct(p);
    const desc = tabs.find((t) => t.tabKey === 'full_description')!;
    expect(assertDescriptionBodyClean(desc.bodyMd).clean).toBe(true);
    expect(desc.bodyMd).toMatch(/What does/);
  });
});
