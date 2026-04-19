// Prompt #95 Phase 7: pure tests for the governance audit CSV serializer.

import { describe, it, expect } from 'vitest';
import {
  serializeGovernanceAuditCsv,
  type AuditEventRow,
} from '@/lib/governance/audit-csv';

function sample(overrides: Partial<AuditEventRow> = {}): AuditEventRow {
  return {
    event_type: 'proposal_submitted',
    event_time: '2026-05-15T12:00:00.000Z',
    actor_user_id: 'aa000000-0000-0000-0000-000000000001',
    actor_email: 'gary@farmceuticawellness.com',
    proposal_id: '10000000-0000-0000-0000-000000000001',
    proposal_number: 7,
    proposal_title: 'Raise Gold monthly to $54',
    pricing_domain_id: 'consumer_gold_monthly',
    summary: 'Submitted for approval',
    raw: { status: 'submitted_for_approval' },
    ...overrides,
  };
}

describe('serializeGovernanceAuditCsv', () => {
  it('emits the canonical header as the first CRLF-terminated line', () => {
    const csv = serializeGovernanceAuditCsv([]);
    expect(csv.split('\r\n')[0]).toBe(
      'event_time,event_type,proposal_number,proposal_title,pricing_domain_id,actor_email,actor_user_id,proposal_id,summary,raw',
    );
  });

  it('empty rows yields header only', () => {
    expect(serializeGovernanceAuditCsv([])).toBe(
      'event_time,event_type,proposal_number,proposal_title,pricing_domain_id,actor_email,actor_user_id,proposal_id,summary,raw',
    );
  });

  it('all fields are quoted', () => {
    const csv = serializeGovernanceAuditCsv([sample()]);
    const bodyLine = csv.split('\r\n')[1];
    expect(bodyLine.startsWith('"')).toBe(true);
    expect(bodyLine.endsWith('"')).toBe(true);
  });

  it('embedded quotes are doubled', () => {
    const csv = serializeGovernanceAuditCsv([
      sample({ summary: 'He said "approve" and left' }),
    ]);
    expect(csv).toContain('"He said ""approve"" and left"');
  });

  it('JSON raw serializes compactly', () => {
    const csv = serializeGovernanceAuditCsv([
      sample({ raw: { a: 1, b: [2, 3] } }),
    ]);
    expect(csv).toContain('"{""a"":1,""b"":[2,3]}"');
  });

  it('null fields render as empty quoted strings', () => {
    const csv = serializeGovernanceAuditCsv([
      sample({ actor_email: null, proposal_title: null, pricing_domain_id: null }),
    ]);
    const line = csv.split('\r\n')[1];
    expect(line.split(',').filter((c) => c === '""').length).toBeGreaterThanOrEqual(3);
  });

  it('multi-row output preserves order', () => {
    const csv = serializeGovernanceAuditCsv([
      sample({ summary: 'one' }),
      sample({ summary: 'two' }),
      sample({ summary: 'three' }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('one');
    expect(lines[2]).toContain('two');
    expect(lines[3]).toContain('three');
  });

  it('embedded newlines stay inside a single quoted field', () => {
    const csv = serializeGovernanceAuditCsv([
      sample({ summary: 'multi\nline\nsummary' }),
    ]);
    // CSV uses CRLF row terminators; embedded \n inside quoted fields does
    // not split rows, so the output has exactly 2 rows.
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
