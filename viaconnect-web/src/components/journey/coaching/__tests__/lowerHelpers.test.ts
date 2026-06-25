/**
 * src/components/journey/coaching/__tests__/lowerHelpers.test.ts
 *
 * TDD for the lower-section pure helpers (Prompt 208i Task I-T2b).
 * Node-safe, no DOM, no React, deterministic, never throw.
 *
 * formatMacroLabel: "consumed / target g" formatting.
 * kcalRemaining: kcal-left computation.
 * goalProgressPct: percent-to-target with guardrails.
 * flatSparkline: 7-point flat sparkline for wearable-off vitals rows.
 */

import { describe, it, expect } from 'vitest';
import {
  formatMacroLabel,
  kcalRemaining,
  goalProgressPct,
  flatSparkline,
} from '../lowerHelpers';

// ---------------------------------------------------------------------------
// formatMacroLabel
// ---------------------------------------------------------------------------

describe('formatMacroLabel', () => {
  it('renders consumed and target when both are positive', () => {
    expect(formatMacroLabel(92, 120)).toBe('92 / 120g');
  });

  it('rounds fractional grams', () => {
    expect(formatMacroLabel(92.6, 120.4)).toBe('93 / 120g');
  });

  it('renders double-dash when target is null', () => {
    expect(formatMacroLabel(0, null)).toBe('--');
  });

  it('renders double-dash when consumed is 0 and no target', () => {
    expect(formatMacroLabel(0, null)).toBe('--');
  });

  it('renders 0 / target when consumed is 0 but target exists', () => {
    expect(formatMacroLabel(0, 120)).toBe('0 / 120g');
  });

  it('never throws', () => {
    expect(() => formatMacroLabel(NaN, null)).not.toThrow();
    expect(() => formatMacroLabel(0, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// kcalRemaining
// ---------------------------------------------------------------------------

describe('kcalRemaining', () => {
  it('returns remaining as string when target and consumed are known', () => {
    expect(kcalRemaining(2000, 1200)).toEqual({ value: '800', label: 'kcal left' });
  });

  it('returns consumed as string when no target but logs exist', () => {
    expect(kcalRemaining(null, 1200)).toEqual({ value: '1200', label: 'kcal logged' });
  });

  it('returns double-dash when no target and no logs', () => {
    expect(kcalRemaining(null, 0)).toEqual({ value: '--', label: 'kcal' });
  });

  it('handles negative remainder gracefully', () => {
    const result = kcalRemaining(1500, 1800);
    expect(result.label).toBe('kcal left');
    expect(result.value).toBe('-300');
  });

  it('rounds fractional calories', () => {
    expect(kcalRemaining(2000, 1200.7)).toEqual({ value: '799', label: 'kcal left' });
  });

  it('never throws', () => {
    expect(() => kcalRemaining(null, NaN)).not.toThrow();
    expect(() => kcalRemaining(NaN, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// goalProgressPct
// ---------------------------------------------------------------------------

describe('goalProgressPct', () => {
  it('returns correct progress between baseline and target', () => {
    expect(goalProgressPct(142, 148, 152)).toBe(60);
  });

  it('returns 0 when at baseline', () => {
    expect(goalProgressPct(142, 142, 152)).toBe(0);
  });

  it('returns 100 when at or past target', () => {
    expect(goalProgressPct(142, 152, 152)).toBe(100);
  });

  it('clamps to 0 when current is below baseline', () => {
    expect(goalProgressPct(142, 140, 152)).toBe(0);
  });

  it('clamps to 100 when current exceeds target', () => {
    expect(goalProgressPct(142, 155, 152)).toBe(100);
  });

  it('returns null when baseline equals target (no valid range)', () => {
    expect(goalProgressPct(152, 152, 152)).toBeNull();
  });

  it('returns null when any input is null', () => {
    expect(goalProgressPct(null, 148, 152)).toBeNull();
    expect(goalProgressPct(142, null, 152)).toBeNull();
    expect(goalProgressPct(142, 148, null)).toBeNull();
  });

  it('never throws', () => {
    expect(() => goalProgressPct(null, null, null)).not.toThrow();
    expect(() => goalProgressPct(NaN, 1, 2)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// flatSparkline
// ---------------------------------------------------------------------------

describe('flatSparkline', () => {
  it('returns 7 identical points at the given value', () => {
    const result = flatSparkline(5);
    expect(result).toHaveLength(7);
    expect(result.every((v) => v === 5)).toBe(true);
  });

  it('defaults value to 1 when not provided', () => {
    const result = flatSparkline();
    expect(result).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('is deterministic', () => {
    expect(flatSparkline(3)).toEqual(flatSparkline(3));
  });

  it('never throws', () => {
    expect(() => flatSparkline(0)).not.toThrow();
    expect(() => flatSparkline(NaN)).not.toThrow();
  });
});
