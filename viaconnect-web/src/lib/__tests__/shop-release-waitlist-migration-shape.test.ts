/**
 * src/lib/__tests__/shop-release-waitlist-migration-shape.test.ts
 *
 * Shop Coming soon PR 1 (migrations only). Parses the two additive files:
 *   supabase/migrations/20260926200000_shop_release_phases.sql
 *   supabase/migrations/20260926200100_shop_product_waitlist.sql
 *
 * Invariants:
 *   1. Exact file names, and each sorts after every other migration file
 *      present in this tree (predecessor 20260926190000).
 *   2. Migration A aborts in a leading DO block unless all 6 SKUs exist,
 *      then a second DO block checks the 3 + 3 link. Phase 2 date stays null.
 *   3. Migration B enables and forces RLS, re-grants only select/insert/delete
 *      to authenticated, and scopes those policies to (select auth.uid()) once.
 *   4. Neither file is destructive: no DROP, no ALTER ... DROP, no TRUNCATE,
 *      no DELETE FROM, no RENAME, and no auth email or template changes.
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

const MIGRATION_A = '20260926200000_shop_release_phases.sql';
const MIGRATION_B = '20260926200100_shop_product_waitlist.sql';
const PREDECESSOR = '20260926190000_retire_performance_advisor_autoheal.sql';

const PHASE_1_SKUS = ['FC-NAD-001', 'FC-RISE-001', 'FC-DESIRE-001'] as const;
const PHASE_2_SKUS = ['FC-CREATINE-001', 'FC-CATALYST-001', 'FC-MTHFR-001'] as const;
const SEEDED_SKUS = [...PHASE_1_SKUS, ...PHASE_2_SKUS] as const;

function readMigration(fileName: string): string {
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

/** Full-line and block comments removed, lowercased, whitespace collapsed. */
function normalize(sql: string): string {
  const withoutLineComments = sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join(' ');
  return withoutLineComments
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches === null ? 0 : matches.length;
}

/**
 * Balanced-paren extraction of a CREATE TABLE body from the normalized SQL.
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
    const ch = sql[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return sql.slice(start + marker.length, i);
}

/** CREATE POLICY statements, each ending at its semicolon. */
function policyStatements(sql: string): string[] {
  const found: string[] = [];
  const pattern = /create policy [\s\S]*?;/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    found.push(match[0]);
  }
  return found;
}

function assertAdditive(sql: string, label: string): void {
  expect(sql, `${label} contains DROP`).not.toMatch(/\bdrop\b/);
  expect(sql, `${label} alters a table to drop`).not.toMatch(/\balter\s+table\b[\s\S]{0,80}\bdrop\b/);
  expect(sql, `${label} contains TRUNCATE`).not.toMatch(/\btruncate\b/);
  expect(sql, `${label} contains DELETE FROM`).not.toMatch(/\bdelete\s+from\b/);
  expect(sql, `${label} contains RENAME`).not.toMatch(/\brename\b/);
  expect(sql, `${label} touches auth.config`).not.toMatch(/auth\.config/);
  expect(sql, `${label} touches auth.email`).not.toMatch(/auth\.email/);
  expect(sql, `${label} touches supabase/templates`).not.toMatch(/supabase\/templates/);
}

describe('shop release migrations sort last with the exact PR 1 names', () => {
  it('uses the blueprint file names and no other shop release migration', () => {
    const files = migrationFiles();
    expect(files).toContain(MIGRATION_A);
    expect(files).toContain(MIGRATION_B);
    expect(files.filter((name) => name.includes('shop_release') || name.includes('shop_product_waitlist'))).toEqual([
      MIGRATION_A,
      MIGRATION_B,
    ]);
  });

  it('sorts both files after the predecessor and after every other migration', () => {
    const files = migrationFiles();
    expect(files).toContain(PREDECESSOR);
    const others = files.filter((name) => name !== MIGRATION_A && name !== MIGRATION_B);
    for (const other of others) {
      expect(MIGRATION_A > other, `${MIGRATION_A} should sort after ${other}`).toBe(true);
      expect(MIGRATION_B > other, `${MIGRATION_B} should sort after ${other}`).toBe(true);
    }
    expect(MIGRATION_A < MIGRATION_B).toBe(true);
    expect(files.slice(-2)).toEqual([MIGRATION_A, MIGRATION_B]);
  });
});

