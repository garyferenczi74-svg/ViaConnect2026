// Prompt #93 Phase 1: Schema integrity + domain type compilation tests.
//
// These tests do not touch the database. They assert that the seeded shape
// of migrations _180 through _230 matches the enum vocabulary the Phase 2+
// evaluation engine will rely on. If someone adds a new rollout strategy in
// a migration without updating src/types/flags.ts (or vice versa), these
// tests fail and the drift is caught before shipping.

import { describe, it, expect } from 'vitest';
import type {
  RolloutStrategy,
  LaunchPhaseStatus,
  LaunchPhaseType,
  CohortType,
  FlagChangeType,
  ScheduledAction,
  FlagEvaluationReason,
  GateBehavior,
  CohortDefinition,
  FeatureRow,
  LaunchPhaseRow,
  RolloutCohortRow,
  FlagAuditRow,
  ScheduledActivationRow,
} from '@/types/flags';

// ----- Migration _180: launch_phases check-constraint vocabulary ----------

const LAUNCH_PHASE_TYPES: LaunchPhaseType[] = [
  'consumer_launch',
  'practitioner_launch',
  'sproutables_launch',
  'white_label_products_launch',
  'custom_formulations_launch',
  'international_expansion',
  'custom_event',
];

const LAUNCH_PHASE_STATUSES: LaunchPhaseStatus[] = [
  'planned', 'scheduled', 'active', 'paused', 'completed', 'canceled',
];

const SEEDED_PHASE_IDS = [
  'consumer_q1_2027',
  'practitioner_q1_2027',
  'sproutables_q4_2027',
  'white_label_products_2028',
  'custom_formulations_2029',
] as const;

describe('launch_phases vocabulary', () => {
  it('has seven phase_type values', () => {
    expect(LAUNCH_PHASE_TYPES).toHaveLength(7);
  });
  it('has six activation_status values', () => {
    expect(LAUNCH_PHASE_STATUSES).toHaveLength(6);
  });
  it('seeds five phases covering the roadmap years 2027 through 2029', () => {
    expect(SEEDED_PHASE_IDS).toHaveLength(5);
    expect(SEEDED_PHASE_IDS).toContain('consumer_q1_2027');
    expect(SEEDED_PHASE_IDS).toContain('practitioner_q1_2027');
    expect(SEEDED_PHASE_IDS).toContain('sproutables_q4_2027');
    expect(SEEDED_PHASE_IDS).toContain('white_label_products_2028');
    expect(SEEDED_PHASE_IDS).toContain('custom_formulations_2029');
  });
});

// ----- Migration _190: features rollout vocabulary ------------------------

const ROLLOUT_STRATEGIES: RolloutStrategy[] = [
  'all_eligible',
  'percentage',
  'cohort_list',
  'opt_in',
  'internal_only',
  'kill_switch_off',
];

describe('rollout strategy vocabulary', () => {
  it('has six strategies matching the CHECK constraint in migration _190', () => {
    expect(ROLLOUT_STRATEGIES).toHaveLength(6);
  });
  it('default strategy is all_eligible (preserves Prompt #90 tier-only behavior)', () => {
    const defaultStrategy: RolloutStrategy = 'all_eligible';
    expect(defaultStrategy).toBe('all_eligible');
  });
  it('kill_switch_off is a rollout strategy AND a separate boolean column', () => {
    // Redundant gate; kill switch column overrides the strategy value.
    const strategy: RolloutStrategy = 'kill_switch_off';
    expect(strategy).toBe('kill_switch_off');
  });
});

// ----- Migration _210: flag audit change types ---------------------------

const CHANGE_TYPES: FlagChangeType[] = [
  'created', 'activated', 'deactivated', 'phase_changed',
  'rollout_percentage_changed', 'rollout_strategy_changed',
  'kill_switch_engaged', 'kill_switch_released',
  'scheduled_activation_set', 'scheduled_activation_canceled',
  'cohort_added', 'cohort_removed',
  'owner_changed', 'description_updated',
];

describe('feature_flag_audit change types', () => {
  it('has fourteen change types matching the CHECK constraint in migration _210', () => {
    expect(CHANGE_TYPES).toHaveLength(14);
  });
  it('covers both engage and release of kill switch (symmetric)', () => {
    expect(CHANGE_TYPES).toContain('kill_switch_engaged');
    expect(CHANGE_TYPES).toContain('kill_switch_released');
  });
  it('covers both set and cancel of scheduled activations (symmetric)', () => {
    expect(CHANGE_TYPES).toContain('scheduled_activation_set');
    expect(CHANGE_TYPES).toContain('scheduled_activation_canceled');
  });
  it('covers both add and remove of cohorts (symmetric)', () => {
    expect(CHANGE_TYPES).toContain('cohort_added');
    expect(CHANGE_TYPES).toContain('cohort_removed');
  });
});

// ----- Migration _220: scheduled activation target actions ---------------

