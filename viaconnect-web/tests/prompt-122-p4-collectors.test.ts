import { describe, it, expect } from 'vitest';
import type { Period } from '@/lib/soc2/types';
import type { CollectorQuery, CollectorRunCtx } from '@/lib/soc2/collectors/types';
import { frozenTimer } from '@/lib/soc2/collectors/helpers';
import { verifyNoPhi } from '@/lib/soc2/redaction/verify';
import { auditPolicyCoverage } from '@/lib/soc2/redaction/policy';

import { githubPrsCollector } from '@/lib/soc2/collectors/github-prs';
import { vercelDeploymentsCollector } from '@/lib/soc2/collectors/vercel-deployments';
import { anthropicUsageCollector } from '@/lib/soc2/collectors/anthropic-usage';
import { supabaseAdvisorCollector } from '@/lib/soc2/collectors/supabase-advisor';
import { dependabotCollector } from '@/lib/soc2/collectors/dependabot';
import { uptimeCollector } from '@/lib/soc2/collectors/uptime';
import { certExpiryCollector } from '@/lib/soc2/collectors/cert-expiry';
import { mfaEnforcementCollector } from '@/lib/soc2/collectors/mfa-enforcement';
import { keyRotationCollector } from '@/lib/soc2/collectors/key-rotation';
import { npiReverifyCollector } from '@/lib/soc2/collectors/npi-reverify';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PACKET_UUID = '01J8ZP5V3K700000000000000P';
const PERIOD: Period = { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' };

type Fixtures = Record<string, Array<Record<string, unknown>>>;

function buildDisabledConfig(): Fixtures {
  return {
    soc2_collector_config: [
      // All 10 collectors disabled; buildDisabledOutput should fire for each.
      { collector_id: 'github-prs-collector',         enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'vercel-deployments-collector', enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'anthropic-usage-collector',    enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'supabase-advisor-collector',   enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'dependabot-collector',         enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'uptime-collector',             enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'cert-expiry-collector',        enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'mfa-enforcement-collector',    enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'key-rotation-collector',       enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
      { collector_id: 'npi-reverify-collector',       enabled: false, api_key_ref: null, last_run_at: null, last_heartbeat_at: null, notes: 'not configured' },
    ],
  };
}

function buildEnabledConfig(): Fixtures {
  const disabled = buildDisabledConfig();
  disabled.soc2_collector_config = disabled.soc2_collector_config.map((row) => ({
    ...row,
    enabled: true,
  }));
  return {
    ...disabled,
    soc2_external_github_prs: [
      {
        id: 'gh-1', repo: 'viaconnect-web', pr_number: 114, title: 'CBP Customs recordation',
        author_login: 'gary-f', state: 'merged',
        merged_at: '2026-02-10T12:00:00Z', closed_at: '2026-02-10T12:00:00Z',
        created_at: '2026-02-08T09:00:00Z',
        approvers: ['michelangelo', 'hannah'], review_count: 2, checks_passed: true,
      },
    ],
    soc2_external_vercel_deploys: [
      {
        id: 'vd-1', deployment_id: 'dpl_abc', project: 'viaconnect-web',
        environment: 'production', state: 'READY',
        created_at: '2026-02-10T12:30:00Z', ready_at: '2026-02-10T12:35:00Z',
        creator_login: 'gary-f', commit_sha: 'deadbeef1234',
      },
    ],
    soc2_external_anthropic_usage: [
      { id: 'au-1', day: '2026-02-10', model: 'claude-opus-4-7', input_tokens: 12345, output_tokens: 4321, request_count: 42 },
    ],
    soc2_external_supabase_advisors: [
      {
        id: 'adv-1', captured_at: '2026-02-11T00:00:00Z',
        category: 'security', level: 'WARN', name: 'rls_disabled',
        description: 'some table had RLS disabled',
        remediation: 'ALTER TABLE ... ENABLE RLS',
      },
    ],
    soc2_external_dependabot: [
      {
        id: 'dep-1', repo: 'viaconnect-web', alert_number: 77, severity: 'high',
        package_name: 'next', ecosystem: 'npm', cve: 'CVE-2026-0001',
        state: 'dismissed',
        created_at: '2026-02-12T00:00:00Z', dismissed_at: '2026-02-12T01:00:00Z',
        auto_dismissed: true,
      },
    ],
    soc2_external_uptime: [
      { id: 'up-1', day: '2026-02-10', service: 'app', uptime_pct: 99.98, incidents: 0, p95_ms: 145 },
    ],
    soc2_external_cert_expiry: [
      {
        id: 'cert-1', hostname: 'viaconnectapp.com',
        not_before: '2026-01-01T00:00:00Z', not_after: '2026-04-01T00:00:00Z',
        issuer: 'Let\'s Encrypt', captured_at: '2026-02-10T00:00:00Z',
        days_to_expiry: 50,
      },
    ],
    soc2_external_mfa_status: [
      {
        id: 'mfa-1', user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        mfa_enabled: true, factor_count: 1,
        factor_types: ['totp'],
        captured_at: '2026-02-10T00:00:00Z',
      },
    ],
    soc2_signing_keys: [
      {
        id: 'k1', alg: 'ES256',
        public_key_pem: '-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----',
        private_key_ref: 'vault://soc2/k1',
        active: true, rotation_of: null,
        created_at: '2026-01-01T00:00:00Z', retired_at: null,
      },
    ],
    precheck_signing_keys: [
      {
        id: 'pk1', alg: 'ES256',
        public_key_pem: '-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----',
        private_key_ref: 'vault://precheck/pk1',
        active: true, rotation_of: null,
        created_at: '2026-01-01T00:00:00Z', retired_at: null,
      },
    ],
    compliance_audit_log: [
      {
        id: 100, event_type: 'npi_reverify', actor_type: 'system',
        actor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        payload: { npi: '1234567890', status: 'verified' },
        prev_hash: 'aaa', row_hash: 'bbb',
        created_at: '2026-02-15T00:00:00Z',
      },
      {
        id: 101, event_type: 'npi_reverify', actor_type: 'system',
        actor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        payload: { npi: '0987654321', status: 'verified' },
        prev_hash: 'bbb', row_hash: 'ccc',
        created_at: '2026-02-20T00:00:00Z',
      },
      {
        id: 102, event_type: 'other_event', actor_type: 'user',
        actor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        payload: {},
        prev_hash: 'ccc', row_hash: 'ddd',
        created_at: '2026-02-25T00:00:00Z',
      },
    ],
  };
}

function buildCtx(fixtures: Fixtures): CollectorRunCtx & { timer: ReturnType<typeof frozenTimer> } {
  return {
    packetUuid: PACKET_UUID,
    pseudonymKey: FIXED_KEY,
    ruleRegistryVersion: 'v4.3.7',
    timer: frozenTimer('2026-04-05T00:00:00Z', 100),
    async fetch<T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> {
      const rows = fixtures[q.table] ?? [];
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

const ALL_P4 = [
  githubPrsCollector,
  vercelDeploymentsCollector,
  anthropicUsageCollector,
  supabaseAdvisorCollector,
  dependabotCollector,
  uptimeCollector,
  certExpiryCollector,
  mfaEnforcementCollector,
  keyRotationCollector,
  npiReverifyCollector,
];

describe('P4 collectors — disabled gate', () => {
  it('each collector emits headers-only CSV when disabled', async () => {
    const ctx = buildCtx(buildDisabledConfig());
    for (const collector of ALL_P4) {
      const result = await collector.collect(PERIOD, ctx);
      expect(result.files.length).toBeGreaterThanOrEqual(1);
      for (const f of result.files) {
        const text = Buffer.from(f.bytes).toString('utf8');
        const lines = text.split('\n').filter(Boolean);
        expect(lines.length).toBe(1); // header only
      }
      expect(result.attestation.rowCount).toBe(0);
      expect(result.attestation.deterministicReplayProof.nonDeterministicSources.some((s) => s.startsWith('disabled_in_soc2_collector_config'))).toBe(true);
    }
  });

  it('disabled output is byte-identical across runs', async () => {
    const a = buildCtx(buildDisabledConfig());
    const b = buildCtx(buildDisabledConfig());
    for (const collector of ALL_P4) {
      const ra = await collector.collect(PERIOD, a);
      const rb = await collector.collect(PERIOD, b);
      expect(ra.files.length).toBe(rb.files.length);
      for (let i = 0; i < ra.files.length; i++) {
        expect(Buffer.from(ra.files[i].bytes).equals(Buffer.from(rb.files[i].bytes))).toBe(true);
      }
      expect(JSON.stringify(ra.attestation)).toBe(JSON.stringify(rb.attestation));
    }
  });
});

describe('P4 collectors — enabled path with fixtures', () => {
  it('each collector emits non-empty CSV when enabled with fixtures', async () => {
    const ctx = buildCtx(buildEnabledConfig());
    for (const collector of ALL_P4) {
      const result = await collector.collect(PERIOD, ctx);
      expect(result.files.length).toBeGreaterThanOrEqual(1);
      const totalRows = result.attestation.rowCount;
      // Every enabled collector should emit at least one row from fixtures.
      expect(totalRows).toBeGreaterThanOrEqual(1);
    }
  });

  it('enabled output is byte-identical across runs', async () => {
    const a = buildCtx(buildEnabledConfig());
    const b = buildCtx(buildEnabledConfig());
    for (const collector of ALL_P4) {
      const ra = await collector.collect(PERIOD, a);
      const rb = await collector.collect(PERIOD, b);
      for (let i = 0; i < ra.files.length; i++) {
        expect(Buffer.from(ra.files[i].bytes).equals(Buffer.from(rb.files[i].bytes))).toBe(true);
      }
      expect(JSON.stringify(ra.attestation)).toBe(JSON.stringify(rb.attestation));
    }
  });

  it('no PHI leaks from any P4 collector output', async () => {
    const ctx = buildCtx(buildEnabledConfig());
    for (const collector of ALL_P4) {
      const result = await collector.collect(PERIOD, ctx);
      for (const f of result.files) {
        const text = Buffer.from(f.bytes).toString('utf8');
        const v = verifyNoPhi(text);
        expect(v.ok, `PHI in ${collector.id} / ${f.relativePath}: ${v.violations.map((x) => `${x.pattern}:${x.matched}`).join(',')}`).toBe(true);
      }
    }
  });
});

describe('P4 collectors — behavior', () => {
  it('key-rotation emits both soc2 + precheck CSVs', async () => {
    const ctx = buildCtx(buildEnabledConfig());
    const r = await keyRotationCollector.collect(PERIOD, ctx);
    expect(r.files.length).toBe(2);
    const paths = r.files.map((f) => f.relativePath).sort();
    expect(paths).toEqual([
      'CC6-logical-access/precheck-signing-keys.csv',
      'CC6-logical-access/soc2-signing-keys.csv',
    ]);
  });

  it('key-rotation CSVs do not contain private_key_ref (Vault path)', async () => {
    const ctx = buildCtx(buildEnabledConfig());
    const r = await keyRotationCollector.collect(PERIOD, ctx);
    for (const f of r.files) {
      const text = Buffer.from(f.bytes).toString('utf8');
      expect(text).not.toContain('vault://');
      expect(text).not.toContain('private_key_ref');
    }
  });

  it('npi-reverify filters to event_type=npi_reverify only', async () => {
    const ctx = buildCtx(buildEnabledConfig());
    const r = await npiReverifyCollector.collect(PERIOD, ctx);
    expect(r.attestation.rowCount).toBe(2); // 2 npi_reverify rows; other_event excluded
    const text = Buffer.from(r.files[0].bytes).toString('utf8');
    expect(text).toContain('npi_reverify');
    expect(text).not.toContain('other_event');
  });

  it('missing soc2_collector_config row → treated as disabled', async () => {
    // No soc2_collector_config fixture at all
    const emptyFixtures = {};
    const ctx = buildCtx(emptyFixtures);
    const r = await githubPrsCollector.collect(PERIOD, ctx);
    expect(r.attestation.rowCount).toBe(0);
    expect(r.attestation.deterministicReplayProof.nonDeterministicSources.some((s) => s.startsWith('disabled_in_soc2_collector_config'))).toBe(true);
  });
});

describe('P4 collectors — metadata', () => {
  it('every P4 collector has a stable id, version, dataSource, and ≥1 control', () => {
    const ids = new Set<string>();
    for (const c of ALL_P4) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.version.length).toBeGreaterThan(0);
      expect(c.dataSource.length).toBeGreaterThan(0);
      expect(c.controls.length).toBeGreaterThan(0);
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
    }
  });

  it('collector ids match soc2_collector_config seed rows', () => {
    const expected = new Set([
      'github-prs-collector',
      'vercel-deployments-collector',
      'anthropic-usage-collector',
      'supabase-advisor-collector',
      'dependabot-collector',
      'uptime-collector',
      'cert-expiry-collector',
      'mfa-enforcement-collector',
      'key-rotation-collector',
      'npi-reverify-collector',
    ]);
    for (const c of ALL_P4) {
      expect(expected.has(c.id)).toBe(true);
    }
  });
});

describe('P4 policy coverage', () => {
  const P4_TABLES_AND_COLS: Record<string, string[]> = {
    soc2_signing_keys: ['id', 'alg', 'public_key_pem', 'private_key_ref', 'active', 'rotation_of', 'created_at', 'retired_at'],
    precheck_signing_keys: ['id', 'alg', 'public_key_pem', 'private_key_ref', 'active', 'rotation_of', 'created_at', 'retired_at'],
    soc2_collector_config: ['collector_id', 'enabled', 'api_key_ref', 'last_run_at', 'last_heartbeat_at', 'notes', 'updated_at'],
    soc2_external_github_prs: ['id', 'repo', 'pr_number', 'title', 'author_login', 'state', 'merged_at', 'closed_at', 'created_at', 'approvers', 'review_count', 'checks_passed'],
    soc2_external_vercel_deploys: ['id', 'deployment_id', 'project', 'environment', 'state', 'created_at', 'ready_at', 'creator_login', 'commit_sha'],
    soc2_external_anthropic_usage: ['id', 'day', 'model', 'input_tokens', 'output_tokens', 'request_count'],
    soc2_external_supabase_advisors: ['id', 'captured_at', 'category', 'level', 'name', 'description', 'remediation'],
    soc2_external_dependabot: ['id', 'repo', 'alert_number', 'severity', 'package_name', 'ecosystem', 'cve', 'state', 'created_at', 'dismissed_at', 'auto_dismissed'],
    soc2_external_uptime: ['id', 'day', 'service', 'uptime_pct', 'incidents', 'p95_ms'],
    soc2_external_cert_expiry: ['id', 'hostname', 'not_before', 'not_after', 'issuer', 'captured_at', 'days_to_expiry'],
    soc2_external_mfa_status: ['id', 'user_id', 'mfa_enabled', 'factor_count', 'factor_types', 'captured_at'],
  };

  for (const [table, cols] of Object.entries(P4_TABLES_AND_COLS)) {
    it(`${table}: every column has an explicit treatment`, () => {
      const missing = auditPolicyCoverage(table, cols);
      expect(missing).toEqual([]);
    });
  }
});
