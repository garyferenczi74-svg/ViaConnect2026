import { describe, it, expect } from 'vitest';
import { rankFdcCandidates } from '../fdc-ranking';

// Candidate lists recorded from the live FDC search API on 2026-06-11
// (tmp/186/fixtures). Each first hit below is what production matched before
// Prompt 186 and what ranking must now reject.

describe('rankFdcCandidates', () => {
  it('avocado: rejects Oil and dressing, picks the raw fruit', () => {
    const { best, firstHitOverridden } = rankFdcCandidates('avocado', undefined, [
      { fdcId: 2710208, description: 'Avocado dressing', dataType: 'Survey (FNDDS)' },
      { fdcId: 2709223, description: 'Avocado, raw', dataType: 'Survey (FNDDS)' },
      { fdcId: 173573, description: 'Oil, avocado', dataType: 'SR Legacy' },
      { fdcId: 2710248, description: 'Avocado, for use on a sandwich', dataType: 'Survey (FNDDS)' },
      { fdcId: 171706, description: 'Avocados, raw, California', dataType: 'SR Legacy' },
    ]);
    expect(best?.description).toBe('Avocado, raw');
    expect(firstHitOverridden).toBe(true);
  });

  it('apple: rejects candied, dried, cider, and croissants', () => {
    const { best } = rankFdcCandidates('apple', undefined, [
      { fdcId: 2709294, description: 'Apple, candied', dataType: 'Survey (FNDDS)' },
      { fdcId: 2709215, description: 'Apple, raw', dataType: 'Survey (FNDDS)' },
      { fdcId: 2709196, description: 'Apple, dried', dataType: 'Survey (FNDDS)' },
      { fdcId: 2709319, description: 'Apple cider', dataType: 'Survey (FNDDS)' },
      { fdcId: 174988, description: 'Croissants, apple', dataType: 'SR Legacy' },
      { fdcId: 171688, description: 'Apples, raw, with skin', dataType: 'SR Legacy' },
    ]);
    expect(best?.description).toBe('Apple, raw');
  });

  it('egg: prefers the whole egg over white and yolk fractions', () => {
    const { best } = rankFdcCandidates('egg', undefined, [
      { fdcId: 747997, description: 'Eggs, Grade A, Large, egg white', dataType: 'Foundation' },
      { fdcId: 748967, description: 'Eggs, Grade A, Large, egg whole', dataType: 'Foundation' },
      { fdcId: 748236, description: 'Eggs, Grade A, Large, egg yolk', dataType: 'Foundation' },
      { fdcId: 2707180, description: 'Egg, Benedict', dataType: 'Survey (FNDDS)' },
    ]);
    expect(best?.fdcId).toBe(748967);
  });

  it('egg with boiled preparation: prefers the boiled match', () => {
    const { best } = rankFdcCandidates('egg', 'boiled', [
      { fdcId: 748967, description: 'Eggs, Grade A, Large, egg whole', dataType: 'Foundation' },
      { fdcId: 2707183, description: 'Egg, whole, boiled or poached', dataType: 'Survey (FNDDS)' },
    ]);
    expect(best?.fdcId).toBe(2707183);
  });

  it('banana: rejects the dehydrated powder that production cached', () => {
    const { best } = rankFdcCandidates('banana', undefined, [
      { fdcId: 173945, description: 'Bananas, dehydrated, or banana powder', dataType: 'SR Legacy' },
      { fdcId: 173944, description: 'Bananas, raw', dataType: 'SR Legacy' },
    ]);
    expect(best?.description).toBe('Bananas, raw');
  });

  it('coffee: rejects instant powder and flavored soymilk', () => {
    const { best } = rankFdcCandidates('coffee', undefined, [
      { fdcId: 175224, description: 'SILK Coffee, soymilk', dataType: 'SR Legacy' },
      { fdcId: 171890, description: 'Coffee, instant, regular, powder', dataType: 'SR Legacy' },
      { fdcId: 171889, description: 'Coffee, brewed from grounds, prepared with tap water', dataType: 'SR Legacy' },
    ]);
    expect(best?.fdcId).toBe(171889);
  });

  it('white rice: rejects flour and crackers (query includes white, so white is not penalized)', () => {
    const { best } = rankFdcCandidates('white rice', undefined, [
      { fdcId: 790214, description: 'Flour, rice, white, unenriched', dataType: 'Foundation' },
      { fdcId: 173161, description: 'Rice crackers', dataType: 'SR Legacy' },
      { fdcId: 2709658, description: 'Rice, white, cooked, no added fat', dataType: 'Survey (FNDDS)' },
    ]);
    expect(best?.fdcId).toBe(2709658);
  });

  it('chocolate milk: rejects milk chocolate candy', () => {
    const { best } = rankFdcCandidates('chocolate milk', undefined, [
      { fdcId: 167587, description: 'Candies, milk chocolate', dataType: 'SR Legacy' },
      { fdcId: 171269, description: 'Milk, chocolate, fluid, commercial, whole', dataType: 'SR Legacy' },
    ]);
    expect(best?.fdcId).toBe(171269);
  });

  it('sourdough bread: accepts the combined french or vienna reference', () => {
    const { best } = rankFdcCandidates('sourdough bread', undefined, [
      { fdcId: 172675, description: 'Bread, french or vienna (includes sourdough)', dataType: 'SR Legacy' },
      { fdcId: 174905, description: 'Bread, cheese', dataType: 'SR Legacy' },
    ]);
    expect(best?.fdcId).toBe(172675);
  });

  it('a query whose tokens are absent from every candidate is a miss', () => {
    const { best } = rankFdcCandidates('banana', undefined, [
      { fdcId: 173573, description: 'Oil, avocado', dataType: 'SR Legacy' },
      { fdcId: 174988, description: 'Croissants, apple', dataType: 'SR Legacy' },
    ]);
    expect(best).toBeNull();
  });

  it('an intentional transform query still matches it (avocado oil)', () => {
    const { best } = rankFdcCandidates('avocado oil', undefined, [
      { fdcId: 2709223, description: 'Avocado, raw', dataType: 'Survey (FNDDS)' },
      { fdcId: 173573, description: 'Oil, avocado', dataType: 'SR Legacy' },
    ]);
    expect(best?.fdcId).toBe(173573);
  });
});
