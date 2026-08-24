/**
 * Prompt 215a: DOM completeness contract + slug resolution + always five sections.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildFiveSections, expectedSectionHeaders } from '../buildFromProduct';
import { resolveFormulationBySlug, SECTION_HEADERS } from '../resolveSlug';
import { PRODUCT_TAB_KEYS } from '../types';
import { scoreGeneticCompatibility, SEED_RELEVANCE_ROWS } from '../compatibility';
import type { ShopProduct } from '@/lib/shop/queries';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';

const root = process.cwd();

function mockProduct(partial: Partial<ShopProduct> & { slug: string; name: string }): ShopProduct {
  return {
    id: 'id-1',
    sku: partial.slug,
    slug: partial.slug,
    name: partial.name,
    short_name: partial.name,
    summary: partial.summary ?? null,
    description: partial.description ?? '',
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
    ingredients: partial.ingredients ?? [
      { name: 'Liposomal B9 – Methyl Folate (5-MTHF)', dose: 0.5, unit: 'mg', role: null },
    ],
    gene_match_score: null,
    requires_practitioner_order: false,
    active: true,
    display_config: null,
  };
}

describe('215a Phase 0 failure mode (documented contract)', () => {
  it('PdpRightRail mounts ProductAccordions not only two Accordion sections', () => {
    const rail = readFileSync(join(root, 'src/components/shop/PdpRightRail.tsx'), 'utf8');
    expect(rail).toMatch(/ProductAccordions/);
    expect(rail).toMatch(/accordionSections/);
  });

  it('product page always builds five sections for supplements', () => {
    const page = readFileSync(
      join(root, 'src/app/(app)/(consumer)/shop/product/[slug]/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/buildFiveSections/);
    expect(page).toMatch(/accordionSections/);
    expect(page).not.toMatch(/ProductTabs/);
  });
});

describe('215a slug resolution', () => {
  it('resolves clean-plus-detox-and-liver-health to clean-detox-liver-health', () => {
    const f = resolveFormulationBySlug('clean-plus-detox-and-liver-health');
    expect(f?.slug).toBe('clean-detox-liver-health');
  });

  it('resolves balance-plus-gut-repair to balance-gut-repair', () => {
    const f = resolveFormulationBySlug('balance-plus-gut-repair');
    expect(f?.slug).toBe('balance-gut-repair');
  });
});

describe('215a always five accordion sections', () => {
  it('headers match Phase 1.1 exactly and in order (215b Description rename)', () => {
    expect([...expectedSectionHeaders()]).toEqual([...SECTION_HEADERS]);
    expect(SECTION_HEADERS).toEqual([
      'Description',
      'Ingredient Breakdown',
      'Who Benefits & What Makes This Different?',
      'Formulation',
      'Genetic Compatibility',
    ]);
  });

  it('buildFiveSections returns all five keys for Clean+ URL slug', () => {
    const product = mockProduct({
      slug: 'clean-plus-detox-and-liver-health',
      name: 'Clean+ Detox and Liver Health',
      description: 'A comprehensive liver support formula.',
    });
    const sections = buildFiveSections(product);
    expect(sections).toHaveLength(5);
    expect(sections.map((s) => s.tabKey)).toEqual([...PRODUCT_TAB_KEYS]);
  });

  it('buildFiveSections never returns empty even for unknown slug', () => {
    const product = mockProduct({
      slug: 'totally-unknown-sku-xyz',
      name: 'Unknown Product',
    });
    const sections = buildFiveSections(product);
    expect(sections).toHaveLength(5);
    expect(sections.every((s) => s.bodyMd.length > 0)).toBe(true);
  });

  it('catalog coverage: every master formulation yields five sections via mock product', () => {
    for (const f of MASTER_FORMULATIONS) {
      const product = mockProduct({
        slug: f.slug,
        name: f.name,
        description: f.marketingDescription,
        ingredients: f.ingredients.map((i) => ({
          name: i.name,
          dose: Number(i.mgPerServing) || null,
          unit: 'mg',
          role: null,
        })),
      });
      const sections = buildFiveSections(product, f.slug);
      expect(sections.map((s) => s.tabKey)).toEqual([...PRODUCT_TAB_KEYS]);
    }
  });
});

describe('215a ProductAccordions markup contract', () => {
  it('component mounts all five sections from SECTION_HEADERS and genetic panel', () => {
    const src = readFileSync(join(root, 'src/components/shop/ProductAccordions.tsx'), 'utf8');
    expect(src).toMatch(/SECTION_HEADERS/);
    expect(src).toMatch(/PRODUCT_TAB_KEYS\.map/);
    expect(src).toMatch(/GeneticCompatibilityPanel/);
    expect(src).toMatch(/data-section-count="5"/);
    expect(src).toMatch(/TAB_KEY_TO_HASH/);
    // Labels + hashes live in resolveSlug (single source of truth)
    const labels = readFileSync(join(root, 'src/lib/shop/productTabs/resolveSlug.ts'), 'utf8');
    for (const h of SECTION_HEADERS) {
      expect(labels).toContain(h);
    }
    expect(labels).toMatch(/description/);
    expect(labels).toMatch(/full-description/); // alias retained
    expect(labels).toMatch(/genetic-compatibility/);
  });
});

describe('215a genetic compatibility states still green', () => {
  it('five account states', () => {
    const states = [
      scoreGeneticCompatibility({
        productSlug: 'x',
        productIngredientNames: [],
        relevanceRows: SEED_RELEVANCE_ROWS,
        userVariants: [],
        signedIn: false,
        geneticsState: 'signed_out',
      }),
      scoreGeneticCompatibility({
        productSlug: 'x',
        productIngredientNames: [],
        relevanceRows: SEED_RELEVANCE_ROWS,
        userVariants: [],
        signedIn: true,
        geneticsState: 'no_data',
      }),
      scoreGeneticCompatibility({
        productSlug: 'x',
        productIngredientNames: [],
        relevanceRows: SEED_RELEVANCE_ROWS,
        userVariants: [{ rsid: 'rs1', status: 'pending' }],
        signedIn: true,
        geneticsState: 'processing',
      }),
      scoreGeneticCompatibility({
        productSlug: 'x',
        productIngredientNames: ['Methyl Folate'],
        relevanceRows: SEED_RELEVANCE_ROWS,
        userVariants: [{ rsid: 'rs1801133', status: 'interpreted', source: 'upload' }],
        signedIn: true,
        geneticsState: 'uploaded_only',
      }),
      scoreGeneticCompatibility({
        productSlug: 'x',
        productIngredientNames: ['Methyl Folate', 'Methylcobalamin'],
        relevanceRows: SEED_RELEVANCE_ROWS,
        userVariants: [
          { rsid: 'rs1801133', status: 'interpreted' },
          { rsid: 'rs1801131', status: 'interpreted' },
        ],
        signedIn: true,
        geneticsState: 'full_data',
      }),
    ];
    expect(states.map((s) => s.band)).toEqual([
      'signed_out',
      'empty',
      'pending',
      'green',
      'green',
    ]);
  });
});
