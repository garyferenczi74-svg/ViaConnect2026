import { describe, it, expect } from 'vitest';
import { PRICING, PROVIDER_IDS, estimateCostUsd, usdFromXaiTicks } from '../ai-pricing';

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
  it('prices existing Anthropic keys at the same input and output rates', () => {
    expect(estimateCostUsd('claude-sonnet-4-20250514', 1_000_000, 1_000_000)).toBe(18);
    expect(estimateCostUsd('claude-haiku-4-5-20251001', 1_000_000, 0)).toBe(1);
  });
  it('accepts the xai provider id and documented Grok rates', () => {
    expect(PROVIDER_IDS).toContain('xai');
    expect(PRICING['grok-4.7']).toEqual({ input: 2, output: 6, cachedInput: 0.5 });
    expect(PRICING['grok-4.3']).toEqual({ input: 1.25, output: 2.5, cachedInput: 0.2 });
    expect(estimateCostUsd('grok-4.7', 1_000_000, 1_000_000)).toBe(8);
    expect(estimateCostUsd('grok-4.7', 1_000_000, 1_000_000, 500_000)).toBe(7.25);
  });
  it('converts xAI cost ticks at 10 billion per dollar', () => {
    expect(usdFromXaiTicks(10_000_000_000)).toBe(1);
    expect(usdFromXaiTicks(5_000_000_000)).toBe(0.5);
    expect(usdFromXaiTicks(-1)).toBeNull();
  });
});
