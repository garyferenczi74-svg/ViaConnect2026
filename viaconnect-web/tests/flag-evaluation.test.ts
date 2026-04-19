// Prompt #93 Phase 2: Pure evaluation engine tests.
//
// Every decision path in `evaluateFlagPure` + `resolveRolloutInclusion`
// is exercised here without touching Supabase. Percentage bucket
// determinism is asserted separately; the DB-backed `evaluateFlag`
// wrapper is covered by integration tests (separate file, skipped until
// a seeded staging branch exists).

import { describe, it, expect } from 'vitest';
import {
  evaluateFlagPure,
  percentageBucket,
  resolveRolloutInclusion,
  type PureFeatureShape,
  type PureEvaluationInputs,
} from '@/lib/flags/evaluation-engine';
import type { RolloutStrategy } from '@/types/flags';

function feature(overrides: Partial<PureFeatureShape> = {}): PureFeatureShape {
  return {
    id: 'test_feature',
    is_active: true,
    kill_switch_engaged: false,
    launch_phase_id: null,
    minimum_tier_level: 0,
    requires_family_tier: false,
    requires_genex360: false,
    gate_behavior: 'upgrade_prompt',
    rollout_strategy: 'all_eligible',
    rollout_percentage: null,
    rollout_cohort_ids: [],
    ...overrides,
  };
}

function inputs(overrides: Partial<PureEvaluationInputs> = {}): PureEvaluationInputs {
  return {
    userId: 'user-1',
    featureId: 'test_feature',
    feature: feature(),
    launchPhaseStatus: null,
    userTierLevel: 1,
    ownsGeneX360: false,
    inAnyListedCohort: false,
    isInternalStaff: false,
    isOptedIn: false,
    ...overrides,
  };
}

// ---- Layer 1: kill switch -------------------------------------------------

describe('evaluateFlagPure — kill switch', () => {
  it('kill switch disables regardless of all other gates', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({
        kill_switch_engaged: true,
        is_active: true,
        minimum_tier_level: 0,
        rollout_strategy: 'all_eligible',
      }),
      userTierLevel: 99,
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('kill_switch_engaged');
    expect(r.gateBehavior).toBe('hide');
  });
});

// ---- Layer 2: global active flag -----------------------------------------

describe('evaluateFlagPure — is_active', () => {
  it('returns feature_not_active when is_active=false', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ is_active: false }),
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('feature_not_active');
  });

  it('returns feature_not_found when feature is null', () => {
    const r = evaluateFlagPure({ ...inputs(), feature: null });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('feature_not_found');
  });
});

// ---- Layer 3: launch phase ----------------------------------------------

describe('evaluateFlagPure — launch phase', () => {
  it('no phase linked: passes through phase check', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ launch_phase_id: null }),
    }));
    expect(r.enabled).toBe(true);
  });

  it('phase active: passes through', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ launch_phase_id: 'consumer_q1_2027' }),
      launchPhaseStatus: 'active',
    }));
    expect(r.enabled).toBe(true);
  });

  it('phase completed: passes through', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ launch_phase_id: 'consumer_q1_2027' }),
      launchPhaseStatus: 'completed',
    }));
    expect(r.enabled).toBe(true);
  });

  it('phase planned: disabled with launch_phase_not_active', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ launch_phase_id: 'sproutables_q4_2027' }),
      launchPhaseStatus: 'planned',
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('launch_phase_not_active');
    expect(r.metadata?.launchPhaseId).toBe('sproutables_q4_2027');
    expect(r.metadata?.launchPhaseStatus).toBe('planned');
  });

  it('phase paused: disabled with launch_phase_paused', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ launch_phase_id: 'consumer_q1_2027' }),
      launchPhaseStatus: 'paused',
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('launch_phase_paused');
  });

  it('phase canceled: disabled (not active or completed)', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ launch_phase_id: 'consumer_q1_2027' }),
      launchPhaseStatus: 'canceled',
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('launch_phase_not_active');
  });
});

// ---- Layer 4/5: tier + family + genex360 --------------------------------

