// Prompt 192 Task 2 (TDD first): compliance gate tests.
// Reuses lintClinicalClaims and layers the 192 rules on top. Failing copy is
// dropped with reasons, never rewritten.

import { describe, expect, it } from 'vitest';
import { lintInsightCopy } from '../compliance';
import { mkFact } from './fixtures';

describe('lintInsightCopy', () => {
  it('drops curative claims via the reused clinical claim linter', () => {
    const result = lintInsightCopy(
      'Iron intake',
      'this will cure your deficiency',
      mkFact({ type: 'micronutrient_gap', horizon: 'weekly' }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('will cure'))).toBe(true);
  });

  it('drops any bioavailability figure that is not the verbatim approved string', () => {
    const result = lintInsightCopy(
      'Absorption note',
      'This form absorbs up to 15x better.',
      mkFact({ type: 'micronutrient_gap', horizon: 'weekly' }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('15x'))).toBe(true);
  });

  it('drops retired house fold ranges including 10x to 28x', () => {
    const result = lintInsightCopy(
      'Iron intake this week',
      'Foods rich in iron include lentils and spinach. Published comparisons cite 10x to 28x for the referenced delivery format.',
      mkFact({ type: 'micronutrient_gap', horizon: 'weekly' }),
    );
    expect(result.ok).toBe(false);
  });

  it('passes Maximum Bioavailability', () => {
    const result = lintInsightCopy(
      'Iron intake this week',
      'Foods rich in iron include lentils and spinach. Delivery uses Maximum Bioavailability.',
      mkFact({ type: 'micronutrient_gap', horizon: 'weekly' }),
    );
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('drops a product suggestion attached to a non micronutrient_gap insight', () => {
    const result = lintInsightCopy(
      'Quality trend',
      'Your quality held steady this week.',
      mkFact({
        type: 'quality_trend',
        horizon: 'weekly',
        productSuggestion: { slug: 'iron-support', name: 'Iron Support', reason: 'seeded' },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('product'))).toBe(true);
  });

  it('drops urgency and discount language', () => {
    const result = lintInsightCopy(
      'Act now',
      'Limited offer: 20% off, do not miss out.',
      mkFact({ type: 'macro_gap', horizon: 'daily' }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(2);
  });

  it('drops causal phrasing on hydration_correlation', () => {
    const result = lintInsightCopy(
      'Hydration and quality',
      'Your score dropped because you drank less water.',
      mkFact({ type: 'hydration_correlation', horizon: 'weekly' }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.includes('causal'))).toBe(true);
  });

  it('does not apply the causal rule to non correlational types', () => {
    const result = lintInsightCopy(
      'Protein gap',
      'Planning ahead led to better lunches.',
      mkFact({ type: 'macro_gap', horizon: 'daily' }),
    );
    expect(result.ok).toBe(true);
  });

  it('requires educational framing when a product suggestion exists', () => {
    const fact = mkFact({
      type: 'micronutrient_gap',
      horizon: 'weekly',
      productSuggestion: { slug: 'iron-support', name: 'Iron Support', reason: 'gap support' },
    });
    const bare = lintInsightCopy('Iron intake', 'Iron Support is available.', fact);
    expect(bare.ok).toBe(false);
    expect(bare.failures.some((f) => f.includes('educational'))).toBe(true);

    const framed = lintInsightCopy(
      'Iron intake',
      'Foods rich in iron include lentils, spinach, and red meat. Iron Support is one option to read up on.',
      fact,
    );
    expect(framed.ok).toBe(true);
  });

  it('passes clean fact based copy', () => {
    const result = lintInsightCopy(
      'Protein came in light yesterday',
      'You logged 55 g of protein against your 120 g target, about 46% of the way there.',
      mkFact({ type: 'macro_gap', horizon: 'daily' }),
    );
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });
});
