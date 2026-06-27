// Prompt 210b P6-T3: TDD tests for BOSMovementReadout (written before / alongside
// implementation per TDD discipline).
//
// Structure:
//   Part A: Pure logic tests (computeBOSMovement, movementLabel, formatMagnitude).
//           No JSX, no rendering, fast.
//   Part B: Component rendering tests (BOSMovementReadoutContent via
//           renderToStaticMarkup + React.createElement). Node harness only.
//
// Coverage:
//   1. score+baseline present -> correct direction + delta (up/down/steady)
//   2. score present, baseline null -> no-baseline state
//   3. score null -> no-score state (never 0)
//   4. movementLabel: "up N since baseline" / "down N since baseline" /
//      "holding steady since baseline"
//   5. "Bio Optimization Score" label verbatim in rendered output
//   6. no-score renders "will appear once computed" (never 0)
//   7. no-baseline: score shown, no movement delta, "baseline pending" note
//   8. ready+up: "up" + "since baseline" in rendered output
//   9. ready+down: "down" + "since baseline" in rendered output
//  10. ready+steady: "holding steady" + "since baseline" in rendered output
//  11. deterministic: same input -> same output
//  12. reduced-motion parity on loading skeleton
//  13. no em/en dashes in any output (standing rule)
//
// Node harness; uses renderToStaticMarkup (no @testing-library/dom required).

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  computeBOSMovement,
  movementLabel,
  formatMagnitude,
} from '@/lib/formavision/bos/bosMovement';
import type { BOSMovementState } from '@/lib/formavision/bos/bosMovement';
import { BOSMovementReadoutContent } from '../BOSMovementReadout';
import type { BOSMovementReadoutContentProps } from '../BOSMovementReadout';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(props: BOSMovementReadoutContentProps): string {
  return renderToStaticMarkup(React.createElement(BOSMovementReadoutContent, props));
}

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

// ---------------------------------------------------------------------------
// Part A: Pure logic tests
// ---------------------------------------------------------------------------

describe('computeBOSMovement: score + baseline present -> up', () => {
  it('score > baseline -> direction up, delta positive', () => {
    const result = computeBOSMovement(75, 60);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      expect(result.direction).toBe('up');
      expect(result.delta).toBe(15);
      expect(result.score).toBe(75);
      expect(result.baseline).toBe(60);
    }
  });

  it('score slightly above baseline -> direction up', () => {
    const result = computeBOSMovement(61, 60);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      expect(result.direction).toBe('up');
      expect(result.delta).toBeGreaterThan(0);
    }
  });
});

describe('computeBOSMovement: score + baseline present -> down', () => {
  it('score < baseline -> direction down, delta negative', () => {
    const result = computeBOSMovement(55, 70);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      expect(result.direction).toBe('down');
      expect(result.delta).toBe(-15);
      expect(result.score).toBe(55);
      expect(result.baseline).toBe(70);
    }
  });

  it('score slightly below baseline -> direction down', () => {
    const result = computeBOSMovement(59, 60);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      expect(result.direction).toBe('down');
      expect(result.delta).toBeLessThan(0);
    }
  });
});

describe('computeBOSMovement: score + baseline present -> steady', () => {
  it('score equals baseline -> direction steady, delta 0', () => {
    const result = computeBOSMovement(65, 65);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      expect(result.direction).toBe('steady');
      expect(result.delta).toBe(0);
    }
  });
});

describe('computeBOSMovement: floating point deltas', () => {
  it('fractional delta rounds to 1dp correctly', () => {
    const result = computeBOSMovement(72.5, 60);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      expect(result.delta).toBe(12.5);
      expect(result.direction).toBe('up');
    }
  });

  it('float noise is absorbed: 0.1+0.2 scenario does not create spurious non-zero', () => {
    // Score and baseline that would produce float drift without rounding
    const result = computeBOSMovement(60.3, 60.0);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') {
      // 60.3 - 60.0 = 0.2999... without rounding; rounded to 1dp = 0.3
      expect(result.delta).toBe(0.3);
      expect(result.direction).toBe('up');
    }
  });
});

describe('computeBOSMovement: score present, baseline null -> no-baseline', () => {
  it('returns no-baseline kind when baseline is null', () => {
    const result = computeBOSMovement(75, null);
    expect(result.kind).toBe('no-baseline');
    if (result.kind === 'no-baseline') {
      expect(result.score).toBe(75);
    }
  });

  it('no-baseline carries the score value, not 0', () => {
    const result = computeBOSMovement(42, null);
    expect(result.kind).toBe('no-baseline');
    if (result.kind === 'no-baseline') {
      expect(result.score).not.toBe(0);
      expect(result.score).toBe(42);
    }
  });
});

