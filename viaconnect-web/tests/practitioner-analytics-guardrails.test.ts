// Prompt #99 Phase 1 (Path A): Helix-isolation + brand guardrail tests.
//
// These cover the pure functions in guardrails.ts AND scan every
// source file under the practitioner analytics tree for forbidden
// tokens. A positive match in any file under analytics/ is a hard
// test failure — the critical compliance rule from §3.1.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  containsHelixReference,
  containsMedicalDisclaimer,
  FORBIDDEN_BRAND_TOKENS,
  FORBIDDEN_HELIX_TOKENS,
  FORBIDDEN_PRODUCT_TOKENS,
  isAggregateOnlyEngagementSource,
  scanForForbiddenTokens,
} from '@/lib/practitioner-analytics/guardrails';

const REPO_ROOT = process.cwd();
const ANALYTICS_LIB = join(REPO_ROOT, 'src/lib/practitioner-analytics');
const ANALYTICS_COMPONENTS = join(REPO_ROOT, 'src/components/practitioner/analytics');
const ANALYTICS_PAGES_ROOT = join(REPO_ROOT, 'src/app/(app)/practitioner/analytics');
const PHASE_2_MIGRATION = join(
  REPO_ROOT,
  'supabase/migrations/20260420000001_practitioner_analytics_mvs_phase_2a.sql',
);
const PHASE_2_LOCKDOWN_FIX = join(
  REPO_ROOT,
  'supabase/migrations/20260420000002_practitioner_analytics_mvs_phase_2a_lockdown_fix.sql',
);
const PHASE_2_FUNCTION_LOCKDOWN = join(
  REPO_ROOT,
  'supabase/migrations/20260420000003_practitioner_analytics_phase_2a_function_lockdown.sql',
);

/** The guardrails module itself MUST contain the forbidden tokens
 *  (it's the source of truth for them). Skip it in the tree scan. */
const GUARDRAIL_SELF_REFERENCE = join(
  ANALYTICS_LIB,
  'guardrails.ts',
).replace(/\\/g, '/');

/** Phase 1 Path A scaffolds + Phase 2 landing page migration. The
 *  MedicalDisclaimer is mandatory on every analytics surface per §3.4. */
const ANALYTICS_PAGE_ROUTES: readonly string[] = [
  'page.tsx',
  'cohorts',
  'protocols',
  'revenue',
  'engagement',
];

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

function isAnalyticsPage(filePath: string): boolean {
  const norm = normalize(filePath);
  return ANALYTICS_PAGE_ROUTES.some((route) => {
    if (route === 'page.tsx') return norm.endsWith('/practitioner/analytics/page.tsx');
    return norm.endsWith(`/practitioner/analytics/${route}/page.tsx`);
  });
}

describe('scanForForbiddenTokens', () => {
  it('passes a clean practitioner analytics snippet', () => {
    const r = scanForForbiddenTokens(
      'const x = "Bio Optimization";\nconst y = "engagement_score";',
    );
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it.each([...FORBIDDEN_HELIX_TOKENS])('flags helix token: %s', (token) => {
    const r = scanForForbiddenTokens(`reference ${token} in source`);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.token === token && v.category === 'helix')).toBe(true);
  });

  it.each([...FORBIDDEN_BRAND_TOKENS])('flags brand token: %s', (token) => {
    const r = scanForForbiddenTokens(`the ${token} display`);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.token === token && v.category === 'brand')).toBe(true);
  });

  it.each([...FORBIDDEN_PRODUCT_TOKENS])('flags product token: %s', (token) => {
    const r = scanForForbiddenTokens(`suggest ${token} for weight loss`);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.token === token && v.category === 'product')).toBe(true);
  });

  it('reports the first offset only per token', () => {
    const r = scanForForbiddenTokens('helix_ and helix_ again');
    const helixViolations = r.violations.filter((v) => v.token === 'helix_');
    expect(helixViolations).toHaveLength(1);
    expect(helixViolations[0]!.offset).toBe(0);
  });
});

describe('containsHelixReference', () => {
  it('returns true for any helix_* token', () => {
    expect(containsHelixReference('select * from helix_rewards')).toBe(true);
    expect(containsHelixReference('token_balance = 0')).toBe(true);
  });
  it('returns false for clean content', () => {
    expect(containsHelixReference('select * from practitioners')).toBe(false);
    expect(containsHelixReference('engagement_score is aggregate')).toBe(false);
  });
});

