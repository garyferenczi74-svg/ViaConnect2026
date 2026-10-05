import { describe, it, expect } from 'vitest';
import { CLAUDE_HAIKU, CLAUDE_OPUS, CLAUDE_SONNET } from '@/lib/ai/claude-models';
import { PRICING, estimateCostUsd } from '../ai-pricing';

describe('PRICING', () => {
  it('includes gemini-2.5-flash at 0/0 (free tier)', () => {
    expect(PRICING['gemini-2.5-flash']).toEqual({ input: 0, output: 0 });
  });
  it('prices current Claude IDs from claude-models.ts', () => {
    expect(PRICING[CLAUDE_HAIKU]).toEqual({ input: 1.0, output: 5.0 });
    expect(PRICING[CLAUDE_SONNET]).toEqual({ input: 3.0, output: 15.0 });
    expect(PRICING[CLAUDE_OPUS]).toEqual({ input: 5.0, output: 25.0 });
  });
  it('preserves claude-sonnet-4-20250514 for historical usage rows', () => {
    expect(PRICING['claude-sonnet-4-20250514']).toEqual({ input: 3.0, output: 15.0 });
  });
  it('prices the Haiku 4.5 alias for historical rows', () => {
    expect(PRICING['claude-haiku-4-5']).toEqual({ input: 1.0, output: 5.0 });
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
