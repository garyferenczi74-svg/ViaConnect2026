// Prompt #93 Phase 1: Feature flag + launch phase domain types.
//
// These are the shared types the evaluation engine (Phase 2), the React
// components (Phase 3), the admin UI (Phase 4), the scheduled activation
// Edge Function (Phase 5), and the monitoring views (Phase 6) all agree on.
// Row types come from the generated Database schema; behavior types
// (strategy, reason, change type) are defined here to keep the enum
// vocabulary authoritative in one place.

import type { Database } from '@/lib/supabase/types';

// ----- Row-shaped types from the generated schema --------------------------

export type FeatureRow = Database['public']['Tables']['features']['Row'];
export type LaunchPhaseRow = Database['public']['Tables']['launch_phases']['Row'];
export type RolloutCohortRow = Database['public']['Tables']['rollout_cohorts']['Row'];
export type FlagAuditRow = Database['public']['Tables']['feature_flag_audit']['Row'];
export type ScheduledActivationRow = Database['public']['Tables']['scheduled_flag_activations']['Row'];

// ----- Controlled vocabulary ------------------------------------------------

export type RolloutStrategy =
  | 'all_eligible'
  | 'percentage'
  | 'cohort_list'
  | 'opt_in'
  | 'internal_only'
  | 'kill_switch_off';

export type LaunchPhaseStatus =
  | 'planned'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'canceled';

export type LaunchPhaseType =
  | 'consumer_launch'
  | 'practitioner_launch'
  | 'sproutables_launch'
  | 'white_label_products_launch'
  | 'custom_formulations_launch'
  | 'international_expansion'
  | 'custom_event';

export type CohortType =
  | 'internal_staff'
  | 'beta_testers'
  | 'practitioner_cohort'
  | 'geographic_region'
  | 'membership_tier'
  | 'custom';

export type FlagChangeType =
  | 'created'
  | 'activated'
  | 'deactivated'
  | 'phase_changed'
  | 'rollout_percentage_changed'
  | 'rollout_strategy_changed'
  | 'kill_switch_engaged'
  | 'kill_switch_released'
  | 'scheduled_activation_set'
  | 'scheduled_activation_canceled'
  | 'cohort_added'
  | 'cohort_removed'
  | 'owner_changed'
  | 'description_updated';

export type ScheduledAction =
  | 'activate'
  | 'deactivate'
  | 'kill_switch_engage'
  | 'kill_switch_release'
  | 'rollout_percentage_change'
  | 'phase_advance';

// ----- Evaluation engine result (consumed by Phase 2+) ---------------------

export type GateBehavior = 'hide' | 'preview' | 'upgrade_prompt' | 'read_only';

export type FlagEvaluationReason =
  | 'enabled_normally'
  | 'kill_switch_engaged'
  | 'feature_not_active'
  | 'feature_not_found'
  | 'launch_phase_not_active'
  | 'launch_phase_paused'
  | 'tier_insufficient'
  | 'requires_family_tier'
  | 'requires_genex360'
  | 'rollout_percentage_excluded'
  | 'not_in_rollout_cohort'
  | 'internal_only_restriction'
  | 'opt_in_not_granted';

export interface FlagEvaluationResult {
  featureId: string;
  enabled: boolean;
  reason: FlagEvaluationReason;
  gateBehavior: GateBehavior;
  metadata?: {
    requiredTier?: number;
    launchPhaseStatus?: LaunchPhaseStatus;
    launchPhaseId?: string;
    rolloutStrategy?: RolloutStrategy;
    userInRollout?: boolean;
  };
}

// ----- Cohort membership rule JSONB shapes ---------------------------------

export interface ProfileRoleMatchDefinition {
  type: 'profile_role_match';
  roles: string[];
}

export interface ExplicitUserListDefinition {
  type: 'explicit_user_list';
  user_ids: string[];
}

export interface PractitionerCohortMatchDefinition {
  type: 'practitioner_cohort_match';
  cohort_number: number;
}

export type CohortDefinition =
  | ProfileRoleMatchDefinition
  | ExplicitUserListDefinition
  | PractitionerCohortMatchDefinition;
