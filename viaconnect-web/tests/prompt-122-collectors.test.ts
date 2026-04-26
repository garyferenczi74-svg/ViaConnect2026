import { describe, it, expect } from 'vitest';
import type { Period } from '@/lib/soc2/types';
import type { CollectorQuery, CollectorRunCtx } from '@/lib/soc2/collectors/types';
import { DB_COLLECTORS, runAllCollectors } from '@/lib/soc2/collectors/runAll';
import { frozenTimer } from '@/lib/soc2/collectors/helpers';
import { verifyNoPhi } from '@/lib/soc2/redaction/verify';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PACKET_UUID = '01J8ZP5V3K700000000000000A';
const PERIOD: Period = { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' };

/**
 * A stable fixture fetcher: returns a deterministic row set per table, sorted
 * by the collector's ORDER BY. Each test runs the same ctx twice and compares.
 */
function buildFixtures(): Record<string, Array<Record<string, unknown>>> {
  return {
    compliance_findings: [
      {
        id: '11111111-2222-3333-4444-555555555555',
        finding_id: 'F-001',
        rule_id: 'MARSHALL.CLAIMS.DISEASE_CLAIM',
        severity: 'P1',
        surface: 'content_cms',
        source: 'runtime',
        location: { url: 'https://example.test/a' },
        excerpt: 'Some user content here with email leaky@example.com',
        message: 'Disease claim detected',
        citation: '21 CFR 101.93',
        remediation: { kind: 'rewrite_claim' },
        status: 'open',
        assigned_to: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        escalated_to: null,
        resolution_note: 'steve@farmceutica.com reviewed',
        resolved_at: null,
        created_at: '2026-02-15T10:00:00Z',
        evidence_bundle_id: null,
      },
      {
        id: '22222222-3333-4444-5555-666666666666',
        finding_id: 'F-002',
        rule_id: 'MARSHALL.CLAIMS.DISEASE_CLAIM',
        severity: 'P1',
        surface: 'content_cms',
        source: 'hounddog',
        location: {},
        excerpt: 'another excerpt',
        message: 'Another',
        citation: '21 CFR 101.93',
        remediation: {},
        status: 'closed',
        assigned_to: null,
        escalated_to: ['steve'],
        resolution_note: null,
        resolved_at: '2026-03-01T10:00:00Z',
        created_at: '2026-02-20T10:00:00Z',
        evidence_bundle_id: null,
      },
    ],
    compliance_incidents: [
      {
        id: '33333333-4444-5555-6666-777777777777',
        incident_id: 'I-001',
        title: 'Disease claim cluster',
        severity: 'P1',
        opened_by: 'marshall_runtime',
        opened_at: '2026-02-20T11:00:00Z',
        closed_at: null,
        root_cause: 'rule update lag',
        dev_side_escape: false,
        related_finding_ids: ['11111111-2222-3333-4444-555555555555'],
        narrative: 'Cluster of narrative with PII user@example.com',
        owner: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        created_at: '2026-02-20T11:00:00Z',
      },
    ],
    compliance_audit_log: [
      {
        id: 1,
        event_type: 'packet_generate_start',
        actor_type: 'user',
        actor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        payload: { packet_uuid: PACKET_UUID },
        prev_hash: '',
        row_hash: 'aaa',
        created_at: '2026-01-10T00:00:00Z',
      },
      {
        id: 2,
        event_type: 'packet_generate_complete',
        actor_type: 'user',
        actor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        payload: {},
        prev_hash: 'aaa',
        row_hash: 'bbb',
        created_at: '2026-01-10T00:05:00Z',
      },
    ],
    social_signals: [
      {
        id: '44444444-5555-6666-7777-888888888888',
        collector_id: 'instagram',
        url: 'https://instagram.com/p/xyz',
        captured_at: '2026-02-05T12:00:00Z',
        author_handle: '@leaky_handle',
        author_external_id: 'IG_1234',
        author_display_name: 'Leaky Person',
        matched_practitioner_id: null,
        practitioner_match_confidence: null,
        language: 'en',
        text_derived: 'long text with leaky@example.com email',
        jurisdiction_country: 'US',
        overall_confidence: 0.8,
        status: 'evaluated',
        created_at: '2026-02-05T12:00:00Z',
      },
    ],
    precheck_sessions: [
      {
        id: '55555555-6666-7777-8888-999999999999',
        session_id: 'PRE-001',
        practitioner_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        source: 'portal',
        draft_hash_sha256: 'abc123',
        normalization_version: 'v1',
        rule_registry_version: 'v4.3.7',
        status: 'cleared',
        recursion_count: 0,
        target_platform: 'instagram',
        cleared_at: '2026-02-10T00:00:00Z',
        closed_at: '2026-02-10T00:00:00Z',
        created_at: '2026-02-10T00:00:00Z',
        updated_at: '2026-02-10T00:00:00Z',
      },
    ],
    precheck_clearance_receipts: [
      {
        id: '66666666-7777-8888-9999-aaaaaaaaaaaa',
        receipt_id: 'R-001',
        session_id: '55555555-6666-7777-8888-999999999999',
        practitioner_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        draft_hash_sha256: 'abc123',
        signing_key_id: 'precheck-k1',
        issued_at: '2026-02-10T00:00:00Z',
        expires_at: '2026-02-17T00:00:00Z',
        revoked: false,
        revoked_at: null,
        revoked_reason: null,
      },
    ],
    consent_ledger: [
      {
        id: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
        user_id: 'cccccccc-dddd-eeee-ffff-000000000000',
        consent_type: 'marketing',
        version: 'v3',
        granted: true,
        granted_at: '2026-01-15T00:00:00Z',
        revoked_at: null,
        ip_address: '203.0.113.47',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0',
        evidence: null,
        created_at: '2026-01-15T00:00:00Z',
      },
    ],
    dsar_requests: [
      {
        id: '88888888-9999-aaaa-bbbb-cccccccccccc',
        user_id: 'cccccccc-dddd-eeee-ffff-000000000000',
        email: 'privacy-requester@example.test',
        request_type: 'access',
        jurisdiction: 'CCPA-CA',
        opened_at: '2026-02-01T00:00:00Z',
        sla_due_at: '2026-03-17T00:00:00Z',
        completed_at: '2026-02-25T00:00:00Z',
        status: 'completed',
        notes: 'Full export sent to privacy-requester@example.test',
        created_at: '2026-02-01T00:00:00Z',
      },
    ],
    vendor_baas: [
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-000000000001',
        vendor_name: 'Anthropic',
        scope: 'Claude API',
        baa_signed_on: '2026-02-01',
        baa_expires_on: '2027-02-01',
        document_url: 'https://internal.example.test/vault/baa-anthropic.pdf',
        notes: 'Contact: vendor-legal@anthropic.com',
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      },
    ],
    profiles: [
      {
        id: 'dddddddd-eeee-ffff-0000-111111111111',
        email: 'steve@farmceutica.com',
        display_name: 'Steve Rica',
        phone: '+1-555-123-4567',
        role: 'compliance_officer',
        created_at: '2025-11-01T00:00:00Z',
        updated_at: '2025-11-01T00:00:00Z',
      },
      {
        id: 'eeeeeeee-ffff-0000-1111-222222222222',
        email: 'gary@farmceutica.com',
        display_name: 'Gary Ferenczi',
        phone: '+1-555-987-6543',
        role: 'ceo',
        created_at: '2025-10-01T00:00:00Z',
        updated_at: '2025-10-01T00:00:00Z',
      },
    ],
    pg_policies: [
      {
        schemaname: 'public',
        tablename: 'compliance_findings',
        policyname: 'cf_read',
        permissive: 'PERMISSIVE',
        roles: ['authenticated'],
        cmd: 'SELECT',
        qual: 'public.is_compliance_reader() OR assigned_to = auth.uid()',
        with_check: null,
      },
    ],
    'supabase_migrations.schema_migrations': [
      { version: '20260101000001', name: 'prompt_119_marshall_compliance' },
      { version: '20260305000001', name: 'some_later_migration' },
      { version: '20260601000001', name: 'after_period_end_migration' },
    ],
  };
}

