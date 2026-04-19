// Prompt #93 Phase 3: Pure tests for the UpgradePromptCard copy helper.
//
// The card itself is a React component (rendering not covered by this
// pure test suite), but its per-reason copy mapping is a pure function
// that must produce sensible output for every reason the evaluation
// engine can emit. If someone adds a new FlagEvaluationReason without
// updating the copy mapping, the "returns default copy for unknown
// reason" assertion becomes a silent regression — so the tests check
// every known reason explicitly.

import { describe, it, expect } from 'vitest';
import { upgradePromptCopyForReason } from '@/lib/flags/upgrade-prompt-copy';
import type { FlagEvaluationReason } from '@/types/flags';

const ALL_REASONS: FlagEvaluationReason[] = [
  'enabled_normally',
  'kill_switch_engaged',
  'feature_not_active',
  'feature_not_found',
  'launch_phase_not_active',
  'launch_phase_paused',
  'tier_insufficient',
  'requires_family_tier',
  'requires_genex360',
  'rollout_percentage_excluded',
  'not_in_rollout_cohort',
  'internal_only_restriction',
  'opt_in_not_granted',
];

describe('upgradePromptCopyForReason', () => {
  it.each(ALL_REASONS)('produces heading + description for reason %s', (reason) => {
    const copy = upgradePromptCopyForReason({ reason });
    expect(copy.heading).toBeTruthy();
    expect(copy.description).toBeTruthy();
    expect(copy.heading.length).toBeGreaterThan(0);
    expect(copy.description.length).toBeGreaterThan(0);
  });

  it('tier_insufficient (level 1) names Gold tier', () => {
    const copy = upgradePromptCopyForReason({ reason: 'tier_insufficient', requiredTier: 1 });
    expect(copy.heading).toContain('Gold');
    expect(copy.cta?.label).toContain('Gold');
    expect(copy.cta?.href).toBe('/pricing');
  });

  it('tier_insufficient (level 2) names Platinum tier', () => {
    const copy = upgradePromptCopyForReason({ reason: 'tier_insufficient', requiredTier: 2 });
    expect(copy.heading).toContain('Platinum');
    expect(copy.cta?.label).toContain('Platinum');
  });

  it('tier_insufficient (level 3) names Platinum+ Family tier', () => {
    const copy = upgradePromptCopyForReason({ reason: 'tier_insufficient', requiredTier: 3 });
    expect(copy.heading).toContain('Family');
  });

  it('requires_family_tier always routes to family pricing', () => {
    const copy = upgradePromptCopyForReason({ reason: 'requires_family_tier' });
    expect(copy.cta?.href).toContain('family');
  });

  it('requires_genex360 routes to the GeneX360 product page', () => {
    const copy = upgradePromptCopyForReason({ reason: 'requires_genex360' });
    expect(copy.cta?.href).toBe('/shop/genex360');
  });

  it('opt_in_not_granted routes to account early-access settings', () => {
    const copy = upgradePromptCopyForReason({ reason: 'opt_in_not_granted' });
    expect(copy.cta?.href).toBe('/account/early-access');
  });

  it('launch_phase_not_active has no CTA (users cannot self-advance a phase)', () => {
    const copy = upgradePromptCopyForReason({ reason: 'launch_phase_not_active' });
    expect(copy.cta).toBeNull();
  });

  it('launch_phase_paused has no CTA', () => {
    const copy = upgradePromptCopyForReason({ reason: 'launch_phase_paused' });
    expect(copy.cta).toBeNull();
  });

  it('rollout_percentage_excluded has no CTA (wait for rollout)', () => {
    const copy = upgradePromptCopyForReason({ reason: 'rollout_percentage_excluded' });
    expect(copy.cta).toBeNull();
  });

  it('internal_only_restriction has no CTA (users cannot self-upgrade to staff)', () => {
    const copy = upgradePromptCopyForReason({ reason: 'internal_only_restriction' });
    expect(copy.cta).toBeNull();
  });

  it('kill_switch_engaged has no CTA (nothing the user can do)', () => {
    const copy = upgradePromptCopyForReason({ reason: 'kill_switch_engaged' });
    expect(copy.cta).toBeNull();
  });

  it('every CTA href starts with /', () => {
    for (const reason of ALL_REASONS) {
      const copy = upgradePromptCopyForReason({ reason });
      if (copy.cta) {
        expect(copy.cta.href.startsWith('/')).toBe(true);
      }
    }
  });
});
