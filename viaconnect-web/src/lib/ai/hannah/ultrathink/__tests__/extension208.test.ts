/**
 * Task 13 - Prompt 208 Hannah extension block tests
 * TDD: write RED first, then append the block to ultrathink-system.ts
 */
import { describe, it, expect } from 'vitest';
import {
  HANNAH_GUARDRAILS_TEXT,
  getUltrathinkSystemPrompt,
  // These will fail (RED) until the extension block is appended:
  HANNAH_208_RESEARCH_DIRECTIVE,
  HANNAH_208_QA_DIRECTIVE,
} from '../prompts/ultrathink-system';

// ---- Marker tests ----
describe('Prompt 208 extension markers', () => {
  it('source file contains the START marker exactly once', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(
      __dirname,
      '../prompts/ultrathink-system.ts',
    );
    const src = fs.readFileSync(filePath, 'utf8');
    const matches = src.match(/\/\/ === PROMPT 208 EXTENSION START ===/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });

  it('source file contains the END marker exactly once', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(
      __dirname,
      '../prompts/ultrathink-system.ts',
    );
    const src = fs.readFileSync(filePath, 'utf8');
    const matches = src.match(/\/\/ === PROMPT 208 EXTENSION END ===/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });
});

// ---- Export existence + non-empty ----
describe('Prompt 208 new exports', () => {
  it('HANNAH_208_RESEARCH_DIRECTIVE is a non-empty string', () => {
    expect(typeof HANNAH_208_RESEARCH_DIRECTIVE).toBe('string');
    expect(HANNAH_208_RESEARCH_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it('HANNAH_208_QA_DIRECTIVE is a non-empty string', () => {
    expect(typeof HANNAH_208_QA_DIRECTIVE).toBe('string');
    expect(HANNAH_208_QA_DIRECTIVE.length).toBeGreaterThan(0);
  });
});

// ---- QA directive guardrail substrings ----
describe('HANNAH_208_QA_DIRECTIVE guardrail content', () => {
  it('contains the word "emerging" (for Tier 3 labeling)', () => {
    expect(HANNAH_208_QA_DIRECTIVE.toLowerCase()).toContain('emerging');
  });

  it('contains "practitioner" (referral requirement)', () => {
    expect(HANNAH_208_QA_DIRECTIVE.toLowerCase()).toContain('practitioner');
  });

  it('contains "weight" (weight-loss guardrail)', () => {
    expect(HANNAH_208_QA_DIRECTIVE.toLowerCase()).toContain('weight');
  });

  it('contains a no-diagnosis phrase', () => {
    const lower = HANNAH_208_QA_DIRECTIVE.toLowerCase();
    const hasDiagnosisGuard =
      lower.includes('no diagnosis') ||
      lower.includes('not a diagnosis') ||
      lower.includes('do not diagnose') ||
      lower.includes('not diagnose') ||
      lower.includes('no disease claims') ||
      lower.includes('disease claims') ||
      lower.includes('no treatment claims') ||
      lower.includes('structure-function') ||
      lower.includes('structure/function');
    expect(hasDiagnosisGuard).toBe(true);
  });
});

// ---- Existing exports unchanged ----
describe('existing exports are unchanged', () => {
  it('HANNAH_GUARDRAILS_TEXT still contains FarmCeutica-only guardrail wording', () => {
    expect(HANNAH_GUARDRAILS_TEXT).toContain('FARMCEUTICA-ONLY PRODUCTS');
  });

  it('HANNAH_GUARDRAILS_TEXT still contains peptide sharing protocol wording', () => {
    expect(HANNAH_GUARDRAILS_TEXT).toContain('PEPTIDE SHARING PROTOCOL');
  });

  it('HANNAH_GUARDRAILS_TEXT still contains mandatory medical disclaimer wording', () => {
    expect(HANNAH_GUARDRAILS_TEXT).toContain('MANDATORY MEDICAL DISCLAIMER');
  });

  it('getUltrathinkSystemPrompt is still a function', () => {
    expect(typeof getUltrathinkSystemPrompt).toBe('function');
  });

  it('getUltrathinkSystemPrompt returns a non-empty string', () => {
    const result = getUltrathinkSystemPrompt({ context: 'test', guardrails: false });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