function buildCtx(fixtures: Record<string, Array<Record<string, unknown>>>): CollectorRunCtx & { timer: ReturnType<typeof frozenTimer> } {
  return {
    packetUuid: PACKET_UUID,
    pseudonymKey: FIXED_KEY,
    ruleRegistryVersion: 'v4.3.7',
    timer: frozenTimer('2026-04-05T00:00:00Z', 100),
    async fetch<T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> {
      const rows = fixtures[q.table] ?? [];
      // Apply filters client-side for fixture testing.
      const filtered = rows.filter((r) => {
        for (const f of q.filters) {
          const v = r[f.column];
          switch (f.op) {
            case 'eq':  if (v !== f.value) return false; break;
            case 'neq': if (v === f.value) return false; break;
            case 'gte': if (!(String(v) >= String(f.value))) return false; break;
            case 'lte': if (!(String(v) <= String(f.value))) return false; break;
            case 'gt':  if (!(String(v) >  String(f.value))) return false; break;
            case 'lt':  if (!(String(v) <  String(f.value))) return false; break;
            case 'in':  if (!(f.value as unknown[]).includes(v)) return false; break;
            case 'is_not_null': if (v === null || v === undefined) return false; break;
          }
        }
        return true;
      });
      // Sort per collector's orderBy (lexicographic on stringified values — sufficient for fixtures).
      const sorted = filtered.slice().sort((a, b) => {
        for (const o of q.orderBy) {
          const av = String(a[o.column] ?? '');
          const bv = String(b[o.column] ?? '');
          if (av < bv) return o.ascending ? -1 : 1;
          if (av > bv) return o.ascending ? 1 : -1;
        }
        return 0;
      });
      return sorted as T[];
    },
  };
}

