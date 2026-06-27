// Prompt 210b P5-T1c: TDD tests for FutureSelfPanel (written before implementation).
//
// Coverage:
//   1. computeWeekSummary pure function: all gate branches + formula.
//   2. FutureSelfPanelContent render: projected, disabled no-goal, disabled
//      no-current-scan, loading.
//   3. Default OFF: ghost toggle shows aria-pressed=false initially.
//   4. Toggle state: aria-pressed reflects showGhost prop.
//   5. Honesty invariant: no fabricated ghost/vector in disabled states.
//   6. P5-T2 segmental note: always present (in all non-loading states).
//   7. No em/en dashes in any output state (standing rule).
//   8. Reduced-motion parity: loading skeleton respects reducedMotion prop.
//
// Node harness; renderToStaticMarkup (same pattern as GeneticsOverlay.test.ts).
// No DOM reconciler, no @testing-library/dom.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  computeWeekSummary,
  FutureSelfPanelContent,
} from '../FutureSelfPanel';
import type { FutureSelfPanelContentProps, WeekSummary } from '../FutureSelfPanel';
import type { FutureSelfProjection } from '@/lib/formavision/projection/projectFutureSelfVector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_VECTOR = {
  sex: 'male' as const,
  heightM: 1.75,
  rings: [],
  arms: [],
};

const PROJECTED: FutureSelfProjection = {
  kind: 'projected',
  vector: MOCK_VECTOR,
  bfDelta: -5,
  projectedBodyFatPct: 15,
};

const DISABLED_NO_GOAL: FutureSelfProjection = {
  kind: 'disabled',
  reason: 'no-goal',
};

const DISABLED_NO_SCAN: FutureSelfProjection = {
  kind: 'disabled',
  reason: 'no-current-scan',
};

const WEEK_SUMMARY: WeekSummary = {
  weeksToGoal: 23,
  estimatedDate: '2027-01-15',
  assumptionsNote: 'Projection assumes consistent protocol adherence and 0.45 kg per week.',
};

function render(props: FutureSelfPanelContentProps): string {
  return renderToStaticMarkup(
    React.createElement(FutureSelfPanelContent, props),
  );
}

// ---------------------------------------------------------------------------
// 1. computeWeekSummary: null-gate and formula
// ---------------------------------------------------------------------------

describe('computeWeekSummary: null-gate', () => {
  it('all null -> null', () => {
    expect(computeWeekSummary(null, null, null)).toBeNull();
  });
  it('currentWeightKg null -> null', () => {
    expect(computeWeekSummary(null, 75, 20)).toBeNull();
  });
  it('goalWeightKg null -> null', () => {
    expect(computeWeekSummary(85, null, 20)).toBeNull();
  });
  it('goalBodyFatPct null -> null (no date without goal BF)', () => {
    expect(computeWeekSummary(85, 75, null)).toBeNull();
  });
});

