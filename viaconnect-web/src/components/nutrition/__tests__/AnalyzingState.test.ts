// Contract tests for AnalyzingState.
//
// Source as text assertions per the repo convention (see
// hub/__tests__/NutritionGettingStartedStrip.test.ts); vitest runs under
// environment: 'node' with jsx: 'preserve', so the .tsx is asserted as
// text. These lock the consumer facing Gordon display name routing
// through getDisplayName and confirm the literal Gordan no longer renders.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'AnalyzingState.tsx');

describe('AnalyzingState source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('renders the display name through getDisplayName with the gordon slug', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain("getDisplayName('gordon')");
  });

  it('no longer contains the literal Gordan', () => {
    expect(source).not.toContain('Gordan');
  });
});
