import { describe, expect, it } from 'vitest';
import { shouldSuggestHelixRewards } from '@/lib/not-found/helix-alias-hint';

describe('shouldSuggestHelixRewards', () => {
  it('matches helix or reward case-insensitively', () => {
    expect(shouldSuggestHelixRewards('/helix-typo')).toBe(true);
    expect(shouldSuggestHelixRewards('/HELIX/missing')).toBe(true);
    expect(shouldSuggestHelixRewards('/old-rewards')).toBe(true);
    expect(shouldSuggestHelixRewards('/Reward-Center')).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(shouldSuggestHelixRewards('/dashboard')).toBe(false);
    expect(shouldSuggestHelixRewards('/nutrition/log')).toBe(false);
    expect(shouldSuggestHelixRewards('/')).toBe(false);
  });
});
