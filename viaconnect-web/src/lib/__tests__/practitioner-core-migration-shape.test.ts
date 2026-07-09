/**
 * src/lib/__tests__/practitioner-core-migration-shape.test.ts
 *
 * Prompt 210f Task F1: practitioner core ADDITIVE SPLIT migration shape test.
 *
 * Parses supabase/migrations/<stamp>_prompt_210f_practitioner_core_additive.sql
 * (located by suffix, never by hardcoded stamp) and enforces Gary's Decision 1:
 * the additive parts of the practitioner core tranche apply now and every
 * destructive statement is deferred to the evidence pack
 * (docs/integrity/practitioner-core-drop-evidence.md).
 *
 * Invariants:
 *   1. ZERO forbidden statements: no DROP COLUMN, no DROP TABLE, no DROP
 *      POLICY (bare or guarded), no destructive CASCADE. The only DROP token
 *      permitted in the whole file is the single ALTER COLUMN patient_id
 *      DROP NOT NULL relax that Gary signed off (its target table is created
 *      by this same tranche, so it has zero live exposure).
 *   2. Every P1-S practitioner column the code queries is created via
 *      ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS. Note on
 *      naming: no code path or source migration uses practice_address_line1;
 *      the source migrations name the address pack practice_street_address,
 *      practice_city, practice_state, practice_postal_code, practice_country,
 *      practice_phone, practice_email, and the P1-S verified list
 *      (docs/integrity/snapshot/column-misses-verified.json) confirms those
 *      names, so those are asserted here.
 *   3. Every create is guarded: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF
 *      NOT EXISTS, CREATE OR REPLACE FUNCTION, every CREATE POLICY inside a
 *      DO block gated on pg_policies, every CREATE TRIGGER inside a DO block
 *      gated on pg_trigger, every ADD COLUMN carries IF NOT EXISTS, and both
 *      seed INSERTs are idempotent (empty-table guard or ON CONFLICT).
 *   4. RLS: every table this migration creates gets ENABLE ROW LEVEL SECURITY
 *      and every policy body uses the initplan-wrapped (select auth.uid()) /
 *      (select auth.role()) form, never a bare call.
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
const MIGRATION_SUFFIX = '_prompt_210f_practitioner_core_additive.sql';

function readMigrationSql(): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(MIGRATION_SUFFIX));
  if (!fileName) {
    throw new Error(
      `No migration file ending with ${MIGRATION_SUFFIX} found under supabase/migrations`,
    );
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

/** Full-line comments removed, lowercased, all whitespace collapsed to single spaces. */
function normalizedSql(): string {
  return readMigrationSql()
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

/** Every table the assembled tranche creates (all fourteen must carry RLS). */
const CREATED_TABLES: readonly string[] = [
  'practitioner_patients',
  'collaborative_care',
  'supplement_protocols',
  'supplement_protocol_items',
  'clinical_notes',
  'panel_orders',
  'portal_messages',
  'herbal_genomic_interactions',
  'patient_intake_forms',
  'consultations',
  'practitioner_tiers',
  'practitioners',
  'practitioner_subscriptions',
  'constitutional_assessments',
];

/**
 * The P1-S verified practitioners columns the code queries, using the exact
 * names the source migrations create (see header note on practice_address_line1).
 */
const P1S_PRACTITIONER_COLUMNS: readonly string[] = [
  'account_status',
  'practice_name',
  'credential_type',
  'dispensary_slug',
  'practice_street_address',
  'practice_city',
  'practice_state',
  'practice_postal_code',
  'practice_country',
  'practice_phone',
  'practice_email',
  'practice_url',
  'patient_facing_display_name',
  'practice_logo_url',
  'onboarded_at',
  'default_active_tab',
  'default_patient_view_mode',
];

/** ADD COLUMN IF NOT EXISTS names scoped to ALTER TABLE public.practitioners statements. */
function practitionerAddedColumns(sql: string): Set<string> {
  const columns = new Set<string>();
  const alterPattern = /alter table public\.practitioners ([^;]+);/g;
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterPattern.exec(sql)) !== null) {
    const clause = alterMatch[1];
    const columnPattern = /add column if not exists ([a-z0-9_]+)/g;
    let columnMatch: RegExpExecArray | null;
    while ((columnMatch = columnPattern.exec(clause)) !== null) {
      columns.add(columnMatch[1]);
    }
  }
  return columns;
}

/** Bodies of every CREATE POLICY emitted inside a guarded DO block. */
function guardedPolicyBodies(sql: string): string[] {
  const bodies: string[] = [];
  const pattern = /then create policy ([\s\S]*?); end if;/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    bodies.push(match[1]);
  }
  return bodies;
}

