// Tests for numbers-optional.ts (Prompt #169b, spec section 3.2.4).
//
// These exercise the REAL display-decision logic behind the "Hide specific
// numbers" body-image safeguard that the results surfaces consume:
//   decideMetricDisplay  per-metric value vs range vs sparkline vs hidden
//   the fully-hidden set  body fat % + visceral fat index hidden entirely
//   reveal-set helpers    tap-to-toggle / press-hold reveal state transitions
//   privacySparklineShape the magnitude-independent redacted sparkline shape
//
// The project's vitest config runs node-environment .test.ts only (see
// vitest.config.ts), so the testable contract lives in the pure module (the
// React components are thin wrappers that render the chosen variant). This
// mirrors the existing scan-gate.test.ts pattern (pure selection helper tested
// directly).
//
// The four behaviors the spec requires are asserted:
//   mode off                  -> every metric shows its value
//   mode on, not revealed     -> composition shows range, measurement shows
//                                sparkline, avatar shows nothing,
//                                body fat % + visceral fat index hidden entirely
//   mode on, revealed         -> the tapped metric shows its value (even the
//                                fully-hidden ones)
//   reveal state transitions  -> toggle / hold / clear behave immutably

import { describe, it, expect } from 'vitest';
import {
  decideMetricDisplay,
  isFullyHiddenMetric,
  isRevealable,
  shouldShowValue,
  shouldHideEntirely,
  toggleRevealed,
  setRevealed,
  clearRevealed,
  privacySparklineShape,
  FULLY_HIDDEN_METRIC_IDS,
  type MetricSurface,
} from '@/lib/body-tracker/numbers-optional';

// ===========================================================================
// Mode OFF: numbers always shown
// ===========================================================================

describe('decideMetricDisplay  mode off (spec 3.2.4 default, safeguard opt-in)', () => {
  const surfaces: MetricSurface[] = ['composition', 'measurement', 'avatar'];
  for (const surface of surfaces) {
    it(`shows the value for a ${surface} metric when the flag is off`, () => {
      expect(decideMetricDisplay({ numbersOptional: false, revealed: false, surface, metricId: 'leanMassKg' }))
        .toBe('value');
    });
  }

  it('shows the value even for body fat % / visceral fat index when the flag is off', () => {
    expect(decideMetricDisplay({ numbersOptional: false, revealed: false, surface: 'composition', metricId: 'bodyFatPct' }))
      .toBe('value');
    expect(decideMetricDisplay({ numbersOptional: false, revealed: false, surface: 'composition', metricId: 'visceralFatIndex' }))
      .toBe('value');
  });
});

// ===========================================================================
// Mode ON, not revealed: per-surface redaction
// ===========================================================================

describe('decideMetricDisplay  mode on, not revealed (spec 3.2.4 hiding)', () => {
  it('composition metric shows a confidence range (arrow + range), not the number', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: false, surface: 'composition', metricId: 'leanMassKg' }))
      .toBe('range');
  });

  it('measurement shows a sparkline shape only, not the number', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: false, surface: 'measurement', metricId: 'Neck' }))
      .toBe('sparkline');
  });

  it('avatar label shows nothing numeric (hidden)', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: false, surface: 'avatar', metricId: 'bodyFatLabel' }))
      .toBe('hidden');
  });

  it('body fat percentage is hidden ENTIRELY (not even a range) on the composition surface', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: false, surface: 'composition', metricId: 'bodyFatPct' }))
      .toBe('hidden');
  });

  it('visceral fat index is hidden ENTIRELY on the composition surface', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: false, surface: 'composition', metricId: 'visceralFatIndex' }))
      .toBe('hidden');
  });

  it('the fully-hidden rule wins over the surface default for the two sensitive metrics', () => {
    // Even if a fully-hidden metric were rendered on a measurement surface, it
    // must hide entirely rather than fall back to a sparkline.
    expect(decideMetricDisplay({ numbersOptional: true, revealed: false, surface: 'measurement', metricId: 'bodyFatPct' }))
      .toBe('hidden');
  });
});

// ===========================================================================
// Mode ON, revealed: temporary reveal wins
// ===========================================================================

describe('decideMetricDisplay  temporary reveal (spec 3.2.4 tap to reveal)', () => {
  it('a revealed composition metric shows its value', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: true, surface: 'composition', metricId: 'leanMassKg' }))
      .toBe('value');
  });

  it('a revealed measurement shows its value', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: true, surface: 'measurement', metricId: 'Neck' }))
      .toBe('value');
  });

  it('reveal overrides the fully-hidden rule: a tapped body fat % shows its value', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: true, surface: 'composition', metricId: 'bodyFatPct' }))
      .toBe('value');
  });

  it('reveal overrides the fully-hidden rule: a tapped visceral fat index shows its value', () => {
    expect(decideMetricDisplay({ numbersOptional: true, revealed: true, surface: 'composition', metricId: 'visceralFatIndex' }))
      .toBe('value');
  });
});

// ===========================================================================
// Fully-hidden set
// ===========================================================================

