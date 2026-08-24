import { describe, it, expect } from 'vitest';
import * as supplementTypes from '@/types/supplements';
import { assembleIngredientBreakdown } from '@/lib/supplements/jsonbAssembler';
import { generateUpgradeInsights } from '@/lib/ai/upgradeIntelligence';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';
import { getSeededTabsForSlug } from '@/lib/shop/productTabs/contentSeed';
import {
  CLASS_LIPOSOMAL_COQ10,
  CLASS_LIPOSOMAL_CURCUMIN,
  CLASS_LIPOSOMAL_VITAMIN_C,
  IRON_FOOD_FRACTION_NOTE,
  LISTED_VIA_CURA_SLUGS,
  NOT_STATED_NOTE,
  resolveIngredientBioavailability,
} from '@/lib/supplements/confirmedBioavailability';

function formulation(slug: string) {
  const p = MASTER_FORMULATIONS.find((f) => f.slug === slug);
  if (!p) throw new Error(`missing formulation ${slug}`);
  return p;
}

function breakdown(slug: string) {
  const tab = getSeededTabsForSlug(slug).find((t) => t.tabKey === 'ingredient_breakdown');
  if (!tab) throw new Error(`missing ingredient breakdown ${slug}`);
  return tab.bodyMd;
}

describe('BIOAVAILABILITY_MAP removal', () => {
  it('does not export invented delivery-form fractions', () => {
    expect('BIOAVAILABILITY_MAP' in supplementTypes).toBe(false);
  });

  it('assembleIngredientBreakdown never computes effectiveDose from percents', () => {
    const rows = assembleIngredientBreakdown(
      [{ name: 'Vitamin C', form: 'liposomal', amount: 500, unit: 'mg', dailyValuePercent: null, isPartOfBlend: false, blendName: null }],
      'liposomal',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].effectiveDose).toBeNull();
    expect(rows[0].effectiveDoseUnit).toBeNull();
    expect(rows[0].evidence_type).toBe('not_stated');
    expect(rows[0].pmid).toBeNull();
    expect(rows[0].amount).toBe(500);
  });

  it('upgrade insights do not invent fold multipliers', () => {
    const insights = generateUpgradeInsights(
      'Brand',
      'Capsule C',
      [
        {
          ingredientId: '1',
          name: 'Vitamin C',
          form: null,
          forms: null,
          amount: 500,
          unit: 'mg',
          dailyValuePercent: null,
          isProprietaryBlend: false,
          proprietaryBlendName: null,
          proprietaryBlendTotal: null,
          proprietaryBlendUnit: null,
          perFormBreakdown: null,
          effectiveDose: null,
          effectiveDoseUnit: null,
          bioavailability_note: null,
          evidence_type: 'not_stated',
          pmid: null,
          interactionCheckRequired: false,
          interactionSeverity: null,
          interactionDetails: null,
        },
      ],
      'standard_capsule',
    );
    expect(insights).toEqual([]);
  });
});

