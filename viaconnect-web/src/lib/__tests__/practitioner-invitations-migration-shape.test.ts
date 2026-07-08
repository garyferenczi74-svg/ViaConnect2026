/**
 * src/lib/__tests__/practitioner-invitations-migration-shape.test.ts
 *
 * Prompt 210f Task F3b: practitioner_invitations ADDITIVE slice shape test.
 *
 * Parses supabase/migrations/<stamp>_prompt_210f_practitioner_invitations_additive.sql
 * (located by suffix, never by hardcoded stamp) and enforces the plan-gap
 * closure for the practitioner_invitations table and the
 * validate_practitioner_invitation RPC.
 *
 * Invariants:
 *   1. ZERO forbidden statements: no DROP of any kind (this tranche has no
 *      signed relax, so the whole file carries zero DROP tokens), no
 *      TRUNCATE, no DELETE FROM, no RENAME, and no CASCADE (this source
 *      table has no ON DELETE CASCADE foreign keys).
 *   2. Every create is guarded: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF
 *      NOT EXISTS, CREATE OR REPLACE FUNCTION, and the CREATE POLICY inside
 *      a DO block gated on pg_policies. No seeds (source has none).
 *   3. The code consumer at src/lib/practitioner/invitations.ts insert
 *      payload keys (line 52), RPC call args (line 92), and RPC return
 *      column reads (lines 102-112) are all covered by created columns and
 *      the function RETURNS TABLE clause.
 *   4. The validate_practitioner_invitation RPC is SECURITY DEFINER with a
 *      pinned search_path and is callable by anon and authenticated roles
 *      via the REVOKE/GRANT pair.
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
const MIGRATION_SUFFIX = '_prompt_210f_practitioner_invitations_additive.sql';

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

/**
 * Column names the code consumer inserts into practitioner_invitations
 * (src/lib/practitioner/invitations.ts lines 52-60).
 */
const INSERT_PAYLOAD_COLUMNS: readonly string[] = [
  'token',
  'invited_by',
  'target_email',
  'expected_credential_type',
  'personal_note',
  'expires_at',
];

/**
 * Return column names the code consumer reads from validate_practitioner_invitation
 * (src/lib/practitioner/invitations.ts lines 102-112).
 */
const RPC_RETURN_COLUMNS: readonly string[] = [
  'ok',
  'target_email',
  'expected_credential_type',
  'personal_note',
  'invited_by_display',
];

// ---------------------------------------------------------------------------
// 1. Forbidden statements: this tranche is pure-additive, zero DROP tokens
// ---------------------------------------------------------------------------

describe('F3b migration forbids every destructive statement class', () => {
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

  it('carries no CASCADE tokens (this table has no ON DELETE CASCADE foreign keys)', () => {
    expect(countMatches(normalizedSql(), /\bcascade\b/g)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Every create is guarded
// ---------------------------------------------------------------------------

describe('F3b migration guards every create', () => {
  it('creates the table with CREATE TABLE IF NOT EXISTS', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/create table if not exists public\.practitioner_invitations \(/);
  });

  it('every CREATE TABLE carries IF NOT EXISTS', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /\bcreate table\b/g)).toBe(
      countMatches(sql, /\bcreate table if not exists\b/g),
    );
  });

  it('every CREATE INDEX carries IF NOT EXISTS and both source indexes are present', () => {
    const sql = normalizedSql();
    const total = countMatches(sql, /\bcreate (?:unique )?index\b/g);
    const guarded = countMatches(sql, /\bcreate (?:unique )?index if not exists\b/g);
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(guarded);
    expect(sql).toMatch(/create index if not exists idx_practitioner_invitations_open/);
    expect(sql).toMatch(/create index if not exists idx_practitioner_invitations_invited_by/);
  });

  it('ships the RPC as CREATE OR REPLACE FUNCTION with SECURITY DEFINER and pinned search_path', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\bcreate function\b/);
    expect(sql).toMatch(/create or replace function public\.validate_practitioner_invitation/);
    expect(countMatches(sql, /set search_path = public, pg_temp/g)).toBe(1);
    expect(countMatches(sql, /security definer/g)).toBe(1);
  });

  it('grants the RPC to anon and authenticated (REVOKE from public, GRANT to anon/authenticated)', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /revoke all on function public\.validate_practitioner_invitation\(text, boolean\) from public/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.validate_practitioner_invitation\(text, boolean\) to anon, authenticated/,
    );
  });

  it('every CREATE POLICY sits inside a DO block gated on pg_policies', () => {
    const sql = normalizedSql();
    const policyCount = countMatches(sql, /\bcreate policy\b/g);
    const guardedCount = countMatches(sql, POLICY_GUARD_PATTERN);
    expect(policyCount).toBe(1);
    expect(policyCount).toBe(guardedCount);
  });

  it('contains no migration-time INSERT INTO (no seeds in this source)', () => {
    expect(countMatches(normalizedSql(), /\binsert into\b/g)).toBe(0);
  });

  it('the only UPDATE is inside the RPC body, touching practitioner_invitations.used_at', () => {
    const sql = normalizedSql();
    const updatePattern = /\bupdate\s+([a-z_.]+)\s+set\s+([a-z_]+)/g;
    const targets: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = updatePattern.exec(sql)) !== null) {
      targets.push(`${match[1]}.${match[2]}`);
    }
    expect(targets).toEqual(['public.practitioner_invitations.used_at']);
  });
});

// ---------------------------------------------------------------------------
// 3. RLS coverage and initplan-wrapped policies
// ---------------------------------------------------------------------------

