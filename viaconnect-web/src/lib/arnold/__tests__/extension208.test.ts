// Task 15 - Prompt 208 extension tests for Arnold additive block
// TDD: write failing tests first, then implement.

import * as fs from 'fs';
import * as path from 'path';

const PROMPT_FILE = path.resolve(__dirname, '..', 'arnoldSystemPrompt.ts');

describe('Prompt 208 Arnold extension - fenced block markers', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(PROMPT_FILE, 'utf-8');
  });

  it('contains PROMPT 208 EXTENSION START marker exactly once', () => {
    const matches = source.match(/=== PROMPT 208 EXTENSION START ===/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });

  it('contains PROMPT 208 EXTENSION END marker exactly once', () => {
    const matches = source.match(/=== PROMPT 208 EXTENSION END ===/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });
});

describe('Prompt 208 Arnold extension - ARNOLD_208_PROTOCOL_CONTEXT_DIRECTIVE', () => {
  it('is exported, non-empty, contains no-diagnosis phrase and "relationship"', async () => {
    const mod = await import('../arnoldSystemPrompt');
    const directive = (mod as Record<string, unknown>)['ARNOLD_208_PROTOCOL_CONTEXT_DIRECTIVE'] as string;
    expect(typeof directive).toBe('string');
    expect(directive.length).toBeGreaterThan(0);
    const lower = directive.toLowerCase();
    expect(lower).toMatch(/never diagnos|not a diagnosis/);
    expect(lower).toContain('relationship');
  });
});

describe('Prompt 208 Arnold extension - buildArnold208ProtocolContext', () => {
  it('includes topic and form names when provided', async () => {
    const mod = await import('../arnoldSystemPrompt');
    const fn = (mod as Record<string, unknown>)['buildArnold208ProtocolContext'] as (
      input: { activeTopics: string[]; recommendedForms: string[] }
    ) => string;
    expect(typeof fn).toBe('function');
    const result = fn({ activeTopics: ['MTHFR'], recommendedForms: ['L-methylfolate'] });
    expect(result).toContain('MTHFR');
    expect(result).toContain('L-methylfolate');
    expect(result.toLowerCase()).toMatch(/not a diagnosis|never diagnos|observation/);
  });

  it('returns non-empty string and does not throw with empty input', async () => {
    const mod = await import('../arnoldSystemPrompt');
    const fn = (mod as Record<string, unknown>)['buildArnold208ProtocolContext'] as (
      input: { activeTopics: string[]; recommendedForms: string[] }
    ) => string;
    let result: string;
    expect(() => {
      result = fn({ activeTopics: [], recommendedForms: [] });
    }).not.toThrow();
    expect(result!.length).toBeGreaterThan(0);
    expect(result!.toLowerCase()).toMatch(/not a diagnosis|never diagnos|observation/);
  });
});

describe('Prompt 208 Arnold extension - existing exports unchanged', () => {
  it('ARNOLD_SYSTEM_PROMPT still contains the representative phrase', async () => {
    const mod = await import('../arnoldSystemPrompt');
    const prompt = (mod as Record<string, unknown>)['ARNOLD_SYSTEM_PROMPT'] as string;
    expect(prompt).toContain('You are Arnold, the Body Tracker AI agent for ViaConnect by FarmCeutica Wellness LLC.');
  });

  it('buildArnoldUserPrompt is still exported as a function', async () => {
    const mod = await import('../arnoldSystemPrompt');
    const fn = (mod as Record<string, unknown>)['buildArnoldUserPrompt'];
    expect(typeof fn).toBe('function');
  });
});
