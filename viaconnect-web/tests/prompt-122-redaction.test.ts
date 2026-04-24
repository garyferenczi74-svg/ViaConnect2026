import { describe, it, expect } from 'vitest';
import {
  pseudonymize,
  generatePacketHmacKey,
} from '@/lib/soc2/redaction/pseudonymize';
import {
  SOC2_REDACTION_POLICY,
  auditPolicyCoverage,
} from '@/lib/soc2/redaction/policy';
import {
  redactRow,
  redactRows,
} from '@/lib/soc2/redaction/redact';
import {
  verifyNoPhi,
  verifyObjectNoPhi,
} from '@/lib/soc2/redaction/verify';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const FIXED_KEY_B = Buffer.from('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 'hex');
const PACKET_A = '01J8ZP5V3K700000000000000A';
const PACKET_B = '01J8ZP5V3K700000000000000B';

describe('pseudonymize — determinism', () => {
  it('same inputs produce same pseudonym', () => {
    const p1 = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_123', key: FIXED_KEY });
    const p2 = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_123', key: FIXED_KEY });
    expect(p1).toBe(p2);
  });

  it('pseudonym is 26 characters (128-bit → base32 unpadded)', () => {
    const p = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_123', key: FIXED_KEY });
    expect(p).toHaveLength(26);
    expect(/^[A-Z2-7]+$/.test(p)).toBe(true);
  });

  it('different real IDs produce different pseudonyms', () => {
    const p1 = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_123', key: FIXED_KEY });
    const p2 = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_456', key: FIXED_KEY });
    expect(p1).not.toBe(p2);
  });

  it('different packet UUIDs produce different pseudonyms for same real ID', () => {
    const p1 = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_123', key: FIXED_KEY });
    const p2 = pseudonymize({ packetUuid: PACKET_B, context: 'user', realId: 'user_123', key: FIXED_KEY });
    expect(p1).not.toBe(p2);
  });

  it('different keys produce different pseudonyms for same real ID', () => {
    const p1 = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_123', key: FIXED_KEY });
    const p2 = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'user_123', key: FIXED_KEY_B });
    expect(p1).not.toBe(p2);
  });

  it('different contexts produce different pseudonyms for same real ID', () => {
    const asUser = pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'x', key: FIXED_KEY });
    const asPractitioner = pseudonymize({ packetUuid: PACKET_A, context: 'practitioner', realId: 'x', key: FIXED_KEY });
    expect(asUser).not.toBe(asPractitioner);
  });

  it('empty/null/undefined realId returns empty string', () => {
    expect(pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: '', key: FIXED_KEY })).toBe('');
    expect(pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: null as unknown as string, key: FIXED_KEY })).toBe('');
    expect(pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: undefined as unknown as string, key: FIXED_KEY })).toBe('');
  });

  it('throws on missing packetUuid / context / key', () => {
    expect(() => pseudonymize({ packetUuid: '', context: 'user', realId: 'x', key: FIXED_KEY })).toThrow();
    expect(() => pseudonymize({ packetUuid: PACKET_A, context: '', realId: 'x', key: FIXED_KEY })).toThrow();
    expect(() => pseudonymize({ packetUuid: PACKET_A, context: 'user', realId: 'x', key: Buffer.alloc(0) })).toThrow();
  });
});

describe('generatePacketHmacKey', () => {
  it('produces 32-byte keys', () => {
    expect(generatePacketHmacKey()).toHaveLength(32);
  });

  it('produces distinct keys on each call', () => {
    const a = generatePacketHmacKey();
    const b = generatePacketHmacKey();
    expect(a.equals(b)).toBe(false);
  });
});