describe('computeWeekSummary: formula (mirrors futureMeProjector.WEEKLY_FAT_LOSS_KG = 0.45)', () => {
  it('all present -> non-null WeekSummary', () => {
    const result = computeWeekSummary(85, 75, 20);
    expect(result).not.toBeNull();
  });
  it('10 kg delta at 0.45 kg/week -> ceiling(10/0.45) = 23 weeks', () => {
    // 10 / 0.45 = 22.22... -> ceiling = 23
    const result = computeWeekSummary(85, 75, 20);
    expect(result!.weeksToGoal).toBe(23);
  });
  it('delta = 0 -> at least 1 week (floor)', () => {
    const result = computeWeekSummary(75, 75, 20);
    expect(result!.weeksToGoal).toBe(1);
  });
  it('estimatedDate is a YYYY-MM-DD string', () => {
    const result = computeWeekSummary(85, 75, 20);
    expect(result!.estimatedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('assumptionsNote references 0.45 kg rate (consistent with futureMeProjector)', () => {
    const result = computeWeekSummary(85, 75, 20);
    expect(result!.assumptionsNote).toContain('0.45');
  });
  it('assumptionsNote is non-trivially long', () => {
    const result = computeWeekSummary(85, 75, 20);
    expect(result!.assumptionsNote.length).toBeGreaterThan(20);
  });
});

// ---------------------------------------------------------------------------
// 2. FutureSelfPanelContent: loading state (projection === null)
// ---------------------------------------------------------------------------

describe('FutureSelfPanelContent: loading state', () => {
  it('renders loading skeleton with data-testid', () => {
    const html = render({ projection: null, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-loading"');
  });
  it('loading skeleton has aria-busy="true"', () => {
    const html = render({ projection: null, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('aria-busy="true"');
  });
  it('loading state does not render toggle or CTA', () => {
    const html = render({ projection: null, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).not.toContain('future-self-toggle');
    expect(html).not.toContain('future-self-goal-cta');
    expect(html).not.toContain('future-self-panel');
  });
});

// ---------------------------------------------------------------------------
// 3. FutureSelfPanelContent: projected state - default OFF + toggle state
// ---------------------------------------------------------------------------

describe('FutureSelfPanelContent: projected state (ghost enabled)', () => {
  it('renders panel testid', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-panel"');
  });

  it('toggle button is present and not disabled when projected', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-toggle"');
    // The enabled toggle must NOT be the disabled one
    expect(html).not.toContain('data-testid="future-self-toggle-disabled"');
  });

  it('default OFF: toggle has aria-pressed="false"', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('aria-pressed="false"');
  });

  it('showGhost=true: toggle has aria-pressed="true"', () => {
    const html = render({ projection: PROJECTED, showGhost: true, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('aria-pressed="true"');
  });

  it('shows "Projected Self" heading', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('Projected Self');
  });

  it('shows estimate disclaimer (honesty marker)', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-estimate-label"');
    expect(html.toLowerCase()).toContain('estimate');
  });

  it('includes "not a guarantee" honesty copy', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html.toLowerCase()).toContain('not a guarantee');
  });

  it('does not show disabled states in projected state', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).not.toContain('future-self-no-goal');
    expect(html).not.toContain('future-self-no-scan');
  });

  it('week summary absent when weekSummary is null', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).not.toContain('future-self-weeks');
  });

  it('week summary shown when weekSummary is provided', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: WEEK_SUMMARY });
    expect(html).toContain('data-testid="future-self-weeks"');
    expect(html).toContain('23');
    expect(html).toContain('2027-01-15');
  });

  it('assumptions note shown when weekSummary is provided', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: WEEK_SUMMARY });
    expect(html).toContain('data-testid="future-self-assumptions-note"');
    expect(html).toContain('0.45');
  });
});

// ---------------------------------------------------------------------------
// 4. FutureSelfPanelContent: disabled no-goal state
// ---------------------------------------------------------------------------

