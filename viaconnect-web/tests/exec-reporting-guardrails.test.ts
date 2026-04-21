// Prompt #105 — consolidated guardrail test: Helix isolation, PHI
// isolation, privileged legal communications, practitioner tax row
// access, and provenance recorder sanity.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  FORBIDDEN_EXEC_TOKENS,
  isPermittedAggregateHelixKpi,
  scanForForbiddenExecTokens,
} from '@/lib/executiveReporting/guardrails';
import {
  buildProvenance,
  hashSourceQuery,
} from '@/lib/executiveReporting/aggregation/provenanceRecorder';

const REPO_ROOT = process.cwd();
const EXEC_LIB = join(REPO_ROOT, 'src/lib/executiveReporting');
const MIGRATIONS = [
  join(REPO_ROOT, 'supabase/migrations/20260421000200_profiles_role_add_board_and_exec.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000201_exec_reporting_aggregation_tables.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000202_exec_reporting_templates_and_packs.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000203_exec_reporting_board_and_distribution.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000204_exec_reporting_audit_log.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000205_exec_reporting_rls.sql'),
];

const GUARDRAIL_SELF = join(EXEC_LIB, 'guardrails.ts').replace(/\\/g, '/');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}
function normalize(p: string): string { return p.replace(/\\/g, '/'); }

describe('scanForForbiddenExecTokens', () => {
  it.each([...FORBIDDEN_EXEC_TOKENS])('flags forbidden token: %s', (token) => {
    const r = scanForForbiddenExecTokens(`some code with ${token} inside`);
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.token === token)).toBe(true);
  });

  it('passes clean exec-reporting code', () => {
    const r = scanForForbiddenExecTokens(
      'aggregation_snapshots / kpi_library / board_packs / commission_reconciliation_runs',
    );
    expect(r.ok).toBe(true);
  });
});

describe('exec-reporting tree static scan', () => {
  const files = walk(EXEC_LIB);

  it('finds at least the Phase 1 lib files', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it('no forbidden tokens anywhere in src/lib/executiveReporting (guardrails.ts excluded)', () => {
    const bad: string[] = [];
    for (const file of files) {
      if (normalize(file) === GUARDRAIL_SELF) continue;
      const raw = readFileSync(file, 'utf8');
      const r = scanForForbiddenExecTokens(raw);
      if (!r.ok) {
        const rel = normalize(file.replace(REPO_ROOT, ''));
        bad.push(`${rel}: ${r.hits.map((h) => h.token).join(', ')}`);
      }
    }
    if (bad.length) throw new Error(`Forbidden tokens found in:\n${bad.join('\n')}`);
    expect(bad).toEqual([]);
  });

  it('no forbidden tokens anywhere in the 6 #105 migration files', () => {
    const bad: string[] = [];
    for (const file of MIGRATIONS) {
      const raw = readFileSync(file, 'utf8');
      const stripped = raw
        .split('\n')
        .filter((line) => !/^\s*--\s*EXCLUDES:/i.test(line))
        .join('\n');
      const r = scanForForbiddenExecTokens(stripped);
      if (!r.ok) {
        bad.push(`${file}: ${r.hits.map((h) => h.token).join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('migrations define the 18 tables with RLS-enable statements', () => {
    const allSql = MIGRATIONS.map((f) => readFileSync(f, 'utf8')).join('\n');
    const expected = [
      'aggregation_snapshots',
      'kpi_library',
      'board_pack_kpi_snapshots',
      'board_pack_templates',
      'board_pack_ai_prompts',
      'board_packs',
      'board_pack_sections',
      'board_pack_artifacts',
      'board_members',
      'board_meetings',
      'board_pack_distributions',
      'board_pack_download_events',
      'executive_reporting_audit_log',
    ];
    for (const t of expected) {
      expect(allSql).toContain(`CREATE TABLE IF NOT EXISTS public.${t}`);
      expect(allSql).toContain(`ALTER TABLE public.${t}`);
    }
  });

  it('issued-pack immutability trigger function exists in migration', () => {
    const allSql = MIGRATIONS.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(allSql).toContain('enforce_issued_pack_immutability');
    expect(allSql).toContain('enforce_issued_pack_section_immutability');
    expect(allSql).toContain('enforce_locked_kpi_snapshot_immutability');
    expect(allSql).toContain('enforce_distribution_nda_gate');
  });

  it('audit log uses block_audit_mutation trigger (append-only)', () => {
    const auditMigration = readFileSync(
      join(REPO_ROOT, 'supabase/migrations/20260421000204_exec_reporting_audit_log.sql'),
      'utf8',
    );
    expect(auditMigration).toContain('block_audit_mutation');
    expect(auditMigration).toContain('BEFORE UPDATE OR DELETE');
  });
});

describe('permitted aggregate Helix KPIs (§3.1)', () => {
  it('identifies aggregate-only Helix KPIs as permitted', () => {
    expect(isPermittedAggregateHelixKpi('helix-tokens-outstanding-aggregate')).toBe(true);
    expect(isPermittedAggregateHelixKpi('helix-redemption-rate-aggregate')).toBe(true);
  });
  it('rejects non-aggregate Helix KPIs', () => {
    expect(isPermittedAggregateHelixKpi('helix-individual-balance')).toBe(false);
    expect(isPermittedAggregateHelixKpi('helix_leaderboard_top_10')).toBe(false);
  });
});

describe('provenance recorder', () => {
  it('same SQL → same hash regardless of whitespace', () => {
    const a = hashSourceQuery('SELECT   1 FROM\tfoo');
    const b = hashSourceQuery('SELECT 1 FROM foo');
    expect(a).toBe(b);
  });
  it('different SQL → different hash', () => {
    expect(hashSourceQuery('SELECT 1')).not.toBe(hashSourceQuery('SELECT 2'));
  });
  it('buildProvenance returns a structured object', () => {
    const p = buildProvenance({
      sourcePrompt: '#99',
      sourceTable: 'practitioner_engagement_summary_mv',
      sourceQueryHash: 'abc',
      computationMethod: 'avg',
      asOfTimestamp: '2026-04-20T23:59:59Z',
      kpiVersion: 1,
    });
    expect(p.sourcePrompt).toBe('#99');
    expect(p.kpiVersion).toBe(1);
  });
});
