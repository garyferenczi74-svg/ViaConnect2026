// Prompt 172 Phase 0 (170c primitive): clinical claim linter scanning rules.
//
// 170c §13.2 scope: scan generated text for prescriptive medical language,
// diagnostic claims, treatment claims, cure claims, prevention claims, and
// FDA approved phrasing. Phase 0 ships the basic ruleset; the §13.5 rule
// versioning table is deferred to when §13 fully lands.
//
// The linter is a vitest helper for build time generation pipelines, not a
// runtime gate. Pure TS, zero dependencies, no React, no IO.

import { describe, it, expect } from 'vitest';

import { lintClinicalClaims } from '@/lib/compliance/clinical-claim-linter';

describe('clinical claim linter: clean input', () => {
  it('returns ok true with empty violations on neutral nutrition copy', () => {
    const text = 'Iron rich foods feature regularly in your meals.';
    const result = lintClinicalClaims(text);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('passes the food positive safety mode style copy', () => {
    const text = 'Your eating today was lighter than yesterday.';
    const result = lintClinicalClaims(text);
    expect(result.ok).toBe(true);
  });
});

describe('clinical claim linter: prescriptive language', () => {
  it('flags "you should take" as prescriptive', () => {
    const result = lintClinicalClaims('You should take 500 mg of magnesium nightly.');
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.kind === 'prescriptive')).toBe(true);
    expect(result.violations[0].match.toLowerCase()).toContain('you should take');
  });

  it('flags "we recommend you take"', () => {
    const result = lintClinicalClaims('We recommend you take a higher dose of vitamin D.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'prescriptive')).toBe(true);
  });

  it('flags "you must avoid"', () => {
    const result = lintClinicalClaims('You must avoid gluten entirely.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'prescriptive')).toBe(true);
  });

  it('flags "you need to eat"', () => {
    const result = lintClinicalClaims('You need to eat more leafy greens.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'prescriptive')).toBe(true);
  });
});

describe('clinical claim linter: diagnostic + curative claims', () => {
  it('flags a diagnostic claim "your symptoms indicate"', () => {
    const result = lintClinicalClaims('Your symptoms indicate iron deficiency.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'diagnostic')).toBe(true);
  });

  it('flags a treatment claim "to treat"', () => {
    const result = lintClinicalClaims('To treat your fatigue, increase B vitamins.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'curative')).toBe(true);
  });

  it('flags a cure claim "this will cure"', () => {
    const result = lintClinicalClaims('This will cure your headaches.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'curative')).toBe(true);
  });

  it('flags a prevention claim "this prevents"', () => {
    const result = lintClinicalClaims('This prevents osteoporosis.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'curative')).toBe(true);
  });

  it('flags an FDA approved claim verbatim', () => {
    const result = lintClinicalClaims('This product is FDA approved for daily use.');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.match.toLowerCase().includes('fda approved'))).toBe(true);
  });
});

describe('clinical claim linter: verb pair loophole', () => {
  it('allows "diagnose, treat, cure, or prevent" inside the DSHEA disclaimer', () => {
    const text =
      'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.';
    const result = lintClinicalClaims(text);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('allows "treat" inside the negated DSHEA phrasing', () => {
    const text = 'Not intended to diagnose, treat, cure, or prevent any disease.';
    const result = lintClinicalClaims(text);
    expect(result.ok).toBe(true);
  });
});

describe('clinical claim linter: violation metadata', () => {
  it('returns the substring index of each violation', () => {
    const text = 'Hello world. You should take this now.';
    const result = lintClinicalClaims(text);
    const v = result.violations[0];
    expect(v.index).toBeGreaterThanOrEqual(0);
    expect(text.substring(v.index, v.index + v.match.length).toLowerCase()).toBe(
      v.match.toLowerCase(),
    );
  });
});