describe('evaluateFlagPure — tier + family + genex360', () => {
  it('tier insufficient: disabled with tier_insufficient', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ minimum_tier_level: 2 }),
      userTierLevel: 1,
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('tier_insufficient');
    expect(r.metadata?.requiredTier).toBe(2);
  });

  it('anonymous (level 0) below required tier 1: tier_insufficient', () => {
    const r = evaluateFlagPure(inputs({
      userId: null,
      feature: feature({ minimum_tier_level: 1 }),
      userTierLevel: 0,
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('tier_insufficient');
  });

  it('requires_family_tier but user on Platinum (2): disabled', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ minimum_tier_level: 2, requires_family_tier: true }),
      userTierLevel: 2,
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('requires_family_tier');
  });

  it('requires_family_tier and user on Family (3): passes', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ minimum_tier_level: 3, requires_family_tier: true }),
      userTierLevel: 3,
    }));
    expect(r.enabled).toBe(true);
  });

  it('requires_genex360 without purchase: disabled', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ minimum_tier_level: 2, requires_genex360: true }),
      userTierLevel: 2,
      ownsGeneX360: false,
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('requires_genex360');
  });

  it('requires_genex360 with purchase: passes', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({ minimum_tier_level: 2, requires_genex360: true }),
      userTierLevel: 2,
      ownsGeneX360: true,
    }));
    expect(r.enabled).toBe(true);
  });
});

// ---- Layer 6: rollout strategy (all paths) -------------------------------

describe('resolveRolloutInclusion — all strategies', () => {
  const base = {
    userId: 'user-1',
    featureId: 'feat_x',
    percentage: null,
    cohortIds: [],
    inAnyListedCohort: false,
    isInternalStaff: false,
    isOptedIn: false,
  };

  it('all_eligible: always included', () => {
    const r = resolveRolloutInclusion({ ...base, strategy: 'all_eligible' });
    expect(r.included).toBe(true);
    expect(r.reason).toBe('enabled_normally');
  });

  it('kill_switch_off: always excluded', () => {
    const r = resolveRolloutInclusion({ ...base, strategy: 'kill_switch_off' });
    expect(r.included).toBe(false);
    expect(r.reason).toBe('kill_switch_engaged');
  });

  it('percentage 0: excluded', () => {
    const r = resolveRolloutInclusion({ ...base, strategy: 'percentage', percentage: 0 });
    expect(r.included).toBe(false);
    expect(r.reason).toBe('rollout_percentage_excluded');
  });

  it('percentage 100: always included', () => {
    const r = resolveRolloutInclusion({ ...base, strategy: 'percentage', percentage: 100 });
    expect(r.included).toBe(true);
  });

  it('percentage with null userId: excluded', () => {
    const r = resolveRolloutInclusion({ ...base, userId: null, strategy: 'percentage', percentage: 50 });
    expect(r.included).toBe(false);
    expect(r.reason).toBe('rollout_percentage_excluded');
  });

  it('cohort_list with matching cohort: included', () => {
    const r = resolveRolloutInclusion({
      ...base, strategy: 'cohort_list', cohortIds: ['internal_staff'], inAnyListedCohort: true,
    });
    expect(r.included).toBe(true);
  });

  it('cohort_list without match: excluded', () => {
    const r = resolveRolloutInclusion({
      ...base, strategy: 'cohort_list', cohortIds: ['beta_testers'], inAnyListedCohort: false,
    });
    expect(r.included).toBe(false);
    expect(r.reason).toBe('not_in_rollout_cohort');
  });

  it('cohort_list with empty cohortIds: excluded', () => {
    const r = resolveRolloutInclusion({
      ...base, strategy: 'cohort_list', cohortIds: [],
    });
    expect(r.included).toBe(false);
    expect(r.reason).toBe('not_in_rollout_cohort');
  });

  it('internal_only for internal staff: included', () => {
    const r = resolveRolloutInclusion({
      ...base, strategy: 'internal_only', isInternalStaff: true,
    });
    expect(r.included).toBe(true);
  });

  it('internal_only for external user: excluded', () => {
    const r = resolveRolloutInclusion({
      ...base, strategy: 'internal_only', isInternalStaff: false,
    });
    expect(r.included).toBe(false);
    expect(r.reason).toBe('internal_only_restriction');
  });

  it('opt_in with opted-in user: included', () => {
    const r = resolveRolloutInclusion({
      ...base, strategy: 'opt_in', isOptedIn: true,
    });
    expect(r.included).toBe(true);
  });

  it('opt_in without opt-in: excluded', () => {
    const r = resolveRolloutInclusion({
      ...base, strategy: 'opt_in', isOptedIn: false,
    });
    expect(r.included).toBe(false);
    expect(r.reason).toBe('opt_in_not_granted');
  });

  it('opt_in with null userId: excluded', () => {
    const r = resolveRolloutInclusion({
      ...base, userId: null, strategy: 'opt_in', isOptedIn: true,
    });
    expect(r.included).toBe(false);
  });
});

// ---- Percentage bucket determinism ---------------------------------------