describe('confirmed Ingredient Breakdown notes', () => {
  it('never labels class literature as this_sku', () => {
    for (const slug of LISTED_VIA_CURA_SLUGS) {
      for (const ing of formulation(slug).ingredients) {
        expect(ing.evidence_type).not.toBe('this_sku');
      }
    }
  });

  it('applies liposomal vitamin C class to Iron+ and Grow+, not Radiance+ micellar C or Sproutables', () => {
    const ironC = formulation('iron-red-blood-cell-support').ingredients.find((i) =>
      /vitamin c/i.test(i.name),
    );
    const growC = formulation('grow-pre-natal-formula').ingredients.find((i) =>
      /vitamin c/i.test(i.name),
    );
    const radianceC = formulation('radiance-plus').ingredients.find((i) =>
      /vitamin c/i.test(i.name),
    );
    const sproutC = formulation('sproutables-children-gummies').ingredients.find((i) =>
      /vitamin c/i.test(i.name),
    );
    expect(ironC?.evidence_type).toBe('class_not_this_sku');
    expect(ironC?.pmid).toBe('27375360');
    expect(ironC?.bioavailability_note).toBe(CLASS_LIPOSOMAL_VITAMIN_C);
    expect(growC?.bioavailability_note).toBe(CLASS_LIPOSOMAL_VITAMIN_C);
    expect(radianceC?.evidence_type).toBe('not_stated');
    expect(radianceC?.bioavailability_note).toBe(NOT_STATED_NOTE);
    expect(sproutC?.evidence_type).toBe('not_stated');
  });

  it('applies CoQ10 class to Radiance+ and Replenish NAD+, not Focus+', () => {
    const radiance = formulation('radiance-plus').ingredients.find((i) => /coq10|ubiquinol/i.test(i.name));
    const replenish = formulation('replenish-nad').ingredients.find((i) => /coq10|ubiquinol/i.test(i.name));
    const focus = formulation('focus-nootropic-formula').ingredients.find((i) => /coq10|ubiquinol/i.test(i.name));
    expect(radiance?.bioavailability_note).toBe(CLASS_LIPOSOMAL_COQ10);
    expect(replenish?.bioavailability_note).toBe(CLASS_LIPOSOMAL_COQ10);
    expect(focus?.evidence_type).toBe('not_stated');
  });

  it('applies curcumin class to Balance+ and Flex+', () => {
    const balance = formulation('balance-gut-repair').ingredients.find((i) => /curcumin/i.test(i.name));
    const flex = formulation('flex-joint-inflammation').ingredients.find((i) => /curcumin/i.test(i.name));
    expect(balance?.bioavailability_note).toBe(CLASS_LIPOSOMAL_CURCUMIN);
    expect(flex?.bioavailability_note).toBe(CLASS_LIPOSOMAL_CURCUMIN);
    expect(balance?.evidence_type).toBe('class_not_this_sku');
  });

  it('does not assign AquaCelle, LipoMicel, LipiSperse, or piperine papers', () => {
    const grow = formulation('grow-pre-natal-formula');
    const desire = formulation('desire-female-hormonal');
    const creatine = formulation('creatine-hcl-plus');
    const replenish = formulation('replenish-nad');
    const joined = [grow, desire, creatine, replenish]
      .flatMap((p) => p.ingredients.map((i) => i.bioavailability_note ?? ''))
      .join('\n');
    expect(joined).not.toMatch(/AquaCelle|7\.1x|31637467|LipoMicel|LipiSperse|57x|185x/i);
    expect(desire.ingredients.find((i) => /resveratrol/i.test(i.name))?.evidence_type).toBe(
      'not_stated',
    );
    expect(replenish.ingredients.find((i) => /quercetin/i.test(i.name))?.evidence_type).toBe(
      'not_stated',
    );
    expect(creatine.ingredients.find((i) => /bioperine|black pepper/i.test(i.name))?.evidence_type).toBe(
      'not_stated',
    );
  });

  it('writes Iron+ food-fraction education and no anemia claim', () => {
    const body = breakdown('iron-red-blood-cell-support');
    expect(body).toContain(IRON_FOOD_FRACTION_NOTE);
    expect(body).toContain('Not a dose, treatment, or anemia claim.');
    expect(formulation('iron-red-blood-cell-support').ingredientBreakdownPreface).toBe(
      IRON_FOOD_FRACTION_NOTE,
    );
  });

  it('shop Ingredient Breakdown strings include approved class lines', () => {
    expect(breakdown('grow-pre-natal-formula')).toContain(CLASS_LIPOSOMAL_VITAMIN_C);
    expect(breakdown('radiance-plus')).toContain(CLASS_LIPOSOMAL_COQ10);
    expect(breakdown('balance-gut-repair')).toContain(CLASS_LIPOSOMAL_CURCUMIN);
    expect(breakdown('sproutables-children-gummies')).toContain(NOT_STATED_NOTE);
    expect(breakdown('sproutables-children-gummies')).not.toContain(CLASS_LIPOSOMAL_VITAMIN_C);
  });

  it('new copy has no em/en dashes and uses Maximum Bioavailability', () => {
    for (const slug of LISTED_VIA_CURA_SLUGS) {
      const body = breakdown(slug);
      expect(body).not.toMatch(/[\u2013\u2014]/);
      expect(body).toContain('Maximum Bioavailability');
      expect(body).not.toMatch(/10\s*[-x×]\s*28/i);
    }
  });

  it('MenoBalance+ has no invented CoQ10 or curcumin rows', () => {
    const meno = formulation('menobalance-plus');
    expect(meno.ingredients.some((i) => /coq10|ubiquinol|curcumin/i.test(i.name))).toBe(false);
    expect(meno.ingredients.every((i) => i.evidence_type === 'not_stated')).toBe(true);
  });

  it('resolver never invents this_sku PK', () => {
    const ev = resolveIngredientBioavailability(
      'iron-red-blood-cell-support',
      'Liposomal Vitamin C (Ascorbic Acid)',
      'IRON+ Red Blood Cell Support',
    );
    expect(ev.evidence_type).toBe('class_not_this_sku');
  });
});
