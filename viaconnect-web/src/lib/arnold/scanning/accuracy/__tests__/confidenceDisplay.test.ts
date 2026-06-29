// Task 12 (Prompt 210c) - TDD tests for confidenceDisplay.ts pure logic.
//
// RED phase: run before confidenceDisplay.ts exists -> import fails.
// GREEN phase: run after confidenceDisplay.ts is created.
//
// Tests cover:
//   numericToConfidenceLevel: threshold edges, null passthrough (RULE 9)
//   confidenceColorVar: correct --severity-* token per tier, no cross-contamination
//   confidenceBodyLabel: body-positive copy, no alarming language for low tier

import { describe, it, expect } from 'vitest';
import {
  numericToConfidenceLevel,
  confidenceColorVar,
  confidenceBodyLabel,
} from '../confidenceDisplay';

// ---------------------------------------------------------------------------
// numericToConfidenceLevel
// ---------------------------------------------------------------------------

describe('numericToConfidenceLevel', () => {
  it('null -> null (UNKNOWN state, RULE 9)', () => {
    expect(numericToConfidenceLevel(null)).toBeNull();
  });

  it('0.85 (stored high via confidenceToNumeric) -> high', () => {
    expect(numericToConfidenceLevel(0.85)).toBe('high');
  });

  it('1.0 (maximum) -> high', () => {
    expect(numericToConfidenceLevel(1.0)).toBe('high');
  });

  it('0.70 (high threshold, inclusive) -> high', () => {
    expect(numericToConfidenceLevel(0.70)).toBe('high');
  });

  it('0.69 (just below high threshold) -> moderate', () => {
    expect(numericToConfidenceLevel(0.69)).toBe('moderate');
  });

  it('0.60 (stored moderate via confidenceToNumeric) -> moderate', () => {
    expect(numericToConfidenceLevel(0.60)).toBe('moderate');
  });

  it('0.45 (moderate threshold, inclusive) -> moderate', () => {
    expect(numericToConfidenceLevel(0.45)).toBe('moderate');
  });

  it('0.44 (just below moderate threshold) -> low', () => {
    expect(numericToConfidenceLevel(0.44)).toBe('low');
  });

  it('0.35 (stored low via confidenceToNumeric) -> low', () => {
    expect(numericToConfidenceLevel(0.35)).toBe('low');
  });

  it('0.0 (minimum possible score) -> low', () => {
    expect(numericToConfidenceLevel(0.0)).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// confidenceColorVar
// ---------------------------------------------------------------------------

describe('confidenceColorVar', () => {
  it('null -> null (no color for UNKNOWN state; RULE 9)', () => {
    expect(confidenceColorVar(null)).toBeNull();
  });

  it('high -> uses --severity-low token (green for confidence)', () => {
    const color = confidenceColorVar('high');
    expect(color).not.toBeNull();
    expect(color!).toContain('--severity-low');
  });

  it('moderate -> uses --severity-moderate token (yellow)', () => {
    const color = confidenceColorVar('moderate');
    expect(color).not.toBeNull();
    expect(color!).toContain('--severity-moderate');
  });

  it('low -> uses --severity-high token (red)', () => {
    const color = confidenceColorVar('low');
    expect(color).not.toBeNull();
    expect(color!).toContain('--severity-high');
  });

  it('high color does not bleed into severity-high or severity-moderate tokens', () => {
    const color = confidenceColorVar('high')!;
    expect(color).not.toContain('--severity-high');
    expect(color).not.toContain('--severity-moderate');
  });

  it('low color does not bleed into severity-low or severity-moderate tokens', () => {
    const color = confidenceColorVar('low')!;
    expect(color).not.toContain('--severity-low');
    expect(color).not.toContain('--severity-moderate');
  });

  it('all non-null colors are valid rgb() expressions', () => {
    for (const level of ['high', 'moderate', 'low'] as const) {
      expect(confidenceColorVar(level)!).toMatch(/^rgb\(/);
    }
  });
});

// ---------------------------------------------------------------------------
// confidenceBodyLabel
// ---------------------------------------------------------------------------

describe('confidenceBodyLabel', () => {
  it('null -> null (UNKNOWN state has no label; RULE 9)', () => {
    expect(confidenceBodyLabel(null)).toBeNull();
  });

  it('high -> Measured (positive label affirming the reading)', () => {
    expect(confidenceBodyLabel('high')).toBe('Measured');
  });

  it('moderate -> Good estimate (positive framing)', () => {
    expect(confidenceBodyLabel('moderate')).toBe('Good estimate');
  });

  it('low -> Estimated (body-positive; not alarming)', () => {
    const label = confidenceBodyLabel('low')!;
    expect(label).toBe('Estimated');
  });

  it('low label does not contain alarming words (bad, poor, low confidence)', () => {
    const label = confidenceBodyLabel('low')!.toLowerCase();
    expect(label).not.toContain('bad');
    expect(label).not.toContain('poor');
    expect(label).not.toContain('low confidence');
    expect(label).not.toContain('inaccurate');
  });

  it('all labels are non-empty strings', () => {
    for (const level of ['high', 'moderate', 'low'] as const) {
      expect(typeof confidenceBodyLabel(level)).toBe('string');
      expect((confidenceBodyLabel(level) as string).length).toBeGreaterThan(0);
    }
  });
});
