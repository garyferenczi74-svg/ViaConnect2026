// Jeffery guardrails — covers Semaglutide block, blocked-brand list,
// bioavailability range, supplement candidate Retatrutide rules, and
// FarmCeutica catalog allow-list.

import { describe, it, expect } from 'vitest';
import {
  validateRecommendationText,
  validateSupplementCandidate,
} from '@/lib/agents/jeffery/guardrails';

describe('validateRecommendationText', () => {
  it('passes a clean FarmCeutica recommendation', () => {
    const r = validateRecommendationText(
      'Try Magnesium Glycinate before bed for sleep support.',
    );
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it.each([
    ['semaglutide', 'Consider semaglutide for weight loss.'],
    ['ozempic', 'A weekly Ozempic shot may help.'],
    ['wegovy', 'Wegovy targets appetite signaling.'],
    ['rybelsus', 'Rybelsus is the oral GLP-1 option.'],
  ])('blocks Semaglutide-family term: %s', (term, text) => {
    const r = validateRecommendationText(text);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.code === 'semaglutide' && v.detail.toLowerCase().includes(term))).toBe(true);
  });

  it.each([
    'thorne', 'Pure Encapsulations', 'Designs for Health',
    'Life Extension', 'NOW Foods',
  ])('blocks third-party brand: %s', (brand) => {
    const r = validateRecommendationText(`Add a ${brand} multivitamin.`);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.code === 'non_farmceutica')).toBe(true);
  });

  it('blocks the wrong bioavailability range (5 to 27x)', () => {
    const r1 = validateRecommendationText('Bioavailability is 5 to 27x baseline.');
    const r2 = validateRecommendationText('Bioavailability is 5x to 27x baseline.');
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    expect(r1.violations.some((v) => v.code === 'bioavailability_range')).toBe(true);
  });

  it('accepts the canonical 10 to 27x bioavailability range', () => {
    const r = validateRecommendationText('Bioavailability is 10 to 27x baseline.');
    expect(r.ok).toBe(true);
  });
});

describe('validateSupplementCandidate', () => {
  it('accepts a FarmCeutica catalog product', () => {
    const r = validateSupplementCandidate({ productName: 'Magnesium Glycinate' });
    expect(r.ok).toBe(true);
  });

  it('blocks Semaglutide as a candidate', () => {
    const r = validateSupplementCandidate({ productName: 'Semaglutide' });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.code === 'semaglutide')).toBe(true);
  });

  it('allows Retatrutide ONLY as injectable, never oral or topical', () => {
    const inj = validateSupplementCandidate({ productName: 'Retatrutide', deliveryForm: 'injectable' });
    const oral = validateSupplementCandidate({ productName: 'Retatrutide', deliveryForm: 'oral' });
    const topical = validateSupplementCandidate({ productName: 'Retatrutide', deliveryForm: 'topical' });
    expect(inj.ok).toBe(true);
    expect(oral.ok).toBe(false);
    expect(topical.ok).toBe(false);
    expect(oral.violations.some((v) => v.code === 'retatrutide_stack')).toBe(true);
  });

  it('blocks Retatrutide stacked with another supplement', () => {
    const r = validateSupplementCandidate({
      productName: 'Retatrutide',
      deliveryForm: 'injectable',
      stackedWith: ['Vitamin D3'],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.code === 'retatrutide_stack')).toBe(true);
  });

  it('blocks an off-catalog name', () => {
    const r = validateSupplementCandidate({ productName: 'Mystery Powder' });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.code === 'non_farmceutica')).toBe(true);
  });
});
