// Contract tests for NutritionInsights.
//
// Source as text assertions per the repo convention (see
// hub/__tests__/NutritionGettingStartedStrip.test.ts); the project runs
// vitest under environment: 'node' with jsx: 'preserve', so the .tsx is
// asserted as text. These lock the Prompt 183 copy follow ups: the
// dash free, non overclaiming Hannah strings, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'NutritionInsights.tsx');

describe('NutritionInsights source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it('uses the protein forward score suggestion', () => {
    expect(source).toContain('A protein forward meal can help lift a lower score.');
  });

  it('uses the tailored meal suggestions copy', () => {
    expect(source).toContain('meal suggestions tailored to what you log');
  });
});
