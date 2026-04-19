// Prompt #95 Phase 2: pure tests for the governance configuration log
// row builder and state-diff helper.

import { describe, it, expect } from 'vitest';
import {
  buildConfigLogRow,
  diffStates,
  type ConfigLogInput,
} from '@/lib/governance/config-log';

const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const TARGET_ID = '10000000-0000-0000-0000-000000000002';

function base(overrides: Partial<ConfigLogInput> = {}): ConfigLogInput {
  return {
    changeType: 'decision_rights_rule_updated',
    targetTable: 'decision_rights_rules',
    targetId: TARGET_ID,
    previousState: { target_decision_sla_hours: 24 },
    newState: { target_decision_sla_hours: 48 },
    changedBy: ADMIN_ID,
    justification: 'Extend moderate SLA so CFO has time to review (was 24h, now 48h)',
    ...overrides,
  };
}

describe('buildConfigLogRow', () => {
  it('produces a complete row when all fields present', () => {
    const row = buildConfigLogRow(base());
    expect(row.change_type).toBe('decision_rights_rule_updated');
    expect(row.target_table).toBe('decision_rights_rules');
    expect(row.target_id).toBe(TARGET_ID);
    expect(row.changed_by).toBe(ADMIN_ID);
    expect(row.change_justification).toContain('SLA');
  });

  it('rejects an empty justification', () => {
    expect(() => buildConfigLogRow(base({ justification: '' }))).toThrow(/justification/i);
  });

  it('rejects a whitespace-only justification', () => {
    expect(() => buildConfigLogRow(base({ justification: '   ' }))).toThrow(/justification/i);
  });

  it('rejects a too-short justification', () => {
    expect(() => buildConfigLogRow(base({ justification: 'short' }))).toThrow(/justification/i);
  });

  it('trims leading and trailing whitespace from justification', () => {
    const row = buildConfigLogRow(base({ justification: '   valid reason with enough length   ' }));
    expect(row.change_justification).toBe('valid reason with enough length');
  });

  it('accepts all 5 change types', () => {
    const types: ConfigLogInput['changeType'][] = [
      'decision_rights_rule_updated',
      'decision_rights_rule_created',
      'decision_rights_rule_deactivated',
      'approver_assigned',
      'approver_unassigned',
    ];
    for (const changeType of types) {
      const row = buildConfigLogRow(base({ changeType }));
      expect(row.change_type).toBe(changeType);
    }
  });

  it('permits null previousState for creation events', () => {
    const row = buildConfigLogRow(base({
      changeType: 'approver_assigned',
      previousState: null,
      newState: { approver_role: 'cfo', user_id: ADMIN_ID },
    }));
    expect(row.previous_state).toBeNull();
    expect(row.new_state).not.toBeNull();
  });
});

describe('diffStates', () => {
  it('empty when states are identical', () => {
    const { previous, next } = diffStates({ a: 1, b: 2 }, { a: 1, b: 2 });
    expect(previous).toEqual({});
    expect(next).toEqual({});
  });

  it('captures only fields that changed', () => {
    const { previous, next } = diffStates(
      { a: 1, b: 'x', c: true },
      { a: 1, b: 'y', c: true },
    );
    expect(previous).toEqual({ b: 'x' });
    expect(next).toEqual({ b: 'y' });
  });

  it('treats different array contents as a change', () => {
    const { previous, next } = diffStates(
      { roles: ['ceo'] },
      { roles: ['ceo', 'cfo'] },
    );
    expect(previous.roles).toEqual(['ceo']);
    expect(next.roles).toEqual(['ceo', 'cfo']);
  });

  it('treats same-array different-order as a change (order matters)', () => {
    const { previous, next } = diffStates(
      { roles: ['a', 'b'] },
      { roles: ['b', 'a'] },
    );
    expect(previous.roles).toEqual(['a', 'b']);
    expect(next.roles).toEqual(['b', 'a']);
  });

  it('handles null transitions correctly', () => {
    const { previous, next } = diffStates(
      { max_percent: null },
      { max_percent: 15 },
    );
    expect(previous.max_percent).toBeNull();
    expect(next.max_percent).toBe(15);
  });

  it('handles newly added keys (previously missing)', () => {
    const { previous, next } = diffStates({ a: 1 }, { a: 1, b: 2 });
    expect(previous.b).toBeUndefined();
    expect(next.b).toBe(2);
  });

  it('nested object changes are captured at top level', () => {
    const { previous, next } = diffStates(
      { nested: { x: 1 } },
      { nested: { x: 2 } },
    );
    expect(previous.nested).toEqual({ x: 1 });
    expect(next.nested).toEqual({ x: 2 });
  });

  it('identical nested objects produce no diff', () => {
    const { previous, next } = diffStates(
      { nested: { x: 1, y: 'z' } },
      { nested: { x: 1, y: 'z' } },
    );
    expect(previous).toEqual({});
    expect(next).toEqual({});
  });
});
