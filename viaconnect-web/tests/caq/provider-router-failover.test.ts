// Prompt 175b hotfix (2026-06-04): provider router pure-logic tests.
//
// The runProviderRouter integration paths require live Anthropic +
// Gemini keys; those are covered at the integration tier after deploy.
// This file covers the pure helpers exported from provider-router.ts so
// the failover classifier, retry-eligibility predicate, and reconciliation
// logic are pinned independent of network.

import { describe, it, expect } from 'vitest';
import {
  isRetryableOutcome,
  isResultAcceptable,
  anyItemBelow,
  pickWinner,
} from '@/lib/caq/supplement-extraction/provider-router';
import type {
  ExtractionResult,
  ModelTier,
} from '@/lib/caq/supplement-extraction/types';

function buildResult(
  tier: ModelTier,
  outcomeCode: ExtractionResult['outcomeCode'],
  itemConfidences: ReadonlyArray<number>,
): ExtractionResult {
  return {
    items: itemConfidences.map((c, i) => ({
      rawText: `item-${i}`,
      name: `item-${i}`,
      brand: null,
      dose: null,
      unit: null,
      form: null,
      confidence: c,
    })),
    modelTier: tier,
    escalated: false,
    latencyMs: 100,
    outcomeCode,
  };
}

describe('isRetryableOutcome', () => {
  it('retries on transient outcomes', () => {
    expect(isRetryableOutcome('timeout')).toBe(true);
    expect(isRetryableOutcome('upstream_error')).toBe(true);
    expect(isRetryableOutcome('parse_failed')).toBe(true);
  });

  it('does not retry on non-transient outcomes', () => {
    expect(isRetryableOutcome('success')).toBe(false);
    expect(isRetryableOutcome('config_missing')).toBe(false);
    expect(isRetryableOutcome('circuit_open')).toBe(false);
    expect(isRetryableOutcome('no_items')).toBe(false);
    expect(isRetryableOutcome('unsupported_image')).toBe(false);
    expect(isRetryableOutcome('image_normalize_failed')).toBe(false);
    expect(isRetryableOutcome('unknown')).toBe(false);
  });
});

describe('isResultAcceptable', () => {
  it('accepts a success with items all above threshold', () => {
    const r = buildResult('sonnet', 'success', [0.9, 0.85, 0.8]);
    expect(isResultAcceptable(r, 0.7)).toBe(true);
  });

  it('rejects a success with any item below threshold', () => {
    const r = buildResult('sonnet', 'success', [0.9, 0.5]);
    expect(isResultAcceptable(r, 0.7)).toBe(false);
  });

  it('rejects a success with zero items', () => {
    const r = buildResult('sonnet', 'success', []);
    expect(isResultAcceptable(r, 0.7)).toBe(false);
  });

  it('rejects any non-success outcome', () => {
    expect(isResultAcceptable(buildResult('sonnet', 'upstream_error', []), 0.7)).toBe(false);
    expect(isResultAcceptable(buildResult('sonnet', 'timeout', []), 0.7)).toBe(false);
    expect(isResultAcceptable(buildResult('sonnet', 'no_items', []), 0.7)).toBe(false);
    expect(isResultAcceptable(buildResult('sonnet', 'circuit_open', []), 0.7)).toBe(false);
  });

  it('treats NaN confidence as below any threshold', () => {
    const r = buildResult('sonnet', 'success', [Number.NaN]);
    expect(isResultAcceptable(r, 0.0)).toBe(false);
  });
});

describe('anyItemBelow', () => {
  it('returns true when at least one item is below the threshold', () => {
    expect(anyItemBelow(buildResult('sonnet', 'success', [0.9, 0.5]).items, 0.7)).toBe(true);
  });

  it('returns false when every item meets or exceeds the threshold', () => {
    expect(anyItemBelow(buildResult('sonnet', 'success', [0.9, 0.85, 0.8]).items, 0.7)).toBe(false);
  });

  it('returns false on empty input (vacuous truth)', () => {
    expect(anyItemBelow(buildResult('sonnet', 'success', []).items, 0.7)).toBe(false);
  });
});

describe('pickWinner', () => {
  it('chooses the side that produced items over a clean failure on the other', () => {
    const a = buildResult('sonnet', 'success', [0.9]);
    const b = buildResult('gemini', 'upstream_error', []);
    expect(pickWinner(a, b).modelTier).toBe('sonnet');
    expect(pickWinner(b, a).modelTier).toBe('sonnet');
  });

  it('keeps the primary side when both fail (route mapper acts on its outcome)', () => {
    const a = buildResult('sonnet', 'upstream_error', []);
    const b = buildResult('gemini', 'upstream_error', []);
    expect(pickWinner(a, b).modelTier).toBe('sonnet');
  });

  it('chooses the side with more items when both succeeded', () => {
    const a = buildResult('sonnet', 'success', [0.9]);
    const b = buildResult('gemini', 'success', [0.85, 0.85, 0.85]);
    expect(pickWinner(a, b).modelTier).toBe('gemini');
  });

  it('breaks ties on item count by higher mean confidence', () => {
    const a = buildResult('sonnet', 'success', [0.9, 0.9]);
    const b = buildResult('gemini', 'success', [0.8, 0.7]);
    expect(pickWinner(a, b).modelTier).toBe('sonnet');
  });
});
