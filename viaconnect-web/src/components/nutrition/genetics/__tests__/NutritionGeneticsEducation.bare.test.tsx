import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EducationalCardMarkdown } from '@/components/content/EducationalCardMarkdown';
import { NutritionGeneticsEducationArticle } from '../NutritionGeneticsEducationArticle';
import { NutritionGeneticsEducationCatalog } from '../NutritionGeneticsEducationCatalog';
import {
  loadNutritionGeneticsEducationCards,
  type NutritionGeneticsEducationCard,
} from '@/lib/nutrition/genetics/educationCards';

function sampleCard(
  overrides: Partial<NutritionGeneticsEducationCard> = {},
): NutritionGeneticsEducationCard {
  return {
    slug: 'nutrition-genetics-omega',
    title: 'Omega-3 and omega-6 in food and conversion',
    subtitle: 'Plant ALA is not the same as EPA and DHA from fish or algae.',
    leadText: 'Education lead.',
    narrativeBody: '## FADS and ELOVL conversion research\n\nThe only FADS1 ID on this extract is rs174548.',
    keyTakeaways: ['Theme only'],
    whatToDoNext: ['Open related cards'],
    relatedSlugs: ['nutrition-genetics-fats'],
    citations: [{ text: 'PMID 27650503', pmid: '27650503', doi: null, url: null }],
    medicalCautionLevel: 'medium',
    confirmedRsIds: ['rs174548'],
    estimatedReadingTimeMinutes: 3,
    fdaDisclaimer:
      'These statements have not been evaluated by the Food and Drug Administration. This information is not intended to diagnose, treat, cure, or prevent any disease.',
    ...overrides,
  };
}

describe('Nutrition genetics education render', () => {
  it('catalog renders all 11 live cards without demo alleles', () => {
    const cards = loadNutritionGeneticsEducationCards();
    const html = renderToStaticMarkup(
      <NutritionGeneticsEducationCatalog cards={cards} />,
    );
    expect(cards).toHaveLength(11);
    for (const card of cards) {
      expect(html).toContain(card.title);
      expect(html).toContain(`/nutrition/genetics/education/${card.slug}`);
    }
    expect(html).toContain('Theme education');
    expect(html).toContain('not your genotypes');
    expect(html).not.toContain('4634');
    expect(html).not.toContain('demo@genemetrics.com');
    expect(html).not.toMatch(/\b(AA|AT|TT|GG|CC|CT|GT)\b/);
    expect(html).not.toContain('Your genotype');
    expect(html.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it('article lists extract SNPs as research IDs, not profile results', () => {
    const html = renderToStaticMarkup(
      <NutritionGeneticsEducationArticle
        card={sampleCard()}
        titleBySlug={{ 'nutrition-genetics-fats': 'Dietary fat response in context' }}
      />,
    );
    expect(html).toContain('rs174548');
    expect(html).not.toContain('rs174537');
    expect(html).toContain('not your results');
    expect(html).toContain('does not attach alleles');
    expect(html).toContain('Dietary fat response in context');
    expect(html).toContain('PMID 27650503');
    expect(html).not.toContain('user_variants');
  });

  it('markdown renderer prints headings and lists without raw HTML', () => {
    const html = renderToStaticMarkup(
      <EducationalCardMarkdown markdown={'## Heading\n\nA **bold** note.\n\n- One\n- Two'} />,
    );
    expect(html).toContain('Heading');
    expect(html).toContain('<strong');
    expect(html).toContain('One');
    expect(html).not.toContain('<script');
  });
});