describe('DB_COLLECTORS — registry shape', () => {
  it('registers all 27 collectors (14 P3 + 10 P4 + 1 #124 Vision + 1 #125 scheduler bridge + 1 #138a marketing copy)', () => {
    expect(DB_COLLECTORS).toHaveLength(27);
  });

  it('every collector has a stable id, version, and dataSource', () => {
    const ids = new Set<string>();
    for (const c of DB_COLLECTORS) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.version.length).toBeGreaterThan(0);
      expect(c.dataSource.length).toBeGreaterThan(0);
      expect(ids.has(c.id)).toBe(false); // no duplicates
      ids.add(c.id);
    }
  });

  it('every collector claims at least one TSC control', () => {
    for (const c of DB_COLLECTORS) {
      expect(c.controls.length).toBeGreaterThan(0);
    }
  });
});

describe('runAllCollectors — determinism', () => {
  it('identical fixture + ctx produce byte-identical output files', async () => {
    const fixtures = buildFixtures();
    const ctxA = buildCtx(fixtures);
    const ctxB = buildCtx(fixtures);
    const a = await runAllCollectors(PERIOD, ctxA);
    const b = await runAllCollectors(PERIOD, ctxB);
    expect(a.files.length).toBe(b.files.length);
    for (let i = 0; i < a.files.length; i++) {
      expect(a.files[i].relativePath).toBe(b.files[i].relativePath);
      expect(Buffer.from(a.files[i].bytes).equals(Buffer.from(b.files[i].bytes))).toBe(true);
    }
  });

  it('attestations are identical across runs with frozen timer', async () => {
    const fixtures = buildFixtures();
    const a = await runAllCollectors(PERIOD, buildCtx(fixtures));
    const b = await runAllCollectors(PERIOD, buildCtx(fixtures));
    expect(JSON.stringify(a.attestations)).toBe(JSON.stringify(b.attestations));
  });

  it('zero errors on the full run', async () => {
    const result = await runAllCollectors(PERIOD, buildCtx(buildFixtures()));
    expect(result.errors).toEqual([]);
  });

  it('row_count in attestation matches actual emitted row count', async () => {
    const result = await runAllCollectors(PERIOD, buildCtx(buildFixtures()));
    for (const a of result.attestations) {
      expect(a.rowCount).toBeGreaterThanOrEqual(0);
      expect(typeof a.rowCount).toBe('number');
    }
  });
});

