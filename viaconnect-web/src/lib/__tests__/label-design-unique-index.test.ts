/**
 * src/lib/__tests__/label-design-unique-index.test.ts
 *
 * Prompt 210f Task F6: shape test for the unique one-current-version index
 * on public.white_label_label_designs.
 *
 * Parses supabase/migrations/<stamp>_prompt_210f_label_design_one_current_unique.sql
 * (located by suffix, never by hardcoded stamp) and enforces:
 *   1. Exactly one CREATE UNIQUE INDEX IF NOT EXISTS statement.
 *   2. The index targets public.white_label_label_designs.
 *   3. The column list is (practitioner_id, product_catalog_id).
 *   4. The partial predicate is WHERE is_current_version = true.
 *   5. Zero DROP tokens of any kind (pure-additive migration).
 *
 * Red-first: all assertions fail until the migration file exists and is
 * correctly shaped.
 *
 * Node-safe (no jsdom), node builtins only, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');
const MIGRATION_SUFFIX = '_prompt_210f_label_design_one_current_unique.sql';

function readMigrationSql(): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(MIGRATION_SUFFIX));
  if (!fileName) {
    throw new Error(`No migration file ending with ${MIGRATION_SUFFIX} found under supabase/migrations`);
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

/** Full-line comments removed, lowercased, all whitespace collapsed to single spaces. */
function normalize(sql: string): string {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches === null ? 0 : matches.length;
}

// ---------------------------------------------------------------------------
// 1. Index count: exactly one CREATE UNIQUE INDEX IF NOT EXISTS
// ---------------------------------------------------------------------------

describe('F6 unique-index migration: index statement count', () => {
  it('contains exactly one CREATE UNIQUE INDEX IF NOT EXISTS statement', () => {
    const sql = normalize(readMigrationSql());
    expect(countMatches(sql, /\bcreate unique index if not exists\b/g)).toBe(1);
  });

  it('contains no unguarded CREATE UNIQUE INDEX (every create carries IF NOT EXISTS)', () => {
    const sql = normalize(readMigrationSql());
    const total = countMatches(sql, /\bcreate unique index\b/g);
    const guarded = countMatches(sql, /\bcreate unique index if not exists\b/g);
    expect(total).toBe(guarded);
  });
});

// ---------------------------------------------------------------------------
// 2. Index name and target table
// ---------------------------------------------------------------------------

describe('F6 unique-index migration: correct index name and table', () => {
  it('names the index uq_label_design_one_current', () => {
    const sql = normalize(readMigrationSql());
    expect(sql).toMatch(/create unique index if not exists uq_label_design_one_current/);
  });

  it('targets public.white_label_label_designs', () => {
    const sql = normalize(readMigrationSql());
    expect(sql).toMatch(
      /create unique index if not exists uq_label_design_one_current\s+on public\.white_label_label_designs/,
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Column list mirrors idx_label_design_current exactly
// ---------------------------------------------------------------------------

describe('F6 unique-index migration: correct column list', () => {
  it('indexes (practitioner_id, product_catalog_id)', () => {
    const sql = normalize(readMigrationSql());
    expect(sql).toMatch(
      /on public\.white_label_label_designs \(practitioner_id, product_catalog_id\)/,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Partial predicate
// ---------------------------------------------------------------------------

describe('F6 unique-index migration: correct partial predicate', () => {
  it('carries the WHERE is_current_version = true partial predicate', () => {
    const sql = normalize(readMigrationSql());
    expect(sql).toMatch(/where is_current_version = true/);
  });

  it('the predicate appears immediately after the column list (no intervening clauses)', () => {
    const sql = normalize(readMigrationSql());
    expect(sql).toMatch(
      /on public\.white_label_label_designs \(practitioner_id, product_catalog_id\)\s+where is_current_version = true/,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Zero DROP tokens -- pure-additive migration
// ---------------------------------------------------------------------------

describe('F6 unique-index migration: pure-additive (zero DROP tokens)', () => {
  it('contains no DROP tokens of any kind', () => {
    const sql = normalize(readMigrationSql());
    expect(countMatches(sql, /\bdrop\b/g)).toBe(0);
  });

  it('contains no TRUNCATE, DELETE FROM, or RENAME', () => {
    const sql = normalize(readMigrationSql());
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
    expect(sql).not.toMatch(/\brename\b/);
  });
});
