#!/usr/bin/env node
/**
 * scripts/schema/verify-edge-adoption.mjs
 *
 * Prompt 210d Task P3-5. Deno is not installed in this environment, so edge
 * function adoption of the drift-tagged fail-open pattern is verified
 * statically: each target function's entry file (index.ts) must import
 * ../_shared/schema-drift.ts AND contain at least one reportSupabaseError
 * call. Exits 1 naming every non-adopter.
 *
 * Usage:
 *   node scripts/schema/verify-edge-adoption.mjs
 *   node scripts/schema/verify-edge-adoption.mjs --root <functionsDir> --targets a,b
 *
 * Zero dependencies (node builtins only) per the 210d global constraints.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_TARGETS = [
  'body-scan-analyze',
  'arnold-vision-analyze',
  'ingest-body-composition',
  'nutrition-insights-daily',
  'nutrition-insights-weekly',
];

const IMPORT_PATTERN = /from\s+['"]\.\.\/_shared\/schema-drift\.ts['"]/;
const CALL_PATTERN = /reportSupabaseError\s*\(/g;

function parseArgs(argv) {
  const args = {
    root: path.join(process.cwd(), 'supabase', 'functions'),
    targets: DEFAULT_TARGETS,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root' && argv[i + 1]) {
      args.root = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--targets' && argv[i + 1]) {
      args.targets = argv[i + 1]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      i += 1;
    }
  }
  return args;
}

function findEntryFile(dir) {
  const indexPath = path.join(dir, 'index.ts');
  if (existsSync(indexPath)) return indexPath;
  let candidates = [];
  try {
    candidates = readdirSync(dir).filter((name) => name.endsWith('.ts'));
  } catch {
    return null;
  }
  if (candidates.length === 1) return path.join(dir, candidates[0]);
  return null;
}

function checkTarget(root, slug) {
  const entry = findEntryFile(path.join(root, slug));
  if (!entry) {
    return {
      slug,
      adopted: false,
      calls: 0,
      reason: 'entry file not found (expected index.ts)',
    };
  }
  const content = readFileSync(entry, 'utf8');
  const hasImport = IMPORT_PATTERN.test(content);
  const calls = (content.match(CALL_PATTERN) || []).length;
  if (!hasImport) {
    return {
      slug,
      adopted: false,
      calls,
      reason: 'missing ../_shared/schema-drift.ts import',
    };
  }
  if (calls < 1) {
    return {
      slug,
      adopted: false,
      calls,
      reason: 'no reportSupabaseError call found',
    };
  }
  return { slug, adopted: true, calls, reason: null };
}

const { root, targets } = parseArgs(process.argv.slice(2));
const results = targets.map((slug) => checkTarget(root, slug));
const failures = results.filter((r) => !r.adopted);

for (const r of results) {
  if (r.adopted) {
    console.log(`ok ${r.slug}: ${r.calls} reportSupabaseError call(s)`);
  } else {
    console.log(`FAIL ${r.slug}: ${r.reason}`);
  }
}

if (failures.length > 0) {
  console.error(
    `verify-edge-adoption: ${failures.length} non-adopter(s): ${failures
      .map((r) => r.slug)
      .join(', ')}`,
  );
  process.exit(1);
}
console.log(
  `verify-edge-adoption: all ${results.length} edge functions adopt drift-tagged fail-open`,
);