describe('containsMedicalDisclaimer', () => {
  it('detects the canonical anchor phrase', () => {
    const page = `
      <p>Analytics insights are decision-support tools, not medical advice.</p>
    `;
    expect(containsMedicalDisclaimer(page)).toBe(true);
  });
  it('is case-insensitive', () => {
    expect(
      containsMedicalDisclaimer('DECISION-SUPPORT TOOLS, NOT MEDICAL ADVICE.'),
    ).toBe(true);
  });
  it('returns false when the anchor is absent', () => {
    expect(containsMedicalDisclaimer('<p>Some page body</p>')).toBe(false);
  });
});

describe('isAggregateOnlyEngagementSource', () => {
  it('passes a clean aggregate-only source', () => {
    expect(
      isAggregateOnlyEngagementSource(
        'SELECT practitioner_id, AVG(engagement_score) FROM engagement_score_snapshots',
      ),
    ).toBe(true);
  });
  it('fails when any helix reference is present', () => {
    expect(
      isAggregateOnlyEngagementSource(
        'SELECT engagement_score, helix_rewards FROM ...',
      ),
    ).toBe(false);
  });
  it('fails when there is no aggregate signal at all', () => {
    expect(isAggregateOnlyEngagementSource('SELECT * FROM practitioners')).toBe(false);
  });
});

