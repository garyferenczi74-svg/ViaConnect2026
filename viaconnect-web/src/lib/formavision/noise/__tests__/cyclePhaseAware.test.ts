/**
 * Tests for cyclePhaseAware.ts (Prompt 211b W4a).
 *
 * TDD contracts:
 *   1. opt_in false -> base classification returned unchanged, isPhaseTypical false.
 *   2. phase null / 'unknown' -> unchanged.
 *   3. phase-typical (luteal/menstrual, waist/hip, MEANINGFUL, worsened) ->
 *      labeled context, classification and delta untouched.
 *   4. non-water-retention phase (follicular/ovulatory) -> unchanged.
 *   5. non-bloat-prone key (e.g. neck) -> unchanged even in luteal phase.
 *   6. WITHIN_NOISE base -> never labeled phase-typical (already reads as no change).
 *   7. direction 'improved' (a girth decrease) -> never labeled phase-typical.
 */

import { describe, it, expect } from 'vitest';
import { applyCyclePhaseAwareness, type CyclePhaseAwareContext } from '../cyclePhaseAware';
import type { CircumferenceNoiseResult } from '../noiseDeltaClassifier';
import type { CircumferenceDelta } from '@/lib/formavision/deltas/compositionDeltas';

function circDelta(
  key: CircumferenceDelta['key'],
  label: string,
  from: number,
  to: number,
  direction: CircumferenceDelta['direction'],
): CircumferenceDelta {
  return { key, label, from, to, delta: to - from, unit: 'in', direction };
}

function meaningfulWaistResult(direction: CircumferenceDelta['direction'] = 'worsened'): CircumferenceNoiseResult {
  return {
    delta: circDelta('waist', 'Waist', 30, 31, direction),
    classification: 'MEANINGFUL',
    mdc95: 0.5,
  };
}

describe('applyCyclePhaseAwareness', () => {
  it('returns base classification unchanged when opt_in is false', () => {
    const base = meaningfulWaistResult();
    const cycle: CyclePhaseAwareContext = { optIn: false, phase: 'luteal' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.classification).toBe('MEANINGFUL');
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  it('returns base classification unchanged when phase is null', () => {
    const base = meaningfulWaistResult();
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: null };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.classification).toBe('MEANINGFUL');
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  it('returns base classification unchanged when phase is unknown', () => {
    const base = meaningfulWaistResult();
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'unknown' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.classification).toBe('MEANINGFUL');
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  it('labels phase-typical context for a MEANINGFUL waist increase in luteal phase, data preserved', () => {
    const base = meaningfulWaistResult('worsened');
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'luteal' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.classification).toBe('MEANINGFUL');
    expect(result.isPhaseTypical).toBe(true);
    expect(result.phaseContextCopy).toContain('typical for your current cycle phase');
    // Underlying delta untouched.
    expect(base.delta.from).toBe(30);
    expect(base.delta.to).toBe(31);
    expect(base.delta.direction).toBe('worsened');
  });

  it('labels phase-typical context for a MEANINGFUL hip increase in menstrual phase', () => {
    const base: CircumferenceNoiseResult = {
      delta: circDelta('hip', 'Hip', 38, 39, 'worsened'),
      classification: 'MEANINGFUL',
      mdc95: 0.5,
    };
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'menstrual' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.isPhaseTypical).toBe(true);
    expect(result.phaseContextCopy).not.toBeNull();
  });

  it('does not label phase context outside water-retention phases (follicular)', () => {
    const base = meaningfulWaistResult('worsened');
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'follicular' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  it('does not label phase context outside water-retention phases (ovulatory)', () => {
    const base = meaningfulWaistResult('worsened');
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'ovulatory' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  it('does not label a non-bloat-prone key (neck) even in luteal phase', () => {
    const base: CircumferenceNoiseResult = {
      delta: circDelta('neck', 'Neck', 14, 14.5, 'worsened'),
      classification: 'MEANINGFUL',
      mdc95: 0.3,
    };
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'luteal' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  it('never labels phase context on a WITHIN_NOISE classification', () => {
    const base: CircumferenceNoiseResult = {
      delta: circDelta('waist', 'Waist', 30, 30.1, 'worsened'),
      classification: 'WITHIN_NOISE',
      mdc95: 0.5,
    };
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'luteal' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.classification).toBe('WITHIN_NOISE');
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  it('never labels phase context on a null (UNKNOWN) classification', () => {
    const base: CircumferenceNoiseResult = {
      delta: circDelta('waist', 'Waist', 30, 31, 'worsened'),
      classification: null,
      mdc95: null,
    };
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'luteal' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.classification).toBeNull();
    expect(result.isPhaseTypical).toBe(false);
  });

  it('never labels phase context on an improved (decrease) direction', () => {
    const base = meaningfulWaistResult('improved');
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'luteal' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.isPhaseTypical).toBe(false);
    expect(result.phaseContextCopy).toBeNull();
  });

  // Task 211b-W4b STEP 0 review nits (folded in before wiring this copy to UI).
  it('STEP 0a: uses "can be typical" (softened, no causal over-attribution), not "is typical"', () => {
    const base = meaningfulWaistResult('worsened');
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'luteal' };
    const result = applyCyclePhaseAwareness(base, cycle);
    expect(result.phaseContextCopy).toContain('can be typical for your current cycle phase');
    expect(result.phaseContextCopy).not.toContain('is typical for your current cycle phase');
  });

  it('STEP 0b: phaseContextCopy (which interpolates delta.label) never contains an em or en dash, for waist or hip', () => {
    const EM_DASH = String.fromCharCode(0x2014);
    const EN_DASH = String.fromCharCode(0x2013);
    const cycle: CyclePhaseAwareContext = { optIn: true, phase: 'luteal' };
    const waist = applyCyclePhaseAwareness(meaningfulWaistResult('worsened'), cycle);
    const hip = applyCyclePhaseAwareness(
      { delta: circDelta('hip', 'Hip', 38, 39, 'worsened'), classification: 'MEANINGFUL', mdc95: 0.5 },
      cycle,
    );
    for (const copy of [waist.phaseContextCopy, hip.phaseContextCopy]) {
      expect(copy).not.toBeNull();
      expect((copy as string).includes(EM_DASH)).toBe(false);
      expect((copy as string).includes(EN_DASH)).toBe(false);
    }
  });
});
