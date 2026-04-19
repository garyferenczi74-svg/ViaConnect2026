// Prompt #93 Phase 5: pure tests for the scheduled activation dispatch.
//
// The Edge Function (supabase/functions/execute-scheduled-flags) calls an
// inlined copy of this same logic; the two must stay in sync. If a new
// target_action is added, update both files and add a test here.

import { describe, it, expect } from 'vitest';
import {
  buildExecutionPlan,
  type ScheduledActivationRow,
} from '@/lib/flags/execution-plan';

const FIXED_NOW = new Date('2026-05-01T12:00:00.000Z');
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

function row(overrides: Partial<ScheduledActivationRow> = {}): ScheduledActivationRow {
  return {
    id: '10000000-0000-0000-0000-000000000000',
    feature_id: 'feat_x',
    target_action: 'activate',
    target_value: {},
    scheduled_for: FIXED_NOW.toISOString(),
    scheduled_by: ADMIN_ID,
    ...overrides,
  };
}

describe('buildExecutionPlan', () => {
  it('activate targets features with is_active=true', () => {
    const plan = buildExecutionPlan(row({ target_action: 'activate' }), FIXED_NOW);
    expect(plan).toEqual({
      target: 'features',
      id: 'feat_x',
      updates: { is_active: true },
      auditChangeType: 'activated',
    });
  });

  it('deactivate targets features with is_active=false', () => {
    const plan = buildExecutionPlan(row({ target_action: 'deactivate' }), FIXED_NOW);
    expect(plan?.updates).toEqual({ is_active: false });
    expect(plan?.auditChangeType).toBe('deactivated');
  });

  it('kill_switch_engage sets all kill-switch columns with reason from target_value', () => {
    const plan = buildExecutionPlan(
      row({
        target_action: 'kill_switch_engage',
        target_value: { reason: 'production regression in payment flow' },
      }),
      FIXED_NOW,
    );
    expect(plan?.target).toBe('features');
    expect(plan?.updates).toEqual({
      kill_switch_engaged: true,
      kill_switch_engaged_at: FIXED_NOW.toISOString(),
      kill_switch_engaged_by: ADMIN_ID,
      kill_switch_reason: 'production regression in payment flow',
    });
    expect(plan?.auditChangeType).toBe('kill_switch_engaged');
  });

  it('kill_switch_engage falls back to default reason when target_value.reason missing', () => {
    const plan = buildExecutionPlan(
      row({ target_action: 'kill_switch_engage', target_value: {} }),
      FIXED_NOW,
    );
    expect(plan?.updates.kill_switch_reason).toBe('Scheduled activation');
  });

  it('kill_switch_release clears all kill-switch columns', () => {
    const plan = buildExecutionPlan(row({ target_action: 'kill_switch_release' }), FIXED_NOW);
    expect(plan?.updates).toEqual({
      kill_switch_engaged: false,
      kill_switch_engaged_at: null,
      kill_switch_engaged_by: null,
      kill_switch_reason: null,
    });
    expect(plan?.auditChangeType).toBe('kill_switch_released');
  });

  it('rollout_percentage_change writes the percentage', () => {
    const plan = buildExecutionPlan(
      row({ target_action: 'rollout_percentage_change', target_value: { percentage: 25 } }),
      FIXED_NOW,
    );
    expect(plan?.updates).toEqual({ rollout_percentage: 25 });
    expect(plan?.auditChangeType).toBe('rollout_percentage_changed');
  });

  it('rollout_percentage_change returns null for missing percentage', () => {
    const plan = buildExecutionPlan(
      row({ target_action: 'rollout_percentage_change', target_value: {} }),
      FIXED_NOW,
    );
    expect(plan).toBeNull();
  });

  it('rollout_percentage_change returns null for out-of-range percentage', () => {
    expect(
      buildExecutionPlan(
        row({ target_action: 'rollout_percentage_change', target_value: { percentage: 150 } }),
        FIXED_NOW,
      ),
    ).toBeNull();
    expect(
      buildExecutionPlan(
        row({ target_action: 'rollout_percentage_change', target_value: { percentage: -5 } }),
        FIXED_NOW,
      ),
    ).toBeNull();
  });

  it('phase_advance targets launch_phases and sets actual_activation_date for active', () => {
    const plan = buildExecutionPlan(
      row({
        target_action: 'phase_advance',
        target_value: { phase_id: 'consumer_q1_2027', new_status: 'active' },
      }),
      FIXED_NOW,
    );
    expect(plan?.target).toBe('launch_phases');
    expect(plan?.id).toBe('consumer_q1_2027');
    expect(plan?.updates.activation_status).toBe('active');
    expect(plan?.updates.actual_activation_date).toBe('2026-05-01');
    expect(plan?.auditChangeType).toBeNull();
  });

  it('phase_advance does NOT set actual_activation_date for non-active statuses', () => {
    const plan = buildExecutionPlan(
      row({
        target_action: 'phase_advance',
        target_value: { phase_id: 'consumer_q1_2027', new_status: 'paused' },
      }),
      FIXED_NOW,
    );
    expect(plan?.updates.activation_status).toBe('paused');
    expect(plan?.updates.actual_activation_date).toBeUndefined();
  });

  it('phase_advance defaults to active when new_status missing', () => {
    const plan = buildExecutionPlan(
      row({
        target_action: 'phase_advance',
        target_value: { phase_id: 'consumer_q1_2027' },
      }),
      FIXED_NOW,
    );
    expect(plan?.updates.activation_status).toBe('active');
  });

  it('phase_advance returns null when phase_id missing', () => {
    const plan = buildExecutionPlan(
      row({ target_action: 'phase_advance', target_value: {} }),
      FIXED_NOW,
    );
    expect(plan).toBeNull();
  });

  it('unknown target_action returns null (surfaces as execution_result=failed)', () => {
    const plan = buildExecutionPlan(row({ target_action: 'unknown_magic' }), FIXED_NOW);
    expect(plan).toBeNull();
  });

  it('timestamps are deterministic given a fixed now', () => {
    const plan = buildExecutionPlan(
      row({ target_action: 'kill_switch_engage' }),
      new Date('2027-01-15T00:00:00.000Z'),
    );
    expect(plan?.updates.kill_switch_engaged_at).toBe('2027-01-15T00:00:00.000Z');
  });
});
