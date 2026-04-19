// Prompt #95 Phase 2: pure config-log row builder.
//
// Converts (previousState, newState, changeType) into a
// governance_configuration_log row payload. The application layer ALWAYS
// writes a log row after mutating decision_rights_rules or
// approver_assignments; this helper keeps the shape consistent.

export type GovernanceChangeType =
  | 'decision_rights_rule_updated'
  | 'decision_rights_rule_created'
  | 'decision_rights_rule_deactivated'
  | 'approver_assigned'
  | 'approver_unassigned';

export interface ConfigLogInput {
  changeType: GovernanceChangeType;
  targetTable: 'decision_rights_rules' | 'approver_assignments';
  targetId: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  changedBy: string;
  justification: string;
}

export interface ConfigLogRow {
  change_type: GovernanceChangeType;
  target_table: string;
  target_id: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  changed_by: string;
  change_justification: string;
}

export function buildConfigLogRow(input: ConfigLogInput): ConfigLogRow {
  if (!input.justification || input.justification.trim().length < 10) {
    throw new Error('Governance config changes require a non-trivial justification (>=10 chars)');
  }
  return {
    change_type: input.changeType,
    target_table: input.targetTable,
    target_id: input.targetId,
    previous_state: input.previousState,
    new_state: input.newState,
    changed_by: input.changedBy,
    change_justification: input.justification.trim(),
  };
}

/** Pure: compute a minimal patch from previous to new state. Used to store
 *  only the fields that actually changed in the log, keeping JSONB compact. */
export function diffStates(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): { previous: Record<string, unknown>; next: Record<string, unknown> } {
  const prevDiff: Record<string, unknown> = {};
  const nextDiff: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const k of allKeys) {
    if (!deepEqual(previous[k], next[k])) {
      prevDiff[k] = previous[k];
      nextDiff[k] = next[k];
    }
  }
  return { previous: prevDiff, next: nextDiff };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) =>
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    );
  }
  return false;
}