describe('computeBOSMovement: score null -> no-score', () => {
  it('returns no-score kind when score is null', () => {
    const result = computeBOSMovement(null, null);
    expect(result.kind).toBe('no-score');
  });

  it('returns no-score even if baseline is present', () => {
    const result = computeBOSMovement(null, 60);
    expect(result.kind).toBe('no-score');
  });

  it('no-score never fabricates a delta or score field', () => {
    const result = computeBOSMovement(null, null);
    expect(result.kind).toBe('no-score');
    // The no-score state has no score or delta property
    expect('score' in result).toBe(false);
    expect('delta' in result).toBe(false);
  });
});

describe('formatMagnitude', () => {
  it('integer delta -> no trailing zero', () => {
    expect(formatMagnitude(15)).toBe('15');
  });

  it('fractional delta -> one decimal place', () => {
    expect(formatMagnitude(3.5)).toBe('3.5');
  });

  it('negative delta -> returns positive magnitude', () => {
    expect(formatMagnitude(-12)).toBe('12');
  });

  it('zero -> "0"', () => {
    expect(formatMagnitude(0)).toBe('0');
  });
});

describe('movementLabel: "since baseline" framing', () => {
  const upState: Extract<BOSMovementState, { kind: 'ready' }> = {
    kind: 'ready', score: 75, baseline: 60, delta: 15, direction: 'up',
  };
  const downState: Extract<BOSMovementState, { kind: 'ready' }> = {
    kind: 'ready', score: 55, baseline: 70, delta: -15, direction: 'down',
  };
  const steadyState: Extract<BOSMovementState, { kind: 'ready' }> = {
    kind: 'ready', score: 65, baseline: 65, delta: 0, direction: 'steady',
  };

  it('up: contains "up" + magnitude + "since baseline"', () => {
    const label = movementLabel(upState);
    expect(label).toContain('up');
    expect(label).toContain('15');
    expect(label).toContain('since baseline');
  });

  it('up: does NOT say "this scan" or "per-scan"', () => {
    const label = movementLabel(upState);
    expect(label.toLowerCase()).not.toContain('this scan');
    expect(label.toLowerCase()).not.toContain('per-scan');
  });

  it('down: contains "down" + magnitude + "since baseline"', () => {
    const label = movementLabel(downState);
    expect(label).toContain('down');
    expect(label).toContain('15');
    expect(label).toContain('since baseline');
  });

  it('down: magnitude is positive even though delta is negative', () => {
    const label = movementLabel(downState);
    expect(label).not.toContain('-15');
    expect(label).toContain('15');
  });

  it('steady: contains "holding steady" + "since baseline"', () => {
    const label = movementLabel(steadyState);
    expect(label).toContain('holding steady');
    expect(label).toContain('since baseline');
  });

  it('no em/en dashes in any label', () => {
    expect(movementLabel(upState)).not.toContain(EN_DASH);
    expect(movementLabel(upState)).not.toContain(EM_DASH);
    expect(movementLabel(downState)).not.toContain(EN_DASH);
    expect(movementLabel(downState)).not.toContain(EM_DASH);
    expect(movementLabel(steadyState)).not.toContain(EN_DASH);
    expect(movementLabel(steadyState)).not.toContain(EM_DASH);
  });

  it('deterministic: same state -> same label', () => {
    expect(movementLabel(upState)).toBe(movementLabel(upState));
    expect(movementLabel(downState)).toBe(movementLabel(downState));
    expect(movementLabel(steadyState)).toBe(movementLabel(steadyState));
  });
});

// ---------------------------------------------------------------------------
// Part B: Component rendering tests
// ---------------------------------------------------------------------------

// Fixtures
const LOADING_STATE = 'loading' as const;

const NO_SCORE_STATE: BOSMovementState = { kind: 'no-score' };

const NO_BASELINE_STATE: BOSMovementState = { kind: 'no-baseline', score: 75 };
const NO_BASELINE_ZERO_SCORE: BOSMovementState = { kind: 'no-baseline', score: 0 };

const READY_UP: BOSMovementState = {
  kind: 'ready', score: 75, baseline: 60, delta: 15, direction: 'up',
};
const READY_DOWN: BOSMovementState = {
  kind: 'ready', score: 55, baseline: 70, delta: -15, direction: 'down',
};
const READY_STEADY: BOSMovementState = {
  kind: 'ready', score: 65, baseline: 65, delta: 0, direction: 'steady',
};