describe('migration A guards the 6 SKU seed before and after the link', () => {
  it('opens with a DO block that raises unless all 6 SKUs exist, before any write', () => {
    const sql = normalize(readMigration(MIGRATION_A));
    expect(sql.startsWith('do $$')).toBe(true);

    const guardEnd = sql.indexOf('end $$');
    const insertAt = sql.indexOf('insert into public.launch_phases');
    const alterAt = sql.indexOf('alter table public.products');
    const updateAt = sql.indexOf('update public.products');
    expect(guardEnd).toBeGreaterThan(0);
    expect(insertAt).toBeGreaterThan(guardEnd);
    expect(alterAt).toBeGreaterThan(insertAt);
    expect(updateAt).toBeGreaterThan(alterAt);

    const guard = sql.slice(0, guardEnd);
    expect(guard).toContain('select count(distinct sku) into found_count');
    expect(guard).toContain('from public.products');
    for (const sku of SEEDED_SKUS) {
      expect(guard).toContain(`'${sku.toLowerCase()}'`);
    }
    expect(guard).toContain('if found_count <> 6 then');
    expect(guard).toContain('raise exception');
    expect(guard).not.toContain('insert into');
    expect(guard).not.toContain('update public.products');
    expect(guard).not.toContain('alter table');
  });

  it('inserts both phases idempotently, leaves phase 2 undated, and adds the nullable FK', () => {
    const sql = normalize(readMigration(MIGRATION_A));
    expect(sql).toContain('on conflict (id) do nothing');
    expect(sql).toContain("'custom_event'");
    expect(sql).toContain("'shop_release_phase_1', 'shop release phase 1'");
    expect(sql).toContain("'custom_event', 'active', null, current_date, 10");
    expect(sql).toContain("'shop_release_phase_2', 'shop release phase 2'");
    expect(sql).toContain("'custom_event', 'planned', null, null, 11");
    expect(sql).toContain('add column if not exists launch_phase_id text');
    expect(sql).toContain('references public.launch_phases(id) on delete set null');
    expect(sql).toContain('create index if not exists products_launch_phase_id_idx');
    expect(countMatches(sql, /\binsert into\b/g)).toBe(1);
    expect(countMatches(sql, /\bupdate\s+public\.products\b/g)).toBe(2);
  });

  it('links phase 1 and phase 2 only when launch_phase_id is still null', () => {
    const sql = normalize(readMigration(MIGRATION_A));
    expect(sql).toContain(
      "update public.products set launch_phase_id = 'shop_release_phase_1' where sku in ('fc-nad-001','fc-rise-001','fc-desire-001') and launch_phase_id is null",
    );
    expect(sql).toContain(
      "update public.products set launch_phase_id = 'shop_release_phase_2' where sku in ('fc-creatine-001','fc-catalyst-001','fc-mthfr-001') and launch_phase_id is null",
    );
    expect(sql).not.toContain('fc-custom-vit-001');
  });

  it('closes with a second DO block that requires exactly 3 phase 1 and 3 phase 2 links', () => {
    const sql = normalize(readMigration(MIGRATION_A));
    const firstEnd = sql.indexOf('end $$');
    const secondStart = sql.indexOf('do $$', firstEnd);
    const phase2Update = sql.lastIndexOf('update public.products');
    expect(secondStart).toBeGreaterThan(phase2Update);

    const post = sql.slice(secondStart);
    expect(post).toContain("launch_phase_id = 'shop_release_phase_1'");
    expect(post).toContain("launch_phase_id = 'shop_release_phase_2'");
    for (const sku of SEEDED_SKUS) {
      expect(post).toContain(`'${sku.toLowerCase()}'`);
    }
    expect(post).toContain('if p1 <> 3 or p2 <> 3 then');
    expect(post).toContain('raise exception');
    expect(countMatches(sql, /\bdo \$\$/g)).toBe(2);
    expect(countMatches(sql, /\braise exception\b/g)).toBe(2);
  });

  it('is additive and does not touch auth email or templates', () => {
    assertAdditive(normalize(readMigration(MIGRATION_A)), 'migration A');
    expect(readMigration(MIGRATION_A)).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('migration B forces own-row RLS on the minimal waitlist table', () => {
  it('creates only the minimal columns and a unique (user_id, product_id) index', () => {
    const raw = readMigration(MIGRATION_B);
    const sql = normalize(raw);
    const body = tableBody(sql, 'shop_product_waitlist');
    expect(body).toContain('id uuid primary key');
    expect(body).toContain('user_id uuid not null');
    expect(body).toContain('references auth.users(id) on delete cascade');
    expect(body).toContain('product_id uuid not null references public.products(id) on delete cascade');
    expect(body).toContain("source text not null default 'plp' check (source in ('plp','pdp'))");
    expect(body).toContain('created_at timestamptz not null default now()');
    expect(body).not.toContain('notified_at');
    expect(raw.toLowerCase()).not.toContain('notified_at');
    expect(sql).toContain(
      'create unique index if not exists shop_product_waitlist_user_product_key on public.shop_product_waitlist (user_id, product_id)',
    );
  });

  it('enables and forces row level security', () => {
    const sql = normalize(readMigration(MIGRATION_B));
    expect(sql).toContain('alter table public.shop_product_waitlist enable row level security');
    expect(sql).toContain('alter table public.shop_product_waitlist force row level security');
  });

  it('revokes public and anon, then re-grants only select, insert, and delete to authenticated', () => {
    const sql = normalize(readMigration(MIGRATION_B));
    expect(sql).toContain('revoke all on table public.shop_product_waitlist from public');
    expect(sql).toContain('revoke all on table public.shop_product_waitlist from anon');
    expect(sql).toContain('revoke all on table public.shop_product_waitlist from authenticated');
    expect(sql).toContain(
      'grant select, insert, delete on table public.shop_product_waitlist to authenticated',
    );
    expect(sql).toContain('grant all on table public.shop_product_waitlist to service_role');
    expect(sql).not.toMatch(/\bto anon\b/);
    expect(sql).not.toMatch(/\bgrant\s+update\b/);
    expect(sql).not.toMatch(/\bgrant\s+all\b[^;]*\bto\s+authenticated\b/);
    expect(sql).not.toMatch(/\bfor\s+update\b/);
  });

  it('ships select, insert, and delete own policies with a single auth.uid() wrapper', () => {
    const policies = policyStatements(normalize(readMigration(MIGRATION_B)));
    expect(policies).toHaveLength(3);

    const select = policies.find((policy) => policy.includes('for select'));
    const insert = policies.find((policy) => policy.includes('for insert'));
    const del = policies.find((policy) => policy.includes('for delete'));
    if (select === undefined || insert === undefined || del === undefined) {
      throw new Error('expected select, insert, and delete policies');
    }

    expect(select).toContain('shop_product_waitlist_select_own');
    expect(select).toContain('to authenticated');
    expect(select).toContain('using (user_id = (select auth.uid()))');

    expect(insert).toContain('shop_product_waitlist_insert_own');
    expect(insert).toContain('to authenticated');
    expect(insert).toContain('with check (user_id = (select auth.uid()))');

    expect(del).toContain('shop_product_waitlist_delete_own');
    expect(del).toContain('to authenticated');
    expect(del).toContain('using (user_id = (select auth.uid()))');

    for (const policy of policies) {
      expect(policy).not.toContain('(select (select auth.uid()))');
      expect(countMatches(policy, /\(select auth\.uid\(\)\)/g)).toBe(1);
      const residue = policy.split('(select auth.uid())').join('');
      expect(residue.includes('auth.uid()'), `bare or nested auth.uid() in ${policy}`).toBe(false);
      expect(policy).toContain('to authenticated');
      expect(policy).not.toMatch(/\bto anon\b/);
    }
  });

  it('comments that the rows are internal launch planning data, not shared and not used for ads', () => {
    const raw = readMigration(MIGRATION_B);
    const comment = raw.slice(raw.toLowerCase().indexOf('comment on table'));
    expect(comment.toLowerCase()).toContain('internal launch planning only');
    expect(comment.toLowerCase()).toContain('no sharing');
    expect(comment.toLowerCase()).toContain('no ad or marketing audiences');
  });

  it('is additive and does not touch auth email or templates', () => {
    assertAdditive(normalize(readMigration(MIGRATION_B)), 'migration B');
    expect(readMigration(MIGRATION_B)).not.toMatch(/[\u2013\u2014]/);
  });
});
