// src/components/formavision/__tests__/MilestoneMoment.test.ts
//
// Prompt 210b P6-T4: TDD tests for MilestoneMoment (written before / alongside
// implementation per TDD discipline).
//
// Structure:
//   Part A: Pure logic tests (BODY_COMP_MILESTONE_TYPES, selectMilestoneForMoment,
//           getSeenIds). No JSX, no rendering, fast.
//   Part B: Component rendering tests (MilestoneMomentContent via
//           renderToStaticMarkup + React.createElement). Node harness only.
//
// Coverage:
//   A1. BODY_COMP_MILESTONE_TYPES contains exactly the three required types
//   A2. non-body-comp types (consistency, custom) not included
//   A3. completed body-comp milestone not yet seen -> returned
//   A4. no completed milestone -> null
//   A5. non-body-comp types excluded by selectMilestoneForMoment
//   A6. null completed_date -> not returned (not achieved)
//   A7. seen-guard: seen milestone suppressed; unseen milestone returned
//   A8. multiple milestones: first in array order wins
//   A9. getSeenIds fail-open when window is undefined (node env)
//  B10. MilestoneMomentContent: milestone present -> toast with real title
//  B11. MilestoneMomentContent: milestone null -> renders nothing (empty string)
//  B12. MilestoneMomentContent: "Milestone Achieved" heading always when present
//  B13. MilestoneMomentContent: dismiss button has aria-label + 44px classes
//  B14. MilestoneMomentContent: no em/en dashes (standing rule)
//  B15. MilestoneMomentContent: reduced-motion parity
//  B16. MilestoneMomentContent: no medical/diagnostic claims
//  B17. MilestoneMomentContent: title is real server value, never "0"
//  B18. MilestoneMomentContent: accessibility (role=status, aria-live=polite)
//  B19. MilestoneMomentContent: deterministic rendering
//
// Node harness; uses renderToStaticMarkup (no @testing-library/dom required).

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  BODY_COMP_MILESTONE_TYPES,
  selectMilestoneForMoment,
  getSeenIds,
} from '@/lib/formavision/milestone/milestoneMoment';
import type { MilestoneForMoment } from '@/lib/formavision/milestone/milestoneMoment';

import { MilestoneMomentContent } from '../MilestoneMoment';
import type { MilestoneMomentContentProps } from '../MilestoneMoment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(props: MilestoneMomentContentProps): string {
  return renderToStaticMarkup(React.createElement(MilestoneMomentContent, props));
}

const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

// Dummy dismiss handler: renderToStaticMarkup does not invoke event handlers.
const noop = () => {};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BODY_FAT_GOAL: MilestoneForMoment = {
  id: 'ms-1',
  milestone_type: 'body_fat_goal',
  completed_date: '2026-06-20',
  title: 'Sub 20% Body Fat',
};

const MUSCLE_GOAL: MilestoneForMoment = {
  id: 'ms-2',
  milestone_type: 'muscle_gain_goal',
  completed_date: '2026-06-21',
  title: '5 lbs Muscle Gain',
};

const WEIGHT_GOAL: MilestoneForMoment = {
  id: 'ms-3',
  milestone_type: 'weight_goal',
  completed_date: '2026-06-22',
  title: 'Hit 185 lbs',
};

const CONSISTENCY_MILESTONE: MilestoneForMoment = {
  id: 'ms-4',
  milestone_type: 'consistency',
  completed_date: '2026-06-23',
  title: '7-Day Streak',
};

const CUSTOM_MILESTONE: MilestoneForMoment = {
  id: 'ms-5',
  milestone_type: 'custom',
  completed_date: '2026-06-24',
  title: 'My Custom Goal',
};

const INCOMPLETE_BODY_FAT: MilestoneForMoment = {
  id: 'ms-6',
  milestone_type: 'body_fat_goal',
  completed_date: null,
  title: 'Reach 18% Body Fat',
};

// ---------------------------------------------------------------------------
// A1. BODY_COMP_MILESTONE_TYPES: exactly the three required types
// ---------------------------------------------------------------------------

