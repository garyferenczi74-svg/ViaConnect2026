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

/** The guardrails module itself MUST contain the forbidden tokens
 *  (it's the source of truth for them). Skip it in the tree scan. */
const GUARDRAIL_SELF_REFERENCE = join(
  ANALYTICS_LIB,
  'guardrails.ts',
).replace(/\\/g, '/');

/** Phase 1 (Path A) scaffolds only. The legacy
 *  /practitioner/analytics/page.tsx predates Prompt #99 and is out of
 *  Path A scope — migrating it is Phase 2. */
const PHASE_1_PAGE_ROUTES: readonly string[] = [
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

function isPhase1ScaffoldPage(filePath: string): boolean {
  const norm = normalize(filePath);
  return PHASE_1_PAGE_ROUTES.some((route) =>
    norm.endsWith(`/practitioner/analytics/${route}/page.tsx`),
  );
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

  it('every Phase 1 scaffold page renders the MedicalDisclaimer component', () => {
    const scaffoldPages = pageFiles.filter(isPhase1ScaffoldPage);
    expect(scaffoldPages.length).toBe(PHASE_1_PAGE_ROUTES.length);
    const missing: string[] = [];
    for (const file of scaffoldPages) {
      const raw = readFileSync(file, 'utf8');
      if (!raw.includes('MedicalDisclaimer')) {
        missing.push(normalize(file.replace(REPO_ROOT, '')));
      }
    }
    if (missing.length) {
      throw new Error(`Scaffold pages missing MedicalDisclaimer:\n${missing.join('\n')}`);
    }
    expect(missing).toEqual([]);
  });
});