describe('isFullyHiddenMetric (spec 3.2.4 body fat % + visceral fat index)', () => {
  it('recognizes exactly body fat % and visceral fat index', () => {
    expect(isFullyHiddenMetric('bodyFatPct')).toBe(true);
    expect(isFullyHiddenMetric('visceralFatIndex')).toBe(true);
    expect([...FULLY_HIDDEN_METRIC_IDS].sort()).toEqual(['bodyFatPct', 'visceralFatIndex']);
  });

  it('does not flag ordinary metrics', () => {
    for (const id of ['leanMassKg', 'fatMassKg', 'ffmi', 'Neck', 'ratio:Waist to hip']) {
      expect(isFullyHiddenMetric(id)).toBe(false);
    }
  });
});

// ===========================================================================
// Predicates
// ===========================================================================

describe('predicate helpers', () => {
  it('shouldShowValue mirrors a value decision', () => {
    expect(shouldShowValue({ numbersOptional: false, revealed: false, surface: 'measurement', metricId: 'Neck' })).toBe(true);
    expect(shouldShowValue({ numbersOptional: true, revealed: false, surface: 'measurement', metricId: 'Neck' })).toBe(false);
    expect(shouldShowValue({ numbersOptional: true, revealed: true, surface: 'measurement', metricId: 'Neck' })).toBe(true);
  });

  it('shouldHideEntirely is true only for the hidden variant', () => {
    expect(shouldHideEntirely({ numbersOptional: true, revealed: false, surface: 'composition', metricId: 'bodyFatPct' })).toBe(true);
    expect(shouldHideEntirely({ numbersOptional: true, revealed: false, surface: 'avatar', metricId: 'x' })).toBe(true);
    expect(shouldHideEntirely({ numbersOptional: true, revealed: false, surface: 'composition', metricId: 'leanMassKg' })).toBe(false);
    expect(shouldHideEntirely({ numbersOptional: false, revealed: false, surface: 'composition', metricId: 'bodyFatPct' })).toBe(false);
  });

  it('isRevealable is true only when the mode is on and the metric is not already revealed', () => {
    expect(isRevealable({ numbersOptional: true, revealed: false })).toBe(true);
    expect(isRevealable({ numbersOptional: true, revealed: true })).toBe(false);
    expect(isRevealable({ numbersOptional: false, revealed: false })).toBe(false);
  });
});

// ===========================================================================
// Reveal-set transitions (immutable)
// ===========================================================================

describe('reveal-set helpers (immutable transitions)', () => {
  it('toggleRevealed adds then removes a metric, returning new sets each time', () => {
    const empty = new Set<string>();
    const added = toggleRevealed(empty, 'leanMassKg');
    expect(added).not.toBe(empty);
    expect(empty.has('leanMassKg')).toBe(false); // original untouched
    expect(added.has('leanMassKg')).toBe(true);

    const removed = toggleRevealed(added, 'leanMassKg');
    expect(removed.has('leanMassKg')).toBe(false);
    expect(added.has('leanMassKg')).toBe(true); // previous untouched
  });

  it('setRevealed adds and is idempotent', () => {
    const a = setRevealed(new Set(), 'Neck');
    expect(a.has('Neck')).toBe(true);
    const b = setRevealed(a, 'Neck');
    expect(b.has('Neck')).toBe(true);
    expect(b.size).toBe(1);
  });

  it('clearRevealed removes and is a no-op when absent', () => {
    const a = setRevealed(new Set(), 'Neck');
    const cleared = clearRevealed(a, 'Neck');
    expect(cleared.has('Neck')).toBe(false);
    const again = clearRevealed(cleared, 'Neck');
    expect(again.has('Neck')).toBe(false);
  });

  it('press-hold then release returns to hidden, and the value decision tracks it', () => {
    let set = new Set<string>();
    // Hold down -> revealed -> value shown.
    set = setRevealed(set, 'Neck');
    expect(decideMetricDisplay({ numbersOptional: true, revealed: set.has('Neck'), surface: 'measurement', metricId: 'Neck' })).toBe('value');
    // Release -> hidden again -> sparkline.
    set = clearRevealed(set, 'Neck');
    expect(decideMetricDisplay({ numbersOptional: true, revealed: set.has('Neck'), surface: 'measurement', metricId: 'Neck' })).toBe('sparkline');
  });
});

// ===========================================================================
// Privacy sparkline shape: deterministic + magnitude-independent
// ===========================================================================

describe('privacySparklineShape (redacted shape, leaks no magnitude)', () => {
  it('is deterministic for a given seed', () => {
    expect(privacySparklineShape('Neck')).toEqual(privacySparklineShape('Neck'));
  });

  it('produces different shapes for different metric seeds (visually distinct cells)', () => {
    expect(privacySparklineShape('Neck')).not.toEqual(privacySparklineShape('Chest'));
  });

  it('keeps every point within the [0,1] drawing range (never clips)', () => {
    for (const seed of ['Neck', 'Chest', 'ratio:Waist to hip', 'length:Inseam']) {
      for (const p of privacySparklineShape(seed)) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it('respects the requested point count', () => {
    expect(privacySparklineShape('Neck', 5)).toHaveLength(5);
    expect(privacySparklineShape('Neck', 10)).toHaveLength(10);
  });

  it('never yields fewer than two points (a line needs two)', () => {
    expect(privacySparklineShape('Neck', 1).length).toBeGreaterThanOrEqual(2);
  });
});
