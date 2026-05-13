// Prompt #161e + Gary directive 2026-05-12 (Pattern A action pills):
// tests for BOSAccuracyRow + AccuracyPill data-seam.
//
// Verbatim header and descriptive sentence live in bos-row-copy.ts
// (JSX free). Pill state classifier, gradient lookup, and aria-label
// builder live in bos-pill-helpers.ts. All imported here so the tests
// run in the node-only Vitest environment without pulling JSX modules.

import { describe, it, expect } from 'vitest';
import {
  ACCURACY_ROW_HEADER,
  ACCURACY_ROW_DESCRIPTION,
} from '@/components/dashboard/bos-row-copy';
import {
  accuracyPillClassesForState,
  accuracyGradientForKey,
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

describe('AccuracyPill / state matrix (Pattern A: opacity-based state, white text)', () => {
  it('complete state uses full-saturation white text', () => {
    const c = accuracyPillClassesForState('complete');
    expect(c.base).toContain('text-white');
    expect(c.base).not.toContain('opacity-');
    expect(c.stateLabel).toBe('Complete');
  });

  it('awaiting_results state dims to opacity-80', () => {
    const c = accuracyPillClassesForState('awaiting_results');
    expect(c.base).toContain('text-white');
    expect(c.base).toContain('opacity-80');
    expect(c.stateLabel).toBe('Awaiting results');
  });

  it('incomplete state dims to opacity-55 (locked/idle)', () => {
    const c = accuracyPillClassesForState('incomplete');
    expect(c.base).toContain('text-white');
    expect(c.base).toContain('opacity-55');
    expect(c.stateLabel).toBe('Unlock');
  });

  it('no state declares its own background class (gradient supplies it)', () => {
    for (const s of ['complete', 'incomplete', 'awaiting_results'] as const) {
      const c = accuracyPillClassesForState(s);
      expect(c.base).not.toContain('bg-');
    }
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

describe('AccuracyPill / per-key Pattern A gradient', () => {
  it('returns a unique bg-gradient-to-br class per pill key', () => {
    const seen = new Set<string>();
    const keys: AccuracyPill['key'][] = ['caq', 'labs', 'genetics'];
    for (const k of keys) {
      const cls = accuracyGradientForKey(k);
      expect(cls).toContain('bg-gradient-to-br');
      expect(cls).toContain('from-');
      expect(cls).toContain('to-[#1E3054]');
      seen.add(cls);
    }
    expect(seen.size).toBe(3);
  });

  it('caq uses emerald to navy (matches the Nutrition engagement pill per Gary directive)', () => {
    expect(accuracyGradientForKey('caq')).toBe(
      'bg-gradient-to-br from-emerald-500 to-[#1E3054]',
    );
  });

  it('labs uses brand teal to navy', () => {
    expect(accuracyGradientForKey('labs')).toBe(
      'bg-gradient-to-br from-[#2DA5A0] to-[#1E3054]',
    );
  });

  it('genetics uses fuchsia to navy', () => {
    expect(accuracyGradientForKey('genetics')).toBe(
      'bg-gradient-to-br from-fuchsia-500 to-[#1E3054]',
    );
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
