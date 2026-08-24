import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  extractConfirmedRsIds,
  extractFdaDisclaimer,
  loadNutritionGeneticsEducationCard,
  loadNutritionGeneticsEducationCards,
  NUTRITION_GENETICS_EDUCATION_SLUGS,
  stripStructuredSections,
} from '../educationCards';

const EXPECTED_RS_COUNTS: Record<string, number> = {
  'nutrition-genetics-result-scores': 0,
  'nutrition-genetics-hunger-fullness': 7,
  'nutrition-genetics-protein': 4,
  'nutrition-genetics-fats': 8,
  'nutrition-genetics-saturated-fat': 16,
  'nutrition-genetics-omega': 7,
  'nutrition-genetics-carbohydrates': 8,
  'nutrition-genetics-food-sensitivities': 19,
  'nutrition-genetics-insulin-resistance': 12,
  'nutrition-genetics-plant-cholesterol': 8,
  'nutrition-genetics-additional': 10,
};

describe('nutrition genetics education cards', () => {
  const cards = loadNutritionGeneticsEducationCards();

  it('loads the 11 INDEX cards in INDEX order', () => {
    expect(cards).toHaveLength(11);
    expect(cards.map((card) => card.slug)).toEqual([...NUTRITION_GENETICS_EDUCATION_SLUGS]);
  });

  it('extracts confirmed rs IDs only from confirmed-variant lines', () => {
    for (const card of cards) {
      expect(card.confirmedRsIds).toHaveLength(EXPECTED_RS_COUNTS[card.slug]);
    }
  });

  it('does not alias FADS1 rs174548 to rs174537 or invent omega header-gap SNPs', () => {
    const omega = cards.find((card) => card.slug === 'nutrition-genetics-omega');
    expect(omega).toBeTruthy();
    expect(omega?.confirmedRsIds).toContain('rs174548');
    expect(omega?.confirmedRsIds).not.toContain('rs174537');
    expect(extractConfirmedRsIds(omega ? `${omega.narrativeBody}\nConfirmed variants: FADS1 rs174548` : '')).toContain(
      'rs174548',
    );
  });

  it('does not pull TCF7L2 rs7903146 onto the insulin card from a note line', () => {
    const insulin = cards.find((card) => card.slug === 'nutrition-genetics-insulin-resistance');
    expect(insulin?.confirmedRsIds).not.toContain('rs7903146');
  });

  it('keeps AOC1 as DAO activity education, not a disease label', () => {
    const extra = cards.find((card) => card.slug === 'nutrition-genetics-additional');
    expect(extra?.narrativeBody).toMatch(/DAO activity research, not as a disease/i);
    expect(extra?.confirmedRsIds).toEqual(
      expect.arrayContaining(['rs10156191', 'rs2052129', 'rs1049742', 'rs1049793', 'rs2071514']),
    );
  });

  it('keeps FTO off the diet-failure framing', () => {
    const hunger = cards.find((card) => card.slug === 'nutrition-genetics-hunger-fullness');
    const carbs = cards.find((card) => card.slug === 'nutrition-genetics-carbohydrates');
    const joined = `${hunger?.narrativeBody ?? ''} ${carbs?.narrativeBody ?? ''}`;
    expect(joined).not.toMatch(/diet-failure/i);
    expect(carbs?.narrativeBody).toMatch(/PMID 27650503/);
  });

  it('does not persist demo 4634, demo email, or FarmCeutica Support', () => {
    const haystack = cards
      .map((card) => `${card.title}\n${card.leadText}\n${card.narrativeBody}`)
      .join('\n');
    expect(haystack).not.toContain('4634');
    expect(haystack).not.toMatch(/demo@genemetrics\.com/i);
    expect(haystack).not.toMatch(/FarmCeutica Support/i);
  });

  it('never writes user_variants or lab values from the loader source', () => {
    const source = readFileSync(path.resolve(__dirname, '..', 'educationCards.ts'), 'utf8');
    expect(source).not.toMatch(/\.from\(['"]user_variants['"]\)/);
    expect(source).not.toMatch(/\.insert\(/);
    expect(source).not.toMatch(/\.upsert\(/);
    expect(source).toContain('Education only');
  });

  it('returns a single card by slug and rejects unknown slugs', () => {
    const card = loadNutritionGeneticsEducationCard('nutrition-genetics-protein');
    expect(card?.title).toMatch(/Protein/i);
    expect(loadNutritionGeneticsEducationCard('not-a-card')).toBeNull();
    expect(loadNutritionGeneticsEducationCard('nutrition-genetics-missing')).toBeNull();
  });

  it('strips structured sections and keeps the FDA disclaimer extract', () => {
    const body = [
      '# Title',
      '',
      'Lead paragraph.',
      '',
      '## Key takeaways',
      '- One',
      '',
      '## FDA disclaimer',
      'These statements have not been evaluated by the Food and Drug Administration. This information is not intended to diagnose, treat, cure, or prevent any disease.',
    ].join('\n');
    expect(stripStructuredSections(body)).toBe('Lead paragraph.');
    expect(extractFdaDisclaimer(body)).toMatch(/not intended to diagnose/);
  });

  it('contains no em or en dashes in the loader', () => {
    const source = readFileSync(path.resolve(__dirname, '..', 'educationCards.ts'), 'utf8');
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
