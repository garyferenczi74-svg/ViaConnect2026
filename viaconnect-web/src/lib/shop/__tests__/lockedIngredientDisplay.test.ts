import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';
import { getTestingProductBySku } from '@/data/testingDiagnosticsInfo';
import { speakableKnowledgeSources } from '@/lib/ai/rag/knowledge-sources';
import { matchPeptidesToPatterns } from '@/lib/ai/peptide-matching';
import { ultrathinkSystemPrompt } from '@/lib/ai/ultrathink-engine';
import { DISCLAIMERS } from '@/config/regulatory/disclaimers';
import { speakableUsFdaStatus, US_FDA_STATUS } from '@/config/regulatory/us-fda';
import { protocolSystemPrompt } from '@/lib/ultrathink/generateProtocol';
import { getSeededTabsForSlug } from '@/lib/shop/productTabs/contentSeed';
import { buildSupplementFactsPanel } from '@/lib/white-label/supplement-facts';
import {
  applyLockedIngredientShopFields,
  isLockedIngredientName,
  lockedIngredientsVisible,
  omitLockedIngredients,
  redactLockedIngredientText,
} from '@/lib/shop/lockedIngredientDisplay';

const BANNED =
  /tesofensine|bpc[\s-]*157|bpc157|body[\s-]*protective\s+compound|body\s+protection\s+compound|\bbpc\b/i;

const LOCKED_SLUGS = [
  'inferno-glp1-activator-complex',
  'catalyst-energy-multivitamin',
  'balance-gut-repair',
  'histamine-relief-protocol',
  'thrive-post-natal-glp1',
];

afterEach(() => {
  delete process.env.LOCKED_INGREDIENT_DISPLAY;
  delete process.env.NEXT_PUBLIC_LOCKED_INGREDIENT_DISPLAY;
});

