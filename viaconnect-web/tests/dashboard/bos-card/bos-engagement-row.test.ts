// Prompt #161e + Gary directive 2026-05-12 (Pattern A action pills):
// tests for BOSEngagementRow + EngagementPill data seam.

import { describe, it, expect } from 'vitest';
import {
  ENGAGEMENT_ROW_HEADER,
  ENGAGEMENT_ROW_DESCRIPTION,
} from '@/components/dashboard/bos-row-copy';
import {
  engagementPillClassesForState,
  engagementGradientForKey,
  engagementStateModifier,
  buildEngagementAriaLabel,
  formatVelocity,
} from '@/components/dashboard/bos-pill-helpers';
import type { EngagementPill } from '@/lib/scoring/types';

describe('BOSEngagementRow / verbatim copy', () => {
  it('exposes the exact header per #161e §2.6', () => {
    expect(ENGAGEMENT_ROW_HEADER).toBe('How can I improve my score?');
  });

  it('exposes the exact descriptive sentence (Gary directive 2026-05-12)', () => {
    expect(ENGAGEMENT_ROW_DESCRIPTION).toBe(
      'Every Daily Log In improves your Bio Optimization Score',
    );
  });

  it('descriptive sentence contains no em dashes, en dashes, or emojis', () => {
    expect(ENGAGEMENT_ROW_DESCRIPTION).not.toMatch(/[—–]/);
    expect(ENGAGEMENT_ROW_DESCRIPTION).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('EngagementPill / state matrix (Pattern A: opacity-based state, white text)', () => {
  it('at_ceiling state uses full-saturation white text (ring supplied by modifier)', () => {
    const c = engagementPillClassesForState('at_ceiling');
    expect(c.base).toContain('text-white');
    expect(c.base).not.toContain('opacity-');
    expect(c.subLabel).toBe('At ceiling');
  });

  it('in_use state uses full-saturation white text', () => {
    const c = engagementPillClassesForState('in_use');
    expect(c.base).toContain('text-white');
    expect(c.base).not.toContain('opacity-');
    expect(c.subLabel).toBe('Active');
  });

  it('unused state dims to opacity-55 (idle)', () => {
    const c = engagementPillClassesForState('unused');
    expect(c.base).toContain('text-white');
    expect(c.base).toContain('opacity-55');
    expect(c.subLabel).toBe('Start logging');
  });

  it('no state declares its own background class (gradient supplies it)', () => {
    for (const s of ['at_ceiling', 'in_use', 'unused'] as const) {
      const c = engagementPillClassesForState(s);
      expect(c.base).not.toContain('bg-');
    }
  });

  it('all three states yield distinct subLabels for the user-facing text', () => {
    const a = engagementPillClassesForState('at_ceiling').subLabel;
    const b = engagementPillClassesForState('in_use').subLabel;
    const c = engagementPillClassesForState('unused').subLabel;
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });
});

describe('EngagementPill / aria-label composition per state', () => {
  function pillFixture(
    state: EngagementPill['state'],
    velocity = 0,
    ceiling = 0,
    current = 0,
  ): EngagementPill {
    return {
      key: 'nutrition',
      label: 'Nutrition',
      state,
      velocity_pct: velocity,
      ceiling_pct: ceiling,
      current_contribution_pct: current,
      last_engaged_at: null,
      destination_key: 'nutrition_log',
    };
  }

  it('at_ceiling aria-label cites the contribution percent', () => {
    expect(buildEngagementAriaLabel(pillFixture('at_ceiling', 0, 100, 100), false)).toBe(
      'Nutrition at ceiling, contributing 100 percent',
    );
  });

  it('in_use aria-label cites the velocity per day', () => {
    expect(buildEngagementAriaLabel(pillFixture('in_use', 1.5, 100, 30), false)).toBe(
      'Nutrition active, adding +1.5 pts/day per day',
    );
  });

  it('unused aria-label invites the user to start logging', () => {
    expect(buildEngagementAriaLabel(pillFixture('unused'), false)).toBe(
      'Nutrition unused, start logging to begin contributing',
    );
  });

  it('preCompute aria-label says unlocks after CAQ completion regardless of state', () => {
    expect(buildEngagementAriaLabel(pillFixture('unused'), true)).toBe(
      'Nutrition, unlocks after CAQ completion',
    );
    expect(buildEngagementAriaLabel(pillFixture('in_use', 2.0), true)).toBe(
      'Nutrition, unlocks after CAQ completion',
    );
  });
});

describe('EngagementPill / velocity formatter', () => {
  it('formats as +X.X pts/day with one decimal place', () => {
    expect(formatVelocity(1)).toBe('+1.0 pts/day');
    expect(formatVelocity(1.5)).toBe('+1.5 pts/day');
    expect(formatVelocity(0.25)).toBe('+0.3 pts/day');
  });

  it('coerces negative velocities to positive sign (display value is the magnitude)', () => {
    expect(formatVelocity(-2)).toBe('+2.0 pts/day');
  });
});

describe('EngagementPill / per-key Pattern A gradient', () => {
  it('returns a unique bg-gradient-to-br class per lever key, all ending at navy #1E3054', () => {
    const seen = new Set<string>();
    const keys: EngagementPill['key'][] = [
      'nutrition',
      'supplements',
      'body_tracker',
      'wearable',
      'plug_ins',
      'helix_challenges',
    ];
    for (const k of keys) {
      const cls = engagementGradientForKey(k);
      expect(cls).toContain('bg-gradient-to-br');
      expect(cls).toContain('from-');
      expect(cls).toContain('to-[#1E3054]');
      seen.add(cls);
    }
    expect(seen.size).toBe(6);
  });

  it('nutrition uses emerald to navy', () => {
    expect(engagementGradientForKey('nutrition')).toBe(
      'bg-gradient-to-br from-emerald-500 to-[#1E3054]',
    );
  });

  it('supplements uses violet to navy', () => {
    expect(engagementGradientForKey('supplements')).toBe(
      'bg-gradient-to-br from-violet-500 to-[#1E3054]',
    );
  });

  it('body_tracker uses orange to navy', () => {
    expect(engagementGradientForKey('body_tracker')).toBe(
      'bg-gradient-to-br from-orange-500 to-[#1E3054]',
    );
  });

  it('wearable uses blue to navy', () => {
    expect(engagementGradientForKey('wearable')).toBe(
      'bg-gradient-to-br from-blue-500 to-[#1E3054]',
    );
  });

  it('plug_ins uses pink to navy', () => {
    expect(engagementGradientForKey('plug_ins')).toBe(
      'bg-gradient-to-br from-pink-500 to-[#1E3054]',
    );
  });

  it('helix_challenges uses amber to navy', () => {
    expect(engagementGradientForKey('helix_challenges')).toBe(
      'bg-gradient-to-br from-amber-500 to-[#1E3054]',
    );
  });
});

describe('EngagementPill / gradient state modifier (Pattern A)', () => {
  it('unused state opacity now lives on the classifier base (modifier returns empty)', () => {
    expect(engagementStateModifier('unused')).toBe('');
  });

  it('in_use state applies no modifier (full saturation)', () => {
    expect(engagementStateModifier('in_use')).toBe('');
  });

  it('at_ceiling state adds a teal ring over the gradient', () => {
    const m = engagementStateModifier('at_ceiling');
    expect(m).toContain('ring-2');
    expect(m).toContain('ring-[#2DA5A0]/40');
  });
});
