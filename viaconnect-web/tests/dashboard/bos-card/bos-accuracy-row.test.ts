// Prompt #161e: tests for BOSAccuracyRow + AccuracyPill data-seam.
//
// Verbatim header and descriptive sentence live in bos-row-copy.ts
// (JSX free). Pill state classifier and aria-label builder live in
// bos-pill-helpers.ts. Both are imported here so the tests run in
// the node-only Vitest environment without pulling JSX modules.

import { describe, it, expect } from 'vitest';
import {
  ACCURACY_ROW_HEADER,
  ACCURACY_ROW_DESCRIPTION,
} from '@/components/dashboard/bos-row-copy';
import {
  accuracyPillClassesForState,
  buildAccuracyAriaLabel,
} from '@/components/dashboard/bos-pill-helpers';
import type { AccuracyPill } from '@/lib/scoring/types';

describe('BOSAccuracyRow / verbatim copy', () => {
  it('exposes the exact header per #161e §2.5', () => {
    expect(ACCURACY_ROW_HEADER).toBe('Improved Accuracy');
  });

  it('exposes the exact descriptive sentence per #161e §6.4', () => {
    expect(ACCURACY_ROW_DESCRIPTION).toBe(
      'CAQ improves accuracy to 72%, Labs improves accuracy to 86%, unlock Genetics improves accuracy to 96%.',
    );
  });

  it('descriptive sentence contains no em dashes, en dashes, or emojis', () => {
    expect(ACCURACY_ROW_DESCRIPTION).not.toMatch(/[—–]/);
    expect(ACCURACY_ROW_DESCRIPTION).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('AccuracyPill / state matrix (canonical legacy)', () => {
  it('complete state uses teal background and Complete label', () => {
    const c = accuracyPillClassesForState('complete');
    expect(c.base).toContain('bg-[#2DA5A0]/15');
    expect(c.base).toContain('border-[#2DA5A0]/30');
    expect(c.base).toContain('text-[#2DA5A0]');
    expect(c.stateLabel).toBe('Complete');
  });

  it('incomplete state uses dim neutral background (legacy locked treatment)', () => {
    const c = accuracyPillClassesForState('incomplete');
    expect(c.base).toContain('bg-white/[0.04]');
    expect(c.base).toContain('border-white/10');
    expect(c.base).toContain('text-white/40');
    expect(c.stateLabel).toBe('Unlock');
  });

  it('awaiting_results state uses neutral outline and Awaiting label', () => {
    const c = accuracyPillClassesForState('awaiting_results');
    expect(c.base).toContain('border-white/30');
    expect(c.base).toContain('bg-white/[0.05]');
    expect(c.base).toContain('text-white/70');
    expect(c.stateLabel).toBe('Awaiting results');
  });

  it('all three states yield visually distinct base classes', () => {
    const a = accuracyPillClassesForState('complete').base;
    const b = accuracyPillClassesForState('incomplete').base;
    const c = accuracyPillClassesForState('awaiting_results').base;
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });
});

describe('AccuracyPill / aria-label composition per state', () => {
  function pillFixture(state: AccuracyPill['state']): AccuracyPill {
    return {
      key: 'caq',
      label: 'CAQ',
      state,
      destination_key: state === 'complete' ? null : 'caq_resume',
      confidence_unlocked_pct: 72,
    };
  }

  it('complete aria-label cites the unlocked percent', () => {
    expect(buildAccuracyAriaLabel(pillFixture('complete'))).toBe(
      'CAQ complete, confidence unlocked at 72 percent',
    );
  });

  it('incomplete aria-label cites the percent to unlock', () => {
    expect(buildAccuracyAriaLabel(pillFixture('incomplete'))).toBe(
      'CAQ unlock, complete to reach 72 percent confidence',
    );
  });

  it('awaiting_results aria-label cites the pending state', () => {
    expect(buildAccuracyAriaLabel(pillFixture('awaiting_results'))).toBe(
      'CAQ awaiting results, confidence 72 percent once complete',
    );
  });
});