describe('pre-launch ingredient lock', () => {
  it('hides by default and shows only on the explicit flag', () => {
    expect(lockedIngredientsVisible()).toBe(false);
    process.env.LOCKED_INGREDIENT_DISPLAY = 'true';
    expect(lockedIngredientsVisible()).toBe(false);
    process.env.LOCKED_INGREDIENT_DISPLAY = 'show';
    expect(lockedIngredientsVisible()).toBe(true);
  });

  it('recognizes stored aliases and ignores unrelated ingredients', () => {
    for (const name of [
      'BPC-157',
      'BPC 157',
      'BPC157',
      'BPC',
      'Liposomal BPC-157',
      'Liposomal BPC-157 Peptide',
      'Body-Protective Compound',
      'Liposomal Body-Protective Compound',
      'Body Protection Compound',
      'Tesofensine',
      'Tesofensine (botanical analog mimic)',
      'Liposomal Tesofensine',
    ]) {
      expect(isLockedIngredientName(name), name).toBe(true);
    }
    expect(isLockedIngredientName('L-Glutamine')).toBe(false);
    expect(isLockedIngredientName('Zinc Carnosine')).toBe(false);
    expect(isLockedIngredientName('Berberine HCl')).toBe(false);
  });

  it('keeps historical master rows and omits them from seeded shop tabs', () => {
    for (const slug of LOCKED_SLUGS) {
      const stored = MASTER_FORMULATIONS.find((row) => row.slug === slug);
      expect(stored?.ingredients.some((item) => isLockedIngredientName(item.name))).toBe(true);
      const rendered = getSeededTabsForSlug(slug)
        .map((tab) => tab.bodyMd)
        .join('\n');
      expect(rendered, slug).not.toMatch(BANNED);
      expect(rendered.length).toBeGreaterThan(40);
    }
  });

  it('renders the stored ingredient again when the flag is show', () => {
    process.env.LOCKED_INGREDIENT_DISPLAY = 'show';
    const rendered = getSeededTabsForSlug('balance-gut-repair')
      .map((tab) => tab.bodyMd)
      .join('\n');
    expect(rendered).toMatch(/BPC-157/);
  });

  it('strips shop prose and ingredient rows without adding a dose', () => {
    const product = applyLockedIngredientShopFields({
      description:
        '- **Liposomal Body-Protective Compound:** Liposomal delivery of body-protective compound.\n\nContains a peptide compound on the WADA Prohibited List Class S2.5.',
      summary: 'Includes Liposomal Tesofensine at the stored amount.',
      ingredients: [
        { name: 'Liposomal Tesofensine', dose: 0.5, unit: 'mg' },
        { name: 'Berberine HCl', dose: 30, unit: 'mg' },
      ],
    });
    const rendered = `${product.description}\n${product.summary}\n${product.ingredients?.map((item) => item.name).join(',')}`;
    expect(rendered).not.toMatch(BANNED);
    expect(product.ingredients?.map((item) => item.name)).toEqual(['Berberine HCl']);
    expect(product.description).toContain('WADA Prohibited List');
    expect(product.description).not.toMatch(/\d+(\.\d+)?\s*mg/);
  });

  it('omits locked rows from the supplement facts panel', () => {
    const hidden = buildSupplementFactsPanel({
      id: '1',
      name: 'Balance+',
      sku: 'FC-BALANCE-001',
      category: 'advanced',
      delivery_form: 'capsule',
      formulation_json: {
        serving_size: '2 capsules',
        servings_per_container: 30,
        ingredients: [
          { name: 'Liposomal BPC-157', amount: '0.5 mg' },
          { name: 'L-Glutamine', amount: '500 mg' },
        ],
      },
    });
    expect(hidden.ingredients.map((item) => item.name)).toEqual(['L-Glutamine']);
    expect(JSON.stringify(hidden)).not.toMatch(BANNED);

    process.env.LOCKED_INGREDIENT_DISPLAY = 'show';
    const shown = buildSupplementFactsPanel({
      id: '1',
      name: 'Balance+',
      sku: 'FC-BALANCE-001',
      category: 'advanced',
      delivery_form: 'capsule',
      formulation_json: {
        ingredients: [{ name: 'Liposomal BPC-157', amount: '0.5 mg' }],
      },
    });
    expect(shown.ingredients.map((item) => item.name)).toEqual(['Liposomal BPC-157']);
  });

  it('keeps protocol, RAG, FDA, and Hannah speakable text free of the names', () => {
    const protocol = protocolSystemPrompt();
    expect(protocol).not.toMatch(BANNED);
    expect(protocol).toContain('L-Glutamine');
    expect(protocol).toContain('CATALYST+ Energy Multivitamin');
    expect(protocol).toContain('Balance+ Gut Repair');
    const ultrathink = ultrathinkSystemPrompt();
    expect(ultrathink).not.toMatch(BANNED);
    expect(ultrathink).toContain('Thymosin Alpha-1');
    const rag = JSON.stringify(speakableKnowledgeSources());
    expect(rag).not.toMatch(BANNED);
    expect(rag).toContain('Thymosin');
    const fda = JSON.stringify(speakableUsFdaStatus());
    expect(fda).not.toMatch(BANNED);
    expect(fda).toContain('Epitalon');
    expect(JSON.stringify(US_FDA_STATUS)).toMatch(/BPC-157/);
    expect(redactLockedIngredientText(DISCLAIMERS.athleteWADA.text)).not.toMatch(BANNED);
    expect(DISCLAIMERS.athleteWADA.text).toMatch(/BPC-157/);

    const spoken = matchPeptidesToPatterns([
      { name: 'gut barrier' },
      { name: 'immune load' },
    ])
      .map((row) => `${row.evidenceSummary} ${row.dosingProtocol} ${row.products.map((p) => p.name).join(' ')}`)
      .join('\n');
    expect(spoken).not.toMatch(BANNED);

    for (const sku of ['61', '67', '68']) {
      expect(JSON.stringify(getTestingProductBySku(sku)), sku).not.toMatch(BANNED);
    }
  });

  it('restores speakable catalog text when the flag is show', () => {
    process.env.LOCKED_INGREDIENT_DISPLAY = 'show';
    expect(protocolSystemPrompt()).toMatch(/BPC-157/);
    expect(omitLockedIngredients([{ name: 'Tesofensine' }], (item) => item.name)).toHaveLength(1);
  });

  it('logs the confirmed SKUs in an unapplied migration', () => {
    const pending = readFileSync(
      join(process.cwd(), 'supabase/pending/NOT_APPLIED_locked_ingredient_display.sql'),
      'utf8',
    );
    expect(pending).toMatch(/NOT APPLIED/);
    expect(pending).toMatch(/Gary Soft GO 2026-10-05/);
    expect(pending).toMatch(/Elizabeth lock via Lex/);
    for (const sku of [
      'FC-HISTAMINE-001',
      'FC-THRIVE-001',
      'FC-BALANCE-001',
      'FC-INFERNO-001',
      'FC-GLP1-001',
      'FC-CATALYST-001',
      'FC-SHRED-001',
    ]) {
      expect(pending).toContain(sku);
    }
    expect(pending).toContain('bpc-157');
    expect(pending).toContain('tesofensine');
    const migrations = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260926200100_shop_product_waitlist.sql'),
      'utf8',
    );
    expect(migrations).not.toContain('product_ingredient_display_log');
  });
});