describe('redactRow — fail-closed contract', () => {
  const ctx = { packetUuid: PACKET_A, pseudonymKey: FIXED_KEY };

  it('throws on unknown table', () => {
    expect(() => redactRow('__not_a_real_table__', { x: 1 }, ctx)).toThrow(/no policy entry/);
  });

  it('throws when a row contains an unpolicy\'d column', () => {
    const row = { id: 'u1', email: 'a@b.com', role: 'admin', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', unknown_column: 'surprise' };
    expect(() => redactRow('profiles', row, ctx)).toThrow(/no policy entry/);
  });

  it('refuses to redact a blocked table', () => {
    expect(() => redactRow('genetic_profiles', { any: 'data' }, ctx)).toThrow(/blocked from any SOC 2 packet/);
  });
});

describe('redactRow — treatment application', () => {
  const ctx = { packetUuid: PACKET_A, pseudonymKey: FIXED_KEY };

  it('removes PHI fields (email, display_name, phone)', () => {
    const row = {
      id: '11111111-2222-3333-4444-555555555555',
      email: 'steve@farmceutica.com',
      display_name: 'Steve Rica',
      phone: '+1-555-123-4567',
      role: 'compliance_officer',
      created_at: '2026-01-15T12:34:56.789Z',
      updated_at: '2026-01-15T12:34:56.789Z',
    };
    const out = redactRow('profiles', row, ctx);
    expect(out.email).toBeNull();
    expect(out.display_name).toBeNull();
    expect(out.phone).toBeNull();
    expect(out.role).toBe('compliance_officer');
  });

  it('pseudonymizes user UUID deterministically within a packet', () => {
    const row1 = { id: '11111111-2222-3333-4444-555555555555', email: 'a@b.com', display_name: null, phone: null, role: 'patient', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
    const row2 = { id: '11111111-2222-3333-4444-555555555555', email: 'a@b.com', display_name: null, phone: null, role: 'patient', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' };
    const a = redactRow('profiles', row1, ctx);
    const b = redactRow('profiles', row2, ctx);
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(row1.id);
    expect(String(a.id)).toHaveLength(26);
  });

  it('truncates ISO timestamps to whole seconds', () => {
    const row = {
      id: '11111111-2222-3333-4444-555555555555',
      email: null, display_name: null, phone: null, role: 'patient',
      created_at: '2026-01-15T12:34:56.789Z',
      updated_at: '2026-01-15T12:34:56.789Z',
    };
    const out = redactRow('profiles', row, ctx);
    expect(out.created_at).toBe('2026-01-15T12:34:56Z');
    expect(out.updated_at).toBe('2026-01-15T12:34:56Z');
  });

  it('truncates IPv4 addresses to /24', () => {
    const row = {
      id: 'abcdef12-3456-7890-abcd-ef1234567890',
      user_id: '11111111-2222-3333-4444-555555555555',
      consent_type: 'marketing',
      version: 'v3',
      granted: true,
      granted_at: '2026-01-01T00:00:00Z',
      revoked_at: null,
      ip_address: '203.0.113.47',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      evidence: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    const out = redactRow('consent_ledger', row, ctx);
    expect(out.ip_address).toBe('203.0.113.0/24');
    expect(out.user_agent).toBe('Chrome 120');
  });

  it('generalizes a Firefox user agent', () => {
    const row = {
      id: 'aaaaaaaa-2222-3333-4444-555555555555',
      user_id: '11111111-2222-3333-4444-555555555555',
      consent_type: 'cookies', version: 'v1', granted: true,
      granted_at: '2026-01-01T00:00:00Z', revoked_at: null,
      ip_address: '10.0.0.1',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64; rv:118.0) Gecko/20100101 Firefox/118.0',
      evidence: null, created_at: '2026-01-01T00:00:00Z',
    };
    const out = redactRow('consent_ledger', row, ctx);
    expect(out.user_agent).toBe('Firefox 118');
  });

  it('truncates IPv6 addresses to /64', () => {
    const row = {
      id: 'aaaaaaaa-2222-3333-4444-555555555555',
      user_id: '11111111-2222-3333-4444-555555555555',
      consent_type: 'genetic', version: 'v2', granted: true,
      granted_at: '2026-01-01T00:00:00Z', revoked_at: null,
      ip_address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      user_agent: 'curl/8.4.0',
      evidence: null, created_at: '2026-01-01T00:00:00Z',
    };
    const out = redactRow('consent_ledger', row, ctx);
    expect(String(out.ip_address).startsWith('2001:0db8:85a3:0000')).toBe(true);
    expect(String(out.ip_address).endsWith('/64')).toBe(true);
  });
});

describe('redactRows — batch + within-packet pseudonym consistency', () => {
  const ctx = { packetUuid: PACKET_A, pseudonymKey: FIXED_KEY };
  const userUuid = '11111111-2222-3333-4444-555555555555';

  it('same user UUID in multiple evidence files gets the same pseudonym (within a packet)', () => {
    const profileRow = {
      id: userUuid, email: 'x@y.com', display_name: null, phone: null,
      role: 'admin', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    const auditRow = {
      id: 1, event_type: 'login', actor_type: 'user', actor_id: userUuid,
      payload: {}, prev_hash: '', row_hash: 'abc', created_at: '2026-01-01T00:00:00Z',
    };
    const pRow = redactRow('profiles', profileRow, ctx);
    const aRow = redactRow('compliance_audit_log', auditRow, ctx);
    expect(pRow.id).toBe(aRow.actor_id);
  });

  it('redacting the same row twice in the same packet is stable', () => {
    const row = {
      id: userUuid, email: 'x@y.com', display_name: null, phone: null,
      role: 'admin', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    const a = redactRow('profiles', row, ctx);
    const b = redactRow('profiles', row, ctx);
    expect(a).toEqual(b);
  });

  it('redactRows handles empty input', () => {
    expect(redactRows('profiles', [], ctx)).toEqual([]);
  });
});

describe('cross-packet pseudonym variance', () => {
  it('same user UUID pseudonymized in two different packets yields different pseudonyms', () => {
    const userUuid = '11111111-2222-3333-4444-555555555555';
    const ctxA = { packetUuid: PACKET_A, pseudonymKey: FIXED_KEY };
    const ctxB = { packetUuid: PACKET_B, pseudonymKey: FIXED_KEY_B };
    const a = redactRow('profiles', {
      id: userUuid, email: null, display_name: null, phone: null,
      role: 'admin', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }, ctxA);
    const b = redactRow('profiles', {
      id: userUuid, email: null, display_name: null, phone: null,
      role: 'admin', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }, ctxB);
    expect(a.id).not.toBe(b.id);
  });
});

describe('verifyNoPhi', () => {
  it('passes a clean string', () => {
    expect(verifyNoPhi('status=active severity=P0 rule=MARSHALL.BRAND.BIO_OPTIMIZATION_NAMING').ok).toBe(true);
  });

  it('catches an email leak', () => {
    const r = verifyNoPhi('contact someone at steve@farmceutica.com for details');
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.pattern === 'email')).toBe(true);
  });

  it('catches a phone leak', () => {
    const r = verifyNoPhi('reach the on-call at +1 (555) 123-4567 today');
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.pattern === 'phone')).toBe(true);
  });

  it('catches a raw UUID leak (a missed pseudonymize)', () => {
    const r = verifyNoPhi('user aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee has status X');
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.pattern === 'raw_uuid')).toBe(true);
  });

  it('catches an SSN leak', () => {
    const r = verifyNoPhi('SSN 123-45-6789 submitted');
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.pattern === 'ssn')).toBe(true);
  });

  it('verifyObjectNoPhi walks nested structures', () => {
    const r = verifyObjectNoPhi({
      findings: [{ user: 'gary@example.com', severity: 'P1' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.pattern === 'email')).toBe(true);
  });
});

