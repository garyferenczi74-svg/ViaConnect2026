/**
 * Prompt 215 Michelangelo suite: tab completeness, scoring determinism,
 * state machine, framing lock, lexicon.
 */

import { describe, it, expect } from 'vitest';
import {
  allSeededProductTabs,
  assertTabCompleteness,
  seededProductSlugs,
  getSeededTabsForSlug,
} from '../contentSeed';
import {
  scoreGeneticCompatibility,
  SEED_RELEVANCE_ROWS,
  matchIngredientKeys,
} from '../compatibility';
import { APPROVED_FRAMING, PRODUCT_TAB_KEYS } from '../types';
import { normalizeProductCopy, hasLexiconViolation } from '../lexicon';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';

describe('215 tab completeness', () => {
  it('seeds all master formulations with exactly five tabs each', () => {
    const rows = allSeededProductTabs();
    expect(seededProductSlugs().length).toBe(MASTER_FORMULATIONS.length);
    expect(seededProductSlugs().length).toBe(60);
    const audit = assertTabCompleteness(rows);
    expect(audit.pass).toBe(true);
    expect(audit.missing).toHaveLength(0);
    // 60 products x 5 tabs
    expect(rows.length).toBe(60 * 5);
  });

  it('balance gut repair has all tab keys in order', () => {
    const tabs = getSeededTabsForSlug('balance-gut-repair');
    expect(tabs.map((t) => t.tabKey)).toEqual([...PRODUCT_TAB_KEYS]);
  });

  it('excludes peptide commercial SKUs from seed catalog', () => {
    const slugs = seededProductSlugs();
    expect(slugs.some((s) => s.includes('peptide') && s.includes('bpc'))).toBe(false);
  });
});

describe('215 lexicon', () => {
  it('normalizes bioavailability and dashes', () => {
    const raw = 'FarmCeutica delivery with 10–28× greater absorption — best in class';
    const n = normalizeProductCopy(raw);
    expect(n).toContain('10x to 28x');
    expect(n).toContain('Via Cura');
    expect(n).not.toMatch(/[\u2013\u2014]/);
    expect(hasLexiconViolation(n)).toHaveLength(0);
  });

  it('seeded full descriptions pass dash check after normalize', () => {
    for (const t of allSeededProductTabs().filter((r) => r.tabKey === 'full_description')) {
      expect(hasLexiconViolation(t.bodyMd)).toHaveLength(0);
    }
  });
});

describe('215 scoring determinism and states', () => {
  const baseIngredients = [
    'Liposomal B9 – Methyl Folate (5-MTHF)',
    'Liposomal B12 – Methylcobalamin',
    'L-Glutamine',
  ];

  it('is deterministic for identical inputs', () => {
    const input = {
      productSlug: 'methylb-complete-b-complex',
      productIngredientNames: baseIngredients,
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [
        { rsid: 'rs1801133', gene: 'MTHFR', status: 'interpreted' as const },
        { rsid: 'rs1801131', gene: 'MTHFR', status: 'interpreted' as const },
      ],
      signedIn: true,
      geneticsState: 'full_data' as const,
    };
    const a = scoreGeneticCompatibility(input);
    const b = scoreGeneticCompatibility(input);
    expect(a.band).toBe(b.band);
    expect(a.scoreInputs).toEqual(b.scoreInputs);
    expect(a.framingLine).toBe(b.framingLine);
  });

  it('signed_out state', () => {
    const r = scoreGeneticCompatibility({
      productSlug: 'x',
      productIngredientNames: baseIngredients,
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [],
      signedIn: false,
      geneticsState: 'signed_out',
    });
    expect(r.band).toBe('signed_out');
    expect(r.state).toBe('signed_out');
  });

  it('no_data empty state never fabricates score', () => {
    const r = scoreGeneticCompatibility({
      productSlug: 'x',
      productIngredientNames: baseIngredients,
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [],
      signedIn: true,
      geneticsState: 'no_data',
    });
    expect(r.band).toBe('empty');
    expect(r.scoreInputs.matchedVariants).toBe(0);
  });

  it('processing state shows pending band', () => {
    const r = scoreGeneticCompatibility({
      productSlug: 'x',
      productIngredientNames: baseIngredients,
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [{ rsid: 'rs1801133', status: 'pending' }],
      signedIn: true,
      geneticsState: 'processing',
    });
    expect(r.band).toBe('pending');
  });

  it('green when strong folate matches present', () => {
    const r = scoreGeneticCompatibility({
      productSlug: 'methylb',
      productIngredientNames: ['Liposomal B9 – Methyl Folate (5-MTHF)', 'Methylcobalamin'],
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [
        { rsid: 'rs1801133', status: 'interpreted' },
        { rsid: 'rs1801131', status: 'interpreted' },
      ],
      signedIn: true,
      geneticsState: 'full_data',
    });
    expect(r.band).toBe('green');
    expect(r.framingLine).toBe(APPROVED_FRAMING.green);
  });

  it('red when caution iron association dominates', () => {
    const r = scoreGeneticCompatibility({
      productSlug: 'iron-product',
      productIngredientNames: ['Iron Bisglycinate'],
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [{ rsid: 'rs1800562', gene: 'HFE', status: 'interpreted' }],
      signedIn: true,
      geneticsState: 'full_data',
    });
    expect(r.band).toBe('red');
    expect(r.framingLine).toBe(APPROVED_FRAMING.red);
    // Framing lock: only approved vocabulary
    expect(
      [APPROVED_FRAMING.red, APPROVED_FRAMING.red_caution].some((f) =>
        r.reasons.some((x) => x.framing === f) || r.framingLine === f,
      ),
    ).toBe(true);
  });

  it('uploaded_only adds coverage caveats', () => {
    const r = scoreGeneticCompatibility({
      productSlug: 'methylb',
      productIngredientNames: ['Methyl Folate'],
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [{ rsid: 'rs1801133', status: 'interpreted', source: 'upload' }],
      signedIn: true,
      geneticsState: 'uploaded_only',
    });
    expect(r.coverageCaveats.some((c) => /Uploaded third-party/i.test(c))).toBe(true);
  });
});

describe('215 framing lock', () => {
  it('approved vocabulary only for color lines', () => {
    expect(APPROVED_FRAMING.green).toBe('strong genetic relevance for you');
    expect(APPROVED_FRAMING.yellow).toBe('moderate or partial relevance');
    expect(APPROVED_FRAMING.red).toBe('lower relevance for your genetics');
    expect(APPROVED_FRAMING.disclaimer).toMatch(/not medical advice/i);
    expect(APPROVED_FRAMING.bioavailability).toBe('10x to 28x');
  });
});

describe('215 ingredient matchers', () => {
  it('maps formulation names to relevance keys', () => {
    const keys = matchIngredientKeys([
      'Liposomal B9 – Methyl Folate (5-MTHF)',
      'Liposomal Curcumin (95% Curcuminoids)',
      'Proprietary Probiotic Blend',
    ]);
    expect(keys).toContain('methyl-folate');
    expect(keys).toContain('curcumin');
    expect(keys).toContain('probiotic-gut');
  });
});
