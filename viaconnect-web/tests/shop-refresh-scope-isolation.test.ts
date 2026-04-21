// Prompt #106 §13 blocking — static-analysis scope isolation.
//
// Walks src/lib/shopRefresh/**, src/app/api/admin/shop/**,
// src/app/(app)/admin/shop/**, and supabase/functions/*shop*|*supplement* and
// asserts ZERO references to the forbidden tokens (genex360_products write
// paths, peptide_registry write paths, helix_*, master_skus/pricing_tiers
// write paths, Stripe product_id/price_id writes, other storage buckets).

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { assertTableIsWritable, assertBucketIsCanonical } from '@/lib/shopRefresh/scopeGuards';

const REPO_ROOT = process.cwd();
const ROOTS = [
  'src/lib/shopRefresh',
  'src/app/api/admin/shop',
  'src/app/(app)/admin/shop',
];
// Edge functions: only the ones this prompt owns, by name prefix. Other
// edge functions have their own scope rules and MUST NOT trip this scan.
const EDGE_FUNCTION_PREFIXES = ['supplement_photo_', 'shop_'];

// Forbidden patterns: anything in this list that appears in the scanned
// files triggers a scope breach. Patterns are bounded to the same ~80-char
// window so ".from('X').select(...)" followed 10 lines later by an
// unrelated ".insert()" does not cause a false positive.
function writePattern(table: string): RegExp {
  // Match .from('TABLE').<write> with up to 40 chars of chain in between
  // (e.g., generic types, whitespace). Write verbs attach directly.
  return new RegExp(
    `\\.from\\s*\\(\\s*['"]${table}['"]\\s*\\)[^;]{0,80}?\\.(insert|update|upsert|delete)\\s*\\(`,
  );
}
const FORBIDDEN_WRITE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'genex360_products write',   pattern: writePattern('genex360_products') },
  { name: 'peptide_registry write',    pattern: writePattern('peptide_registry') },
  { name: 'peptide_delivery_options write', pattern: writePattern('peptide_delivery_options') },
  { name: 'peptide_rules write',       pattern: writePattern('peptide_rules') },
  { name: 'user_peptide write',        pattern: /\.from\s*\(\s*['"]user_peptide_[a-z_]+['"]\s*\)[^;]{0,80}?\.(insert|update|upsert|delete)\s*\(/ },
  { name: 'master_skus write',         pattern: writePattern('master_skus') },
  { name: 'pricing_tiers write',       pattern: writePattern('pricing_tiers') },
  { name: 'helix_* reference',         pattern: /['"]helix_[a-z_]+['"]/ },
];

const FORBIDDEN_BUCKET_PATTERNS: RegExp[] = [
  /\.storage\.from\(\s*['"](?!supplement-photos\b)[a-z-]+['"]\s*\)/,
];

const EXEMPT_FILES = new Set<string>([
  'src/lib/shopRefresh/scopeGuards/index.ts', // declares forbidden tables explicitly
  'src/lib/shopRefresh/reconciliation/threeWayDiff.ts', // names set types in its signature
]);

function walk(dir: string): string[] {
  const abs = join(REPO_ROOT, dir);
  let stat;
  try { stat = statSync(abs); } catch { return []; }
  if (!stat.isDirectory()) return [];
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const full = join(abs, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(join(dir, name)));
    else if (/\.(ts|tsx|sql)$/.test(name)) out.push(full);
  }
  return out;
}

function listShopEdgeFunctions(): string[] {
  const abs = join(REPO_ROOT, 'supabase', 'functions');
  let stat;
  try { stat = statSync(abs); } catch { return []; }
  if (!stat.isDirectory()) return [];
  const out: string[] = [];
  for (const entry of readdirSync(abs)) {
    if (!EDGE_FUNCTION_PREFIXES.some((p) => entry.startsWith(p))) continue;
    const fnDir = join(abs, entry);
    if (!statSync(fnDir).isDirectory()) continue;
    for (const f of readdirSync(fnDir)) {
      if (/\.(ts|tsx)$/.test(f)) out.push(join(fnDir, f));
    }
  }
  return out;
}

describe('scope isolation static scan', () => {
  const files = [...ROOTS.flatMap(walk), ...listShopEdgeFunctions()];

  it('discovers the scoped files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { name, pattern } of FORBIDDEN_WRITE_PATTERNS) {
    it(`no files contain "${name}"`, () => {
      const hits: string[] = [];
      for (const f of files) {
        const rel = f.replace(REPO_ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
        if (EXEMPT_FILES.has(rel)) continue;
        const src = readFileSync(f, 'utf8');
        if (pattern.test(src)) hits.push(rel);
      }
      if (hits.length) throw new Error(`Scope breach — "${name}" found in:\n${hits.join('\n')}`);
      expect(hits).toEqual([]);
    });
  }

  it('no storage.from() call targets any bucket other than supplement-photos', () => {
    const hits: string[] = [];
    for (const f of files) {
      const rel = f.replace(REPO_ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
      const src = readFileSync(f, 'utf8');
      for (const p of FORBIDDEN_BUCKET_PATTERNS) {
        if (p.test(src)) hits.push(rel);
      }
    }
    if (hits.length) throw new Error(`Scope breach — non-supplement-photos bucket referenced:\n${hits.join('\n')}`);
    expect(hits).toEqual([]);
  });

  it('no Stripe product_id/price_id writes in shop refresh code', () => {
    const hits: string[] = [];
    for (const f of files) {
      const rel = f.replace(REPO_ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
      const src = readFileSync(f, 'utf8');
      if (/stripe_(product|price)_id\s*:\s*/i.test(src)) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });
});

describe('runtime scope guards', () => {
  it('assertTableIsWritable rejects master_skus + pricing_tiers', () => {
    expect(() => assertTableIsWritable('master_skus')).toThrow(/SCOPE_BREACH/);
    expect(() => assertTableIsWritable('pricing_tiers')).toThrow(/SCOPE_BREACH/);
    expect(() => assertTableIsWritable('genex360_products')).toThrow(/SCOPE_BREACH/);
    expect(() => assertTableIsWritable('peptide_registry')).toThrow(/SCOPE_BREACH/);
    expect(() => assertTableIsWritable('helix_challenges')).toThrow(/SCOPE_BREACH/);
  });

  it('assertTableIsWritable accepts #106 targets', () => {
    expect(() => assertTableIsWritable('product_catalog')).not.toThrow();
    expect(() => assertTableIsWritable('supplement_photo_inventory')).not.toThrow();
    expect(() => assertTableIsWritable('supplement_photo_bindings')).not.toThrow();
    expect(() => assertTableIsWritable('shop_refresh_audit_log')).not.toThrow();
  });

  it('assertBucketIsCanonical rejects anything other than supplement-photos', () => {
    expect(() => assertBucketIsCanonical('legal-evidence')).toThrow(/SCOPE_BREACH/);
    expect(() => assertBucketIsCanonical('board-pack-artifacts')).toThrow(/SCOPE_BREACH/);
    expect(() => assertBucketIsCanonical('avatars')).toThrow(/SCOPE_BREACH/);
    expect(() => assertBucketIsCanonical('supplement-photos')).not.toThrow();
  });
});