describe('practitioner analytics tree — static scan', () => {
  const libFiles = walk(ANALYTICS_LIB);
  const componentFiles = walk(ANALYTICS_COMPONENTS);
  const pageFiles = walk(ANALYTICS_PAGES_ROOT);
  const allFiles = [...libFiles, ...componentFiles, ...pageFiles];

  it('finds at least the Phase 1 scaffold files', () => {
    expect(libFiles.length).toBeGreaterThanOrEqual(4);
    expect(componentFiles.length).toBeGreaterThanOrEqual(4);
    expect(pageFiles.length).toBeGreaterThanOrEqual(4);
  });

  it('no file under the practitioner analytics tree contains a forbidden helix_* token (guardrails.ts itself excluded as self-reference)', () => {
    const bad: string[] = [];
    for (const file of allFiles) {
      if (normalize(file) === GUARDRAIL_SELF_REFERENCE) continue;
      const raw = readFileSync(file, 'utf8');
      const scan = scanForForbiddenTokens(raw);
      if (!scan.ok) {
        const rel = normalize(file.replace(REPO_ROOT, ''));
        bad.push(`${rel}: ${scan.violations.map((v) => v.token).join(', ')}`);
      }
    }
    if (bad.length) {
      throw new Error(`Forbidden tokens found in:\n${bad.join('\n')}`);
    }
    expect(bad).toEqual([]);
  });

  it('every analytics page renders the MedicalDisclaimer component (landing + 4 scaffolds)', () => {
    const allPages = pageFiles.filter(isAnalyticsPage);
    expect(allPages.length).toBe(ANALYTICS_PAGE_ROUTES.length);
    const missing: string[] = [];
    for (const file of allPages) {
      const raw = readFileSync(file, 'utf8');
      if (!raw.includes('MedicalDisclaimer')) {
        missing.push(normalize(file.replace(REPO_ROOT, '')));
      }
    }
    if (missing.length) {
      throw new Error(`Pages missing MedicalDisclaimer:\n${missing.join('\n')}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('Phase 2 MV migration — Helix isolation', () => {
  it('migration SQL contains no forbidden helix_* identifier (EXCLUDES header comment is the sanctioned exception per Prompt #99 §5)', () => {
    const sql = readFileSync(PHASE_2_MIGRATION, 'utf8');
    // The EXCLUDES header is mandated by the prompt and references the
    // token declaratively. Strip it before scanning; any remaining
    // match is a real violation.
    const stripped = sql
      .split('\n')
      .filter((line) => !/^--\s*EXCLUDES:/i.test(line.trim()))
      .join('\n');
    expect(containsHelixReference(stripped)).toBe(false);
  });

  it('migration SQL defines all three materialized views', () => {
    const sql = readFileSync(PHASE_2_MIGRATION, 'utf8');
    expect(sql).toMatch(/practitioner_engagement_summary_mv/);
    expect(sql).toMatch(/practitioner_protocol_effectiveness_mv/);
    expect(sql).toMatch(/practitioner_practice_health_mv/);
  });

  it('migration SQL defines the three RLS-equivalent wrapper views', () => {
    const sql = readFileSync(PHASE_2_MIGRATION, 'utf8');
    expect(sql).toMatch(/v_practitioner_engagement_summary/);
    expect(sql).toMatch(/v_practitioner_protocol_effectiveness/);
    expect(sql).toMatch(/v_practitioner_practice_health/);
  });

  it('migration SQL enforces patient consent flags for engagement + protocol surfaces', () => {
    const sql = readFileSync(PHASE_2_MIGRATION, 'utf8');
    expect(sql).toMatch(/consent_share_engagement_score\s*=\s*true/);
    expect(sql).toMatch(/consent_share_protocol\s*=\s*true/);
  });

  it('migration SQL revokes all access on MVs from PUBLIC', () => {
    const sql = readFileSync(PHASE_2_MIGRATION, 'utf8');
    expect(sql).toMatch(/REVOKE ALL ON public\.practitioner_engagement_summary_mv FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE ALL ON public\.practitioner_protocol_effectiveness_mv FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE ALL ON public\.practitioner_practice_health_mv FROM PUBLIC/i);
  });

  it('migration SQL grants view SELECT to authenticated role', () => {
    const sql = readFileSync(PHASE_2_MIGRATION, 'utf8');
    expect(sql).toMatch(/GRANT SELECT ON public\.v_practitioner_engagement_summary TO authenticated/i);
    expect(sql).toMatch(/GRANT SELECT ON public\.v_practitioner_protocol_effectiveness TO authenticated/i);
    expect(sql).toMatch(/GRANT SELECT ON public\.v_practitioner_practice_health TO authenticated/i);
  });
});

describe('Phase 2 lockdown fix migration', () => {
  it('contains no forbidden helix_* identifier', () => {
    const sql = readFileSync(PHASE_2_LOCKDOWN_FIX, 'utf8');
    const stripped = sql
      .split('\n')
      .filter((line) => !/^--\s*EXCLUDES:/i.test(line.trim()))
      .join('\n');
    expect(containsHelixReference(stripped)).toBe(false);
  });

  it('revokes all on each MV from anon AND authenticated', () => {
    const sql = readFileSync(PHASE_2_LOCKDOWN_FIX, 'utf8');
    for (const mv of [
      'practitioner_engagement_summary_mv',
      'practitioner_protocol_effectiveness_mv',
      'practitioner_practice_health_mv',
    ]) {
      expect(sql).toMatch(
        new RegExp(`REVOKE ALL ON public\\.${mv} FROM anon`, 'i'),
      );
      expect(sql).toMatch(
        new RegExp(`REVOKE ALL ON public\\.${mv} FROM authenticated`, 'i'),
      );
    }
  });

  it('re-affirms wrapper view SELECT grants to authenticated', () => {
    const sql = readFileSync(PHASE_2_LOCKDOWN_FIX, 'utf8');
    for (const view of [
      'v_practitioner_engagement_summary',
      'v_practitioner_protocol_effectiveness',
      'v_practitioner_practice_health',
    ]) {
      expect(sql).toMatch(
        new RegExp(`GRANT SELECT ON public\\.${view} TO authenticated`, 'i'),
      );
    }
  });
});

describe('Phase 2 function lockdown migration', () => {
  it('contains no forbidden helix_* identifier', () => {
    const sql = readFileSync(PHASE_2_FUNCTION_LOCKDOWN, 'utf8');
    const stripped = sql
      .split('\n')
      .filter((line) => !/^--\s*EXCLUDES:/i.test(line.trim()))
      .join('\n');
    expect(containsHelixReference(stripped)).toBe(false);
  });

  it('revokes EXECUTE on refresh function from PUBLIC, anon, and authenticated', () => {
    const sql = readFileSync(PHASE_2_FUNCTION_LOCKDOWN, 'utf8');
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.refresh_practitioner_analytics_phase_2a\(\) FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.refresh_practitioner_analytics_phase_2a\(\) FROM anon/i);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.refresh_practitioner_analytics_phase_2a\(\) FROM authenticated/i);
  });

  it('re-grants EXECUTE only to service_role', () => {
    const sql = readFileSync(PHASE_2_FUNCTION_LOCKDOWN, 'utf8');
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.refresh_practitioner_analytics_phase_2a\(\) TO service_role/i);
  });

  it('annotates protocol + practice_health MVs with explicit EXCLUDES clause', () => {
    const sql = readFileSync(PHASE_2_FUNCTION_LOCKDOWN, 'utf8');
    expect(sql).toMatch(/COMMENT ON MATERIALIZED VIEW public\.practitioner_protocol_effectiveness_mv[\s\S]*EXCLUDES/i);
    expect(sql).toMatch(/COMMENT ON MATERIALIZED VIEW public\.practitioner_practice_health_mv[\s\S]*EXCLUDES/i);
  });
});