describe('F3b migration enables RLS and wraps every auth call for the initplan', () => {
  it('enables row level security on practitioner_invitations', () => {
    expect(normalizedSql()).toMatch(
      /alter table (?:public\.)?practitioner_invitations enable row level security/,
    );
  });

  it('ships at least one policy for practitioner_invitations', () => {
    expect(normalizedSql()).toMatch(
      /and tablename = 'practitioner_invitations' and policyname /,
    );
  });

  it('ships the invitations_admin_all policy scoped to authenticated only', () => {
    expect(normalizedSql()).toMatch(
      /create policy "invitations_admin_all" on public\.practitioner_invitations for all to authenticated/,
    );
  });

  it('every policy body uses (select auth.uid()), never a bare call', () => {
    const bodies = guardedPolicyBodies(normalizedSql());
    expect(bodies).toHaveLength(1);
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
// 4. Code-consumer column coverage (src/lib/practitioner/invitations.ts)
// ---------------------------------------------------------------------------

describe('F3b migration covers the live code paths that reference practitioner_invitations', () => {
  it('practitioner_invitations defines every column the insert payload writes (line 52)', () => {
    const body = tableBody(normalizedSql(), 'practitioner_invitations');
    for (const column of INSERT_PAYLOAD_COLUMNS) {
      expect(hasColumn(body, column), `table column "${column}" is not defined`).toBe(true);
    }
  });

  it('validate_practitioner_invitation signature has parameter p_token text', () => {
    expect(normalizedSql()).toMatch(
      /create or replace function public\.validate_practitioner_invitation\( p_token text/,
    );
  });

  it('validate_practitioner_invitation signature has parameter p_claim boolean default false', () => {
    expect(normalizedSql()).toMatch(/p_claim boolean default false/);
  });

  it('validate_practitioner_invitation RETURNS TABLE defines all consumer return columns (lines 102-112)', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /returns table \( ok boolean, target_email text, expected_credential_type text, personal_note text, invited_by_display text \)/,
    );
    for (const col of RPC_RETURN_COLUMNS) {
      expect(sql, `RPC RETURNS TABLE missing column: ${col}`).toMatch(
        new RegExp(`\\b${col}\\b`),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Live profiles column validity (F3b-fix: caught pre-apply by controller)
//    Red-first: before the fix, p.first_name and p.last_name are found in the
//    function body but are absent from live profiles.Row -- the exact defect.
//    Green after: only p.full_name and p.id remain; both are live columns.
// ---------------------------------------------------------------------------

/**
 * Parse the profiles Row column names from docs/integrity/snapshot/live-types.ts.
 * Uses balanced-brace extraction so the result is resilient to Row key additions.
 * Returns a Set of lowercase column names that exist in the live profiles table.
 */
function liveProfilesRowKeys(): Set<string> {
  const liveTypesPath = join(REPO_ROOT, 'docs', 'integrity', 'snapshot', 'live-types.ts');
  const source = readFileSync(liveTypesPath, 'utf8');
  const profilesMarker = '      profiles: {';
  const profilesIdx = source.indexOf(profilesMarker);
  if (profilesIdx === -1) {
    throw new Error('profiles section not found in docs/integrity/snapshot/live-types.ts');
  }
  const rowMarker = '        Row: {';
  const rowIdx = source.indexOf(rowMarker, profilesIdx);
  if (rowIdx === -1) {
    throw new Error('profiles Row block not found in docs/integrity/snapshot/live-types.ts');
  }
  // Balanced-brace extraction: start from the opening { of Row: {
  let depth = 0;
  let blockStart = -1;
  let blockEnd = -1;
  for (let i = rowIdx + rowMarker.length - 1; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
      if (depth === 1) blockStart = i + 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        blockEnd = i;
        break;
      }
    }
  }
  if (blockStart === -1 || blockEnd === -1) {
    throw new Error('Failed to extract profiles Row block (unbalanced braces)');
  }
  const block = source.slice(blockStart, blockEnd);
  const keys = new Set<string>();
  const lineRe = /^\s+([a-z_]+):/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(block)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

/**
 * Extract unique p.<column> references from within AS $$ ... $$ function bodies
 * in the migration SQL (the only context where p is used as a profiles alias).
 * Returns a sorted array of unique column names.
 */
function functionBodyProfileColumnRefs(): string[] {
  const sql = readMigrationSql();
  const refs = new Set<string>();
  const bodyRe = /\bAS\s+\$\$([\s\S]*?)\$\$/g;
  let bodyMatch: RegExpExecArray | null;
  while ((bodyMatch = bodyRe.exec(sql)) !== null) {
    const body = bodyMatch[1];
    const colRe = /\bp\.([a-z_]+)\b/g;
    let colMatch: RegExpExecArray | null;
    while ((colMatch = colRe.exec(body)) !== null) {
      refs.add(colMatch[1]);
    }
  }
  return [...refs].sort();
}

describe('F3b migration: p.<column> refs in function bodies are valid live profiles columns', () => {
  it('finds at least one p.<column> reference in the AS $$ function body', () => {
    const refs = functionBodyProfileColumnRefs();
    expect(refs.length, 'regex found zero p.<column> refs -- check scoping').toBeGreaterThan(0);
  });

  it('every p.<column> reference resolves to a column that exists in live profiles.Row', () => {
    const refs = functionBodyProfileColumnRefs();
    const liveKeys = liveProfilesRowKeys();
    for (const col of refs) {
      expect(
        liveKeys.has(col),
        `p.${col} referenced in migration function body but absent from live profiles.Row (phantom column)`,
      ).toBe(true);
    }
  });
});
