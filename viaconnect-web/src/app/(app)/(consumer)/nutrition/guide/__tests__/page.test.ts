// Contract tests for the nutrition guide page.
//
// Source as text assertions per the repo convention (see
// components/nutrition/hub/__tests__/NutritionGettingStartedStrip.test.ts);
// vitest runs under environment: 'node' with jsx: 'preserve', so the .tsx
// is asserted as text. These lock the consumer facing Gordon display name
// routing through getDisplayName and confirm the literal Gordan no longer
// renders on the page.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'page.tsx');

describe('nutrition guide page source', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('renders the display name through getDisplayName with the gordon slug', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain("getDisplayName('gordon')");
  });

  it('no longer contains the literal Gordan', () => {
    expect(source).not.toContain('Gordan');
  });
});