const POLICY_GUARD_PATTERN =
  /if not exists \( select 1 from pg_policies where schemaname = 'public' and tablename = '[a-z_]+' and policyname (?:= '[^']+'|in \('[^)]+'\)) \) then create policy/g;

const TRIGGER_GUARD_PATTERN =
  /if not exists \( select 1 from pg_trigger where tgname = '[a-z_]+' and tgrelid = '[a-z_.]+'::regclass \) then create trigger/g;

// ---------------------------------------------------------------------------
// 1. Forbidden statements: additive split means zero destructive DDL
// ---------------------------------------------------------------------------

describe('F1 migration forbids every destructive statement class', () => {
  it('contains no DROP COLUMN', () => {
    expect(normalizedSql()).not.toMatch(/\bdrop\s+column\b/);
  });

  it('contains no DROP TABLE', () => {
    expect(normalizedSql()).not.toMatch(/\bdrop\s+table\b/);
  });

  it('contains no DROP POLICY, bare or guarded', () => {
    expect(normalizedSql()).not.toMatch(/\bdrop\s+policy\b/);
  });

  it('contains no DROP TRIGGER, DROP FUNCTION, DROP VIEW, DROP INDEX, or DROP CONSTRAINT', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\bdrop\s+trigger\b/);
    expect(sql).not.toMatch(/\bdrop\s+function\b/);
    expect(sql).not.toMatch(/\bdrop\s+view\b/);
    expect(sql).not.toMatch(/\bdrop\s+index\b/);
    expect(sql).not.toMatch(/\bdrop\s+constraint\b/);
  });

  it('contains no TRUNCATE, DELETE, or RENAME', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
    expect(sql).not.toMatch(/\brename\b/);
  });

  it('permits exactly one DROP token: the signed patient_id DROP NOT NULL relax', () => {
    const sql = normalizedSql();
    const dropPattern = /\bdrop\b([^;]{0,24})/g;
    const drops: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = dropPattern.exec(sql)) !== null) {
      drops.push(match[1]);
    }
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatch(/^\s+not\s+null\b/);
    expect(sql).toMatch(
      /alter table public\.practitioner_patients alter column patient_id drop not null/,
    );
  });

  it('uses CASCADE only as an ON DELETE / ON UPDATE foreign key action, never on a DROP', () => {
    const sql = normalizedSql();
    const cascadePattern = /\bcascade\b/g;
    let match: RegExpExecArray | null;
    let occurrences = 0;
    while ((match = cascadePattern.exec(sql)) !== null) {
      occurrences += 1;
      const preceding = sql.slice(Math.max(0, match.index - 12), match.index);
      expect(
        /on (?:delete|update) $/.test(preceding),
        `cascade at index ${match.index} is not an FK action (preceding text: "${preceding}")`,
      ).toBe(true);
    }
    expect(occurrences).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. P1-S practitioner columns the code queries are all created
// ---------------------------------------------------------------------------

describe('F1 migration creates every P1-S practitioners column the code queries', () => {
  it('adds each verified column via ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS', () => {
    const added = practitionerAddedColumns(normalizedSql());
    for (const column of P1S_PRACTITIONER_COLUMNS) {
      expect(added.has(column), `practitioners column "${column}" is not added`).toBe(true);
    }
  });

  it('backfills account_status from the legacy status column without dropping status', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/update public\.practitioners set account_status = case status/);
    expect(sql).toMatch(/when 'pending' then 'pending_onboarding'/);
    expect(sql).toMatch(/when 'revoked' then 'terminated'/);
    expect(sql).not.toMatch(/\bdrop\s+column\b/);
  });

  it('hardens account_status with default, backfill, not null, and check', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /alter table public\.practitioners alter column account_status set default 'pending_onboarding'/,
    );
    expect(sql).toMatch(
      /update public\.practitioners set account_status = 'pending_onboarding' where account_status is null/,
    );
    expect(sql).toMatch(
      /alter table public\.practitioners alter column account_status set not null/,
    );
    expect(sql).toMatch(/practitioners_account_status_check/);
  });
});

// ---------------------------------------------------------------------------
// 3. Every create is guarded
// ---------------------------------------------------------------------------

