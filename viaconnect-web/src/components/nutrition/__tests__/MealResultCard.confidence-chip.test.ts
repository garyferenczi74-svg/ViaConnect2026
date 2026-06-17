// Prompt 203 (2026-06-17): source-string contract tests for the MealResultCard
// ConfidenceChip. Run under the repo's active vitest config (node env, no jsdom;
// include glob is *.test.ts) the same way the genetics/hub Blueprint card tests
// do: read the .tsx source and assert on its content. The behavioural logic of
// which tone is chosen lives in mealConfidence.test.ts.
//
// What this locks (supersedes the Prompt 194a percentage contract):
//   - the chip is driven by the resolved tone, never the raw confidence number
//     (analysis.confidence is the USDA match RATE, not a quality signal).
//   - an estimated meal (USDA miss) renders an honest "Estimated" pill, never a
//     "{label} confidence: N%" percentage.
//   - only a genuine quality downgrade renders the red "Review recommended" state.
//   - a clean full USDA match renders "High confidence".
//   - no em or en dashes.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'MealResultCard.tsx');

describe('MealResultCard ConfidenceChip', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('drives the chip from the resolved tone, not the raw confidence number', () => {
    expect(source).toContain("import { resolveMealConfidenceTone, type MealConfidenceTone } from './mealConfidence';");
    expect(source).toContain('const tone = resolveMealConfidenceTone(analysis);');
    expect(source).toContain('<ConfidenceChip tone={tone} />');
  });

  it('no longer renders a match-rate percentage as confidence', () => {
    expect(source).not.toContain('{label} confidence: {(confidence * 100).toFixed(0)}%');
    expect(source).not.toContain("label = 'Low'");
  });

  it('renders an Estimated pill with the Info icon for the estimated tone', () => {
    expect(source).toContain("if (tone === 'estimated') {");
    expect(source).toMatch(/\s+Estimated\s+<\/span>/);
    expect(source).toContain('<Info className="h-3 w-3" strokeWidth={1.5} />');
  });

  it('reserves the red "Review recommended" state for a genuine downgrade', () => {
    expect(source).toContain("if (tone === 'low') {");
    expect(source).toMatch(/\s+Review recommended\s+<\/span>/);
    // The review banner is gated on the low tone, not on a confidence threshold.
    expect(source).toContain("{tone === 'low' && (");
    expect(source).not.toContain('analysis.confidence < 0.3');
  });

  it('renders High confidence for a clean full USDA match', () => {
    expect(source).toMatch(/\s+High confidence\s+<\/span>/);
  });

  it('has no em or en dashes', () => {
    const enDash = String.fromCharCode(0x2013);
    const emDash = String.fromCharCode(0x2014);
    expect(source.includes(enDash) || source.includes(emDash)).toBe(false);
  });
});
