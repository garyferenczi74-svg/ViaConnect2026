// Prompt #93 Phase 2: Server-side flag evaluation engine.
//
// The evaluation engine is a single pure function wrapped in a DB-backed
// loader. Five layered checks run in fixed order:
//
//   1. Kill switch         overrides every other check
//   2. is_active           feature globally disabled
//   3. Launch phase        must be active or completed if feature is linked
//   4. Tier gating         minimum_tier_level (and family + genex360 flags)
//   5. Rollout strategy    all_eligible / percentage / cohort_list /
//                          opt_in / internal_only / kill_switch_off
//
// Splitting the logic into `evaluateFlagPure` (no DB) and `evaluateFlag`
// (loads data then calls pure) lets every decision path be tested without
// mocking Supabase.

import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { tierIdToLevel } from '@/types/pricing';
import { getEffectiveTierForUser } from '@/lib/pricing/membership-manager';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';
import type {
  CohortDefinition,
  FlagEvaluationResult,
  FlagEvaluationReason,
  GateBehavior,
  LaunchPhaseStatus,
  RolloutStrategy,
} from '@/types/flags';

// ---- Shapes the pure function needs ---------------------------------------

export interface PureFeatureShape {
  id: string;
  is_active: boolean;
  kill_switch_engaged: boolean;
  launch_phase_id: string | null;
  minimum_tier_level: number;
  requires_family_tier: boolean;
  requires_genex360: boolean;
  gate_behavior: GateBehavior;
  rollout_strategy: RolloutStrategy;
  rollout_percentage: number | null;
  rollout_cohort_ids: string[];
}

export interface PureEvaluationInputs {
  userId: string | null;
  featureId: string;
  feature: PureFeatureShape | null;
  launchPhaseStatus: LaunchPhaseStatus | null;
  userTierLevel: number;
  ownsGeneX360: boolean;
  inAnyListedCohort: boolean;
  isInternalStaff: boolean;
  isOptedIn: boolean;
}

// ---- Pure evaluation (no DB) ---------------------------------------------

export function evaluateFlagPure(inputs: PureEvaluationInputs): FlagEvaluationResult {
  const { feature, featureId } = inputs;

  if (!feature) {
    return {
      featureId,
      enabled: false,
      reason: 'feature_not_found',
      gateBehavior: 'hide',
    };
  }

  // 1. Kill switch — overrides everything
  if (feature.kill_switch_engaged) {
    return {
      featureId,
      enabled: false,
      reason: 'kill_switch_engaged',
      gateBehavior: 'hide',
    };
  }

  // 2. Globally inactive
  if (!feature.is_active) {
    return {
      featureId,
      enabled: false,
      reason: 'feature_not_active',
      gateBehavior: 'hide',
    };
  }

  // 3. Launch phase gate
  if (feature.launch_phase_id) {
    const status = inputs.launchPhaseStatus;
    if (status !== 'active' && status !== 'completed') {
      return {
        featureId,
        enabled: false,
        reason: status === 'paused' ? 'launch_phase_paused' : 'launch_phase_not_active',
        gateBehavior: feature.gate_behavior,
        metadata: {
          launchPhaseId: feature.launch_phase_id,
          launchPhaseStatus: status ?? undefined,
        },
      };
    }
  }

  // 4. Tier gating
  if (inputs.userTierLevel < feature.minimum_tier_level) {
    return {
      featureId,
      enabled: false,
      reason: 'tier_insufficient',
      gateBehavior: feature.gate_behavior,
      metadata: { requiredTier: feature.minimum_tier_level },
    };
  }

  // 5. Family tier requirement
  if (feature.requires_family_tier && inputs.userTierLevel !== 3) {
    return {
      featureId,
      enabled: false,
      reason: 'requires_family_tier',
      gateBehavior: feature.gate_behavior,
    };
  }

  // 6. GeneX360 requirement (authenticated users only; anonymous fails tier above)
  if (feature.requires_genex360 && !inputs.ownsGeneX360) {
    return {
      featureId,
      enabled: false,
      reason: 'requires_genex360',
      gateBehavior: feature.gate_behavior,
    };
  }

  // 7. Rollout strategy
  const rollout = resolveRolloutInclusion({
    userId: inputs.userId,
    featureId: feature.id,
    strategy: feature.rollout_strategy,
    percentage: feature.rollout_percentage,
    cohortIds: feature.rollout_cohort_ids,
    inAnyListedCohort: inputs.inAnyListedCohort,
    isInternalStaff: inputs.isInternalStaff,
    isOptedIn: inputs.isOptedIn,
  });

  if (!rollout.included) {
    return {
      featureId,
      enabled: false,
      reason: rollout.reason,
      gateBehavior: feature.gate_behavior,
      metadata: {
        rolloutStrategy: feature.rollout_strategy,
        userInRollout: false,
      },
    };
  }

  return {
    featureId,
    enabled: true,
    reason: 'enabled_normally',
    gateBehavior: feature.gate_behavior,
    metadata: {
      rolloutStrategy: feature.rollout_strategy,
      userInRollout: true,
    },
  };
}