// ---------------------------------------------------------------------------
// 5. "Bio Optimization Score" label verbatim
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: "Bio Optimization Score" label verbatim', () => {
  const ALL_NON_LOADING_STATES: BOSMovementState[] = [
    NO_SCORE_STATE,
    NO_BASELINE_STATE,
    READY_UP,
    READY_DOWN,
    READY_STEADY,
  ];

  for (const state of ALL_NON_LOADING_STATES) {
    it(`renders "Bio Optimization Score" verbatim for state: ${state.kind}`, () => {
      const html = render({ state });
      expect(html).toContain('Bio Optimization Score');
    });
  }

  it('does not use an alternate name for the score', () => {
    const html = render({ state: READY_UP });
    // No alternate label allowed
    expect(html).not.toContain('BOS Score');
    expect(html).not.toContain('Optimization Index');
    expect(html).not.toContain('Health Score');
  });
});

// ---------------------------------------------------------------------------
// 6. no-score: "will appear once computed" (never 0)
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: no-score state', () => {
  it('renders no-score testid', () => {
    const html = render({ state: NO_SCORE_STATE });
    expect(html).toContain('data-testid="bos-movement-no-score"');
  });

  it('contains "will appear once computed"', () => {
    const html = render({ state: NO_SCORE_STATE });
    expect(html.toLowerCase()).toContain('will appear once computed');
  });

  it('does not show "0" as a score value when score is null', () => {
    const html = render({ state: NO_SCORE_STATE });
    // Must not render a literal "0" as a score number (honest-disabled only)
    expect(html).not.toContain('data-testid="bos-movement-score"');
  });

  it('does not show "0" as a standalone number in the output', () => {
    const html = render({ state: NO_SCORE_STATE });
    // Must not have ">0<" (a literal zero as element content)
    expect(html).not.toMatch(/>0</);
  });

  it('does not show movement direction text', () => {
    const html = render({ state: NO_SCORE_STATE });
    expect(html).not.toContain('since baseline');
    expect(html).not.toContain('data-testid="bos-movement-direction"');
  });
});

// ---------------------------------------------------------------------------
// 7. no-baseline: score shown, no delta, "baseline pending" note
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: no-baseline state', () => {
  it('renders score value (not 0) in the output', () => {
    const html = render({ state: NO_BASELINE_STATE });
    expect(html).toContain('data-testid="bos-movement-score"');
    // Score 75 should appear in the output
    expect(html).toContain('>75<');
  });

  it('renders "baseline pending" note', () => {
    const html = render({ state: NO_BASELINE_STATE });
    expect(html).toContain('data-testid="bos-movement-baseline-pending"');
  });

  it('baseline-pending note contains the word "baseline"', () => {
    const html = render({ state: NO_BASELINE_STATE });
    const pendingHtml = html.match(/data-testid="bos-movement-baseline-pending"[^>]*>([\s\S]*?)<\/p>/)?.[0] ?? '';
    expect(pendingHtml.toLowerCase()).toContain('baseline');
  });

  it('does NOT show movement direction (no "since baseline" movement text)', () => {
    const html = render({ state: NO_BASELINE_STATE });
    // The movement direction row must not be present
    expect(html).not.toContain('data-testid="bos-movement-direction"');
  });

  it('does NOT fabricate a delta number when baseline is null', () => {
    const html = render({ state: NO_BASELINE_STATE });
    // Must not contain "since baseline" in a movement framing context
    // (the disclaimer may have "baseline" as a noun but not in a delta context)
    expect(html).not.toContain('up 75 since baseline');
    expect(html).not.toContain('down 75 since baseline');
  });
});

// ---------------------------------------------------------------------------
// 8. ready + up: "up N since baseline" in rendered output
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: ready state (up)', () => {
  it('renders movement-direction testid', () => {
    const html = render({ state: READY_UP });
    expect(html).toContain('data-testid="bos-movement-direction"');
  });

  it('contains "up" in the movement text', () => {
    const html = render({ state: READY_UP });
    expect(html.toLowerCase()).toContain('up');
  });

  it('contains the delta magnitude (15) in the output', () => {
    const html = render({ state: READY_UP });
    expect(html).toContain('15');
  });

  it('contains "since baseline" framing', () => {
    const html = render({ state: READY_UP });
    expect(html).toContain('since baseline');
  });

  it('renders the score value (75)', () => {
    const html = render({ state: READY_UP });
    expect(html).toContain('>75<');
  });
});

// ---------------------------------------------------------------------------
// 9. ready + down: "down N since baseline" in rendered output
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: ready state (down)', () => {
  it('contains "down" in the movement text', () => {
    const html = render({ state: READY_DOWN });
    expect(html.toLowerCase()).toContain('down');
  });

  it('contains the magnitude (15) in the output, not the raw negative delta', () => {
    const html = render({ state: READY_DOWN });
    expect(html).toContain('15');
    // Must NOT show "-15" as the movement value (magnitude only)
    const directionSection = html.match(/bos-movement-direction[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(directionSection).not.toContain('-15');
  });

  it('contains "since baseline" framing', () => {
    const html = render({ state: READY_DOWN });
    expect(html).toContain('since baseline');
  });
});