describe('FutureSelfPanelContent: disabled no-goal state', () => {
  it('shows no-goal testid', () => {
    const html = render({ projection: DISABLED_NO_GOAL, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-no-goal"');
  });

  it('shows goal CTA link data-testid', () => {
    const html = render({ projection: DISABLED_NO_GOAL, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-goal-cta"');
  });

  it('CTA links to /body-tracker/progress (existing goal surface)', () => {
    const html = render({ projection: DISABLED_NO_GOAL, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('/body-tracker/progress');
  });

  it('toggle is disabled (aria-disabled + disabled attr)', () => {
    const html = render({ projection: DISABLED_NO_GOAL, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-toggle-disabled"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('disabled');
  });

  it('enabled toggle is absent in no-goal state', () => {
    const html = render({ projection: DISABLED_NO_GOAL, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).not.toContain('data-testid="future-self-toggle"');
  });

  it('does not show no-scan state alongside no-goal', () => {
    const html = render({ projection: DISABLED_NO_GOAL, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).not.toContain('future-self-no-scan');
  });

  it('no-fabrication contract: a disabled state never surfaces an active ghost toggle, even with a stale showGhost=true', () => {
    // The real no-fabrication guarantee at the content layer: a disabled
    // projection must NOT render an interactive, "ghost is on" affordance.
    // We feed an inconsistent showGhost=true to prove the disabled branch
    // ignores it and never presents an enabled / pressed ghost control.
    const html = render({ projection: DISABLED_NO_GOAL, showGhost: true, onToggle: () => {}, weekSummary: null });
    // No active/pressed ghost toggle can appear in a disabled state.
    expect(html).not.toContain('aria-pressed="true"');
    // The interactive (enabled) toggle is absent; only the disabled affordance exists.
    expect(html).not.toContain('data-testid="future-self-toggle"');
    expect(html).toContain('data-testid="future-self-toggle-disabled"');
    // The sole toggle carries the disabled attribute, so it cannot be clicked
    // to reveal a ghost. (Belt-and-suspenders: it is also aria-disabled.)
    expect(html).toContain('disabled');
    expect(html).toContain('aria-disabled="true"');
  });
});

// ---------------------------------------------------------------------------
// 5. FutureSelfPanelContent: disabled no-current-scan state
// ---------------------------------------------------------------------------

describe('FutureSelfPanelContent: disabled no-current-scan state', () => {
  it('shows no-scan testid', () => {
    const html = render({ projection: DISABLED_NO_SCAN, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-no-scan"');
  });

  it('communicates scan requirement to user', () => {
    const html = render({ projection: DISABLED_NO_SCAN, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html.toLowerCase()).toContain('scan');
  });

  it('toggle is disabled in no-scan state', () => {
    const html = render({ projection: DISABLED_NO_SCAN, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).toContain('data-testid="future-self-toggle-disabled"');
    expect(html).toContain('aria-disabled="true"');
  });

  it('does not show goal CTA in no-scan state', () => {
    const html = render({ projection: DISABLED_NO_SCAN, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).not.toContain('future-self-no-goal');
    expect(html).not.toContain('future-self-goal-cta');
  });
});

// ---------------------------------------------------------------------------
// 6. P5-T2: segmental-fat note always honest-disabled (all non-loading states)
// ---------------------------------------------------------------------------

describe('FutureSelfPanelContent: P5-T2 segmental note always present', () => {
  const NON_LOADING: FutureSelfProjection[] = [PROJECTED, DISABLED_NO_GOAL, DISABLED_NO_SCAN];

  for (const projection of NON_LOADING) {
    const label = projection.kind === 'disabled' ? `${projection.kind}/${projection.reason}` : projection.kind;
    it(`segmental note present in state "${label}"`, () => {
      const html = render({ projection, showGhost: false, onToggle: () => {}, weekSummary: null });
      expect(html).toContain('data-testid="future-self-segmental-note"');
    });
  }

  it('segmental note communicates that per-region future body fat is not projected', () => {
    const html = render({ projection: PROJECTED, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html.toLowerCase()).toContain('per-region');
    expect(html.toLowerCase()).toContain('not projected');
  });

  it('loading skeleton does NOT show the segmental note (skeleton only)', () => {
    const html = render({ projection: null, showGhost: false, onToggle: () => {}, weekSummary: null });
    expect(html).not.toContain('future-self-segmental-note');
  });
});

// ---------------------------------------------------------------------------
// 7. No em/en dashes in any rendered output (standing rule)
// ---------------------------------------------------------------------------

describe('FutureSelfPanelContent: no em/en dashes (standing rule)', () => {
  // U+2013 = en-dash, U+2014 = em-dash. Constructed at runtime via charCodeAt so
  // the source file contains no literal Unicode bytes that would trip the commit hook.
  const EN_DASH = String.fromCharCode(0x2013);
  const EM_DASH = String.fromCharCode(0x2014);

  const ALL_PROJECTIONS: Array<FutureSelfProjection | null> = [
    null,
    PROJECTED,
    DISABLED_NO_GOAL,
    DISABLED_NO_SCAN,
  ];

  for (const projection of ALL_PROJECTIONS) {
    const label = projection === null
      ? 'loading'
      : (projection.kind === 'disabled' ? `${projection.kind}/${projection.reason}` : projection.kind);
    it(`no em/en dashes in "${label}" state`, () => {
      const html = render({ projection, showGhost: false, onToggle: () => {}, weekSummary: null });
      expect(html).not.toContain(EN_DASH);
      expect(html).not.toContain(EM_DASH);
      expect(html).not.toContain('&ndash;');
      expect(html).not.toContain('&mdash;');
    });
  }
});

// ---------------------------------------------------------------------------
// 8. Reduced-motion parity on the loading skeleton
// ---------------------------------------------------------------------------

describe('FutureSelfPanelContent: reduced-motion parity', () => {
  it('reducedMotion=true: no animate-pulse on loading skeleton', () => {
    const html = render({ projection: null, showGhost: false, onToggle: () => {}, weekSummary: null, reducedMotion: true });
    expect(html).not.toContain('animate-pulse');
  });
  it('reducedMotion=false (default): animate-pulse is guarded by motion-safe: prefix', () => {
    const html = render({ projection: null, showGhost: false, onToggle: () => {}, weekSummary: null, reducedMotion: false });
    // The pulse class should be motion-safe:animate-pulse (media-query gated) not bare animate-pulse.
    // Strip motion-safe:animate-pulse, then confirm bare animate-pulse is absent.
    const stripped = html.replace(/motion-safe:animate-pulse/g, '');
    expect(stripped).not.toContain('animate-pulse');
  });
});
