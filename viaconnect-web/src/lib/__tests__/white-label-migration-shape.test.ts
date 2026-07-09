/**
 * src/lib/__tests__/white-label-migration-shape.test.ts
 *
 * Prompt 210f Task F5: white label ADDITIVE tranche shape test.
 *
 * Parses supabase/migrations/<stamp>_prompt_210f_white_label_additive.sql
 * (located by suffix, never by hardcoded stamp) and enforces Gary's Decision 3
 * schema portion: the cluster 1 white label tranche (sources 20260418000420,
 * 000430, 000440 storage buckets, 000450, 000460, 000470, 000480, 000490,
 * 000500) applies now as pure-additive DDL, the launch checklist stays with
 * Task F6, and zero destructive statements ride along.
 *
 * Invariants:
 *   1. ZERO forbidden statements: no DROP of any kind (this tranche has no
 *      signed relax, so the whole file carries zero DROP tokens), no
 *      TRUNCATE, no DELETE FROM, no RENAME, and CASCADE only as an ON DELETE
 *      foreign key action. The 000500 DROP VIEW + CREATE VIEW pair is carried
 *      as CREATE OR REPLACE VIEW (identical column list, view absent live).
 *   2. Every create is guarded: CREATE TABLE IF NOT EXISTS (15), CREATE
 *      INDEX IF NOT EXISTS (22), CREATE OR REPLACE FUNCTION (3), CREATE
 *      SEQUENCE IF NOT EXISTS, CREATE OR REPLACE VIEW, every CREATE POLICY
 *      inside a DO block gated on pg_policies (36: 30 public + 6 storage),
 *      every CREATE TRIGGER inside a DO block gated on pg_trigger (2), and
 *      every seed guarded (empty-table guard for tranche-created tables,
 *      row-absence guard for live tables) plus source ON CONFLICT clauses.
 *   3. 19 of the 20 cluster objects are created; the 20th,
 *      sum_practitioner_wholesale_volume, is DEFERRED-INERT: its LANGUAGE
 *      sql body reads shop_orders.wholesale_total_cents /
 *      placed_by_practitioner_id / order_type, columns absent from live
 *      shop_orders (their adding migration 20260418000130 is outside this
 *      tranche), so an unguarded create would fail the apply. It rides as a
 *      comment block for a later lift.
 *   4. Live-validity (the F3b incident class): every live-table column
 *      reference in seeds and policy bodies is validated at test runtime
 *      against docs/integrity/snapshot/live-types.ts, and every
 *      practitioner_patients reference in the 000500 tightened dispensary
 *      policy is validated against the F1 migration's CREATE TABLE (the
 *      authoritative post-F1 shape). The source's phantom
 *      pp.patient_user_id is rewritten to pp.patient_id with a
 *      practitioners user_id bridge, following the F1
 *      practitioners_patient_read_public precedent.
 *   5. The 000480 broad wl_disp_published_read policy is NOT emitted; only
 *      the 000500 tightened same-name replacement is (guard-once semantics
 *      would otherwise freeze the insecure draft).
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
const MIGRATION_SUFFIX = '_prompt_210f_white_label_additive.sql';
const F1_MIGRATION_SUFFIX = '_prompt_210f_practitioner_core_additive.sql';

function readSqlBySuffix(suffix: string): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(suffix));
  if (!fileName) {
    throw new Error(`No migration file ending with ${suffix} found under supabase/migrations`);
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

function readMigrationSql(): string {
  return readSqlBySuffix(MIGRATION_SUFFIX);
}

/** Raw file text, comments included (used to assert the deferral block exists). */
function rawSql(): string {
  return readMigrationSql();
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

function normalizedSql(): string {
  return normalize(readMigrationSql());
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches === null ? 0 : matches.length;
}

/** The 15 tables this tranche creates (all must carry RLS). */
const CREATED_TABLES: readonly string[] = [
  'white_label_enrollments',
  'white_label_catalog_config',
  'practitioner_brand_configurations',
  'white_label_label_designs',
  'white_label_compliance_reviews',
  'white_label_production_orders',
  'white_label_production_order_items',
  'white_label_inventory_lots',
  'white_label_sku_mappings',
  'white_label_recalls',
  'white_label_compliance_reviewer_roles',
  'white_label_reviewer_assignments',
  'white_label_dispensary_settings',
  'white_label_discount_tiers',
  'white_label_parameters',
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
  /if not exists \( select 1 from pg_policies where schemaname = '(?:public|storage)' and tablename = '[a-z_]+' and policyname = '[a-z_]+' \) then create policy/g;

const TRIGGER_GUARD_PATTERN =
  /if not exists \( select 1 from pg_trigger where tgname = '[a-z_]+' and tgrelid = 'public\.[a-z_]+'::regclass \) then create trigger/g;

/**
 * Header segment of a CREATE OR REPLACE FUNCTION (signature + attributes,
 * everything before the AS $$ body opener). Used for targeted SECURITY
 * DEFINER / search_path attribute assertions that raw token counts cannot
 * express (a carried COMMENT string also says "SECURITY DEFINER").
 */
function functionHeaderSegment(sql: string, name: string): string {
  const marker = `create or replace function public.${name}`;
  const start = sql.indexOf(marker);
  if (start === -1) {
    throw new Error(`CREATE OR REPLACE FUNCTION public.${name} not found`);
  }
  const bodyOpen = sql.indexOf(' as $$', start);
  if (bodyOpen === -1) {
    throw new Error(`AS $$ body opener not found for public.${name}`);
  }
  return sql.slice(start, bodyOpen);
}

// ---------------------------------------------------------------------------
// live-types runtime parsing (F3b-fix pattern, generalized per table)
// ---------------------------------------------------------------------------

/**
 * Parse the named table's Row column names from
 * docs/integrity/snapshot/live-types.ts via balanced-brace extraction.
 * Returns a Set of column names that exist in the live table.
 */
function liveRowKeys(table: string): Set<string> {
  const liveTypesPath = join(REPO_ROOT, 'docs', 'integrity', 'snapshot', 'live-types.ts');
  const source = readFileSync(liveTypesPath, 'utf8');
  const tableMarker = `      ${table}: {`;
  const tableIdx = source.indexOf(tableMarker);
  if (tableIdx === -1) {
    throw new Error(`${table} section not found in docs/integrity/snapshot/live-types.ts`);
  }
  const rowMarker = '        Row: {';
  const rowIdx = source.indexOf(rowMarker, tableIdx);
  if (rowIdx === -1) {
    throw new Error(`${table} Row block not found in docs/integrity/snapshot/live-types.ts`);
  }
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
    throw new Error(`Failed to extract ${table} Row block (unbalanced braces)`);
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

/** Unique <alias>.<column> references across the given text. */
function aliasColumnRefs(text: string, alias: string): string[] {
  const refs = new Set<string>();
  const re = new RegExp(`\\b${alias}\\.([a-z_]+)\\b`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    refs.add(m[1]);
  }
  return [...refs].sort();
}

/** Column list of an INSERT INTO <qualified target> ( col, ... ) statement. */
function insertColumnList(sql: string, qualifiedTarget: string): string[] {
  const marker = `insert into ${qualifiedTarget} (`;
  const start = sql.indexOf(marker);
  if (start === -1) {
    throw new Error(`INSERT INTO ${qualifiedTarget} not found`);
  }
  const end = sql.indexOf(')', start + marker.length);
  return sql
    .slice(start + marker.length, end)
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * The F1 migration's practitioner_patients CREATE TABLE column names: the
 * authoritative post-F1 shape (the table is absent from live-types because
 * F1 created it after the snapshot; F1 is applied live per the manifest).
 */
function f1PractitionerPatientsColumns(): Set<string> {
  const f1 = normalize(readSqlBySuffix(F1_MIGRATION_SUFFIX));
  const marker = 'create table if not exists practitioner_patients (';
  const start = f1.indexOf(marker);
  if (start === -1) {
    throw new Error('practitioner_patients CREATE TABLE not found in the F1 migration');
  }
  let depth = 0;
  let i = start + marker.length - 1;
  for (; i < f1.length; i += 1) {
    if (f1[i] === '(') depth += 1;
    else if (f1[i] === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const body = f1.slice(start + marker.length, i);
  const cols = new Set<string>();
  const colRe = /(?:^|, )([a-z_]+) /g;
  let m: RegExpExecArray | null;
  while ((m = colRe.exec(body)) !== null) {
    cols.add(m[1]);
  }
  return cols;
}

// ---------------------------------------------------------------------------
// 1. Forbidden statements: this tranche is pure-additive, zero DROP tokens
// ---------------------------------------------------------------------------

describe('F5 migration forbids every destructive statement class', () => {
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
    expect(occurrences).toBe(9);
  });

  it('replaces the 000500 DROP VIEW + CREATE VIEW pair with CREATE OR REPLACE VIEW', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /create or replace view public\.wl_pending_reviews_with_sla as/g)).toBe(2);
    expect(sql).not.toMatch(/\bcreate view\b/);
  });
});

// ---------------------------------------------------------------------------
// 2. sum_practitioner_wholesale_volume: deferred-inert (live-validity STOP)
// ---------------------------------------------------------------------------

describe('F5 migration defers sum_practitioner_wholesale_volume as an inert comment block', () => {
  it('carries the clearly-marked F5 DEFERRED comment block naming the unblocking migration', () => {
    const raw = rawSql();
    expect(raw).toContain('-- F5 DEFERRED, DO NOT APPLY IN F5: sum_practitioner_wholesale_volume');
    expect(raw).toContain('sum_practitioner_wholesale_volume');
    expect(raw).toContain('20260418000130');
  });

  it('keeps the deferred function and its phantom shop_orders columns non-executable', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/sum_practitioner_wholesale_volume/);
    expect(sql).not.toMatch(/wholesale_total_cents/);
    expect(sql).not.toMatch(/placed_by_practitioner_id/);
    expect(sql).not.toMatch(/\border_type\b/);
  });

  it('documents a real defect: the referenced columns are absent from live shop_orders', () => {
    // If this fails, 20260418000130 has reached the live snapshot and the
    // deferral can be lifted (ship the RPC verbatim in a follow-up tranche).
    const liveKeys = liveRowKeys('shop_orders');
    expect(liveKeys.has('wholesale_total_cents')).toBe(false);
    expect(liveKeys.has('placed_by_practitioner_id')).toBe(false);
    expect(liveKeys.has('order_type')).toBe(false);
    // The two shop_orders columns that DO exist live and made the function
    // body superficially plausible:
    expect(liveKeys.has('status')).toBe(true);
    expect(liveKeys.has('user_id')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Every create is guarded
// ---------------------------------------------------------------------------

describe('F5 migration guards every create', () => {
  it('creates all fifteen tranche tables with CREATE TABLE IF NOT EXISTS', () => {
    const sql = normalizedSql();
    for (const table of CREATED_TABLES) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${table} \\(`));
    }
  });

  it('every CREATE TABLE carries IF NOT EXISTS (15 total)', () => {
    const sql = normalizedSql();
    const total = countMatches(sql, /\bcreate table\b/g);
    expect(total).toBe(15);
    expect(total).toBe(countMatches(sql, /\bcreate table if not exists\b/g));
  });

  it('every CREATE INDEX carries IF NOT EXISTS (22 total)', () => {
    const sql = normalizedSql();
    const total = countMatches(sql, /\bcreate (?:unique )?index\b/g);
    const guarded = countMatches(sql, /\bcreate (?:unique )?index if not exists\b/g);
    expect(total).toBe(22);
    expect(total).toBe(guarded);
    expect(sql).toMatch(/create index if not exists idx_wl_enroll_status/);
    expect(sql).toMatch(/create index if not exists idx_label_design_current/);
    expect(sql).toMatch(/create index if not exists idx_wl_reviewer_assign_pending/);
    expect(sql).toMatch(/create index if not exists idx_wl_disp_published/);
  });

  it('the order-number sequence is CREATE SEQUENCE IF NOT EXISTS', () => {
    const sql = normalizedSql();
    const total = countMatches(sql, /\bcreate sequence\b/g);
    expect(total).toBe(1);
    expect(sql).toMatch(/create sequence if not exists public\.white_label_order_number_seq/);
  });

  it('ships exactly three functions, all CREATE OR REPLACE (the fourth is deferred)', () => {
    const sql = normalizedSql();
    expect(sql).not.toMatch(/\bcreate function\b/);
    expect(countMatches(sql, /\bcreate or replace function\b/g)).toBe(3);
  });

  it('clone_label_design_revision keeps its source SECURITY DEFINER and pinned search_path', () => {
    const seg = functionHeaderSegment(normalizedSql(), 'clone_label_design_revision');
    expect(seg).toMatch(/security definer/);
    expect(seg).toMatch(/set search_path = public, pg_catalog/);
  });

  it('next_white_label_order_number keeps its source SECURITY DEFINER and pinned search_path', () => {
    const seg = functionHeaderSegment(normalizedSql(), 'next_white_label_order_number');
    expect(seg).toMatch(/security definer/);
    expect(seg).toMatch(/set search_path = public, pg_catalog/);
  });

  it('block_compliance_review_mutation stays non-definer (source has none) and gains a pinned search_path', () => {
    const seg = functionHeaderSegment(normalizedSql(), 'block_compliance_review_mutation');
    expect(seg).not.toMatch(/security definer/);
    expect(seg).toMatch(/set search_path = public, pg_temp/);
  });

  it('locks both emitted RPCs with the source REVOKE/GRANT pairs', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /revoke all on function public\.clone_label_design_revision\(uuid\) from public/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.clone_label_design_revision\(uuid\) to authenticated/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.next_white_label_order_number\(\) from public/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.next_white_label_order_number\(\) to authenticated/,
    );
  });

  it('every CREATE POLICY sits inside a DO block gated on pg_policies (36 total)', () => {
    const sql = normalizedSql();
    const policyCount = countMatches(sql, /\bcreate policy\b/g);
    const guardedCount = countMatches(sql, POLICY_GUARD_PATTERN);
    expect(policyCount).toBe(36);
    expect(policyCount).toBe(guardedCount);
  });

  it('every CREATE TRIGGER sits inside a DO block gated on pg_trigger (2 total)', () => {
    const sql = normalizedSql();
    const triggerCount = countMatches(sql, /\bcreate trigger\b/g);
    const guardedCount = countMatches(sql, TRIGGER_GUARD_PATTERN);
    expect(triggerCount).toBe(2);
    expect(triggerCount).toBe(guardedCount);
  });

  it('guards the 000500 parent_design_id FK attach on constraint absence with ON DELETE SET NULL', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/constraint_name = 'wl_label_designs_parent_design_id_fkey'/);
    expect(sql).toMatch(
      /add constraint wl_label_designs_parent_design_id_fkey foreign key \(parent_design_id\) references public\.white_label_label_designs\(id\) on delete set null/,
    );
  });

  it('carries the three 000500 refund columns as ADD COLUMN IF NOT EXISTS (the only ADD COLUMNs)', () => {
    const sql = normalizedSql();
    const total = countMatches(sql, /\badd column\b/g);
    expect(total).toBe(3);
    expect(total).toBe(countMatches(sql, /\badd column if not exists\b/g));
    expect(sql).toMatch(/add column if not exists stripe_refund_id text/);
    expect(sql).toMatch(/add column if not exists refund_amount_cents bigint/);
    expect(sql).toMatch(/add column if not exists refund_recorded_at timestamptz/);
  });
});

// ---------------------------------------------------------------------------
// 4. Seeds: guarded and idempotent
// ---------------------------------------------------------------------------

describe('F5 migration guards every seed', () => {
  it('has exactly 8 INSERT INTO statements (7 seeds + the clone RPC body insert)', () => {
    expect(countMatches(normalizedSql(), /\binsert into\b/g)).toBe(8);
  });

  it('empty-table-guards the catalog seed and keeps its ON CONFLICT clause', () => {
    expect(normalizedSql()).toMatch(
      /if not exists \( select 1 from public\.white_label_catalog_config \) then insert into public\.white_label_catalog_config[\s\S]*?on conflict \(product_catalog_id\) do nothing/,
    );
  });

  it('adapts the catalog seed COGS expression to the live product_catalog shape', () => {
    const sql = normalizedSql();
    // live product_catalog has no cogs_cents (its adding migration
    // 20260418000270 is outside this tranche); the source's own COALESCE
    // fallback is the value every row would receive anyway.
    expect(sql).not.toMatch(/pc\.cogs_cents/);
    expect(sql).toMatch(/round\(pc\.price \* 100 \* 0\.35\)::integer/);
    expect(sql).toMatch(/where pc\.category = 'supplement' and pc\.active = true/);
  });

  it('row-absence-guards the launch_phases seed (live populated table) and keeps ON CONFLICT', () => {
    expect(normalizedSql()).toMatch(
      /if not exists \( select 1 from public\.launch_phases where id = 'white_label_products_2028' \) then insert into public\.launch_phases[\s\S]*?on conflict \(id\) do nothing/,
    );
  });

  it('row-absence-guards both storage bucket inserts and keeps ON CONFLICT', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /if not exists \( select 1 from storage\.buckets where id = 'white-label-brand-assets' \) then insert into storage\.buckets/,
    );
    expect(sql).toMatch(
      /if not exists \( select 1 from storage\.buckets where id = 'white-label-proofs' \) then insert into storage\.buckets/,
    );
    expect(countMatches(sql, /insert into storage\.buckets/g)).toBe(2);
  });

  it('empty-table-guards the discount tier and parameter seeds with their source ON CONFLICTs', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(
      /if not exists \( select 1 from public\.white_label_discount_tiers \) then insert into public\.white_label_discount_tiers[\s\S]*?on conflict \(id\) do nothing/,
    );
    expect(sql).toMatch(
      /if not exists \( select 1 from public\.white_label_parameters \) then insert into public\.white_label_parameters[\s\S]*?on conflict \(id\) do nothing/,
    );
  });

  it('keeps the pricing_domains registration double-guarded (table existence + row absence)', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/table_name = 'pricing_domains'/);
    expect(sql).toMatch(
      /if not exists \( select 1 from public\.pricing_domains where id = 'wl_discount_tier_100_499' \) then insert into public\.pricing_domains/,
    );
    expect(sql).toMatch(/insert into public\.pricing_domains[\s\S]*?on conflict \(id\) do nothing/);
  });

  it('the only UPDATE is the clone RPC body demoting the prior current version', () => {
    const sql = normalizedSql();
    const updatePattern = /\bupdate\s+([a-z_.]+)\s+set\s+([a-z_]+)/g;
    const targets: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = updatePattern.exec(sql)) !== null) {
      targets.push(`${match[1]}.${match[2]}`);
    }
    expect(targets).toEqual(['public.white_label_label_designs.is_current_version']);
  });
});

// ---------------------------------------------------------------------------
// 5. RLS coverage and initplan-wrapped policies
// ---------------------------------------------------------------------------

describe('F5 migration enables RLS and wraps every auth call for the initplan', () => {
  it('enables row level security on all fifteen tranche tables', () => {
    const sql = normalizedSql();
    for (const table of CREATED_TABLES) {
      expect(sql).toMatch(
        new RegExp(`alter table (?:public\\.)?${table} enable row level security`),
      );
    }
    expect(countMatches(sql, /enable row level security/g)).toBe(15);
  });

  it('ships at least one policy for each tranche table and for storage.objects', () => {
    const sql = normalizedSql();
    for (const table of [...CREATED_TABLES, 'objects']) {
      expect(sql).toMatch(new RegExp(`and tablename = '${table}' and policyname `));
    }
  });

  it('every policy body uses (select auth.uid()), never a bare call', () => {
    const bodies = guardedPolicyBodies(normalizedSql());
    expect(bodies).toHaveLength(36);
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

  it('emits the 000480 broad wl_disp_published_read NEVER, the 000500 tightened version ONCE', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /create policy wl_disp_published_read/g)).toBe(1);
    const body = guardedPolicyBodies(sql).find((b) => b.startsWith('wl_disp_published_read'));
    expect(body, 'tightened wl_disp_published_read policy body not found').toBeDefined();
    expect(body).toMatch(/is_published = true/);
    expect(body).toMatch(/practitioner_patients/);
  });

  it('names all six storage.objects policies from the 000440 source', () => {
    const sql = normalizedSql();
    for (const name of [
      'wl_brand_assets_self_read',
      'wl_brand_assets_self_write',
      'wl_brand_assets_self_delete',
      'wl_proofs_self_read',
      'wl_proofs_self_write',
      'wl_storage_admin_all',
    ]) {
      expect(sql).toMatch(new RegExp(`create policy ${name} on storage\\.objects`));
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Twenty-object coverage (19 created + 1 documented deferral)
// ---------------------------------------------------------------------------

describe('F5 migration covers the cluster 1 object list', () => {
  it('creates both views with CREATE OR REPLACE (wl_pending_reviews_with_sla final form filtered)', () => {
    const sql = normalizedSql();
    expect(countMatches(sql, /\bcreate or replace view\b/g)).toBe(3);
    expect(sql).toMatch(/create or replace view public\.white_label_economics as/);
    // The last wl_pending_reviews_with_sla definition (000500) filters
    // demoted label versions out of the inbox.
    const lastIdx = sql.lastIndexOf('create or replace view public.wl_pending_reviews_with_sla as');
    const lastDef = sql.slice(lastIdx, sql.indexOf(';', lastIdx));
    expect(lastDef).toMatch(/ld\.is_current_version = true/);
  });

  it('creates both RPCs of the tranche (the third RPC is the documented deferral)', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/create or replace function public\.clone_label_design_revision/);
    expect(sql).toMatch(/create or replace function public\.next_white_label_order_number/);
  });

  it('creates both white label storage buckets', () => {
    const sql = normalizedSql();
    expect(sql).toMatch(/'white-label-brand-assets'/);
    expect(sql).toMatch(/'white-label-proofs'/);
  });

  it('defines the key code-path columns on the payment-bearing tables', () => {
    const sql = normalizedSql();
    const orders = tableBody(sql, 'white_label_production_orders');
    for (const col of [
      'order_number',
      'status',
      'stripe_deposit_payment_intent_id',
      'stripe_final_payment_intent_id',
      'deposit_amount_cents',
      'final_payment_amount_cents',
      'total_cents',
    ]) {
      expect(hasColumn(orders, col), `production orders column "${col}" is not defined`).toBe(true);
    }
    const designs = tableBody(sql, 'white_label_label_designs');
    for (const col of [
      'display_product_name',
      'supplement_facts_panel_data',
      'manufacturer_line',
      'version_number',
      'is_current_version',
    ]) {
      expect(hasColumn(designs, col), `label designs column "${col}" is not defined`).toBe(true);
    }
    const dispensary = tableBody(sql, 'white_label_dispensary_settings');
    for (const col of ['retail_price_cents', 'is_published', 'is_featured', 'display_order']) {
      expect(hasColumn(dispensary, col), `dispensary column "${col}" is not defined`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Live-validity: every live-table column reference resolves (F3b pattern)
// ---------------------------------------------------------------------------

describe('F5 migration: live-table column references are valid live columns', () => {
  it('profiles admin checks use only live profiles columns (id, role)', () => {
    const sql = normalizedSql();
    const liveKeys = liveRowKeys('profiles');
    const adminChecks = countMatches(
      sql,
      /from public\.profiles where id = \(select auth\.uid\(\)\) and role = 'admin'/g,
    );
    expect(adminChecks).toBeGreaterThan(0);
    expect(liveKeys.has('id')).toBe(true);
    expect(liveKeys.has('role')).toBe(true);
  });

  it('every practitioners alias reference (p./pr.) resolves to a live practitioners column', () => {
    const bodies = guardedPolicyBodies(normalizedSql()).join(' ');
    const liveKeys = liveRowKeys('practitioners');
    const refs = [...aliasColumnRefs(bodies, 'p'), ...aliasColumnRefs(bodies, 'pr')];
    expect(refs.length, 'expected practitioners alias refs in policy bodies').toBeGreaterThan(0);
    for (const col of refs) {
      expect(
        liveKeys.has(col),
        `practitioners.${col} referenced in a policy body but absent from live practitioners.Row`,
      ).toBe(true);
    }
  });

  it('practitioner ownership subqueries use the live user_id column', () => {
    const sql = normalizedSql();
    const liveKeys = liveRowKeys('practitioners');
    expect(liveKeys.has('user_id')).toBe(true);
    expect(liveKeys.has('id')).toBe(true);
    expect(
      countMatches(
        sql,
        /select id from public\.practitioners where user_id = \(select auth\.uid\(\)\)/g,
      ),
    ).toBeGreaterThan(10);
  });

  it('every product_catalog pc.<column> reference in the catalog seed is a live column', () => {
    const sql = normalizedSql();
    const liveKeys = liveRowKeys('product_catalog');
    const refs = aliasColumnRefs(sql, 'pc');
    expect(refs.length, 'expected pc.<column> refs in the catalog seed').toBeGreaterThan(0);
    for (const col of refs) {
      expect(
        liveKeys.has(col),
        `product_catalog.${col} referenced but absent from live product_catalog.Row (phantom column)`,
      ).toBe(true);
    }
  });

  it('every launch_phases seed column is a live launch_phases column', () => {
    const cols = insertColumnList(normalizedSql(), 'public.launch_phases');
    const liveKeys = liveRowKeys('launch_phases');
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      expect(
        liveKeys.has(col),
        `launch_phases.${col} in the seed column list but absent from live launch_phases.Row`,
      ).toBe(true);
    }
  });

  it('every pricing_domains registration column is a live pricing_domains column', () => {
    const cols = insertColumnList(normalizedSql(), 'public.pricing_domains');
    const liveKeys = liveRowKeys('pricing_domains');
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      expect(
        liveKeys.has(col),
        `pricing_domains.${col} in the registration column list but absent from live pricing_domains.Row`,
      ).toBe(true);
    }
  });

  it('the tightened dispensary policy references only real practitioner_patients columns (F1 shape)', () => {
    const sql = normalizedSql();
    // Red-first: the 000500 source reads pp.patient_user_id, which does not
    // exist on the F1-created table (its column is patient_id). The carried
    // policy must use the live equivalent.
    expect(sql).not.toMatch(/patient_user_id/);
    const f1Columns = f1PractitionerPatientsColumns();
    const refs = aliasColumnRefs(guardedPolicyBodies(sql).join(' '), 'pp');
    expect(refs.length, 'expected pp.<column> refs in the tightened dispensary policy').toBeGreaterThan(0);
    for (const col of refs) {
      expect(
        f1Columns.has(col),
        `practitioner_patients.${col} referenced but absent from the F1 CREATE TABLE (phantom column)`,
      ).toBe(true);
    }
  });

  it('bridges the practitioner id spaces via practitioners.user_id (F1 policy precedent)', () => {
    const sql = normalizedSql();
    // practitioner_patients.practitioner_id holds an auth.users id while
    // white_label_dispensary_settings.practitioner_id holds a
    // practitioners.id; a direct equality would silently never match.
    const body = guardedPolicyBodies(sql).find((b) => b.startsWith('wl_disp_published_read'));
    expect(body).toBeDefined();
    expect(body).toMatch(/join public\.practitioners pr on pr\.user_id = pp\.practitioner_id/);
    expect(body).toMatch(/pr\.id = white_label_dispensary_settings\.practitioner_id/);
    expect(body).toMatch(/pp\.patient_id = \(select auth\.uid\(\)\)/);
    expect(body).toMatch(/pp\.status = 'active'/);
  });
});

// ---------------------------------------------------------------------------
// 8. Entity string: carried verbatim from source, flagged (not silently fixed)
// ---------------------------------------------------------------------------

describe('F5 migration carries the source manufacturer line unchanged', () => {
  it('keeps the source default exactly (deviation from Farmceutica Wellness Ltd is FLAGGED in the F5 report, not silently edited)', () => {
    expect(rawSql()).toContain("'Manufactured by FarmCeutica Wellness LLC, Buffalo NY'");
  });
});

// ---------------------------------------------------------------------------
// 9. F5-fix Important-1: view lockdown (security_invoker + anon REVOKE)
// ---------------------------------------------------------------------------

describe('F5-fix Important-1: both owner-rights views carry security_invoker lockdown and anon REVOKE', () => {
  it('sets security_invoker = on on white_label_economics via ALTER VIEW', () => {
    expect(rawSql()).toContain(
      'ALTER VIEW public.white_label_economics SET (security_invoker = on);',
    );
  });

  it('revokes ALL from anon on white_label_economics', () => {
    expect(rawSql()).toContain('REVOKE ALL ON public.white_label_economics FROM anon;');
  });

  it('sets security_invoker = on on wl_pending_reviews_with_sla via ALTER VIEW', () => {
    expect(rawSql()).toContain(
      'ALTER VIEW public.wl_pending_reviews_with_sla SET (security_invoker = on);',
    );
  });

  it('revokes ALL from anon on wl_pending_reviews_with_sla', () => {
    expect(rawSql()).toContain('REVOKE ALL ON public.wl_pending_reviews_with_sla FROM anon;');
  });
});