describe('500-row synthetic PHI corpus — end-to-end redaction', () => {
  const ctx = { packetUuid: PACKET_A, pseudonymKey: FIXED_KEY };

  it('produces zero PHI across 500 synthetic profile rows', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      id: `11111111-2222-3333-4444-${String(i).padStart(12, '0')}`,
      email: `user${i}@farmceutica-synthetic.com`,
      display_name: `Synthetic User ${i}`,
      phone: `+1-555-${String(1000 + i).slice(0, 3)}-${String(i).padStart(4, '0')}`,
      role: i % 2 === 0 ? 'patient' : 'practitioner',
      created_at: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T12:34:56.789Z`,
      updated_at: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T12:34:56.789Z`,
    }));
    const redacted = redactRows('profiles', rows, ctx);
    const asJson = JSON.stringify(redacted);
    const result = verifyNoPhi(asJson);
    expect(result.ok).toBe(true);
  });

  it('covers consent rows at scale without IP or UA leaks', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      id: `aaaaaaaa-2222-3333-4444-${String(i).padStart(12, '0')}`,
      user_id: `11111111-2222-3333-4444-${String(i).padStart(12, '0')}`,
      consent_type: 'marketing',
      version: 'v3',
      granted: true,
      granted_at: '2026-02-01T00:00:00Z',
      revoked_at: null,
      ip_address: `192.168.${i % 256}.${(i * 7) % 256}`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      evidence: null,
      created_at: '2026-02-01T00:00:00Z',
    }));
    const redacted = redactRows('consent_ledger', rows, ctx);
    for (const r of redacted) {
      expect(String(r.ip_address).endsWith('/24')).toBe(true);
      expect(r.user_agent).toBe('Chrome 120');
    }
    const asJson = JSON.stringify(redacted);
    const result = verifyNoPhi(asJson);
    expect(result.ok).toBe(true);
  });
});

describe('auditPolicyCoverage', () => {
  it('returns empty array when all columns have policy entries', () => {
    const missing = auditPolicyCoverage('profiles', ['id', 'email', 'role', 'created_at']);
    expect(missing).toEqual([]);
  });

  it('returns the list of uncovered columns', () => {
    const missing = auditPolicyCoverage('profiles', ['id', 'email', 'new_column_xyz', 'another_missing']);
    expect(missing).toEqual(['new_column_xyz', 'another_missing']);
  });

  it('returns __BLOCKED__ sentinel for blocked tables', () => {
    const missing = auditPolicyCoverage('genetic_profiles', ['any', 'columns']);
    expect(missing).toEqual(['__BLOCKED__']);
  });

  it('returns all columns when table is absent from policy', () => {
    const missing = auditPolicyCoverage('__ghost_table__', ['a', 'b', 'c']);
    expect(missing).toEqual(['a', 'b', 'c']);
  });
});

describe('policy coverage — every policy table references valid treatments', () => {
  it('every treatment kind is known', () => {
    const known = new Set([
      'remove', 'pseudonymize', 'pseudonymize_array', 'retain',
      'truncate_timestamp_seconds', 'truncate_ip',
      'generalize_user_agent', 'block_entire_table',
    ]);
    for (const [, tablePolicy] of Object.entries(SOC2_REDACTION_POLICY.tables)) {
      for (const [, treatment] of Object.entries(tablePolicy)) {
        expect(known.has((treatment as { kind: string }).kind)).toBe(true);
      }
    }
  });
});
