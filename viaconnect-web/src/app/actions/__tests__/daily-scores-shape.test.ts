/**
 * src/app/actions/__tests__/daily-scores-shape.test.ts
 *
 * Prompt 210d P0-4: daily_scores shape test.
 *
 * Guards the contract between four artifacts:
 *   1. The LIVE daily_scores columns (verified by SQL 2026-07-07; hardcoded
 *      below verbatim from the P0-4 brief Global Constraints).
 *   2. The eight code-expected pillar columns added by the P0-4 append-only
 *      migration (*_prompt_210d_daily_scores_pillar_columns.sql). These are
 *      PARSED from the migration file text, never hardcoded, so this suite
 *      fails if the migration file is missing or a column is renamed.
 *   3. The gauge writer payload: buildDailyScoresUpsertPayload exported by
 *      src/app/actions/dailyScores.ts (the upsert at ~line 63).
 *   4. The windowed journey graph reader select list: DAILY_SCORES_COLUMNS
 *      exported by useBioOptimizationTrend.ts (the 208k-era windowed
 *      daily_scores reader consumed by the journey coaching graph).
 *
 * Invariant: every writer payload key and every reader selected column must be
 * a subset of live columns UNION the eight migration columns.
 *
 * Node-safe (no jsdom), node builtins only, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The writer module imports the server Supabase client (which imports
// next/headers) and the reader module calls createClient() at module scope;
// both are mocked so this suite stays node-safe and env-independent. Neither
// mock is exercised: the test only touches the pure payload builder and the
// exported select-list constant.
vi.mock('@/lib/supabase/server', () => ({ createClient: () => ({}) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { buildDailyScoresUpsertPayload } from '@/app/actions/dailyScores';
import { DAILY_SCORES_COLUMNS } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';

// ---------------------------------------------------------------------------
// Live schema truth (P0-4 brief Global Constraints, verified by SQL 2026-07-07)
// ---------------------------------------------------------------------------

const LIVE_DAILY_SCORES_COLUMNS: readonly string[] = [
  'id',
  'user_id',
  'date',
  'recovery_score',
  'sleep_score',
  'steps_score',
  'strain_score',
  'exercise_score',
  'regimen_score',
  'steps_count',
  'sleep_hours',
  'exercise_minutes',
  'recovery_hrv',
  'strain_value',
  'data_source',
  'wearable_type',
  'daily_composite',
  'bio_optimization_score',
  'created_at',
  'updated_at',
  'source_breakdown',
];

/** The eight columns the P0-4 migration must add (brief Step 2). */
const EXPECTED_PILLAR_COLUMNS: readonly string[] = [
  'score_date',
  'data_mode',
  'calculated_at',
  'overall_score',
  'nutrition_score',
  'activity_score',
  'mood_stress_score',
  'energy_score',
];

// ---------------------------------------------------------------------------
// Migration file parsing (node builtins only)
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');
const MIGRATION_SUFFIX = '_prompt_210d_daily_scores_pillar_columns.sql';