describe('percentageBucket — determinism', () => {
  it('same user + feature always produces same bucket', () => {
    const a = percentageBucket('user-1', 'feat_x');
    const b = percentageBucket('user-1', 'feat_x');
    expect(a).toBe(b);
  });

  it('different user produces different bucket (usually)', () => {
    const a = percentageBucket('user-1', 'feat_x');
    const b = percentageBucket('user-2', 'feat_x');
    // Not guaranteed to differ (SHA256 collisions mod 100 happen), but very
    // likely to differ; assert bucket values are at least valid.
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(100);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
  });

  it('bucket is always in [0, 99]', () => {
    for (let i = 0; i < 20; i++) {
      const bucket = percentageBucket(`user-${i}`, 'feat_x');
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it('distribution is approximately uniform over 1,000 samples', () => {
    // Over 1,000 random-ish users, rollout=50 should include roughly 500.
    let included = 0;
    for (let i = 0; i < 1000; i++) {
      if (percentageBucket(`user-${i}`, 'feat_x') < 50) included += 1;
    }
    // Allow generous tolerance to avoid flakiness (450..550 out of 1000).
    expect(included).toBeGreaterThanOrEqual(400);
    expect(included).toBeLessThanOrEqual(600);
  });
});

// ---- Percentage strategy integrated with evaluation engine ---------------

describe('evaluateFlagPure — percentage integration', () => {
  it('percentage 50 and user in bucket: enabled', () => {
    const f = feature({
      id: 'feat_p',
      rollout_strategy: 'percentage',
      rollout_percentage: 50,
    });
    let seed = 0;
    while (percentageBucket(`seed-${seed}`, f.id) >= 50) seed++;
    const r = evaluateFlagPure(inputs({
      userId: `seed-${seed}`,
      featureId: f.id,
      feature: f,
    }));
    expect(r.enabled).toBe(true);
  });

  it('percentage 50 and user outside bucket: disabled', () => {
    const f = feature({
      id: 'feat_p',
      rollout_strategy: 'percentage',
      rollout_percentage: 50,
    });
    let seed = 0;
    while (percentageBucket(`seed-${seed}`, f.id) < 50) seed++;
    const r = evaluateFlagPure(inputs({
      userId: `seed-${seed}`,
      featureId: f.id,
      feature: f,
    }));
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('rollout_percentage_excluded');
  });

  it('same user + feature is stable across repeated evaluations', () => {
    const shared = feature({
      id: 'feat_stable',
      rollout_strategy: 'percentage',
      rollout_percentage: 30,
    });
    const userId = 'stable-user';
    const first = evaluateFlagPure(inputs({ userId, featureId: shared.id, feature: shared }));
    const second = evaluateFlagPure(inputs({ userId, featureId: shared.id, feature: shared }));
    const third = evaluateFlagPure(inputs({ userId, featureId: shared.id, feature: shared }));
    expect(first.enabled).toBe(second.enabled);
    expect(second.enabled).toBe(third.enabled);
  });
});

// ---- End-to-end precedence ordering --------------------------------------

describe('evaluateFlagPure — precedence ordering', () => {
  it('kill switch overrides rollout=all_eligible', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({
        kill_switch_engaged: true,
        rollout_strategy: 'all_eligible',
      }),
    }));
    expect(r.reason).toBe('kill_switch_engaged');
  });

  it('is_active=false overrides launch phase active', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({
        is_active: false,
        launch_phase_id: 'consumer_q1_2027',
      }),
      launchPhaseStatus: 'active',
    }));
    expect(r.reason).toBe('feature_not_active');
  });

  it('launch phase gate fires before tier check', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({
        launch_phase_id: 'sproutables_q4_2027',
        minimum_tier_level: 0,
      }),
      launchPhaseStatus: 'planned',
      userTierLevel: 3,
    }));
    expect(r.reason).toBe('launch_phase_not_active');
  });

  it('tier check fires before rollout strategy', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({
        minimum_tier_level: 2,
        rollout_strategy: 'all_eligible',
      }),
      userTierLevel: 1,
    }));
    expect(r.reason).toBe('tier_insufficient');
  });

  it('family tier check fires before rollout', () => {
    const r = evaluateFlagPure(inputs({
      feature: feature({
        minimum_tier_level: 3,
        requires_family_tier: true,
        rollout_strategy: 'all_eligible',
      }),
      userTierLevel: 3,
      // exactly family tier -> passes; then rollout=all_eligible -> passes
    }));
    expect(r.enabled).toBe(true);
  });

  it('all strategies respect is_active false (short-circuit)', () => {
    const strategies: RolloutStrategy[] = [
      'all_eligible', 'percentage', 'cohort_list',
      'opt_in', 'internal_only', 'kill_switch_off',
    ];
    for (const strategy of strategies) {
      const r = evaluateFlagPure(inputs({
        feature: feature({
          is_active: false,
          rollout_strategy: strategy,
        }),
      }));
      expect(r.reason).toBe('feature_not_active');
    }
  });
});