describe('BODY_COMP_MILESTONE_TYPES: exactly three body-comp types', () => {
  it('contains body_fat_goal', () => {
    expect(BODY_COMP_MILESTONE_TYPES.has('body_fat_goal')).toBe(true);
  });

  it('contains muscle_gain_goal', () => {
    expect(BODY_COMP_MILESTONE_TYPES.has('muscle_gain_goal')).toBe(true);
  });

  it('contains weight_goal', () => {
    expect(BODY_COMP_MILESTONE_TYPES.has('weight_goal')).toBe(true);
  });

  it('has exactly 3 entries', () => {
    expect(BODY_COMP_MILESTONE_TYPES.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// A2. Non-body-comp types not in BODY_COMP_MILESTONE_TYPES
// ---------------------------------------------------------------------------

describe('BODY_COMP_MILESTONE_TYPES: excludes non-body-comp types', () => {
  it('does NOT contain consistency', () => {
    expect(BODY_COMP_MILESTONE_TYPES.has('consistency')).toBe(false);
  });

  it('does NOT contain custom', () => {
    expect(BODY_COMP_MILESTONE_TYPES.has('custom')).toBe(false);
  });

  it('does NOT contain an empty string', () => {
    expect(BODY_COMP_MILESTONE_TYPES.has('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// A3. completed body-comp milestone not yet seen -> returned
// ---------------------------------------------------------------------------

describe('selectMilestoneForMoment: completed body-comp milestone not yet seen', () => {
  it('returns body_fat_goal milestone when completed and not seen', () => {
    const result = selectMilestoneForMoment([BODY_FAT_GOAL], new Set());
    expect(result).not.toBeNull();
    expect(result?.id).toBe('ms-1');
    expect(result?.title).toBe('Sub 20% Body Fat');
  });

  it('returns muscle_gain_goal milestone', () => {
    const result = selectMilestoneForMoment([MUSCLE_GOAL], new Set());
    expect(result?.id).toBe('ms-2');
    expect(result?.title).toBe('5 lbs Muscle Gain');
  });

  it('returns weight_goal milestone', () => {
    const result = selectMilestoneForMoment([WEIGHT_GOAL], new Set());
    expect(result?.id).toBe('ms-3');
    expect(result?.title).toBe('Hit 185 lbs');
  });
});

// ---------------------------------------------------------------------------
// A4. no completed milestone -> null
// ---------------------------------------------------------------------------

describe('selectMilestoneForMoment: no completed milestone -> null', () => {
  it('returns null for empty list', () => {
    expect(selectMilestoneForMoment([], new Set())).toBeNull();
  });

  it('returns null when only milestone has completed_date null', () => {
    expect(selectMilestoneForMoment([INCOMPLETE_BODY_FAT], new Set())).toBeNull();
  });

  it('returns null when all body-comp milestones are incomplete', () => {
    const milestones: MilestoneForMoment[] = [
      INCOMPLETE_BODY_FAT,
      { ...MUSCLE_GOAL, completed_date: null },
      { ...WEIGHT_GOAL, completed_date: null },
    ];
    expect(selectMilestoneForMoment(milestones, new Set())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A5. non-body-comp types excluded
// ---------------------------------------------------------------------------

describe('selectMilestoneForMoment: non-body-comp types excluded', () => {
  it('excludes consistency type even when completed', () => {
    expect(selectMilestoneForMoment([CONSISTENCY_MILESTONE], new Set())).toBeNull();
  });

  it('excludes custom type even when completed', () => {
    expect(selectMilestoneForMoment([CUSTOM_MILESTONE], new Set())).toBeNull();
  });

  it('skips non-body-comp types and returns the first body-comp milestone', () => {
    const milestones: MilestoneForMoment[] = [
      CONSISTENCY_MILESTONE,
      CUSTOM_MILESTONE,
      BODY_FAT_GOAL,
    ];
    const result = selectMilestoneForMoment(milestones, new Set());
    expect(result?.id).toBe('ms-1');
  });
});

// ---------------------------------------------------------------------------
// A6. null completed_date -> not returned (not achieved)
// ---------------------------------------------------------------------------

describe('selectMilestoneForMoment: null completed_date is not achieved', () => {
  it('does not return a milestone with completed_date=null', () => {
    const result = selectMilestoneForMoment([INCOMPLETE_BODY_FAT], new Set());
    expect(result).toBeNull();
  });

  it('skips incomplete and returns next completed body-comp', () => {
    const milestones: MilestoneForMoment[] = [INCOMPLETE_BODY_FAT, MUSCLE_GOAL];
    const result = selectMilestoneForMoment(milestones, new Set());
    expect(result?.id).toBe('ms-2');
  });
});

// ---------------------------------------------------------------------------
// A7. seen-guard: seen milestone suppressed; unseen returned
// ---------------------------------------------------------------------------

describe('selectMilestoneForMoment: seen-guard suppresses already-seen milestones', () => {
  it('returns null when the only milestone is already seen', () => {
    const seen = new Set(['ms-1']);
    expect(selectMilestoneForMoment([BODY_FAT_GOAL], seen)).toBeNull();
  });

  it('skips seen milestone, returns the next unseen one', () => {
    const seen = new Set(['ms-1']);
    const milestones: MilestoneForMoment[] = [BODY_FAT_GOAL, MUSCLE_GOAL];
    const result = selectMilestoneForMoment(milestones, seen);
    expect(result?.id).toBe('ms-2');
  });

  it('returns null when all milestones are seen', () => {
    const seen = new Set(['ms-1', 'ms-2', 'ms-3']);
    const milestones: MilestoneForMoment[] = [BODY_FAT_GOAL, MUSCLE_GOAL, WEIGHT_GOAL];
    expect(selectMilestoneForMoment(milestones, seen)).toBeNull();
  });

  it('empty seenIds set -> first qualifying milestone returned', () => {
    const result = selectMilestoneForMoment([BODY_FAT_GOAL, MUSCLE_GOAL], new Set());
    expect(result?.id).toBe('ms-1');
  });
});

// ---------------------------------------------------------------------------
// A8. multiple milestones: first in array order wins
// ---------------------------------------------------------------------------

describe('selectMilestoneForMoment: first qualifying in array order wins', () => {
  it('returns the first milestone in array order (not by date)', () => {
    const milestones: MilestoneForMoment[] = [MUSCLE_GOAL, BODY_FAT_GOAL, WEIGHT_GOAL];
    const result = selectMilestoneForMoment(milestones, new Set());
    expect(result?.id).toBe('ms-2'); // MUSCLE_GOAL is first in array
  });

  it('seen guard skips ms-2, first qualifying becomes ms-1', () => {
    const milestones: MilestoneForMoment[] = [MUSCLE_GOAL, BODY_FAT_GOAL, WEIGHT_GOAL];
    const seen = new Set(['ms-2']);
    const result = selectMilestoneForMoment(milestones, seen);
    expect(result?.id).toBe('ms-1');
  });
});

// ---------------------------------------------------------------------------
// A9. getSeenIds fail-open when window is undefined (node test env)
// ---------------------------------------------------------------------------

describe('getSeenIds: fail-open in server / node environment', () => {
  it('returns an empty Set (window is undefined in node test env)', () => {
    // In node test env, typeof window === 'undefined', so the guard returns
    // an empty Set immediately without touching sessionStorage.
    const seen = getSeenIds();
    expect(seen instanceof Set).toBe(true);
    expect(seen.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// B10. MilestoneMomentContent: milestone present -> toast rendered with real title
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: milestone present -> toast rendered', () => {
  it('renders milestone-moment-toast testid', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('data-testid="milestone-moment-toast"');
  });

  it('renders the real milestone title (not fabricated)', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('data-testid="milestone-moment-title"');
    expect(html).toContain('Sub 20% Body Fat');
  });

  it('renders muscle_gain_goal title correctly', () => {
    const html = render({ milestone: MUSCLE_GOAL, onDismiss: noop });
    expect(html).toContain('5 lbs Muscle Gain');
  });

  it('renders weight_goal title correctly', () => {
    const html = render({ milestone: WEIGHT_GOAL, onDismiss: noop });
    expect(html).toContain('Hit 185 lbs');
  });
});

// ---------------------------------------------------------------------------
// B11. MilestoneMomentContent: milestone null -> renders nothing
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: null milestone -> nothing rendered', () => {
  it('returns empty string when milestone is null', () => {
    const html = render({ milestone: null, onDismiss: noop });
    expect(html).toBe('');
  });

  it('does NOT render the toast testid when milestone is null', () => {
    const html = render({ milestone: null, onDismiss: noop });
    expect(html).not.toContain('data-testid="milestone-moment-toast"');
  });

  it('does NOT render any title element when milestone is null', () => {
    const html = render({ milestone: null, onDismiss: noop });
    expect(html).not.toContain('data-testid="milestone-moment-title"');
  });

  it('does NOT render any congratulatory body copy when milestone is null', () => {
    const html = render({ milestone: null, onDismiss: noop });
    expect(html).not.toContain('data-testid="milestone-moment-body"');
  });
});

// ---------------------------------------------------------------------------
// B12. "Milestone Achieved" heading: always present when milestone shown
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: "Milestone Achieved" heading', () => {
  it('renders heading testid when milestone is present', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('data-testid="milestone-moment-heading"');
  });

  it('contains "Milestone Achieved" verbatim', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('Milestone Achieved');
  });

  it('does NOT use an alternate heading', () => {
    const html = render({ milestone: WEIGHT_GOAL, onDismiss: noop });
    expect(html).not.toContain('Goal Reached');
    expect(html).not.toContain('Achievement Unlocked');
  });
});

// ---------------------------------------------------------------------------
// B13. Dismiss button: aria-label + 44px classes
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: dismiss button', () => {
  it('renders dismiss button testid', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('data-testid="milestone-moment-dismiss"');
  });

  it('dismiss button has aria-label="Dismiss milestone moment"', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('aria-label="Dismiss milestone moment"');
  });

  it('dismiss button has 44px height class (touch target)', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('h-[44px]');
  });

  it('dismiss button has 44px width class (touch target)', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('w-[44px]');
  });
});

// ---------------------------------------------------------------------------
// B14. No em/en dashes in any rendered output (standing rule)
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: no em/en dashes (standing rule)', () => {
  it('no em/en dashes in milestone-present state', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).not.toContain(EN_DASH);
    expect(html).not.toContain(EM_DASH);
    expect(html).not.toContain('&ndash;');
    expect(html).not.toContain('&mdash;');
  });

  it('no em/en dashes in null-milestone state (empty string)', () => {
    const html = render({ milestone: null, onDismiss: noop });
    expect(html).not.toContain(EN_DASH);
    expect(html).not.toContain(EM_DASH);
  });
});

// ---------------------------------------------------------------------------
// B15. Reduced-motion parity
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: reduced-motion parity', () => {
  it('reducedMotion=true: no transition-opacity on the toast', () => {
    const html = render({ milestone: BODY_FAT_GOAL, reducedMotion: true, onDismiss: noop });
    // With reducedMotion=true the motion-safe transition classes are omitted
    expect(html).not.toContain('transition-opacity');
  });

  it('reducedMotion=false: includes motion-safe:transition-opacity', () => {
    const html = render({ milestone: BODY_FAT_GOAL, reducedMotion: false, onDismiss: noop });
    expect(html).toContain('motion-safe:transition-opacity');
  });

  it('reducedMotion omitted (default): includes motion-safe:transition-opacity', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('motion-safe:transition-opacity');
  });

  it('null milestone: reducedMotion makes no difference (both render nothing)', () => {
    const withMotion = render({ milestone: null, reducedMotion: false, onDismiss: noop });
    const withoutMotion = render({ milestone: null, reducedMotion: true, onDismiss: noop });
    expect(withMotion).toBe('');
    expect(withoutMotion).toBe('');
  });
});