function readPillarMigrationSql(): string {
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

/** Live columns UNION the columns the P0-4 migration adds. */
function liveUnionMigrated(): Set<string> {
  return new Set([...LIVE_DAILY_SCORES_COLUMNS, ...parseAddedColumns(readPillarMigrationSql())]);
}

const SAMPLE_MERGED = {
  sleep_score: 80,
  energy_score: 70,
  mood_stress_score: null,
  nutrition_score: 65,
  activity_score: null,
};

// ---------------------------------------------------------------------------
// 1. Migration file shape
// ---------------------------------------------------------------------------

describe('P0-4 pillar-columns migration file', () => {
  it('adds exactly the eight code-expected pillar columns via add column if not exists', () => {
    const added = parseAddedColumns(readPillarMigrationSql());
    expect(added).toHaveLength(8);
    expect([...added].sort()).toEqual([...EXPECTED_PILLAR_COLUMNS].sort());
  });

  it('is append-only: no drop or rename statements outside comment lines', () => {
    const statements = readPillarMigrationSql()
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(statements).not.toMatch(/\bdrop\b/i);
    expect(statements).not.toMatch(/\brename\b/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Writer payload keys (subset of live UNION the eight)
// ---------------------------------------------------------------------------

describe('gauge writer payload (buildDailyScoresUpsertPayload)', () => {
  it('every upsert payload key is a live column or one of the eight migrated columns', async () => {
    const payload = await buildDailyScoresUpsertPayload('user-123', '2026-07-07', SAMPLE_MERGED, 72);
    const union = liveUnionMigrated();
    for (const key of Object.keys(payload)) {
      expect(
        union.has(key),
        `writer payload key "${key}" is not a live or migrated daily_scores column`,
      ).toBe(true);
    }
  });

  it('keeps the exact pre-210d payload keys and values (shape unchanged)', async () => {
    const payload = await buildDailyScoresUpsertPayload('user-123', '2026-07-07', SAMPLE_MERGED, 72);
    expect(Object.keys(payload).sort()).toEqual([
      'activity_score',
      'calculated_at',
      'data_mode',
      'energy_score',
      'mood_stress_score',
      'nutrition_score',
      'overall_score',
      'score_date',
      'sleep_score',
      'user_id',
    ]);
    expect(payload.user_id).toBe('user-123');
    expect(payload.score_date).toBe('2026-07-07');
    expect(payload.data_mode).toBe('manual');
    expect(payload.overall_score).toBe(72);
    expect(payload.sleep_score).toBe(80);
    expect(payload.energy_score).toBe(70);
    expect(payload.mood_stress_score).toBeNull();
    expect(payload.nutrition_score).toBe(65);
    expect(payload.activity_score).toBeNull();
    expect(typeof payload.calculated_at).toBe('string');
    expect(Number.isNaN(Date.parse(payload.calculated_at))).toBe(false);
  });

  it('the upsert onConflict target columns (user_id, score_date) exist after the migration', () => {
    const union = liveUnionMigrated();
    expect(union.has('user_id')).toBe(true);
    expect(union.has('score_date')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Reader selected columns (subset of live UNION the eight)
// ---------------------------------------------------------------------------

describe('journey graph reader select list (DAILY_SCORES_COLUMNS)', () => {
  it('every selected column is a live column or one of the eight migrated columns', () => {
    const selected = DAILY_SCORES_COLUMNS.split(',').map((c) => c.trim());
    expect(selected.length).toBeGreaterThan(0);
    const union = liveUnionMigrated();
    for (const column of selected) {
      expect(
        union.has(column),
        `reader selected column "${column}" is not a live or migrated daily_scores column`,
      ).toBe(true);
    }
  });

  it('keeps score_date so the windowed read can filter and order (keys unchanged)', () => {
    const selected = DAILY_SCORES_COLUMNS.split(',').map((c) => c.trim());
    expect(selected).toContain('score_date');
  });
});

// ---------------------------------------------------------------------------
// 4. Unique index migration file (upsert onConflict 42P10 fix)
// ---------------------------------------------------------------------------

const UPSERT_INDEX_SUFFIX = '_prompt_210d_daily_scores_upsert_unique_index.sql';

function readUpsertIndexMigrationSql(): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(UPSERT_INDEX_SUFFIX));
  if (!fileName) {
    throw new Error(
      `No migration file ending with ${UPSERT_INDEX_SUFFIX} found under supabase/migrations`,
    );
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

describe('P0-4 upsert unique index migration file', () => {
  it('contains exactly one create unique index if not exists on public.daily_scores (user_id, score_date) and zero drop or alter statements', () => {
    const sql = readUpsertIndexMigrationSql();
    const normalized = sql.replace(/\s+/g, ' ').toLowerCase();
    const matches = normalized.match(
      /create unique index if not exists \S+ on public\.daily_scores \(user_id, score_date\)/g,
    );
    expect(matches).toHaveLength(1);
    const nonCommentLines = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(nonCommentLines).not.toMatch(/\bdrop\b/i);
    expect(nonCommentLines).not.toMatch(/\balter\b/i);
  });
});
