// Prompt 194 Task 3 item 4 (spec Task 5 acceptance): resolver and portion
// parser parity between the text and photo channels.
//
// The two channels must route identical input through the SAME food resolver
// (lookupFood) and the SAME portion parser (portionToGrams) so the same plate
// cannot diverge between Log a meal and NutriVision. Executing the route
// modules pulls in Supabase, Gemini, and Next request plumbing, so a structural
// parity check is used instead: read both route sources and assert they import
// the same resolver symbol from the same module, and that the resolver itself
// is the single front door to the shared portion parser. This does not change
// the resolution cascade or the parser; it locks that both channels share them.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Walk up from this test file to the web app root, then into src. Avoids a
// brittle relative chain and works regardless of the vitest working directory.
const SRC_ROOT = join(__dirname, '..', '..', '..', '..');

function readSource(relPath: string): string {
  return readFileSync(join(SRC_ROOT, relPath), 'utf8');
}

const TEXT_ROUTE = 'app/api/nutrition/analyze-text/route.ts';
const PHOTO_ROUTE = 'app/api/nutrition/analyze-photo/route.ts';
const USDA_CLIENT = 'lib/nutrition/usda-client.ts';

describe('Prompt 194: text and photo channels share one food resolver', () => {
  const textSource = readSource(TEXT_ROUTE);
  const photoSource = readSource(PHOTO_ROUTE);

  it('both routes import lookupFood from the same usda-client module', () => {
    const importPattern = /import\s*\{[^}]*\blookupFood\b[^}]*\}\s*from\s*['"]@\/lib\/nutrition\/usda-client['"]/;
    expect(textSource).toMatch(importPattern);
    expect(photoSource).toMatch(importPattern);
  });

  it('both routes call lookupFood with the same name, quantity, unit, preparation signature', () => {
    // Identical call shape means identical input resolves identically. The
    // preparation hint is the fifth argument on both channels.
    const callPattern = /lookupFood\(\s*item\.name,\s*item\.quantity,\s*item\.unit,\s*undefined,\s*item\.preparation\s*\)/;
    expect(textSource).toMatch(callPattern);
    expect(photoSource).toMatch(callPattern);
  });
});

describe('Prompt 194: the shared resolver is the single front door to portionToGrams', () => {
  const usdaClientSource = readSource(USDA_CLIENT);

  it('usda-client imports the shared portionToGrams parser', () => {
    const importPattern = /import\s*\{[^}]*\bportionToGrams\b[^}]*\}\s*from\s*['"]\.\/portion-to-grams['"]/;
    expect(usdaClientSource).toMatch(importPattern);
  });

  it('usda-client invokes portionToGrams so both channels share one portion parser', () => {
    // Because both channels resolve grams through lookupFood, and lookupFood is
    // the only caller wiring the portion parser, identical input cannot use two
    // different gram conversions across text and photo.
    expect(usdaClientSource).toMatch(/portionToGrams\(/);
  });
});
