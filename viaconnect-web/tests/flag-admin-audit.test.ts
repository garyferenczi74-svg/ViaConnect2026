// Prompt #93 Phase 4: audit-entry builder + admin role check.

import { describe, it, expect } from 'vitest';
import { buildAuditEntries } from '@/lib/flags/audit-builder';
import { requireAdminRole } from '@/lib/flags/admin-guard';

const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

describe('buildAuditEntries', () => {
  it('no change produces no entries', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { is_active: true },
      newState: { is_active: true },
      changedBy: ADMIN_ID,
    });
    expect(rows).toHaveLength(0);
  });

  it('activating produces single activated entry', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { is_active: false },
      newState: { is_active: true },
      changedBy: ADMIN_ID,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].change_type).toBe('activated');
    expect(rows[0].feature_id).toBe('feat_x');
    expect(rows[0].changed_by).toBe(ADMIN_ID);
  });

  it('deactivating produces single deactivated entry', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { is_active: true },
      newState: { is_active: false },
      changedBy: ADMIN_ID,
    });
    expect(rows[0].change_type).toBe('deactivated');
  });

  it('kill switch engaged produces kill_switch_engaged entry', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { kill_switch_engaged: false },
      newState: { kill_switch_engaged: true },
      changedBy: ADMIN_ID,
      changeReason: 'prod regression',
    });
    expect(rows[0].change_type).toBe('kill_switch_engaged');
    expect(rows[0].change_reason).toBe('prod regression');
  });

  it('phase change produces phase_changed entry', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { launch_phase_id: 'consumer_q1_2027' },
      newState: { launch_phase_id: 'sproutables_q4_2027' },
      changedBy: ADMIN_ID,
    });
    expect(rows[0].change_type).toBe('phase_changed');
    expect(rows[0].previous_state).toEqual({ phase_changed: 'consumer_q1_2027' });
    expect(rows[0].new_state).toEqual({ phase_changed: 'sproutables_q4_2027' });
  });

  it('strategy + percentage change produces two distinct entries', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { rollout_strategy: 'all_eligible', rollout_percentage: null },
      newState: { rollout_strategy: 'percentage', rollout_percentage: 50 },
      changedBy: ADMIN_ID,
    });
    const types = rows.map((r) => r.change_type);
    expect(types).toContain('rollout_strategy_changed');
    expect(types).toContain('rollout_percentage_changed');
    expect(rows).toHaveLength(2);
  });

  it('cohort additions and removals produce separate per-cohort entries', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { rollout_cohort_ids: ['internal_staff'] },
      newState: { rollout_cohort_ids: ['beta_testers', 'cohort_1_practitioners'] },
      changedBy: ADMIN_ID,
    });
    const added = rows.filter((r) => r.change_type === 'cohort_added');
    const removed = rows.filter((r) => r.change_type === 'cohort_removed');
    expect(added).toHaveLength(2);
    expect(removed).toHaveLength(1);
    expect(added.map((r) => r.new_state.cohort_added).sort()).toEqual([
      'beta_testers',
      'cohort_1_practitioners',
    ]);
    expect(removed[0].previous_state.cohort_removed).toBe('internal_staff');
  });

  it('owner change emits owner_changed entry', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { feature_owner: null },
      newState: { feature_owner: ADMIN_ID },
      changedBy: ADMIN_ID,
    });
    expect(rows[0].change_type).toBe('owner_changed');
  });

  it('description update emits description_updated entry', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { description: 'old' },
      newState: { description: 'new' },
      changedBy: ADMIN_ID,
    });
    expect(rows[0].change_type).toBe('description_updated');
  });

  it('records user agent + ip when provided', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: { is_active: false },
      newState: { is_active: true },
      changedBy: ADMIN_ID,
      userAgent: 'Mozilla/5.0',
      ipAddress: '203.0.113.42',
    });
    expect(rows[0].user_agent).toBe('Mozilla/5.0');
    expect(rows[0].ip_address).toBe('203.0.113.42');
  });

  it('kill switch change + strategy change in same save produces both', () => {
    const rows = buildAuditEntries({
      featureId: 'feat_x',
      previousState: {
        kill_switch_engaged: true,
        rollout_strategy: 'all_eligible',
      },
      newState: {
        kill_switch_engaged: false,
        rollout_strategy: 'percentage',
      },
      changedBy: ADMIN_ID,
    });
    const types = rows.map((r) => r.change_type).sort();
    expect(types).toEqual(['kill_switch_released', 'rollout_strategy_changed']);
  });
});

describe('requireAdminRole', () => {
  it('allows admin', () => {
    expect(requireAdminRole('admin')).toBe(true);
  });
  it('allows founder', () => {
    expect(requireAdminRole('founder')).toBe(true);
  });
  it('allows staff', () => {
    expect(requireAdminRole('staff')).toBe(true);
  });
  it('rejects naturopath', () => {
    expect(requireAdminRole('naturopath')).toBe(false);
  });
  it('rejects consumer', () => {
    expect(requireAdminRole('consumer')).toBe(false);
  });
  it('rejects null', () => {
    expect(requireAdminRole(null)).toBe(false);
  });
  it('rejects undefined', () => {
    expect(requireAdminRole(undefined)).toBe(false);
  });
});