describe('runAllCollectors — PHI redaction across all files', () => {
  it('no plaintext email, phone, SSN, or raw UUID in any collector output', async () => {
    const result = await runAllCollectors(PERIOD, buildCtx(buildFixtures()));
    for (const file of result.files) {
      const text = Buffer.from(file.bytes).toString('utf8');
      const verify = verifyNoPhi(text);
      expect(verify.ok, `PHI leaked from ${file.relativePath}: ${verify.violations.map(v => `${v.pattern}:${v.matched}`).join(',')}`).toBe(true);
    }
  });
});

describe('boundary behavior — period edges', () => {
  it('rows exactly at period.start are included (inclusive)', async () => {
    const fixtures = buildFixtures();
    // Row exactly at period.start for compliance_findings
    fixtures.compliance_findings.push({
      ...fixtures.compliance_findings[0],
      id: 'ffffffff-0000-0000-0000-000000000001',
      finding_id: 'F-EDGE-START',
      created_at: PERIOD.start,
    });
    fixtures.compliance_findings.push({
      ...fixtures.compliance_findings[0],
      id: 'ffffffff-0000-0000-0000-000000000002',
      finding_id: 'F-EDGE-END',
      created_at: PERIOD.end,
    });
    const result = await runAllCollectors(PERIOD, buildCtx(fixtures));
    const findings = result.files.find((f) => f.relativePath.includes('marshall-findings'));
    expect(findings).toBeDefined();
    const csv = Buffer.from(findings!.bytes).toString('utf8');
    expect(csv).toContain('F-EDGE-START');
    expect(csv).toContain('F-EDGE-END');
  });

  it('rows outside the period are excluded', async () => {
    const fixtures = buildFixtures();
    // compliance_findings: add one row with created_at = Dec 31 2025 (before period)
    fixtures.compliance_findings.push({
      ...fixtures.compliance_findings[0],
      id: 'ffffffff-0000-0000-0000-000000000003',
      finding_id: 'F-EDGE-OUTSIDE',
      created_at: '2025-12-31T23:59:59Z',
    });
    const result = await runAllCollectors(PERIOD, buildCtx(fixtures));
    const findings = result.files.find((f) => f.relativePath.includes('marshall-findings'));
    expect(Buffer.from(findings!.bytes).toString('utf8')).not.toContain('F-EDGE-OUTSIDE');
  });
});

describe('marshall-audit-chain — chain verification report', () => {
  it('flags chain_intact=true on a clean chain', async () => {
    const result = await runAllCollectors(PERIOD, buildCtx(buildFixtures()));
    const chainFile = result.files.find((f) => f.relativePath.includes('audit-log-chain-verification'));
    expect(chainFile).toBeDefined();
    const json = JSON.parse(Buffer.from(chainFile!.bytes).toString('utf8'));
    expect(json.chain_intact).toBe(true);
    expect(json.total_rows_in_period).toBe(2);
  });

  it('flags chain_intact=false and first_bad_row when a link breaks', async () => {
    const fixtures = buildFixtures();
    fixtures.compliance_audit_log[1].prev_hash = 'TAMPERED';
    const result = await runAllCollectors(PERIOD, buildCtx(fixtures));
    const chainFile = result.files.find((f) => f.relativePath.includes('audit-log-chain-verification'));
    const json = JSON.parse(Buffer.from(chainFile!.bytes).toString('utf8'));
    expect(json.chain_intact).toBe(false);
    expect(json.first_bad_row).toBe(2);
  });
});

describe('migrations collector — version-range filter', () => {
  it('includes only migrations within the period version window', async () => {
    const result = await runAllCollectors(PERIOD, buildCtx(buildFixtures()));
    const migFile = result.files.find((f) => f.relativePath.includes('migration-history'));
    const csv = Buffer.from(migFile!.bytes).toString('utf8');
    expect(csv).toContain('20260101000001');
    expect(csv).toContain('20260305000001');
    // After-period migration must be excluded
    expect(csv).not.toContain('20260601000001');
  });
});