// ---- Rollout strategy resolver (pure) ------------------------------------

interface RolloutInclusion {
  included: boolean;
  reason: FlagEvaluationReason;
}

export function resolveRolloutInclusion(params: {
  userId: string | null;
  featureId: string;
  strategy: RolloutStrategy;
  percentage: number | null;
  cohortIds: string[];
  inAnyListedCohort: boolean;
  isInternalStaff: boolean;
  isOptedIn: boolean;
}): RolloutInclusion {
  switch (params.strategy) {
    case 'kill_switch_off':
      return { included: false, reason: 'kill_switch_engaged' };

    case 'all_eligible':
      return { included: true, reason: 'enabled_normally' };

    case 'percentage': {
      if (params.percentage === null || params.percentage <= 0) {
        return { included: false, reason: 'rollout_percentage_excluded' };
      }
      if (params.percentage >= 100) {
        return { included: true, reason: 'enabled_normally' };
      }
      if (!params.userId) {
        // Anonymous can't be bucketed — default to excluded for safety.
        return { included: false, reason: 'rollout_percentage_excluded' };
      }
      const bucket = percentageBucket(params.userId, params.featureId);
      return bucket < params.percentage
        ? { included: true, reason: 'enabled_normally' }
        : { included: false, reason: 'rollout_percentage_excluded' };
    }

    case 'cohort_list': {
      if (!params.userId || params.cohortIds.length === 0) {
        return { included: false, reason: 'not_in_rollout_cohort' };
      }
      return params.inAnyListedCohort
        ? { included: true, reason: 'enabled_normally' }
        : { included: false, reason: 'not_in_rollout_cohort' };
    }

    case 'internal_only':
      return params.isInternalStaff
        ? { included: true, reason: 'enabled_normally' }
        : { included: false, reason: 'internal_only_restriction' };

    case 'opt_in':
      if (!params.userId) {
        return { included: false, reason: 'opt_in_not_granted' };
      }
      return params.isOptedIn
        ? { included: true, reason: 'enabled_normally' }
        : { included: false, reason: 'opt_in_not_granted' };

    default:
      return { included: false, reason: 'feature_not_active' };
  }
}

/** Deterministic 0..99 bucket for (userId, featureId). Pure. */
export function percentageBucket(userId: string, featureId: string): number {
  const hash = createHash('sha256').update(`${userId}:${featureId}`).digest();
  return hash.readUInt32BE(0) % 100;
}

// ---- DB-backed evaluation -------------------------------------------------

