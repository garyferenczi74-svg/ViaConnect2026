/**
 * Tests for pregnancyMode.ts (Prompt 211b W4a).
 *
 * TDD contracts:
 *   1. isPregnancyModeActive: true for pregnant/lactating/breastfeeding/nursing
 *      (case-insensitive), false for null, empty, or unrelated status.
 *   2. getCompositionGating: active -> compositionSuppressed true, reason
 *      populated with supportive copy.
 *   3. getCompositionGating: inactive -> compositionSuppressed false, reason null.
 *   4. Girth measurements are never referenced by the gating result (the
 *      result shape has no girth-suppression field; this documents the
 *      invariant so a future edit cannot silently add one without a test
 *      failure prompting review).
 */

import { describe, it, expect } from 'vitest';
import {
  isPregnancyModeActive,
  getCompositionGating,
  PREGNANCY_COMPOSITION_SUPPRESSED_COPY,
  type PregnancyModeHealthContext,
} from '../pregnancyMode';

describe('isPregnancyModeActive', () => {
  it('is true for pregnancyStatus "pregnant"', () => {
    expect(isPregnancyModeActive({ pregnancyStatus: 'pregnant' })).toBe(true);
  });

  it('is true for pregnancyStatus "lactating" case-insensitively', () => {
    expect(isPregnancyModeActive({ pregnancyStatus: 'Lactating' })).toBe(true);
  });

  it('is true for pregnancyStatus "breastfeeding"', () => {
    expect(isPregnancyModeActive({ pregnancyStatus: 'breastfeeding' })).toBe(true);
  });

  it('is true for pregnancyStatus "nursing"', () => {
    expect(isPregnancyModeActive({ pregnancyStatus: 'currently nursing' })).toBe(true);
  });

  it('is false for null pregnancyStatus', () => {
    expect(isPregnancyModeActive({ pregnancyStatus: null })).toBe(false);
  });

  it('is false for an unrelated pregnancyStatus value', () => {
    expect(isPregnancyModeActive({ pregnancyStatus: 'trying to conceive' })).toBe(false);
  });

  it('is false for an empty string', () => {
    expect(isPregnancyModeActive({ pregnancyStatus: '' })).toBe(false);
  });
});

describe('getCompositionGating', () => {
  it('suppresses composition with supportive copy when pregnancy mode is active', () => {
    const ctx: PregnancyModeHealthContext = { pregnancyStatus: 'pregnant' };
    const result = getCompositionGating(ctx);
    expect(result.compositionSuppressed).toBe(true);
    expect(result.reason).toBe(PREGNANCY_COMPOSITION_SUPPRESSED_COPY);
  });

  it('does not suppress composition when pregnancy mode is inactive', () => {
    const ctx: PregnancyModeHealthContext = { pregnancyStatus: null };
    const result = getCompositionGating(ctx);
    expect(result.compositionSuppressed).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('the gating result shape has no girth-suppression field (girth is never gated by this service)', () => {
    const result = getCompositionGating({ pregnancyStatus: 'pregnant' });
    expect(Object.keys(result).sort()).toEqual(['compositionSuppressed', 'reason']);
  });
});
