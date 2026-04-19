// Prompt #93 Phase 4: pure audit-entry builder.
//
// Converts (previousState, newState) into an ordered list of audit rows
// keyed by what actually changed. Used by all admin mutation endpoints
// to keep the feature_flag_audit entries consistent.

import type { FlagChangeType } from '@/types/flags';

export interface AuditEntryInput {
  featureId: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  changedBy: string;
  changeReason?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuditEntryRow {
  feature_id: string;
  change_type: FlagChangeType;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  change_reason: string | null;
  changed_by: string;
  user_agent: string | null;
  ip_address: string | null;
}

/** Pure: diff previous vs new state, emit one audit row per semantically
 *  distinct change. Unknown columns are ignored so the function remains
 *  schema-tolerant when new flag columns are added. */
export function buildAuditEntries(input: AuditEntryInput): AuditEntryRow[] {
  const { previousState, newState } = input;
  const entries: AuditEntryRow[] = [];

  const mkEntry = (changeType: FlagChangeType, prev: unknown, next: unknown): AuditEntryRow => ({
    feature_id: input.featureId,
    change_type: changeType,
    previous_state: { [changeType]: prev },
    new_state: { [changeType]: next },
    change_reason: input.changeReason ?? null,
    changed_by: input.changedBy,
    user_agent: input.userAgent ?? null,
    ip_address: input.ipAddress ?? null,
  });

  if (previousState.is_active !== newState.is_active) {
    entries.push(
      mkEntry(
        newState.is_active ? 'activated' : 'deactivated',
        previousState.is_active,
        newState.is_active,
      ),
    );
  }

  if (previousState.kill_switch_engaged !== newState.kill_switch_engaged) {
    entries.push(
      mkEntry(
        newState.kill_switch_engaged ? 'kill_switch_engaged' : 'kill_switch_released',
        previousState.kill_switch_engaged,
        newState.kill_switch_engaged,
      ),
    );
  }

  if (previousState.launch_phase_id !== newState.launch_phase_id) {
    entries.push(mkEntry('phase_changed', previousState.launch_phase_id, newState.launch_phase_id));
  }

  if (previousState.rollout_strategy !== newState.rollout_strategy) {
    entries.push(
      mkEntry('rollout_strategy_changed', previousState.rollout_strategy, newState.rollout_strategy),
    );
  }

  if (previousState.rollout_percentage !== newState.rollout_percentage) {
    entries.push(
      mkEntry(
        'rollout_percentage_changed',
        previousState.rollout_percentage,
        newState.rollout_percentage,
      ),
    );
  }

  const prevCohorts = asStringArray(previousState.rollout_cohort_ids);
  const nextCohorts = asStringArray(newState.rollout_cohort_ids);
  const added = nextCohorts.filter((c) => !prevCohorts.includes(c));
  const removed = prevCohorts.filter((c) => !nextCohorts.includes(c));
  for (const cohort of added) {
    entries.push(mkEntry('cohort_added', null, cohort));
  }
  for (const cohort of removed) {
    entries.push(mkEntry('cohort_removed', cohort, null));
  }

  if (previousState.feature_owner !== newState.feature_owner) {
    entries.push(mkEntry('owner_changed', previousState.feature_owner, newState.feature_owner));
  }

  if (previousState.description !== newState.description) {
    entries.push(mkEntry('description_updated', previousState.description, newState.description));
  }

  return entries;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