export async function evaluateFlag(params: {
  userId: string | null;
  featureId: string;
}): Promise<FlagEvaluationResult> {
  const supabase = createClient() as unknown as PricingSupabaseClient;

  const { data: featureRow } = await supabase
    .from('features')
    .select(
      'id, is_active, kill_switch_engaged, launch_phase_id, minimum_tier_level, requires_family_tier, requires_genex360, gate_behavior, rollout_strategy, rollout_percentage, rollout_cohort_ids',
    )
    .eq('id', params.featureId)
    .maybeSingle();

  const feature = featureRow as PureFeatureShape | null;

  if (!feature) {
    return {
      featureId: params.featureId,
      enabled: false,
      reason: 'feature_not_found',
      gateBehavior: 'hide',
    };
  }

  // Fast-path: kill switch + is_active short-circuit without loading anything
  // else. Matches the pure function's order; keeps the kill switch hot-path
  // fast for a production emergency.
  if (feature.kill_switch_engaged || !feature.is_active) {
    return evaluateFlagPure({
      userId: params.userId,
      featureId: params.featureId,
      feature,
      launchPhaseStatus: null,
      userTierLevel: 0,
      ownsGeneX360: false,
      inAnyListedCohort: false,
      isInternalStaff: false,
      isOptedIn: false,
    });
  }

  // Load remaining signals in parallel.
  const [launchPhaseStatus, userTierLevel, ownsGeneX360, cohortMatch, isInternalStaff, isOptedIn] =
    await Promise.all([
      feature.launch_phase_id ? loadLaunchPhaseStatus(supabase, feature.launch_phase_id) : null,
      params.userId ? loadUserTierLevel(supabase, params.userId) : 0,
      params.userId && feature.requires_genex360 ? userOwnsGeneX360(supabase, params.userId) : false,
      params.userId && feature.rollout_strategy === 'cohort_list' && feature.rollout_cohort_ids.length > 0
        ? userInAnyCohort(supabase, params.userId, feature.rollout_cohort_ids)
        : false,
      params.userId && feature.rollout_strategy === 'internal_only'
        ? userIsInternalStaff(supabase, params.userId)
        : false,
      params.userId && feature.rollout_strategy === 'opt_in'
        ? userIsOptedIn(supabase, params.userId, feature.id)
        : false,
    ]);

  return evaluateFlagPure({
    userId: params.userId,
    featureId: params.featureId,
    feature,
    launchPhaseStatus,
    userTierLevel,
    ownsGeneX360,
    inAnyListedCohort: cohortMatch,
    isInternalStaff,
    isOptedIn,
  });
}

// ---- Data loaders ---------------------------------------------------------

async function loadLaunchPhaseStatus(
  client: PricingSupabaseClient,
  phaseId: string,
): Promise<LaunchPhaseStatus | null> {
  const { data } = await client
    .from('launch_phases')
    .select('activation_status')
    .eq('id', phaseId)
    .maybeSingle();
  return ((data as { activation_status: LaunchPhaseStatus } | null) ?? null)?.activation_status ?? null;
}

async function loadUserTierLevel(client: PricingSupabaseClient, userId: string): Promise<number> {
  const tierId = await getEffectiveTierForUser(client, userId);
  return tierIdToLevel(tierId);
}

async function userOwnsGeneX360(client: PricingSupabaseClient, userId: string): Promise<boolean> {
  const { count } = await client
    .from('genex360_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('payment_status', 'paid');
  return (count ?? 0) > 0;
}

async function userInAnyCohort(
  client: PricingSupabaseClient,
  userId: string,
  cohortIds: string[],
): Promise<boolean> {
  const { data } = await client
    .from('rollout_cohorts')
    .select('id, definition')
    .in('id', cohortIds)
    .eq('is_active', true);
  const cohorts = (data ?? []) as unknown as Array<{ id: string; definition: CohortDefinition }>;

  for (const cohort of cohorts) {
    if (await matchCohortDefinition(client, userId, cohort.definition)) {
      return true;
    }
  }
  return false;
}

async function matchCohortDefinition(
  client: PricingSupabaseClient,
  userId: string,
  definition: CohortDefinition,
): Promise<boolean> {
  switch (definition.type) {
    case 'profile_role_match': {
      const { data: profile } = await client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      const row = profile as { role: string | null } | null;
      return row?.role ? definition.roles.includes(row.role) : false;
    }
    case 'explicit_user_list':
      return definition.user_ids.includes(userId);
    case 'practitioner_cohort_match': {
      // Practitioner cohort metadata (practitioners.cohort_number column or
      // a separate practitioner_cohorts table) is not in the current schema.
      // All active practitioners are treated as the Cohort 1 launch wave
      // until that data lands. Future work: add practitioners.cohort_number
      // and match on it here.
      if (definition.cohort_number !== 1) return false;
      const { data } = await client
        .from('practitioners')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      const row = data as { status: string } | null;
      return row?.status === 'active';
    }
    default:
      return false;
  }
}

async function userIsInternalStaff(
  client: PricingSupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  const row = data as { role: string | null } | null;
  const role = row?.role;
  return role === 'admin' || role === 'staff' || role === 'founder';
}

async function userIsOptedIn(
  client: PricingSupabaseClient,
  userId: string,
  featureId: string,
): Promise<boolean> {
  const { data } = await client
    .from('user_feature_opt_ins')
    .select('opted_in')
    .eq('user_id', userId)
    .eq('feature_id', featureId)
    .maybeSingle();
  const row = data as { opted_in: boolean } | null;
  return !!row?.opted_in;
}
