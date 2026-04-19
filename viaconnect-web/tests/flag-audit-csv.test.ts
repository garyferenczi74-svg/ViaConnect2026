// Prompt #93 Phase 6: pure tests for the audit CSV serializer.

import { describe, it, expect } from 'vitest';
import { serializeAuditCsv, type AuditCsvRow } from '@/lib/flags/audit-csv';

function sample(overrides: Partial<AuditCsvRow> = {}): AuditCsvRow {
  return {
    id: '10000000-0000-0000-0000-000000000001',
    feature_id: 'feat_x',
    change_type: 'kill_switch_engaged',
    change_reason: 'production regression',
    changed_by: '20000000-0000-0000-0000-000000000002',
    changed_at: '2026-05-01T12:00:00.000Z',
    previous_state: { kill_switch_engaged: false },
    new_state: { kill_switch_engaged: true },
    user_agent: 'Mozilla/5.0',
    ip_address: '203.0.113.42',
    ...overrides,
  };
}

describe('serializeAuditCsv', () => {
  it('emits header row as first line', () => {
    const csv = serializeAuditCsv([]);
    expect(csv.split('\r\n')[0]).toBe(
      'changed_at,feature_id,change_type,change_reason,changed_by,previous_state,new_state,user_agent,ip_address,id',
    );
  });

  it('empty rows array produces only the header', () => {
    expect(serializeAuditCsv([])).toBe(
      'changed_at,feature_id,change_type,change_reason,changed_by,previous_state,new_state,user_agent,ip_address,id',
    );
  });

  it('uses CRLF line terminators per RFC 4180', () => {
    const csv = serializeAuditCsv([sample()]);
    expect(csv.includes('\r\n')).toBe(true);
  });

  it('quotes every field', () => {
    const csv = serializeAuditCsv([sample()]);
    const bodyLine = csv.split('\r\n')[1];
    expect(bodyLine.startsWith('"')).toBe(true);
    expect(bodyLine.endsWith('"')).toBe(true);
  });

  it('doubles embedded double-quotes inside a field', () => {
    const csv = serializeAuditCsv([
      sample({ change_reason: 'he said "kill it"' }),
    ]);
    expect(csv).toContain('"he said ""kill it"""');
  });

  it('serializes JSONB state columns as compact JSON', () => {
    const csv = serializeAuditCsv([sample()]);
    expect(csv).toContain('"{""kill_switch_engaged"":false}"');
    expect(csv).toContain('"{""kill_switch_engaged"":true}"');
  });

  it('null fields become empty quoted strings', () => {
    const csv = serializeAuditCsv([sample({ change_reason: null, user_agent: null, ip_address: null })]);
    // Three nulls → three consecutive "",""
    expect(csv).toMatch(/""/);
  });

  it('multiple rows produce one line each plus the header', () => {
    const csv = serializeAuditCsv([sample(), sample({ id: 'row-2' }), sample({ id: 'row-3' })]);
    expect(csv.split('\r\n')).toHaveLength(4);
  });

  it('embedded newlines do not break the row count (quoted)', () => {
    const csv = serializeAuditCsv([
      sample({ change_reason: 'line 1\nline 2' }),
    ]);
    const rawLines = csv.split('\r\n');
    expect(rawLines).toHaveLength(2);
  });

  it('columns are in the documented order', () => {
    const csv = serializeAuditCsv([sample()]);
    const headerFields = csv.split('\r\n')[0].split(',');
    expect(headerFields[0]).toBe('changed_at');
    expect(headerFields[1]).toBe('feature_id');
    expect(headerFields[2]).toBe('change_type');
    expect(headerFields[headerFields.length - 1]).toBe('id');
  });
});
