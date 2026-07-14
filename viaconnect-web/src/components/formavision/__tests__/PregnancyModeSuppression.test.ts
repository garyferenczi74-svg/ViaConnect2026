/**
 * Task 211b-W4b: SAFETY-CRITICAL pregnancy-mode composition-suppression wiring.
 *
 * TDD contract (from the task brief):
 *   1. pregnancy inactive -> nothing suppressed (BodyFatReadout, NotableChanges
 *      headline, FutureSelfPanel all render exactly as before).
 *   2. pregnancy active -> every composition ESTIMATE surface suppressed
 *      (BodyFatReadout figure/delta, NotableChanges headline, FutureSelfPanel)
 *      AND girth MEASUREMENTS keep rendering (NotableChanges circumference rows)
 *      AND the composition-estimate function (projectFutureSelfVector) is
 *      NEVER called while suppressed.
 *   3. No numeric precision figure is introduced by any suppressed-state copy.
 *   4. getCompositionGating (the APPROVED W4a service) is the single decision
 *      source; this file never re-derives suppression logic itself.
 *
 * Uses renderToStaticMarkup (no DOM/JSDOM, no @testing-library). useMemo runs
 * synchronously during a function component's render pass even under
 * renderToStaticMarkup (only useEffect is skipped, since there is no commit
 * phase), so mocking the goal hooks to a non-loading state lets us prove the
 * projectFutureSelfVector call-count directly.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyFatReadout } from '../BodyFatReadout';
import { NotableChanges } from '../NotableChanges';
import { FutureSelfPanel } from '../FutureSelfPanel';
import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
import { getCompositionGating } from '@/lib/formavision/pregnancy/pregnancyMode';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';

// vi.mock calls are hoisted by vitest above every import in this file
// (including the static `import { FutureSelfPanel } from '../FutureSelfPanel'`
// above), so FutureSelfPanel's internal hook + projection imports resolve to
// these mocks even though this block appears after the imports in source order.
const projectFutureSelfVectorMock = vi.fn();

vi.mock('@/lib/formavision/projection/projectFutureSelfVector', () => ({
  projectFutureSelfVector: (...args: unknown[]) => projectFutureSelfVectorMock(...args),
}));

vi.mock('@/hooks/journey/useActiveBodyGoal', () => ({
  useActiveBodyGoal: () => ({
    goal: { goal_bodyfat_pct: 18 },
    goalLabel: 'Reach a lighter weight',
    loading: false,
  }),
}));

vi.mock('@/hooks/useWeightGoalKg', () => ({
  useWeightGoalKg: () => ({ goalWeightKg: 70, currentWeightKg: 80, loading: false }),
}));

function snapshot(over: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'e',
    source: 'scan',
    recordedAt: '2026-01-01T00:00:00Z',
    totalBodyFatPct: null,
    regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    ...over,
  };
}

function circ(over: Partial<CircumferenceMeasurements> = {}): CircumferenceMeasurements {
  return { ...emptyMeasurements(), ...over };
}

const DIGIT = /\d/;

// Extracts visible text nodes only (never SVG path/attribute data, which
// legitimately contains digits, e.g. the Heart icon's path coordinates).
function visibleTextNodes(html: string): string[] {
  const out: string[] = [];
  const re = />([^<>]+)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].trim();
    if (text.length > 0) out.push(text);
  }
  return out;
}

// ---------------------------------------------------------------------------
// getCompositionGating: the single decision source (sanity, not re-derivation)
// ---------------------------------------------------------------------------

describe('getCompositionGating (APPROVED W4a service, consumed unmodified)', () => {
  it('pregnancy inactive -> compositionSuppressed false, reason null', () => {
    const gating = getCompositionGating({ pregnancyStatus: null });
    expect(gating.compositionSuppressed).toBe(false);
    expect(gating.reason).toBeNull();
  });

  it('pregnancy active -> compositionSuppressed true, reason present', () => {
    const gating = getCompositionGating({ pregnancyStatus: 'pregnant' });
    expect(gating.compositionSuppressed).toBe(true);
    expect(gating.reason).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BodyFatReadout: composition-estimate surface (SAFETY-CRITICAL)
// ---------------------------------------------------------------------------

describe('BodyFatReadout: pregnancy-mode suppression', () => {
  const deltas = computeCompositionDeltas({
    firstComposition: snapshot({ totalBodyFatPct: 28 }),
    latestComposition: snapshot({ totalBodyFatPct: 24 }),
    firstCircumferences: null,
    latestCircumferences: null,
    unit: 'in',
  });

  it('pregnancy inactive: renders exactly as before (nothing suppressed)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: deltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        compositionSuppressed: false,
      }),
    );
    expect(html).toContain('body-fat-figure');
    expect(html).toContain('24.0%');
    expect(html).not.toContain('body-fat-composition-suppressed');
  });

  it('pregnancy active: suppresses the figure and delta entirely, shows supportive copy', () => {
    const gating = getCompositionGating({ pregnancyStatus: 'pregnant' });
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: deltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        compositionSuppressed: gating.compositionSuppressed,
        suppressedCopy: gating.reason,
      }),
    );
    expect(html).toContain('body-fat-composition-suppressed');
    expect(html).not.toContain('body-fat-figure');
    expect(html).not.toContain('24.0%');
    expect(html).not.toContain('body-fat-delta');
  });

  it('suppressed copy introduces no new numeric precision figure', () => {
    const gating = getCompositionGating({ pregnancyStatus: 'lactating' });
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: deltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        compositionSuppressed: gating.compositionSuppressed,
        suppressedCopy: gating.reason,
      }),
    );
    for (const text of visibleTextNodes(html)) {
      expect(text).not.toMatch(DIGIT);
    }
  });
});

// ---------------------------------------------------------------------------
// NotableChanges: composition headline suppressed, girth ROWS always render
// ---------------------------------------------------------------------------

describe('NotableChanges: pregnancy-mode suppression (headline only, rows always keep rendering)', () => {
  const bodyFatBiggest = computeCompositionDeltas({
    firstComposition: snapshot({ totalBodyFatPct: 28 }),
    latestComposition: snapshot({ totalBodyFatPct: 20 }), // big body-fat delta -> headline about body fat
    firstCircumferences: circ({ waist: 36 }),
    latestCircumferences: circ({ waist: 35 }), // small girth delta so bodyFat wins "biggest"
    unit: 'in',
  });

  it('pregnancy inactive: headline renders exactly as before', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas: bodyFatBiggest,
        compositionSuppressed: false,
      }),
    );
    expect(html).toContain('notable-changes-headline');
    expect(html).not.toContain('notable-changes-composition-suppressed');
  });

  it('pregnancy active: headline suppressed with supportive copy, girth rows still render', () => {
    const gating = getCompositionGating({ pregnancyStatus: 'pregnant' });
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas: bodyFatBiggest,
        compositionSuppressed: gating.compositionSuppressed,
        suppressedCopy: gating.reason,
      }),
    );
    expect(html).toContain('notable-changes-composition-suppressed');
    expect(html).not.toContain('notable-changes-headline');
    // Girth MEASUREMENT row (waist) is unaffected and keeps rendering.
    expect(html).toContain('notable-row-waist');
  });

  it('pregnancy active with only girth data (no body-fat delta): rows still render, no headline, no crash', () => {
    const girthOnly = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: circ({ waist: 36, chest: 42 }),
      latestCircumferences: circ({ waist: 34, chest: 40 }),
      unit: 'in',
    });
    const gating = getCompositionGating({ pregnancyStatus: 'pregnant' });
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas: girthOnly,
        compositionSuppressed: gating.compositionSuppressed,
        suppressedCopy: gating.reason,
      }),
    );
    expect(html).toContain('notable-row-waist');
    expect(html).toContain('notable-row-chest');
    expect(html).not.toContain('notable-changes-headline');
  });
});

// ---------------------------------------------------------------------------
// FutureSelfPanel: SAFETY-CRITICAL -- the estimate function is never CALLED,
// not merely hidden from the output, while suppressed.
// ---------------------------------------------------------------------------

describe('FutureSelfPanel: pregnancy-mode suppression (never calls projectFutureSelfVector)', () => {
  const baseProps = {
    snapshot: snapshot({ totalBodyFatPct: 28 }),
    circumferences: circ({ waist: 36 }),
    sex: 'male' as const,
    unit: 'in' as const,
    userId: 'user-1',
    onGhostChange: () => {},
  };

  it('pregnancy inactive: calls projectFutureSelfVector as before (sanity check on the mock/harness)', () => {
    projectFutureSelfVectorMock.mockClear();
    projectFutureSelfVectorMock.mockReturnValue({
      kind: 'projected',
      vector: { sex: 'male', heightM: 1.75, rings: [], arms: [] },
      bfDelta: -5,
      projectedBodyFatPct: 15,
    });
    renderToStaticMarkup(React.createElement(FutureSelfPanel, { ...baseProps, suppressed: false }));
    expect(projectFutureSelfVectorMock).toHaveBeenCalledTimes(1);
  });

  it('pregnancy active: NEVER calls projectFutureSelfVector, renders supportive copy instead', () => {
    projectFutureSelfVectorMock.mockClear();
    const gating = getCompositionGating({ pregnancyStatus: 'pregnant' });
    const html = renderToStaticMarkup(
      React.createElement(FutureSelfPanel, {
        ...baseProps,
        suppressed: gating.compositionSuppressed,
        suppressedCopy: gating.reason,
      }),
    );
    expect(projectFutureSelfVectorMock).not.toHaveBeenCalled();
    expect(html).toContain('future-self-suppressed');
    expect(html).not.toContain('future-self-panel');
    expect(html).not.toContain('future-self-toggle');
  });

  it('suppressed FutureSelfPanel copy introduces no new numeric precision figure', () => {
    projectFutureSelfVectorMock.mockClear();
    const gating = getCompositionGating({ pregnancyStatus: 'lactating' });
    const html = renderToStaticMarkup(
      React.createElement(FutureSelfPanel, {
        ...baseProps,
        suppressed: gating.compositionSuppressed,
        suppressedCopy: gating.reason,
      }),
    );
    for (const text of visibleTextNodes(html)) {
      expect(text).not.toMatch(DIGIT);
    }
  });
});

// ---------------------------------------------------------------------------
// No em/en dashes in any suppressed-state copy (standing rule)
// ---------------------------------------------------------------------------

describe('pregnancy-mode suppressed copy: no em/en dashes', () => {
  const EM_DASH = String.fromCharCode(0x2014);
  const EN_DASH = String.fromCharCode(0x2013);

  it('sweeps BodyFatReadout, NotableChanges, and FutureSelfPanel suppressed states', () => {
    const gating = getCompositionGating({ pregnancyStatus: 'pregnant' });
    projectFutureSelfVectorMock.mockClear();

    const deltas = computeCompositionDeltas({
      firstComposition: snapshot({ totalBodyFatPct: 28 }),
      latestComposition: snapshot({ totalBodyFatPct: 24 }),
      firstCircumferences: circ({ waist: 36 }),
      latestCircumferences: circ({ waist: 34 }),
      unit: 'in',
    });

    const surfaces = [
      renderToStaticMarkup(
        React.createElement(BodyFatReadout, {
          latestBodyFatPct: 24,
          bodyFat: deltas.bodyFat,
          firstScanDate: null,
          latestScanDate: null,
          compositionSuppressed: true,
          suppressedCopy: gating.reason,
        }),
      ),
      renderToStaticMarkup(
        React.createElement(NotableChanges, {
          deltas,
          compositionSuppressed: true,
          suppressedCopy: gating.reason,
        }),
      ),
      renderToStaticMarkup(
        React.createElement(FutureSelfPanel, {
          snapshot: snapshot({ totalBodyFatPct: 28 }),
          circumferences: circ({ waist: 36 }),
          sex: 'male' as const,
          unit: 'in' as const,
          userId: 'user-1',
          onGhostChange: () => {},
          suppressed: true,
          suppressedCopy: gating.reason,
        }),
      ),
    ];

    for (const html of surfaces) {
      expect(html.includes(EM_DASH)).toBe(false);
      expect(html.includes(EN_DASH)).toBe(false);
    }
  });
});
