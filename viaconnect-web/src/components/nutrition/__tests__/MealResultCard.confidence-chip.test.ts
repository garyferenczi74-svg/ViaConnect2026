// Prompt 194a (2026-06-14): source-string contract tests for the MealResultCard
// ConfidenceChip relabel. Run under the repo's active vitest config (node env,
// no jsdom; include glob is *.test.ts) the same way the genetics/hub Blueprint
// card tests do: read the .tsx source and assert on its content.
//
// What this locks:
//   - a true no-USDA-match (data_source === 'gemini_fallback') renders an honest
//     "Estimated" pill with the Info icon at strokeWidth 1.5 and the estimated
//     tooltip, and NOT the "{label} confidence: 0%" text.
//   - the no-match condition is driven explicitly from data_source via a noMatch
//     prop, never inferred from confidence === 0.
//   - data_source 'usda' / 'mixed' keep the existing High/Medium/Low band and the
//     percentage display.
//   - no em or en dashes.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'MealResultCard.tsx');

describe('MealResultCard ConfidenceChip', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('relabels a true no-USDA-match as an Estimated pill instead of a 0% confidence', () => {
    // The Estimated branch is gated on noMatch and renders the literal word plus
    // the estimated tooltip (and not a percentage).
    expect(source).toContain('if (noMatch) {');
    // The literal "Estimated" label sits on its own line just before the chip
    // closes (tolerant of CRLF line endings).
    expect(source).toMatch(/\s+Estimated\s+<\/span>/);
    expect(source).toContain(
      'Nutrition values estimated. We could not confirm a USDA match for these foods, so adjust any value as needed.',
    );
  });

  it('drives no-match from data_source gemini_fallback, not from confidence === 0', () => {
    expect(source).toContain("noMatch={analysis.data_source === 'gemini_fallback'}");
    // The chip never infers the no-match state from a zero confidence value.
    expect(source).not.toContain('confidence === 0');
  });

  it('uses the Info icon at strokeWidth 1.5 for the Estimated pill', () => {
    expect(source).toContain('<Info className="h-3 w-3" strokeWidth={1.5} />');
  });

  it('keeps the existing High/Medium/Low band and percentage display for usda/mixed', () => {
    expect(source).toContain("let label = 'High'");
    expect(source).toContain("label = 'Low'");
    expect(source).toContain("label = 'Medium'");
    expect(source).toContain('{label} confidence: {(confidence * 100).toFixed(0)}%');
  });

  it('has no em or en dashes', () => {
    const enDash = String.fromCharCode(0x2013);
    const emDash = String.fromCharCode(0x2014);
    expect(source.includes(enDash) || source.includes(emDash)).toBe(false);
  });
});
