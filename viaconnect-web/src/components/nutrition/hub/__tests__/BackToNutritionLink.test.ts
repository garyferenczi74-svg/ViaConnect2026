// Contract tests for BackToNutritionLink.
//
// Vitest runs under environment: 'node' with jsx: 'preserve' (see
// vitest.config.ts + tsconfig.json), and the project ships neither jsdom
// nor a JSX-transforming test pipeline, so importing the .tsx component
// into a test fails source parsing. The repo convention for JSX surfaces
// (see NutriVisionTab/__tests__/ErrorStateCard.test.ts) is to assert on
// the component source as text; full visual sign-off happens at Vercel
// preview. These assertions lock the anchor target, the visible label,
// and the ChevronLeft icon contract.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'BackToNutritionLink.tsx');

describe('BackToNutritionLink source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('points the anchor at the nutrition hub', () => {
    expect(source).toContain('href="/nutrition"');
  });

  it('shows the My Nutrition label', () => {
    expect(source).toContain('My Nutrition');
  });

  it('uses the ChevronLeft icon at strokeWidth 1.5', () => {
    expect(source).toContain("import { ChevronLeft } from 'lucide-react'");
    expect(source).toContain('strokeWidth={1.5}');
  });
});
