import { describe, it, expect } from 'vitest';
import { PRICING, estimateCostUsd } from '../ai-pricing';

describe('PRICING', () => {
  it('includes gemini-2.5-flash at 0/0 (free tier)', () => {
    expect(PRICING['gemini-2.5-flash']).toEqual({ input: 0, output: 0 });
  });
  it('preserves claude-sonnet-4-20250514 for non-nutrition surfaces', () => {
    expect(PRICING['claude-sonnet-4-20250514']).toBeDefined();
  });
});

describe('estimateCostUsd', () => {
  it('returns 0 for free-tier model regardless of tokens', () => {
    expect(estimateCostUsd('gemini-2.5-flash', 1_000_000, 1_000_000)).toBe(0);
  });
  it('returns null for unknown model', () => {
    expect(estimateCostUsd('nonexistent', 100, 100)).toBeNull();
  });
});