// ---------------------------------------------------------------------------
// B16. No medical/diagnostic claims
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: no medical/diagnostic claims', () => {
  const BANNED_TERMS = [
    'diagnos',
    'clinical advice',
    'medical advice',
    'treatment',
    'prescription',
    'physician',
    'disease',
    'cure',
    'therapy',
  ];

  for (const term of BANNED_TERMS) {
    it(`no "${term}" in milestone-present state`, () => {
      const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
      expect(html.toLowerCase()).not.toContain(term);
    });
  }
});

// ---------------------------------------------------------------------------
// B17. Title is real server value, not "0"
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: title is real server value, never 0', () => {
  it('title element contains the real title string', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    const titleMatch = html.match(/data-testid="milestone-moment-title"[^>]*>([^<]*)</)?.[1] ?? '';
    expect(titleMatch.trim()).toBe('Sub 20% Body Fat');
  });

  it('title element is never a bare zero', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    const titleMatch = html.match(/data-testid="milestone-moment-title"[^>]*>([^<]*)</)?.[1] ?? '';
    expect(titleMatch.trim()).not.toBe('0');
  });
});

// ---------------------------------------------------------------------------
// B18. Accessibility
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: accessibility', () => {
  it('toast has role="status"', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('role="status"');
  });

  it('toast has aria-live="polite"', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('aria-live="polite"');
  });

  it('toast has aria-atomic="true"', () => {
    const html = render({ milestone: BODY_FAT_GOAL, onDismiss: noop });
    expect(html).toContain('aria-atomic="true"');
  });
});

// ---------------------------------------------------------------------------
// B19. Deterministic rendering
// ---------------------------------------------------------------------------

describe('MilestoneMomentContent: deterministic rendering', () => {
  const CASES: Array<[string, MilestoneMomentContentProps]> = [
    ['body_fat_goal', { milestone: BODY_FAT_GOAL, onDismiss: noop }],
    ['muscle_gain_goal', { milestone: MUSCLE_GOAL, onDismiss: noop }],
    ['weight_goal', { milestone: WEIGHT_GOAL, onDismiss: noop }],
    ['null milestone', { milestone: null, onDismiss: noop }],
    ['reducedMotion=true', { milestone: BODY_FAT_GOAL, reducedMotion: true, onDismiss: noop }],
    ['reducedMotion=false', { milestone: BODY_FAT_GOAL, reducedMotion: false, onDismiss: noop }],
  ];

  for (const [label, props] of CASES) {
    it(`same output on two renders: ${label}`, () => {
      const html1 = render(props);
      const html2 = render(props);
      expect(html1).toBe(html2);
    });
  }
});
