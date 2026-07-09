/**
 * src/lib/__tests__/certification_waitlist-migration-shape.test.ts
 *
 * Prompt 210f Task F3: certification/waitlist ADDITIVE tranche shape test.
 *
 * Parses supabase/migrations/<stamp>_prompt_210f_certification_waitlist_additive.sql
 * (located by suffix, never by hardcoded stamp) and enforces Gary's Decision 2
 * schema portion: the five cluster 4 tables (practitioner_cohorts,
 * practitioner_waitlist, practitioner_email_queue, certification_levels,
 * practitioner_certifications) apply now, the mailer cron arming stays with
 * Task F4, and zero destructive statements ride along.
 *
 * Invariants:
 *   1. ZERO forbidden statements: no DROP of any kind (this tranche has no
 *      signed relax, so the whole file carries zero DROP tokens), no
 *      TRUNCATE, no DELETE FROM, no RENAME, and CASCADE only as an ON DELETE
 *      foreign key action.
 *   2. Every create is guarded: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF
 *      NOT EXISTS, CREATE OR REPLACE FUNCTION, every CREATE POLICY inside a
 *      DO block gated on pg_policies, every CREATE TRIGGER inside a DO block
 *      gated on pg_trigger, and both seeds idempotent (empty-table guard
 *      plus their source ON CONFLICT clauses).
 *   3. The public waitlist form payload (src/app/api/waitlist/practitioner/
 *      route.ts insert keys) and the practitioner-waitlist-mailer reads and
 *      contacted-marking updates (supabase/functions/practitioner-waitlist-
 *      mailer/index.ts) are all covered by created columns.
 *   4. The F4 ARMING comment block is present (so Task F4 can lift the cron
 *      registration verbatim) but INERT: no executable cron.schedule,
 *      cron.unschedule, http_post, or ultrathink_agent_registry statement
 *      survives comment stripping.
 *   5. The two F1-deferred FK attaches (practitioners.waitlist_id and
 *      practitioners.cohort_id, evidence pack Additional deferrals section 1)
 *      ride at the end as pg_constraint-guarded conditional ALTERs.
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
const MIGRATION_SUFFIX = '_prompt_210f_certification_waitlist_additive.sql';

function readMigrationSql(): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(MIGRATION_SUFFIX));
  if (!fileName) {
    throw new Error(
      `No migration file ending with ${MIGRATION_SUFFIX} found under supabase/migrations`,
    );
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

/** Raw file text, comments included (used to assert the F4 block exists). */
function rawSql(): string {
  return readMigrationSql();
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

/** The five cluster 4 tables this tranche creates (all must carry RLS). */
const CREATED_TABLES: readonly string[] = [
  'practitioner_cohorts',
  'practitioner_waitlist',
  'practitioner_email_queue',
  'certification_levels',
  'practitioner_certifications',
];

/**
 * Every column key the public waitlist form route inserts
 * (src/app/api/waitlist/practitioner/route.ts lines 68-107), plus id,
 * which the route reads back via .select('id').
 */
const WAITLIST_FORM_PAYLOAD_COLUMNS: readonly string[] = [
  'id',
  'email',
  'first_name',
  'last_name',
  'phone',
  'practice_name',
  'practice_url',
  'practice_street_address',
  'practice_city',
  'practice_state',
  'practice_postal_code',
  'practice_country',
  'credential_type',
  'credential_type_other',
  'license_state',
  'license_number',
  'npi_number',
  'years_in_practice',
  'approximate_patient_panel_size',
  'primary_clinical_focus',
  'primary_clinical_focus_other',
  'specialties',
  'uses_genetic_testing',
  'currently_dispensing_supplements',
  'estimated_monthly_supplement_volume_cents',
  'referral_source',
  'referral_source_other',
  'interest_reason',
  'biggest_clinical_challenge',
  'desired_platform_features',
  'submission_type',
  'invitation_token',
  'user_agent',
  'ip_address',
  'referrer_url',
  'utm_source',
  'utm_medium',
  'utm_campaign',
];

/**
 * Every practitioner_email_queue column the mailer edge function selects,
 * filters, orders by, or updates (supabase/functions/practitioner-waitlist-
 * mailer/index.ts).
 */
const MAILER_QUEUE_COLUMNS: readonly string[] = [
  'id',
  'waitlist_id',
  'step',
  'scheduled_for',
  'status',
  'attempts',
  'last_error',
  'sent_at',
  'updated_at',
];

/** Every practitioner_waitlist column the mailer selects per queue row. */
const MAILER_WAITLIST_READ_COLUMNS: readonly string[] = [
  'id',
  'email',
  'first_name',
  'last_name',
  'practice_name',
  'credential_type',
  'unsubscribed',
];

/** The contacted-marking columns the mailer writes back to the waitlist row. */
const MAILER_CONTACTED_MARK_COLUMNS: readonly string[] = [
  'last_email_sent_at',
  'email_sequence_step',
  'updated_at',
];

/**
 * Balanced-paren extraction of a CREATE TABLE body from the normalized SQL.
 * Throws when the guarded create for the table is missing entirely.
 */
function tableBody(sql: string, table: string): string {
  const marker = `create table if not exists public.${table} (`;
  const start = sql.indexOf(marker);
  if (start === -1) {
    throw new Error(`CREATE TABLE IF NOT EXISTS public.${table} not found`);
  }
  let depth = 0;
  let i = start + marker.length - 1;
  for (; i < sql.length; i += 1) {
    if (sql[i] === '(') depth += 1;
    else if (sql[i] === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return sql.slice(start + marker.length, i);
}

/** True when the table body defines the named column. */
function hasColumn(body: string, column: string): boolean {
  const trimmed = body.trim();
  return trimmed.startsWith(`${column} `) || trimmed.includes(`, ${column} `);
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
// 1. Forbidden statements: this tranche is pure-additive, zero DROP tokens
// ---------------------------------------------------------------------------

describe('F3 migration forbids every destructive statement class', () => {
  it('contains no DROP COLUMN, DROP TABLE, or DROP POLICY', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\bdrop\s+column\b/);
    expect(sql).not.toMatch(/\bdrop\s+table\b/);
    expect(sql).not.toMatch(/\bdrop\s+policy\b/);
  });

  it('contains no DROP TRIGGER, DROP FUNCTION, DROP VIEW, DROP INDEX, or DROP CONSTRAINT', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\bdrop\s+trigger\b/);
    expect(sql).not.toMatch(/\bdrop\s+function\b/);
    expect(sql).not.toMatch(/\bdrop\s+view\b/);
    expect(sql).not.toMatch(/\bdrop\s+index\b/);
    expect(sql).not.toMatch(/\bdrop\s+constraint\b/);
  });

  it('contains no TRUNCATE, DELETE FROM, or RENAME', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
    expect(sql).not.toMatch(/\brename\b/);
  });

  it('carries ZERO DROP tokens of any kind (no signed relax exists in this tranche)', () => {
    expect(countMatches(normalizedSql(), /\bdrop\b/g)).toBe(0);
  });

  it('uses CASCADE only as an ON DELETE foreign key action, never on a DROP', () => {
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
    expect(occurrences).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. F4 ARMING block: present for verbatim lift, inert in this file
// ---------------------------------------------------------------------------

describe('F3 migration defers the mailer cron to Task F4 as an inert comment block', () => {
  it('carries the clearly-marked F4 ARMING comment block', () => {
    expect(rawSql()).toContain('-- F4 ARMING, DO NOT APPLY IN F3');
  });

  it('reproduces the cron registration inside comments so F4 can lift it verbatim', () => {
    const raw = rawSql();
    expect(raw).toContain('cron.schedule');
    expect(raw).toContain('practitioner_waitlist_mailer_cron');
    expect(raw).toContain('practitioner-waitlist-mailer');
    expect(raw).toContain('ultrathink_agent_registry');
  });

  it('keeps every cron, http_post, and registry statement non-executable', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/cron\.schedule/);
    expect(sql).not.toMatch(/cron\.unschedule/);
    expect(sql).not.toMatch(/http_post/);
    expect(sql).not.toMatch(/ultrathink_agent_registry/);
  });
});

// ---------------------------------------------------------------------------
// 3. Every create is guarded
// ---------------------------------------------------------------------------

describe('F3 migration guards every create', () => {
  it('creates all five tranche tables with CREATE TABLE IF NOT EXISTS', () => {
    const sql = normalizedSql();
    for (const table of CREATED_TABLES) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${table} \\(`));
    }
  });

  it('every CREATE TABLE carries IF NOT EXISTS', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /\bcreate table\b/g)).toBe(
      countMatches(sql, /\bcreate table if not exists\b/g),
    );
  });

  it('every CREATE INDEX carries IF NOT EXISTS, including the queue due-scan index', () => {
    const sql = normalizedSql();
    const total = countMatches(sql, /\bcreate (?:unique )?index\b/g);
    const guarded = countMatches(sql, /\bcreate (?:unique )?index if not exists\b/g);
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(guarded);
    expect(sql).toMatch(/create index if not exists idx_pwlq_due/);
    expect(sql).toMatch(/create index if not exists idx_waitlist_email/);
  });

  it('ships both queue functions as CREATE OR REPLACE with pinned search_path', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\bcreate function\b/);
    expect(sql).toMatch(/create or replace function public\.enqueue_practitioner_welcome_email/);
    expect(sql).toMatch(
      /create or replace function public\.tg_practitioner_waitlist_enqueue_welcome/,
    );
    expect(countMatches(sql, /set search_path = public, pg_temp/g)).toBe(2);
    expect(countMatches(sql, /security definer/g)).toBe(2);
  });

  it('locks the enqueue RPC to service_role (REVOKE public/anon, GRANT service_role)', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /revoke all on function public\.enqueue_practitioner_welcome_email\(uuid\) from public/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.enqueue_practitioner_welcome_email\(uuid\) from anon/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.enqueue_practitioner_welcome_email\(uuid\) to service_role/,
    );
  });

  it('every CREATE POLICY sits inside a DO block gated on pg_policies', () => {
    const sql = normalizedSql();
    const policyCount = countMatches(sql, /\bcreate policy\b/g);
    const guardedCount = countMatches(sql, POLICY_GUARD_PATTERN);
    expect(policyCount).toBe(10);
    expect(policyCount).toBe(guardedCount);
  });

  it('every CREATE TRIGGER sits inside a DO block gated on pg_trigger', () => {
    const sql = normalizedSql();
    const triggerCount = countMatches(sql, /\bcreate trigger\b/g);
    const guardedCount = countMatches(sql, TRIGGER_GUARD_PATTERN);
    expect(triggerCount).toBe(1);
    expect(triggerCount).toBe(guardedCount);
  });

  it('both seeds are empty-table guarded and keep their source ON CONFLICT clauses', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /\binsert into\b/g)).toBe(3);
    expect(sql).toMatch(
      /if not exists \( select 1 from public\.practitioner_cohorts \) then insert into public\.practitioner_cohorts[\s\S]*?on conflict \(cohort_number\) do nothing/,
    );
    expect(sql).toMatch(
      /if not exists \( select 1 from public\.certification_levels \) then insert into public\.certification_levels[\s\S]*?on conflict \(id\) do update/,
    );
    expect(sql).toMatch(
      /insert into public\.practitioner_email_queue \(waitlist_id, step, scheduled_for\)[\s\S]*?on conflict \(waitlist_id, step\) do nothing/,
    );
  });

  it('the only UPDATE is the enqueue function body sequence-step touch, no migration-time data change', () => {
    const sql = normalizedSql();
    const updatePattern = /\bupdate\s+([a-z_.]+)\s+set\s+([a-z_]+)/g;
    const targets: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = updatePattern.exec(sql)) !== null) {
      targets.push(`${match[1]}.${match[2]}`);
    }
    expect(targets).toEqual(['public.practitioner_waitlist.email_sequence_step']);
  });
});

// ---------------------------------------------------------------------------
// 4. RLS coverage and initplan-wrapped policies
// ---------------------------------------------------------------------------

describe('F3 migration enables RLS and wraps every auth call for the initplan', () => {
  it('enables row level security on all five tranche tables', () => {
    const sql = normalizedSql();
    for (const table of CREATED_TABLES) {
      expect(sql).toMatch(
        new RegExp(`alter table (?:public\\.)?${table} enable row level security`),
      );
    }
  });

  it('ships at least one policy for each tranche table', () => {
    const sql = normalizedSql();
    for (const table of CREATED_TABLES) {
      expect(sql).toMatch(new RegExp(`and tablename = '${table}' and policyname `));
    }
  });

  it('keeps the anon public-insert lead-capture policy on the waitlist', () => {
    expect(normalizedSql()).toMatch(
      /create policy "waitlist_public_insert" on public\.practitioner_waitlist for insert to anon, authenticated with check \(true\)/,
    );
  });

  it('every policy body uses (select auth.uid()), never a bare call', () => {
    const bodies = guardedPolicyBodies(normalizedSql());
    expect(bodies).toHaveLength(10);
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
});

// ---------------------------------------------------------------------------
// 5. Form payload and mailer column coverage
// ---------------------------------------------------------------------------

describe('F3 migration covers the live code paths that were losing writes', () => {
  it('practitioner_waitlist defines every column the public form route inserts, plus id', () => {
    const body = tableBody(normalizedSql(), 'practitioner_waitlist');
    for (const column of WAITLIST_FORM_PAYLOAD_COLUMNS) {
      expect(hasColumn(body, column), `waitlist column "${column}" is not defined`).toBe(true);
    }
  });

  it('practitioner_email_queue defines every column the mailer reads and updates', () => {
    const body = tableBody(normalizedSql(), 'practitioner_email_queue');
    for (const column of MAILER_QUEUE_COLUMNS) {
      expect(hasColumn(body, column), `queue column "${column}" is not defined`).toBe(true);
    }
  });

  it('practitioner_waitlist defines the mailer read set and contacted-marking columns', () => {
    const body = tableBody(normalizedSql(), 'practitioner_waitlist');
    for (const column of [...MAILER_WAITLIST_READ_COLUMNS, ...MAILER_CONTACTED_MARK_COLUMNS]) {
      expect(hasColumn(body, column), `waitlist column "${column}" is not defined`).toBe(true);
    }
  });

  it('wires the welcome-email enqueue trigger AFTER INSERT on the waitlist', () => {
    expect(normalizedSql()).toMatch(
      /create trigger practitioner_waitlist_enqueue_welcome after insert on public\.practitioner_waitlist for each row execute function public\.tg_practitioner_waitlist_enqueue_welcome\(\)/,
    );
  });
});

// ---------------------------------------------------------------------------
// 6. F1 deferral closure: the two practitioners FK attaches
// ---------------------------------------------------------------------------

describe('F3 migration closes the F1 FK deferral from the evidence pack', () => {
  it('attaches practitioners_waitlist_id_fkey under a pg_constraint absence guard', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/conname = 'practitioners_waitlist_id_fkey'/);
    expect(sql).toMatch(
      /alter table public\.practitioners add constraint practitioners_waitlist_id_fkey foreign key \(waitlist_id\) references public\.practitioner_waitlist\(id\)/,
    );
  });

  it('attaches practitioners_cohort_id_fkey under a pg_constraint absence guard', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/conname = 'practitioners_cohort_id_fkey'/);
    expect(sql).toMatch(
      /alter table public\.practitioners add constraint practitioners_cohort_id_fkey foreign key \(cohort_id\) references public\.practitioner_cohorts\(id\)/,
    );
  });
});