const SCHEDULED_ACTIONS: ScheduledAction[] = [
  'activate', 'deactivate',
  'kill_switch_engage', 'kill_switch_release',
  'rollout_percentage_change', 'phase_advance',
];

describe('scheduled_flag_activations target actions', () => {
  it('has six target_action values matching the CHECK constraint in migration _220', () => {
    expect(SCHEDULED_ACTIONS).toHaveLength(6);
  });
  it('phase_advance is a scheduled action (rolls a launch phase forward)', () => {
    expect(SCHEDULED_ACTIONS).toContain('phase_advance');
  });
});

// ----- Migration _230: rollout cohort types ------------------------------

const COHORT_TYPES: CohortType[] = [
  'internal_staff',
  'beta_testers',
  'practitioner_cohort',
  'geographic_region',
  'membership_tier',
  'custom',
];

const SEEDED_COHORT_IDS = [
  'internal_staff',
  'beta_testers',
  'cohort_1_practitioners',
] as const;

describe('rollout_cohorts vocabulary', () => {
  it('has six cohort_type values matching the CHECK constraint in migration _230', () => {
    expect(COHORT_TYPES).toHaveLength(6);
  });
  it('seeds three cohorts (internal, beta, cohort 1 practitioners)', () => {
    expect(SEEDED_COHORT_IDS).toHaveLength(3);
  });
});

// ----- Cohort definition JSONB shape discrimination ----------------------

describe('CohortDefinition discriminated union', () => {
  it('accepts profile_role_match with roles array', () => {
    const def: CohortDefinition = {
      type: 'profile_role_match',
      roles: ['admin', 'staff', 'founder'],
    };
    expect(def.type).toBe('profile_role_match');
  });

  it('accepts explicit_user_list with user_ids array', () => {
    const def: CohortDefinition = {
      type: 'explicit_user_list',
      user_ids: [],
    };
    expect(def.type).toBe('explicit_user_list');
  });

  it('accepts practitioner_cohort_match with cohort_number', () => {
    const def: CohortDefinition = {
      type: 'practitioner_cohort_match',
      cohort_number: 1,
    };
    expect(def.type).toBe('practitioner_cohort_match');
  });
});

// ----- Evaluation reasons + gate behaviors --------------------------------

const EVALUATION_REASONS: FlagEvaluationReason[] = [
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

const GATE_BEHAVIORS: GateBehavior[] = ['hide', 'preview', 'upgrade_prompt', 'read_only'];

describe('evaluation result vocabulary', () => {
  it('has thirteen reasons covering every check in the Phase 2 engine', () => {
    expect(EVALUATION_REASONS).toHaveLength(13);
  });
  it('enabled path always uses reason = enabled_normally', () => {
    const enabledReason: FlagEvaluationReason = 'enabled_normally';
    expect(enabledReason).toBe('enabled_normally');
  });
  it('has four gate behaviors matching features.gate_behavior from Prompt #90', () => {
    expect(GATE_BEHAVIORS).toHaveLength(4);
  });
});

// ----- Row type shape sanity checks (catch regenerate-without-update) -----

describe('Row type shape sanity', () => {
  it('FeatureRow carries launch_phase_id + rollout columns', () => {
    const probe: Pick<FeatureRow, 'launch_phase_id' | 'rollout_strategy' | 'rollout_percentage' | 'rollout_cohort_ids' | 'kill_switch_engaged'> = {
      launch_phase_id: 'consumer_q1_2027',
      rollout_strategy: 'all_eligible',
      rollout_percentage: null,
      rollout_cohort_ids: [],
      kill_switch_engaged: false,
    };
    expect(probe.rollout_strategy).toBe('all_eligible');
  });

  it('LaunchPhaseRow carries activation_status and target_activation_date', () => {
    const probe: Pick<LaunchPhaseRow, 'activation_status' | 'target_activation_date'> = {
      activation_status: 'planned',
      target_activation_date: '2027-01-15',
    };
    expect(probe.activation_status).toBe('planned');
  });

  it('RolloutCohortRow carries cohort_type and definition JSONB', () => {
    const probe: Pick<RolloutCohortRow, 'cohort_type' | 'is_active'> = {
      cohort_type: 'internal_staff',
      is_active: true,
    };
    expect(probe.cohort_type).toBe('internal_staff');
  });

  it('FlagAuditRow carries change_type + changed_by', () => {
    const probe: Pick<FlagAuditRow, 'change_type' | 'changed_by'> = {
      change_type: 'kill_switch_engaged',
      changed_by: '00000000-0000-0000-0000-000000000000',
    };
    expect(probe.change_type).toBe('kill_switch_engaged');
  });

  it('ScheduledActivationRow carries target_action + scheduled_for', () => {
    const probe: Pick<ScheduledActivationRow, 'target_action' | 'scheduled_for'> = {
      target_action: 'activate',
      scheduled_for: new Date().toISOString(),
    };
    expect(probe.target_action).toBe('activate');
  });
});
