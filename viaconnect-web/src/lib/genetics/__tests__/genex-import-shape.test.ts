/**
 * src/lib/genetics/__tests__/genex-import-shape.test.ts
 *
 * Prompt 210d P0-7b: GENEX360 / Genemetrics import write-shape test.
 *
 * Guards the contract between three artifacts:
 *   1. The LIVE user_variants columns, parsed AT RUNTIME from the drift
 *      snapshot docs/integrity/snapshot/live-types.ts (Tables -> user_variants
 *      -> Row keys). They are never hardcoded here, so a snapshot refresh keeps
 *      this suite honest.
 *   2. The two columns added by the P0-7b append-only migration
 *      (*_prompt_210d_user_variants_risk_category.sql), parsed from the
 *      migration file text, never hardcoded, so this suite fails if the
 *      migration file is missing or a column is renamed.
 *   3. The genemetrics import upsert payload: buildGenemetricsVariantRow
 *      exported by src/lib/genetics/genemetricsImportPayload.ts (the redirected
 *      upsert in src/app/api/genex/genemetrics/route.ts), plus the onConflict
 *      key constant GENEMETRICS_USER_VARIANTS_ONCONFLICT.
 *
 * Invariant: every upsert payload key is a subset of the live user_variants
 * columns UNION the columns the P0-7b migration adds ({risk_level, category}).
 *
 * Redirect facts (P0-7 report, .superpowers/sdd/task-210d-P0-7-report.md):
 *   - panel            -> panel_key (rename)
 *   - clinical_summary -> clinical_significance (rename)
 *   - risk_level, category keep their names once the additive columns land
 *   - onConflict is the live panel-scoped unique key user_id,rsid,panel_key
 *     (the old user_id,rsid is stale)
 *
 * Genetic-privacy: all fixtures are synthetic and obviously fake (rsTEST....),
 * never real rsids, genotypes, or variant data.
 *
 * Node-safe (no jsdom), node builtins only, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGenemetricsVariantRow,
  GENEMETRICS_USER_VARIANTS_ONCONFLICT,
} from '@/lib/genetics/genemetricsImportPayload';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');
const MIGRATION_SUFFIX = '_prompt_210d_user_variants_risk_category.sql';
const LIVE_TYPES_PATH = join(REPO_ROOT, 'docs', 'integrity', 'snapshot', 'live-types.ts');

// ---------------------------------------------------------------------------
// Migration file parsing (node builtins only)
// ---------------------------------------------------------------------------

function readMigrationSql(): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(MIGRATION_SUFFIX));
  if (!fileName) {
    throw new Error(
      `No migration file ending with ${MIGRATION_SUFFIX} found under supabase/migrations`,
    );
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

function parseAddedColumns(sql: string): string[] {
  const pattern = /add column if not exists\s+([a-z0-9_]+)/gi;
  const columns: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    columns.push(match[1].toLowerCase());
  }
  return columns;
}

/** The migration SQL with comment lines removed and whitespace normalized. */
function migrationStatementText(): string {
  return readMigrationSql()
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Live snapshot parsing (Tables -> user_variants -> Row keys, at runtime)
// ---------------------------------------------------------------------------

/**
 * Parses the live user_variants Row keys from the drift snapshot at runtime.
 * The table matcher anchors the exact name after start-of-line whitespace.
 * Keys are then collected one per line inside the `Row: {` block until its
 * closing brace.
 */
function parseLiveUserVariantsRowKeys(): string[] {
  const lines = readFileSync(LIVE_TYPES_PATH, 'utf8').split(/\r?\n/);
  const tableIndex = lines.findIndex((line) => /^\s*user_variants: \{$/.test(line));
  if (tableIndex === -1) {
    throw new Error('user_variants table entry not found in live-types.ts');
  }
  let rowIndex = -1;
  for (let i = tableIndex + 1; i < lines.length; i += 1) {
    if (/^\s*Row: \{$/.test(lines[i])) {
      rowIndex = i;
      break;
    }
    if (/^\s*(Insert|Update|Relationships)\b/.test(lines[i])) {
      break;
    }
  }
  if (rowIndex === -1) {
    throw new Error('user_variants Row block not found in live-types.ts');
  }
  const keys: string[] = [];
  for (let i = rowIndex + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '}') {
      return keys;
    }
    const keyMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*):/.exec(lines[i]);
    if (keyMatch) {
      keys.push(keyMatch[1]);
    }
  }
  throw new Error('user_variants Row block not terminated in live-types.ts');
}

/** Live user_variants columns UNION the columns the P0-7b migration adds. */
function liveUnionMigrated(): Set<string> {
  return new Set([...parseLiveUserVariantsRowKeys(), ...parseAddedColumns(readMigrationSql())]);
}

// A single synthetic, obviously-fake variant. Never real genetic data.
const SYNTHETIC_INPUT = {
  userId: 'user-TEST-0001',
  panel: 'GENEX-M',
  gene: 'TESTGENE',
  rsid: 'rsTEST0001',
  genotype: 'XX',
  riskLevel: 'low',
  category: 'methylation',
  clinicalSummary: 'synthetic fixture, not real clinical data',
} as const;

// ---------------------------------------------------------------------------
// 1. Migration file shape
// ---------------------------------------------------------------------------

describe('P0-7b user_variants risk_level + category migration file', () => {
  it('exists and adds exactly risk_level and category via add column if not exists', () => {
    const added = parseAddedColumns(readMigrationSql());
    expect([...added].sort()).toEqual(['category', 'risk_level']);
  });

  it('contains only the single alter add-column statement outside comment lines', () => {
    expect(migrationStatementText()).toBe(
      'alter table public.user_variants add column if not exists risk_level text, '
        + 'add column if not exists category text;',
    );
  });

  it('is append-only: no drop or rename statements outside comment lines', () => {
    const statement = migrationStatementText();
    expect(statement).not.toMatch(/\bdrop\b/);
    expect(statement).not.toMatch(/\brename\b/);
  });
});

// ---------------------------------------------------------------------------
// 2. Live snapshot parsing sanity
// ---------------------------------------------------------------------------

describe('live user_variants Row keys (parsed from live-types.ts at runtime)', () => {
  it('parses a plausible non-empty key set without duplicates', () => {
    const keys = parseLiveUserVariantsRowKeys();
    expect(keys.length).toBeGreaterThanOrEqual(10);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('user_id');
    expect(keys).toContain('rsid');
    expect(keys).toContain('panel_key');
    expect(keys).toContain('clinical_significance');
  });
});

// ---------------------------------------------------------------------------
// 3. Genemetrics import upsert payload (buildGenemetricsVariantRow)
// ---------------------------------------------------------------------------

describe('genemetrics import payload (buildGenemetricsVariantRow)', () => {
  const row = buildGenemetricsVariantRow(SYNTHETIC_INPUT);

  it('every payload key is a live user_variants column or one added by the P0-7b migration', () => {
    const union = liveUnionMigrated();
    for (const key of Object.keys(row)) {
      expect(
        union.has(key),
        `genemetrics payload key "${key}" is not a live or migrated user_variants column`,
      ).toBe(true);
    }
  });

  it('applies the P0-7 key renames and keeps values unchanged', () => {
    // panel -> panel_key, clinical_summary -> clinical_significance
    expect(row.panel_key).toBe('GENEX-M');
    expect(row.clinical_significance).toBe('synthetic fixture, not real clinical data');
    // risk_level and category keep their names
    expect(row.risk_level).toBe('low');
    expect(row.category).toBe('methylation');
    // exact-map keys carried through unchanged
    expect(row.user_id).toBe('user-TEST-0001');
    expect(row.gene).toBe('TESTGENE');
    expect(row.rsid).toBe('rsTEST0001');
    expect(row.genotype).toBe('XX');
  });

  it('emits no stale genetic_variants payload keys', () => {
    const keys = Object.keys(row);
    expect(keys).not.toContain('panel');
    expect(keys).not.toContain('clinical_summary');
  });
});

// ---------------------------------------------------------------------------
// 4. onConflict key (the live panel-scoped unique key)
// ---------------------------------------------------------------------------

describe('genemetrics import onConflict key', () => {
  it('is the live panel-scoped unique key user_id,rsid,panel_key', () => {
    expect(GENEMETRICS_USER_VARIANTS_ONCONFLICT).toBe('user_id,rsid,panel_key');
  });
});

// ---------------------------------------------------------------------------
// 5. Upload route source-text contract (P0-7c)
//
// Guards that src/app/api/genex/upload/route.ts has been redirected away from
// the non-existent genetic_variants table and onto the live user_variants
// consumer lane using the shared builder and onConflict constant.
//
// Source-text assertions are intentionally coarse-grained (substring match on
// the file as a string), so no runtime execution of the route is required and
// no genetic data passes through this test.
//
// Red-first evidence: before the P0-7c fix the file contained '"genetic_variants"'
// and lacked the builder/constant references, so every assertion below would fail.
// After the fix all four pass.
// ---------------------------------------------------------------------------

describe('upload route source-text contract (P0-7c)', () => {
  const UPLOAD_ROUTE_PATH = join(
    REPO_ROOT,
    'src',
    'app',
    'api',
    'genex',
    'upload',
    'route.ts',
  );
  let uploadSource: string;

  beforeAll(() => {
    uploadSource = readFileSync(UPLOAD_ROUTE_PATH, 'utf8');
  });

  it('no longer references genetic_variants in any string literal', () => {
    expect(uploadSource).not.toContain('"genetic_variants"');
  });

  it('upserts to user_variants', () => {
    expect(uploadSource).toContain('.from("user_variants")');
  });

  it('uses the shared builder buildGenemetricsVariantRow', () => {
    expect(uploadSource).toContain('buildGenemetricsVariantRow');
  });

  it('uses GENEMETRICS_USER_VARIANTS_ONCONFLICT for the onConflict key', () => {
    expect(uploadSource).toContain('GENEMETRICS_USER_VARIANTS_ONCONFLICT');
  });
});
