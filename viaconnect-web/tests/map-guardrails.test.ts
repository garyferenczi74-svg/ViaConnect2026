// Prompt #100 — MAP guardrail tests.
// Covers: L1/L2 scope isolation, Helix isolation, margin preservation,
// fair enforcement (anonymous attribution), naming-collision detection,
// and a static scan of the MAP source tree.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  FORBIDDEN_MAP_TOKENS,
  FORBIDDEN_COLLISION_IDENTIFIERS,
  isAttributableToPractitioner,
  isMAPEnforcedTier,
  isMarginPreserving,
  marginPreservingFloorCents,
  MARGIN_MULTIPLIER,
  MAP_ALLOWED_TIERS,
  scanForMAPGuardrailViolations,
  sqlReferencesL1L2Filter,
} from '@/lib/map/guardrails';

const REPO_ROOT = process.cwd();
const MAP_LIB = join(REPO_ROOT, 'src/lib/map');
const MAP_MIGRATIONS = [
  join(REPO_ROOT, 'supabase/migrations/20260420000011_map_tables.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260420000012_map_rls_policies.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260420000013_map_functions.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260420000014_map_cron_jobs.sql'),
];
const GUARDRAIL_SELF_REFERENCE = join(MAP_LIB, 'guardrails.ts').replace(/\\/g, '/');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function normalize(p: string): string {
  return p.replace(/\\/g, '/');
}

describe('MAP scope — L1 + L2 only (§3.1)', () => {
  it('MAP_ALLOWED_TIERS is exactly ["L1","L2"]', () => {
    expect([...MAP_ALLOWED_TIERS]).toEqual(['L1', 'L2']);
  });
  it.each(['L1', 'L2'])('allows tier %s', (t) => {
    expect(isMAPEnforcedTier(t)).toBe(true);
  });
  it.each(['L3', 'L4', '', null, undefined, 'L5'])('rejects tier %s', (t) => {
    expect(isMAPEnforcedTier(t as string | null | undefined)).toBe(false);
  });
});

describe('Margin preservation (§3.5 / #94)', () => {
  it('multiplier is 1.72', () => {
    expect(MARGIN_MULTIPLIER).toBe(1.72);
  });
  it('passes at exactly 1.72x', () => {
    expect(isMarginPreserving(172, 100)).toBe(true);
    expect(marginPreservingFloorCents(100)).toBe(172);
  });
  it('fails below 1.72x', () => {
    expect(isMarginPreserving(170, 100)).toBe(false);
  });
  it('passes above 1.72x', () => {
    expect(isMarginPreserving(1000, 100)).toBe(true);
  });
  it('returns false for zero or negative cost floor', () => {
    expect(isMarginPreserving(100, 0)).toBe(false);
    expect(isMarginPreserving(100, -5)).toBe(false);
  });
});

describe('Fair enforcement (§3.4)', () => {
  it('anonymous observations are not attributable', () => {
    expect(isAttributableToPractitioner(null)).toBe(false);
    expect(isAttributableToPractitioner('')).toBe(false);
  });
  it('non-empty practitioner id is attributable', () => {
    expect(isAttributableToPractitioner('p-1')).toBe(true);
  });
});

describe('Helix isolation + naming collision (§3.3)', () => {
  it.each([...FORBIDDEN_MAP_TOKENS])('flags forbidden token: %s', (token) => {
    const r = scanForMAPGuardrailViolations(`SELECT ${token} FROM something`);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.token === token && v.category === 'map_forbidden')).toBe(true);
  });

  it.each([...FORBIDDEN_COLLISION_IDENTIFIERS])('flags collision identifier: %s', (token) => {
    const r = scanForMAPGuardrailViolations(`const ${token} = 1`);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.token === token && v.category === 'collision')).toBe(true);
  });

  it('passes a clean MAP snippet', () => {
    const r = scanForMAPGuardrailViolations(
      'const tier: MAPComplianceTier = "Gold"; const score = computeMAPComplianceScore(input);',
    );
    expect(r.ok).toBe(true);
  });

  it('static scan of src/lib/map (guardrails.ts excluded)', () => {
    const files = walk(MAP_LIB);
    const bad: string[] = [];
    for (const file of files) {
      if (normalize(file) === GUARDRAIL_SELF_REFERENCE) continue;
      const raw = readFileSync(file, 'utf8');
      const r = scanForMAPGuardrailViolations(raw);
      if (!r.ok) bad.push(`${normalize(file.replace(REPO_ROOT, ''))}: ${r.violations.map((v) => v.token).join(', ')}`);
    }
    if (bad.length) throw new Error(`Forbidden tokens in MAP lib:\n${bad.join('\n')}`);
    expect(bad).toEqual([]);
  });
});

describe('Migration SQL — L1/L2 filter + Helix isolation', () => {
  it.each(MAP_MIGRATIONS)('migration contains no reward-program tokens or collision identifiers: %s', (path) => {
    const sql = readFileSync(path, 'utf8');
    const r = scanForMAPGuardrailViolations(sql);
    if (!r.ok) {
      throw new Error(`${path}: ${r.violations.map((v) => v.token).join(', ')}`);
    }
    expect(r.ok).toBe(true);
  });

  it('detect_map_violations migration filters on pricing_tier IN L1 L2', () => {
    const sql = readFileSync(
      join(REPO_ROOT, 'supabase/migrations/20260420000013_map_functions.sql'),
      'utf8',
    );
    expect(sqlReferencesL1L2Filter(sql)).toBe(true);
  });

  it('map_tables migration enforces margin preservation at DB level', () => {
    const sql = readFileSync(
      join(REPO_ROOT, 'supabase/migrations/20260420000011_map_tables.sql'),
      'utf8',
    );
    expect(sql).toMatch(/map_policies_margin_preserved/);
    expect(sql).toMatch(/ingredient_cost_floor_cents \* 1\.72/);
  });

  it('map_tables migration registers append-only triggers for observations + policy log', () => {
    const sql = readFileSync(
      join(REPO_ROOT, 'supabase/migrations/20260420000011_map_tables.sql'),
      'utf8',
    );
    expect(sql).toMatch(/map_price_observations_append_only/);
    expect(sql).toMatch(/map_policy_change_log_append_only/);
    expect(sql).toMatch(/block_audit_mutation/);
  });
});

describe('sqlReferencesL1L2Filter', () => {
  it('accepts the canonical filter expression', () => {
    expect(sqlReferencesL1L2Filter("WHERE p.pricing_tier IN ('L1','L2')")).toBe(true);
    expect(sqlReferencesL1L2Filter("WHERE tier IN ('L1','L2')")).toBe(true);
  });
  it('rejects a missing filter', () => {
    expect(sqlReferencesL1L2Filter('SELECT * FROM map_policies')).toBe(false);
  });
});
