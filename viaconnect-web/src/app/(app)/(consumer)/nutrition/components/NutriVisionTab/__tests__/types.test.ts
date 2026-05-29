// Prompt #170a supplement §18.1: classifyConfidence threshold tests.
// Verifies the raised 0.85 / 0.55 thresholds replace the prior 0.75 / 0.5
// pair from Phase 1l. Env-driven so the fallback path is what production
// runs without explicit overrides.

import { describe, it, expect } from 'vitest';
import { classifyConfidence } from '../types';

describe('classifyConfidence (supplement §18.1 thresholds)', () => {
  it('classifies a score equal to HIGH_THRESHOLD 0.85 as high', () => {
    expect(classifyConfidence(0.85)).toBe('high');
  });

  it('classifies a score just below the high cutoff (0.84) as medium', () => {
    expect(classifyConfidence(0.84)).toBe('medium');
  });

  it('classifies a score equal to MEDIUM_THRESHOLD 0.55 as medium', () => {
    expect(classifyConfidence(0.55)).toBe('medium');
  });

  it('classifies a score just below the medium cutoff (0.54) as low', () => {
    expect(classifyConfidence(0.54)).toBe('low');
  });

  it('classifies a 1.0 score as high', () => {
    expect(classifyConfidence(1)).toBe('high');
  });

  it('classifies a 0 score as low', () => {
    expect(classifyConfidence(0)).toBe('low');
  });

  it('treats undefined as medium per the existing contract', () => {
    expect(classifyConfidence(undefined)).toBe('medium');
  });

  it('treats NaN as medium per the existing contract', () => {
    expect(classifyConfidence(Number.NaN)).toBe('medium');
  });
});
