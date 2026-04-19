// Prompt #93 Phase 5: pure dispatch logic for the scheduled activation job.
//
// Mirrors the `buildExecutionPlan` in
// supabase/functions/execute-scheduled-flags/index.ts so the decision
// table can be unit-tested with Node/Vitest. Keep the two in sync — the
// Edge Function runs in Deno isolation and cannot import from src/.

export interface ScheduledActivationRow {
  id: string;
  feature_id: string;
  target_action: string;
  target_value: Record<string, unknown>;
  scheduled_for: string;
  scheduled_by: string;
}

export interface ExecutionPlan {
  target: 'features' | 'launch_phases';
  id: string;
  updates: Record<string, unknown>;
  auditChangeType: string | null;
}

export function buildExecutionPlan(
  row: ScheduledActivationRow,
  now: Date = new Date(),
): ExecutionPlan | null {
  const nowIso = now.toISOString();

  switch (row.target_action) {
    case 'activate':
      return {
        target: 'features',
        id: row.feature_id,
        updates: { is_active: true },
        auditChangeType: 'activated',
      };
    case 'deactivate':
      return {
        target: 'features',
        id: row.feature_id,
        updates: { is_active: false },
        auditChangeType: 'deactivated',
      };
    case 'kill_switch_engage': {
      const reason = typeof row.target_value?.reason === 'string'
        ? row.target_value.reason
        : 'Scheduled activation';
      return {
        target: 'features',
        id: row.feature_id,
        updates: {
          kill_switch_engaged: true,
          kill_switch_engaged_at: nowIso,
          kill_switch_engaged_by: row.scheduled_by,
          kill_switch_reason: reason,
        },
        auditChangeType: 'kill_switch_engaged',
      };
    }
    case 'kill_switch_release':
      return {
        target: 'features',
        id: row.feature_id,
        updates: {
          kill_switch_engaged: false,
          kill_switch_engaged_at: null,
          kill_switch_engaged_by: null,
          kill_switch_reason: null,
        },
        auditChangeType: 'kill_switch_released',
      };
    case 'rollout_percentage_change': {
      const percentage = typeof row.target_value?.percentage === 'number'
        ? row.target_value.percentage
        : null;
      if (percentage === null || percentage < 0 || percentage > 100) return null;
      return {
        target: 'features',
        id: row.feature_id,
        updates: { rollout_percentage: percentage },
        auditChangeType: 'rollout_percentage_changed',
      };
    }
    case 'phase_advance': {
      const phaseId = typeof row.target_value?.phase_id === 'string'
        ? row.target_value.phase_id
        : null;
      const newStatus = typeof row.target_value?.new_status === 'string'
        ? row.target_value.new_status
        : 'active';
      if (!phaseId) return null;
      const updates: Record<string, unknown> = {
        activation_status: newStatus,
        updated_at: nowIso,
      };
      if (newStatus === 'active') {
        updates.actual_activation_date = nowIso.slice(0, 10);
      }
      return {
        target: 'launch_phases',
        id: phaseId,
        updates,
        auditChangeType: null,
      };
    }
    default:
      return null;
  }
}
