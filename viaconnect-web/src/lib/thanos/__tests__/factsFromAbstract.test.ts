import { describe, expect, it } from 'vitest';
import {
  extractPublicationFacts,
  factsTooSimilarToAbstract,
} from '@/lib/thanos/factsFromAbstract';

describe('Prompt 225a facts-only extraction', () => {
  it('does not return abstract body and redacts dose language', () => {
    const abstract =
      'In this randomized trial, 120 patients with type 2 diabetes received semaglutide 1.0 mg once weekly. HbA1c decreased significantly versus placebo.';
    const facts = extractPublicationFacts({
      title: 'Semaglutide in type 2 diabetes',
      abstract,
      publicationTypes: ['Randomized Controlled Trial'],
    });
    expect(JSON.stringify(facts)).not.toContain('1.0 mg');
    expect(facts.note).toMatch(/not stored/i);
    expect(facts.is_human).toBe(true);
    expect(facts.design).toBe('human_clinical_trial');
    expect(factsTooSimilarToAbstract(facts, abstract)).toBe(false);
  });

  it('rejects near-copy facts windows', () => {
    const abstract =
      'UniquePhraseAlphaBravoCharlieDeltaEchoFoxtrotGolfHotelIndiaJuliet observed in cohort.';
    const facts = extractPublicationFacts({
      title: 'Study',
      abstract,
      publicationTypes: ['Journal Article'],
    });
    // Force a near-copy outcome for the guard
    const forged = {
      ...facts,
      outcome_hint:
        'UniquePhraseAlphaBravoCharlieDeltaEchoFoxtrotGolfHotelIndiaJuliet observed',
    };
    expect(factsTooSimilarToAbstract(forged, abstract)).toBe(true);
  });
});
