// Prompt #161e: tests for BOSEngagementRow + EngagementPill data seam.

import { describe, it, expect } from 'vitest';
import {
  ENGAGEMENT_ROW_HEADER,
  ENGAGEMENT_ROW_DESCRIPTION,
} from '@/components/dashboard/bos-row-copy';
import {
  engagementPillClassesForState,
  engagementStateModifier,
  buildEngagementAriaLabel,
  formatVelocity,
  BOS_PILL_GRADIENT,
} from '@/components/dashboard/bos-pill-helpers';
import type { EngagementPill } from '@/lib/scoring/types';

describe('BOSEngagementRow / verbatim copy', () => {
  it('exposes the exact header per #161e §2.6', () => {
    expect(ENGAGEMENT_ROW_HEADER).toBe('How can I improve my score?');
  });

  it('exposes the exact descriptive sentence per #161e §6.5', () => {
    expect(ENGAGEMENT_ROW_DESCRIPTION).toBe(
      'Log nutrition, track supplements, record body measurements, sync wearables, connect plug-ins, and complete Helix Challenges. Each lever adds points to your score over time.',
    );
  });

  it('descriptive sentence contains no em dashes, en dashes, or emojis', () => {
    expect(ENGAGEMENT_ROW_DESCRIPTION).not.toMatch(/[—–]/);
    expect(ENGAGEMENT_ROW_DESCRIPTION).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('EngagementPill / state matrix (Phase A: border + text only, gradient is the bg)', () => {
  it('at_ceiling state uses solid teal border + teal text', () => {
    const c = engagementPillClassesForState('at_ceiling');
    expect(c.base).toContain('border-[#2DA5A0]');
    expect(c.base).toContain('text-[#2DA5A0]');
    expect(c.subLabel).toBe('At ceiling');
  });

  it('in_use state uses teal accent border + teal text', () => {
    const c = engagementPillClassesForState('in_use');
    expect(c.base).toContain('border-[#2DA5A0]/40');
    expect(c.base).toContain('text-[#2DA5A0]');
    expect(c.subLabel).toBe('Active');
  });

  it('unused state uses neutral outline + soft white text', () => {
    const c = engagementPillClassesForState('unused');
    expect(c.base).toContain('border-white/30');
    expect(c.base).toContain('text-white/85');
    expect(c.subLabel).toBe('Start logging');
  });

  it('no state declares its own background class (gradient supplies it)', () => {
    for (const s of ['at_ceiling', 'in_use', 'unused'] as const) {
      const c = engagementPillClassesForState(s);
      expect(c.base).not.toContain('bg-');
    }
  });

  it('all three states yield visually distinct base classes', () => {
    const a = engagementPillClassesForState('at_ceiling').base;
    const b = engagementPillClassesForState('in_use').base;
    const c = engagementPillClassesForState('unused').base;
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

describe('EngagementPill / unified BOS pill gradient (Gary directive 2026-05-12)', () => {
  it('exposes a single unified gradient constant for every pill in the BOS card', () => {
    expect(BOS_PILL_GRADIENT).toContain('bg-gradient-to-br');
    expect(BOS_PILL_GRADIENT).toContain('from-');
    expect(BOS_PILL_GRADIENT).toContain('to-');
  });

  it('uses the dashboard brand navy and brand teal tokens', () => {
    expect(BOS_PILL_GRADIENT).toContain('from-[#1A2744]');
    expect(BOS_PILL_GRADIENT).toContain('to-[#2DA5A0]');
  });

  it('contains no em dashes or en dashes (catch-all consistency check)', () => {
    expect(BOS_PILL_GRADIENT).not.toMatch(/[—–]/);
  });
});

describe('EngagementPill / gradient state modifier (Gary directive)', () => {
  it('unused state dims the gradient (opacity-60)', () => {
    expect(engagementStateModifier('unused')).toContain('opacity-60');
  });

  it('in_use state applies no opacity modifier (full saturation)', () => {
    const m = engagementStateModifier('in_use');
    expect(m).not.toContain('opacity-60');
  });

  it('at_ceiling state adds a teal ring over the gradient', () => {
    const m = engagementStateModifier('at_ceiling');
    expect(m).toContain('ring-2');
    expect(m).toContain('ring-[#2DA5A0]/40');
  });
});
