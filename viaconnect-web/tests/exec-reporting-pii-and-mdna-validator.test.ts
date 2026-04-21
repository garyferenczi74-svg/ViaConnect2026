// Prompt #105 §3.6 — PII pre-send scan + MD&A post-generation validator.

import { describe, it, expect } from 'vitest';
import {
  assertNoPIIInClaudePrompt,
  scanForPII,
} from '@/lib/executiveReporting/mdna/piiRedactor';
import {
  validateGeneratedMDNA,
} from '@/lib/executiveReporting/mdna/postGenerationValidator';

describe('scanForPII — pre-send boundary', () => {
  it('passes clean content', () => {
    const r = scanForPII('Revenue grew 12% in Q1; contribution margin held steady.');
    expect(r.ok).toBe(true);
    expect(r.hits).toEqual([]);
  });

  it('catches SSN', () => {
    const r = scanForPII('Contact 123-45-6789 for details.');
    expect(r.ok).toBe(false);
    expect(r.hits[0]!.pattern).toBe('ssn');
  });

  it('catches EIN', () => {
    const r = scanForPII('Entity EIN 12-3456789');
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.pattern === 'ein')).toBe(true);
  });

  it('catches email address', () => {
    const r = scanForPII('Contact jane@example.com');
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.pattern === 'email_address')).toBe(true);
  });

  it('catches US phone number', () => {
    const r = scanForPII('Call (555) 123-4567 for more.');
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.pattern === 'phone_us')).toBe(true);
  });

  it('preview masks the hit itself; never leaks full PII', () => {
    const r = scanForPII('ABCD 123-45-6789 XYZ');
    expect(r.ok).toBe(false);
    expect(r.hits[0]!.preview).toContain('[REDACTED]');
    expect(r.hits[0]!.preview).not.toContain('123-45-6789');
  });
});

describe('assertNoPIIInClaudePrompt — throws', () => {
  it('silent pass for clean prompt', () => {
    expect(() => assertNoPIIInClaudePrompt('revenue grew', 'ctx')).not.toThrow();
  });

  it('throws with pattern names but NOT raw PII', () => {
    try {
      assertNoPIIInClaudePrompt('123-45-6789 in prompt', 'mdna_financial');
      throw new Error('should have thrown');
    } catch (err) {
      const msg = String((err as Error).message);
      expect(msg).toContain('PII_IN_CLAUDE_PROMPT');
      expect(msg).toContain('ssn');
      expect(msg).not.toContain('123-45-6789');
    }
  });
});

describe('validateGeneratedMDNA — post-generation', () => {
  it('passes a disciplined MD&A paragraph', () => {
    const r = validateGeneratedMDNA(
      'Revenue grew 12% period-over-period, driven primarily by category expansion in the supplements segment. Contribution margin held steady at 48%.',
    );
    expect(r.ok).toBe(true);
    expect(r.findings).toEqual([]);
  });

  it('flags investment-advice phrasing', () => {
    const r = validateGeneratedMDNA('Investors should buy the stock based on these trends.');
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.finding === 'INVESTMENT_ADVICE')).toBe(true);
  });

  it('flags unbounded forecasts', () => {
    const r = validateGeneratedMDNA('Revenue will definitely exceed $100M by year-end.');
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.finding === 'UNBOUNDED_FORECAST')).toBe(true);
  });

  it('flags individual attribution by name', () => {
    const r = validateGeneratedMDNA('Growth was driven by Jane Smith building the category team.');
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.finding === 'INDIVIDUAL_ATTRIBUTION')).toBe(true);
  });

  it('flags "X\'s leadership" attributions', () => {
    const r = validateGeneratedMDNA("John Doe's leadership drove the expansion.");
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.finding === 'INDIVIDUAL_ATTRIBUTION')).toBe(true);
  });

  it('does not flag aggregate team attribution', () => {
    const r = validateGeneratedMDNA('The category team drove expansion through focused execution.');
    expect(r.ok).toBe(true);
  });
});