describe('F1 migration guards every create', () => {
  it('creates all fourteen tranche tables with CREATE TABLE IF NOT EXISTS', () => {
    const sql = normalizedSql();
    for (const table of CREATED_TABLES) {
      expect(sql).toMatch(new RegExp(`create table if not exists (?:public\\.)?${table} \\(`));
    }
  });

  it('every CREATE TABLE carries IF NOT EXISTS', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /\bcreate table\b/g)).toBe(
      countMatches(sql, /\bcreate table if not exists\b/g),
    );
  });

  it('every CREATE INDEX carries IF NOT EXISTS', () => {
    const sql = normalizedSql();
    const total = countMatches(sql, /\bcreate (?:unique )?index\b/g);
    const guarded = countMatches(sql, /\bcreate (?:unique )?index if not exists\b/g);
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(guarded);
  });

  it('every function is CREATE OR REPLACE FUNCTION, including the invitation RPCs', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\bcreate function\b/);
    expect(sql).toMatch(
      /create or replace function public\.tg_practitioner_patients_consent_touch/,
    );
    expect(sql).toMatch(/create or replace function public\.lookup_practitioner_invitation/);
    expect(sql).toMatch(/create or replace function public\.accept_practitioner_invitation/);
  });

  it('every ADD COLUMN carries IF NOT EXISTS', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /\badd column\b/g)).toBe(
      countMatches(sql, /\badd column if not exists\b/g),
    );
  });

  it('every CREATE POLICY sits inside a DO block gated on pg_policies', () => {
    const sql = normalizedSql();
    const policyCount = countMatches(sql, /\bcreate policy\b/g);
    const guardedCount = countMatches(sql, POLICY_GUARD_PATTERN);
    expect(policyCount).toBeGreaterThan(0);
    expect(policyCount).toBe(guardedCount);
  });

  it('every CREATE TRIGGER sits inside a DO block gated on pg_trigger', () => {
    const sql = normalizedSql();
    const triggerCount = countMatches(sql, /\bcreate trigger\b/g);
    const guardedCount = countMatches(sql, TRIGGER_GUARD_PATTERN);
    expect(triggerCount).toBeGreaterThan(0);
    expect(triggerCount).toBe(guardedCount);
  });

  it('every seed INSERT is idempotent: empty-table guard or ON CONFLICT upsert', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /\binsert into\b/g)).toBe(2);
    expect(sql).toMatch(
      /if not exists \(\s*select 1 from public\.herbal_genomic_interactions\s*\) then insert into public\.herbal_genomic_interactions/,
    );
    expect(sql).toMatch(/insert into public\.practitioner_tiers[\s\S]*?on conflict \(id\) do update/);
  });

  it('the only UPDATEs are the accept RPC body claim and the two account_status backfills', () => {
    const sql = normalizedSql();
    const updatePattern = /\bupdate\s+([a-z_.]+)\s+set\s+([a-z_]+)/g;
    const targets: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = updatePattern.exec(sql)) !== null) {
      targets.push(`${match[1]}.${match[2]}`);
    }
    // First entry is inside the accept_practitioner_invitation function body
    // (runtime invitation claim, source 20260418000150), not a migration-time
    // data change. The two practitioners updates are the Decision 1 backfills.
    expect(targets).toEqual([
      'public.practitioner_patients.patient_id',
      'public.practitioners.account_status',
      'public.practitioners.account_status',
    ]);
  });
});

// ---------------------------------------------------------------------------
// 4. RLS coverage and initplan-wrapped policies
// ---------------------------------------------------------------------------

describe('F1 migration enables RLS and wraps every auth call for the initplan', () => {
  it('enables row level security on all fourteen tranche tables', () => {
    const sql = normalizedSql();
    for (const table of CREATED_TABLES) {
      expect(sql).toMatch(
        new RegExp(`alter table (?:public\\.)?${table} enable row level security`),
      );
    }
  });

  it('ships at least one policy for each core cluster table', () => {
    const sql = normalizedSql();
    const coreTables = [
      'practitioner_patients',
      'practitioner_tiers',
      'practitioners',
      'practitioner_subscriptions',
      'supplement_protocols',
      'constitutional_assessments',
      'engagement_score_snapshots',
    ];
    for (const table of coreTables) {
      expect(sql).toMatch(new RegExp(`and tablename = '${table}' and policyname `));
    }
  });

  it('every policy body uses (select auth.uid()) / (select auth.role()), never a bare call', () => {
    const bodies = guardedPolicyBodies(normalizedSql());
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      const residue = body
        .split('(select auth.uid())')
        .join('')
        .split('(select auth.role())')
        .join('');
      expect(
        residue.includes('auth.uid()'),
        `bare auth.uid() found in policy body: ${body.slice(0, 120)}`,
      ).toBe(false);
      expect(
        residue.includes('auth.role()'),
        `bare auth.role() found in policy body: ${body.slice(0, 120)}`,
      ).toBe(false);
    }
  });

  it('replaces the stale engagement policy recreate with a new-name dual-guard create', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /tablename = 'engagement_score_snapshots' and policyname in \('engagement_scores_practitioner_read_with_consent', 'engagement_scores_practitioner_read_via_pp_210f'\)/,
    );
    expect(sql).toMatch(/create policy engagement_scores_practitioner_read_via_pp_210f/);
  });
});
