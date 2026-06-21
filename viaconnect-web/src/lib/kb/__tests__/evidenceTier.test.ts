/**
 * src/lib/kb/__tests__/evidenceTier.test.ts
 *
 * TDD tests for evidenceTier.ts (Prompt 208, Phase 2, Task 6).
 *
 * Assertions:
 *   1. gradeToTier maps A->1, B->2, C->3, D->3.
 *   2. CONSUMER_TIERS deep-equals [1, 2].
 */

import { describe, it, expect } from 'vitest';
import { gradeToTier, CONSUMER_TIERS } from '../evidenceTier';

describe('gradeToTier', () => {
  it('maps grade A to tier 1', () => {
    expect(gradeToTier('A')).toBe(1);
  });

  it('maps grade B to tier 2', () => {
    expect(gradeToTier('B')).toBe(2);
  });

  it('maps grade C to tier 3', () => {
    expect(gradeToTier('C')).toBe(3);
  });

  it('maps grade D to tier 3', () => {
    expect(gradeToTier('D')).toBe(3);
  });
});

describe('CONSUMER_TIERS', () => {
  it('deep-equals [1, 2]', () => {
    expect(CONSUMER_TIERS).toEqual([1, 2]);
  });

  it('has exactly 2 elements', () => {
    expect(CONSUMER_TIERS.length).toBe(2);
  });

  it('does not include tier 3 (emerging/corpus-only)', () => {
    expect(CONSUMER_TIERS).not.toContain(3);
  });
});
