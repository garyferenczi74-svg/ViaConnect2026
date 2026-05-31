// Tests for the cross-view clothing-tightness decision (Prompt #169d section 2.5)
// and the capture pose-count selection (Prompt #169e section 3.1).
//
// THE CROSS-VIEW RULE:
//   The four-view capture (front, back, left, right) is rejected as a WHOLE if
//   ANY single view's clothing-tightness ratio EXCEEDS the ceiling (1.18). One
//   baggy view fails the set; the user must retake all four in consistent form
//   fitting clothing.
//
// BOUNDARY (locked here): the ceiling is a CLOSED upper bound, matching
// scoreClothingTightness exactly. A view AT 1.18 is ACCEPTABLE (it does not
// exceed the ceiling). A view STRICTLY ABOVE 1.18 fails. "Exceeds" is strict.
//
// Node-environment pure-logic test (project convention); no DOM, no Supabase.

import { describe, it, expect } from 'vitest';
import {
  evaluateCrossViewClothing,
  CLOTHING_TIGHTNESS_MAX_RATIO,
  CROSS_VIEW_CLOTHING_RETAKE_MESSAGE,
  type CrossViewClothingInput,
} from '@/lib/body-tracker/cross-view-clothing';
import {
  selectCapturePoseCount,
  FOUR_VIEW_POSE_COUNT,
} from '@/lib/body-tracker/capture-pose-count';
import { CLOTHING_TIGHTNESS_RANGE } from '@/lib/body-tracker/scan-constants';

// The four views, all comfortably within the acceptable band (midpoint 1.10).
function allViews(ratio: number): CrossViewClothingInput[] {
  return [
    { view: 'front', ratio },
    { view: 'back', ratio },
    { view: 'left', ratio },
    { view: 'right', ratio },
  ];
}

// ===========================================================================
// Ceiling constant wiring
// ===========================================================================

describe('cross-view clothing ceiling', () => {
  it('reuses the single CLOTHING_TIGHTNESS_RANGE.max source of truth (1.18)', () => {
    expect(CLOTHING_TIGHTNESS_MAX_RATIO).toBe(1.18);
    expect(CLOTHING_TIGHTNESS_MAX_RATIO).toBe(CLOTHING_TIGHTNESS_RANGE.max);
  });
});

// ===========================================================================
// Pass cases
// ===========================================================================

describe('evaluateCrossViewClothing: pass cases', () => {
  it('all four views well within the band -> pass, no failing views, no message', () => {
    const decision = evaluateCrossViewClothing(allViews(1.10));
    expect(decision.pass).toBe(true);
    expect(decision.failingViews).toEqual([]);
    expect(decision.retakeMessage).toBeNull();
    expect(decision.maxRatio).toBe(1.10);
  });

  it('empty input -> pass (nothing out of range to reject)', () => {
    const decision = evaluateCrossViewClothing([]);
    expect(decision.pass).toBe(true);
    expect(decision.failingViews).toEqual([]);
    expect(decision.maxRatio).toBe(0);
  });

  it('mixed but all in-range ratios -> pass; maxRatio is the largest observed', () => {
    const decision = evaluateCrossViewClothing([
      { view: 'front', ratio: 1.05 },
      { view: 'back', ratio: 1.17 },
      { view: 'left', ratio: 1.02 },
      { view: 'right', ratio: 1.12 },
    ]);
    expect(decision.pass).toBe(true);
    expect(decision.maxRatio).toBe(1.17);
  });
});

// ===========================================================================
// BOUNDARY: exactly 1.18 is acceptable (closed upper bound)
// ===========================================================================

describe('evaluateCrossViewClothing: boundary at exactly 1.18', () => {
  it('a view AT exactly 1.18 is ACCEPTABLE (does not exceed the ceiling)', () => {
    const decision = evaluateCrossViewClothing(allViews(1.18));
    expect(decision.pass).toBe(true);
    expect(decision.failingViews).toEqual([]);
    expect(decision.retakeMessage).toBeNull();
  });

  it('a view JUST above 1.18 fails (strict exceed)', () => {
    const decision = evaluateCrossViewClothing([
      { view: 'front', ratio: 1.18 },
      { view: 'back', ratio: 1.1801 },
      { view: 'left', ratio: 1.10 },
      { view: 'right', ratio: 1.05 },
    ]);
    expect(decision.pass).toBe(false);
    expect(decision.failingViews).toEqual(['back']);
  });
});

// ===========================================================================
// Reject cases: ANY single view over the ceiling fails the whole scan
// ===========================================================================

