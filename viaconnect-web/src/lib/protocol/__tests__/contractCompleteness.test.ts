/**
 * src/lib/protocol/__tests__/contractCompleteness.test.ts
 *
 * Unit tests for assessCompleteness (Prompt 208b, Section 5, Task 5-T2).
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * assessCompleteness is PURE and DETERMINISTIC: it LABELS the synthesis output
 * with a confidence floor when required cross-reference inputs are missing. It
 * never removes a recommendation and never gates a safety interlock.
 *
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';

import {
  assessCompleteness,
  REQUIRED_FOR_FULL_CONFIDENCE,
  type CompletenessInputs,
  type CompletenessReport,
} from '../contractCompleteness';

// ---------------------------------------------------------------------------
// Helper: a fully-present inputs object that callers tweak per-case.
// ---------------------------------------------------------------------------

function allPresent(): CompletenessInputs {
  return {
    hasVariants: true,
    hasLabs: true,
    hasHealthContext: true,
    hasNutritionLedger: true,
    hasConnected: true,
  };
}

// ---------------------------------------------------------------------------
// REQUIRED_FOR_FULL_CONFIDENCE shape
// ---------------------------------------------------------------------------

describe('REQUIRED_FOR_FULL_CONFIDENCE', () => {
  it('is exactly the three core cross-reference inputs', () => {
    expect(REQUIRED_FOR_FULL_CONFIDENCE).toEqual([
      'hasVariants',
      'hasLabs',
      'hasHealthContext',
    ]);
  });

  it('does NOT include the enriching inputs (nutrition ledger, connected)', () => {
    expect(REQUIRED_FOR_FULL_CONFIDENCE).not.toContain('hasNutritionLedger');
    expect(REQUIRED_FOR_FULL_CONFIDENCE).not.toContain('hasConnected');
  });
});

// ---------------------------------------------------------------------------
// All three required present -> full, not degraded, missing []
// ---------------------------------------------------------------------------

describe('assessCompleteness: all required present', () => {
  it('returns full confidence, not degraded, empty missing and empty note', () => {
    const report = assessCompleteness(allPresent());
    expect(report.confidenceFloor).toBe('full');
    expect(report.degraded).toBe(false);
    expect(report.missing).toEqual([]);
    expect(report.note).toBe('');
  });

  it('is full even when the ENRICHING inputs are absent (they never floor)', () => {
    const report = assessCompleteness({
      hasVariants: true,
      hasLabs: true,
      hasHealthContext: true,
      hasNutritionLedger: false,
      hasConnected: false,
    });
    expect(report.confidenceFloor).toBe('full');
    expect(report.degraded).toBe(false);
    expect(report.missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Exactly one missing -> reduced, degraded, named, non-empty note
// ---------------------------------------------------------------------------

describe('assessCompleteness: exactly one required missing', () => {
  it('no labs -> reduced, degraded, missing ["labs"], non-empty note naming labs', () => {
    const inputs = allPresent();
    inputs.hasLabs = false;
    const report = assessCompleteness(inputs);

    expect(report.confidenceFloor).toBe('reduced');
    expect(report.degraded).toBe(true);
    expect(report.missing).toEqual(['labs']);
    expect(report.note.length).toBeGreaterThan(0);
    expect(report.note).toContain('labs');
  });

  it('no genetics -> reduced, missing maps hasVariants to "genetics"', () => {
    const inputs = allPresent();
    inputs.hasVariants = false;
    const report = assessCompleteness(inputs);

    expect(report.confidenceFloor).toBe('reduced');
    expect(report.degraded).toBe(true);
    expect(report.missing).toEqual(['genetics']);
    expect(report.note).toContain('genetics');
  });

  it('no health context -> reduced, missing maps hasHealthContext to "health_context"', () => {
    const inputs = allPresent();
    inputs.hasHealthContext = false;
    const report = assessCompleteness(inputs);

    expect(report.confidenceFloor).toBe('reduced');
    expect(report.degraded).toBe(true);
    expect(report.missing).toEqual(['health_context']);
    expect(report.note).toContain('health_context');
  });
});

// ---------------------------------------------------------------------------
// Two or more missing -> minimal
// ---------------------------------------------------------------------------

describe('assessCompleteness: two or more required missing', () => {
  it('genetics + labs missing -> minimal, degraded, both named', () => {
    const inputs = allPresent();
    inputs.hasVariants = false;
    inputs.hasLabs = false;
    const report = assessCompleteness(inputs);

    expect(report.confidenceFloor).toBe('minimal');
    expect(report.degraded).toBe(true);
    expect(report.missing).toEqual(['genetics', 'labs']);
    expect(report.note).toContain('genetics');
    expect(report.note).toContain('labs');
  });

  it('all three required missing -> minimal, missing has all three names', () => {
    const report = assessCompleteness({
      hasVariants: false,
      hasLabs: false,
      hasHealthContext: false,
      hasNutritionLedger: true,
      hasConnected: true,
    });

    expect(report.confidenceFloor).toBe('minimal');
    expect(report.degraded).toBe(true);
    expect(report.missing).toEqual(['genetics', 'labs', 'health_context']);
  });
});

// ---------------------------------------------------------------------------
// Purity / determinism
// ---------------------------------------------------------------------------

describe('assessCompleteness: pure and deterministic', () => {
  it('returns the same report for the same inputs', () => {
    const inputs = allPresent();
    inputs.hasLabs = false;
    const a = assessCompleteness(inputs);
    const b = assessCompleteness(inputs);
    expect(a).toEqual(b);
  });

  it('does not mutate the inputs object', () => {
    const inputs = allPresent();
    inputs.hasLabs = false;
    const snapshot = { ...inputs };
    assessCompleteness(inputs);
    expect(inputs).toEqual(snapshot);
  });

  it('never throws on any boolean combination', () => {
    const combos: CompletenessInputs[] = [];
    for (let i = 0; i < 32; i++) {
      combos.push({
        hasVariants: Boolean(i & 1),
        hasLabs: Boolean(i & 2),
        hasHealthContext: Boolean(i & 4),
        hasNutritionLedger: Boolean(i & 8),
        hasConnected: Boolean(i & 16),
      });
    }
    for (const c of combos) {
      let report: CompletenessReport | undefined;
      expect(() => {
        report = assessCompleteness(c);
      }).not.toThrow();
      // degraded is consistent with missing length
      expect(report!.degraded).toBe(report!.missing.length > 0);
    }
  });
});