// ---------------------------------------------------------------------------
// 10. ready + steady: "holding steady since baseline" in rendered output
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: ready state (steady)', () => {
  it('contains "holding steady" in the movement text', () => {
    const html = render({ state: READY_STEADY });
    expect(html.toLowerCase()).toContain('holding steady');
  });

  it('contains "since baseline" framing', () => {
    const html = render({ state: READY_STEADY });
    expect(html).toContain('since baseline');
  });

  it('does not show a numeric delta when steady', () => {
    // delta is 0; the label should not show "0" as a movement number
    const html = render({ state: READY_STEADY });
    // The movement label is "holding steady since baseline", no numeric delta
    expect(html).not.toContain('up 0 since baseline');
    expect(html).not.toContain('down 0 since baseline');
  });
});

// ---------------------------------------------------------------------------
// 11. Deterministic: same state -> same HTML
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: deterministic rendering', () => {
  const CASES: Array<[string, BOSMovementState | 'loading']> = [
    ['loading', LOADING_STATE],
    ['no-score', NO_SCORE_STATE],
    ['no-baseline', NO_BASELINE_STATE],
    ['ready up', READY_UP],
    ['ready down', READY_DOWN],
    ['ready steady', READY_STEADY],
  ];

  for (const [label, state] of CASES) {
    it(`same output on two renders: ${label}`, () => {
      const html1 = render({ state });
      const html2 = render({ state });
      expect(html1).toBe(html2);
    });
  }
});

// ---------------------------------------------------------------------------
// 12. Reduced-motion parity on loading skeleton
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: reduced-motion parity', () => {
  it('loading skeleton renders bos-movement-loading testid', () => {
    const html = render({ state: LOADING_STATE });
    expect(html).toContain('data-testid="bos-movement-loading"');
  });

  it('loading skeleton has aria-busy="true"', () => {
    const html = render({ state: LOADING_STATE });
    expect(html).toContain('aria-busy="true"');
  });

  it('reducedMotion=true: no animate-pulse class on loading skeleton', () => {
    const html = render({ state: LOADING_STATE, reducedMotion: true });
    expect(html).not.toContain('animate-pulse');
  });

  it('reducedMotion=false (default): loading skeleton uses motion-safe:animate-pulse', () => {
    const html = render({ state: LOADING_STATE, reducedMotion: false });
    // Uses the motion-safe prefixed variant, not bare animate-pulse
    const stripped = html.replace(/motion-safe:animate-pulse/g, '');
    expect(stripped).not.toContain('animate-pulse');
  });

  it('reducedMotion omitted (default false): loading skeleton uses motion-safe:animate-pulse', () => {
    const html = render({ state: LOADING_STATE });
    // Same as reducedMotion=false
    const stripped = html.replace(/motion-safe:animate-pulse/g, '');
    expect(stripped).not.toContain('animate-pulse');
  });

  it('loading state does not render the main readout panel', () => {
    const html = render({ state: LOADING_STATE });
    expect(html).not.toContain('data-testid="bos-movement-readout"');
  });
});

// ---------------------------------------------------------------------------
// 13. No em/en dashes in any rendered output (standing rule)
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: no em/en dashes (standing rule)', () => {
  const ALL_STATES: Array<[string, BOSMovementState | 'loading']> = [
    ['loading', LOADING_STATE],
    ['no-score', NO_SCORE_STATE],
    ['no-baseline', NO_BASELINE_STATE],
    ['ready up', READY_UP],
    ['ready down', READY_DOWN],
    ['ready steady', READY_STEADY],
  ];

  for (const [label, state] of ALL_STATES) {
    it(`no em/en dashes in "${label}" state`, () => {
      const html = render({ state });
      expect(html).not.toContain(EN_DASH);
      expect(html).not.toContain(EM_DASH);
      expect(html).not.toContain('&ndash;');
      expect(html).not.toContain('&mdash;');
    });
  }
});

// ---------------------------------------------------------------------------
// 14. No medical or diagnostic claims in rendered output
// ---------------------------------------------------------------------------

describe('BOSMovementReadoutContent: no medical/diagnostic claims', () => {
  const BANNED_TERMS = [
    'diagnos',
    'clinical advice',
    'medical advice',
    'treatment',
    'prescription',
    'physician',
    'disease',
    'cure',
  ];

  const ALL_NON_LOADING: BOSMovementState[] = [
    NO_SCORE_STATE,
    NO_BASELINE_STATE,
    READY_UP,
    READY_DOWN,
    READY_STEADY,
  ];

  for (const state of ALL_NON_LOADING) {
    for (const term of BANNED_TERMS) {
      it(`no "${term}" in ${state.kind} state`, () => {
        const html = render({ state });
        expect(html.toLowerCase()).not.toContain(term);
      });
    }
  }
});
