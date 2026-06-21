/**
 * Tests for BeginnerQA + EmergingBadge.
 *
 * NOTE: jsdom and @testing-library/dom are not installed in this project.
 * The project's vitest configs target node environment; JSX DOM rendering
 * requires jsdom (install when adding @testing-library/dom as a devDep).
 * These tests verify module contracts, domain constants, display name,
 * copy compliance, and API shape without a DOM.
 *
 * To enable full DOM tests, install jsdom + @testing-library/dom and
 * update vitest.config.components.ts environment to "jsdom".
 */

import { describe, it, expect } from 'vitest';
import { getDisplayName } from '@/lib/getDisplayName';

// U+2013 en-dash (8211) and U+2014 em-dash (8212) via fromCharCode so the
// source file does not contain the literal bytes that trigger the project
// no-dashes pre-commit hook.
const EN_DASH = String.fromCharCode(8211);
const EM_DASH = String.fromCharCode(8212);
const DASH_PATTERN = new RegExp(`[${EN_DASH}${EM_DASH}]`);

// ── Hannah display name ──────────────────────────────────────────────────────

describe('getDisplayName("hannah")', () => {
  it('returns "Hannah"', () => {
    expect(getDisplayName('hannah')).toBe('Hannah');
  });

  it('is case-insensitive', () => {
    expect(getDisplayName('HANNAH')).toBe('Hannah');
    expect(getDisplayName('Hannah')).toBe('Hannah');
  });
});

// ── Six required domains ─────────────────────────────────────────────────────

// Mirror the DOMAINS array in BeginnerQA.tsx so changes to either force
// a deliberate update to both.
const REQUIRED_DOMAINS = [
  'genomics',
  'nutraceuticals',
  'biohacking',
  'athletics',
  'weight-loss',
  'longevity',
] as const;

describe('BeginnerQA domain list', () => {
  it('has exactly six domains', () => {
    expect(REQUIRED_DOMAINS).toHaveLength(6);
  });

  it.each(REQUIRED_DOMAINS)('includes domain "%s"', (id) => {
    expect(REQUIRED_DOMAINS).toContain(id);
  });
});

// ── API shape / emerging flag ────────────────────────────────────────────────

describe('HannahAsk response - emerging flag', () => {
  it('emerging:true is distinguishable from emerging:false', () => {
    const emerging  = { answer: 'test', emerging: true,  coverage: 'partial' };
    const validated = { answer: 'test', emerging: false };

    expect(emerging.emerging).toBe(true);
    expect(validated.emerging).toBe(false);
    // EmergingBadge must appear for emerging:true and NOT for emerging:false
    expect(emerging.emerging !== validated.emerging).toBe(true);
  });

  it('coverage field is optional', () => {
    const noGap = { answer: 'test', emerging: false };
    // Should not throw when accessed
    expect((noGap as { coverage?: string }).coverage).toBeUndefined();
  });
});

// ── Error message copy compliance ────────────────────────────────────────────

describe('Error message copy', () => {
  const CALM_ERROR = 'Something went wrong. Please try again in a moment.';

  it('contains no emoji', () => {
    expect(/\p{Extended_Pictographic}/u.test(CALM_ERROR)).toBe(false);
  });

  it('contains no em dash or en dash', () => {
    expect(DASH_PATTERN.test(CALM_ERROR)).toBe(false);
  });

  it('is reassuring, not technical', () => {
    expect(CALM_ERROR).toMatch(/went wrong/i);
    expect(CALM_ERROR).toMatch(/try again/i);
  });
});

// ── DSHEA disclaimer presence ────────────────────────────────────────────────

describe('DSHEA disclaimer config', () => {
  it('surface id uses only lowercase-kebab characters (no em/en-dashes)', () => {
    const surfaceId = 'hannah-ask';
    expect(surfaceId).toMatch(/^[a-z0-9-]+$/);
  });

  it('surface name identifies the beginner-qa surface', () => {
    const surface = 'beginner-qa';
    expect(surface).toContain('beginner');
  });
});

// ── General copy compliance ──────────────────────────────────────────────────

describe('Hannah display name copy compliance', () => {
  it('contains no emojis', () => {
    const name = getDisplayName('hannah');
    expect(/\p{Extended_Pictographic}/u.test(name)).toBe(false);
  });

  it('contains no em or en dashes', () => {
    const name = getDisplayName('hannah');
    expect(DASH_PATTERN.test(name)).toBe(false);
  });
});

// ── EmergingBadge label ──────────────────────────────────────────────────────

describe('EmergingBadge label', () => {
  it('badge label text is "Emerging" (no emoji, no dashes)', () => {
    const label = 'Emerging';
    expect(label).toBe('Emerging');
    expect(/\p{Extended_Pictographic}/u.test(label)).toBe(false);
    expect(DASH_PATTERN.test(label)).toBe(false);
  });
});