describe('evaluateCrossViewClothing: reject cases', () => {
  it('one baggy view (1.30) among three good -> whole scan rejected, that view flagged', () => {
    const decision = evaluateCrossViewClothing([
      { view: 'front', ratio: 1.10 },
      { view: 'back', ratio: 1.30 },
      { view: 'left', ratio: 1.08 },
      { view: 'right', ratio: 1.12 },
    ]);
    expect(decision.pass).toBe(false);
    expect(decision.failingViews).toEqual(['back']);
    expect(decision.retakeMessage).toBe(CROSS_VIEW_CLOTHING_RETAKE_MESSAGE);
    expect(decision.maxRatio).toBe(1.30);
  });

  it('multiple baggy views are all reported, in input order', () => {
    const decision = evaluateCrossViewClothing([
      { view: 'front', ratio: 1.40 },
      { view: 'back', ratio: 1.10 },
      { view: 'left', ratio: 1.25 },
      { view: 'right', ratio: 1.50 },
    ]);
    expect(decision.pass).toBe(false);
    expect(decision.failingViews).toEqual(['front', 'left', 'right']);
  });

  it('the retake message names all four views and form fitting clothing, ASCII only', () => {
    const decision = evaluateCrossViewClothing(allViews(1.5));
    expect(decision.retakeMessage).not.toBeNull();
    const msg = decision.retakeMessage as string;
    expect(msg).toContain('form fitting');
    expect(msg).toContain('all four photos');
    // No dashes / no non-ASCII glyphs in the user-facing copy.
    expect(msg).not.toMatch(/[-]/);
    // eslint-disable-next-line no-control-regex
    expect(msg).toMatch(/^[\x00-\x7F]*$/);
  });
});

// ===========================================================================
// Defensive: non-finite ratios are treated as failing (cannot confirm in-range)
// ===========================================================================

describe('evaluateCrossViewClothing: non-finite ratios', () => {
  it('a NaN ratio fails that view (we cannot confirm it is within range)', () => {
    const decision = evaluateCrossViewClothing([
      { view: 'front', ratio: 1.10 },
      { view: 'back', ratio: Number.NaN },
      { view: 'left', ratio: 1.10 },
      { view: 'right', ratio: 1.10 },
    ]);
    expect(decision.pass).toBe(false);
    expect(decision.failingViews).toEqual(['back']);
  });

  it('Infinity ratio fails that view and is excluded from maxRatio', () => {
    const decision = evaluateCrossViewClothing([
      { view: 'front', ratio: 1.12 },
      { view: 'back', ratio: Number.POSITIVE_INFINITY },
      { view: 'left', ratio: 1.05 },
      { view: 'right', ratio: 1.08 },
    ]);
    expect(decision.pass).toBe(false);
    expect(decision.failingViews).toEqual(['back']);
    // Infinity is not counted in maxRatio (finite-only).
    expect(decision.maxRatio).toBe(1.12);
  });
});

// ===========================================================================
// Custom ceiling override (kept consistent with the strict-exceed semantics)
// ===========================================================================

describe('evaluateCrossViewClothing: custom ceiling', () => {
  it('respects an injected ceiling with the same closed-upper-bound semantics', () => {
    // ceiling 1.05: 1.05 passes, 1.06 fails.
    const atCeiling = evaluateCrossViewClothing(allViews(1.05), { maxRatio: 1.05 });
    expect(atCeiling.pass).toBe(true);

    const overCeiling = evaluateCrossViewClothing(
      [
        { view: 'front', ratio: 1.06 },
        { view: 'back', ratio: 1.00 },
        { view: 'left', ratio: 1.00 },
        { view: 'right', ratio: 1.00 },
      ],
      { maxRatio: 1.05 },
    );
    expect(overCeiling.pass).toBe(false);
    expect(overCeiling.failingViews).toEqual(['front']);
  });
});

// ===========================================================================
// capture_pose_count value selection (#169e section 3.1)
// ===========================================================================

describe('selectCapturePoseCount', () => {
  it('four-view flow selects 4', () => {
    expect(selectCapturePoseCount('four_view')).toBe(4);
  });

  it('two-view flow selects 2', () => {
    expect(selectCapturePoseCount('two_view')).toBe(2);
  });

  it('FOUR_VIEW_POSE_COUNT is the constant the persist path uses', () => {
    expect(FOUR_VIEW_POSE_COUNT).toBe(4);
    expect(FOUR_VIEW_POSE_COUNT).toBe(selectCapturePoseCount('four_view'));
  });

  it('every selectable mode yields a value the schema CHECK allows (2 or 4)', () => {
    for (const mode of ['four_view', 'two_view'] as const) {
      expect([2, 4]).toContain(selectCapturePoseCount(mode));
    }
  });
});
