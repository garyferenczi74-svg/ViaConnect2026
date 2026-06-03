/**
 * Prompt 172e Phase C: migration file integrity tests.
 *
 * Pins the append only contract for the new meal_items.beverage_catalog_slug
 * column. Phase A used the same pattern to pin the catalog seed against
 * accidental edits. This sweep ensures:
 *   - Migration file exists at the expected path
 *   - ADD COLUMN IF NOT EXISTS is used (idempotent re run)
 *   - FK target is beverage_catalog.slug with ON DELETE SET NULL
 *   - Index is partial (WHERE beverage_catalog_slug IS NOT NULL)
 *   - No destructive statements (no DROP, no ALTER COLUMN, no DELETE)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260603000010_prompt_172e_phase_c_meal_items_beverage_slug.sql',
);

describe('Prompt 172e Phase C migration integrity', () => {
  it('the migration file exists at the canonical path', () => {
    expect(() => readFileSync(MIGRATION_PATH, 'utf8')).not.toThrow();
  });

  it('adds the beverage_catalog_slug column with IF NOT EXISTS (idempotent)', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS beverage_catalog_slug TEXT/);
  });

  it('references beverage_catalog(slug) with ON DELETE SET NULL', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/REFERENCES public\.beverage_catalog\(slug\)/);
    expect(sql).toMatch(/ON DELETE SET NULL/);
  });

  it('creates a partial index gated on beverage_catalog_slug IS NOT NULL', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_meal_items_beverage_catalog_slug/);
    expect(sql).toMatch(/WHERE beverage_catalog_slug IS NOT NULL/);
  });

  it('contains no destructive statements (append only)', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    // Strip SQL comments before scanning so the file's own narrative copy
    // describing what the migration does (and does not do) does not trip
    // the destructive statement guard. Postgres -- line comments and
    // /* */ block comments are both stripped.
    const stripped = sql
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    expect(stripped).not.toMatch(/\bDROP COLUMN\b/i);
    expect(stripped).not.toMatch(/\bDROP TABLE\b/i);
    expect(stripped).not.toMatch(/\bALTER COLUMN\b/i);
    expect(stripped).not.toMatch(/\bDELETE FROM\b/i);
    expect(stripped).not.toMatch(/\bTRUNCATE\b/i);
  });

  it('contains no em or en dashes (production migration discipline)', () => {
    const EM_DASH = String.fromCharCode(0x2014);
    const EN_DASH = String.fromCharCode(0x2013);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).not.toContain(EM_DASH);
    expect(sql).not.toContain(EN_DASH);
  });
});
