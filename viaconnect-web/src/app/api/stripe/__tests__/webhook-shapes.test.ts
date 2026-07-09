/**
 * src/app/api/stripe/__tests__/webhook-shapes.test.ts
 *
 * Prompt 210d P0-3: stripe webhook write-shape test.
 *
 * Guards the contract between four artifacts:
 *   1. The LIVE orders columns, parsed AT RUNTIME from the drift snapshot
 *      docs/integrity/snapshot/live-types.ts (Tables -> orders -> Row keys).
 *      Never hardcoded, so a snapshot refresh keeps this suite honest.
 *   2. The P0-3 orders migration (*_prompt_210d_orders_items_column.sql),
 *      parsed from the migration file text at runtime.
 *   3. The P0-3 DRAFT subscriptions migration
 *      (*_prompt_210d_subscriptions_table.sql), whose create-table column
 *      list is parsed from the migration file text at runtime.
 *   4. The two webhook write payloads: buildOrderInsertPayload and
 *      buildSubscriptionUpsertPayload exported by
 *      src/app/api/stripe/webhook/payload-shapes.ts (the two
 *      checkout.session.completed write branches in route.ts).
 *
 * Invariants:
 *   - Every orders insert payload key is a subset of the live orders Row
 *     keys UNION the columns the P0-3 orders migration adds ({items}).
 *   - The subscriptions upsert payload keys EXACTLY match the draft
 *     migration's column set minus the standard {id, created_at,
 *     updated_at}, and those three standard columns are present.
 *
 * Node-safe (no jsdom), node builtins only, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildOrderInsertPayload,
  buildSubscriptionUpsertPayload,
} from '@/app/api/stripe/webhook/payload-shapes';

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
);
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');
const ORDERS_MIGRATION_SUFFIX = '_prompt_210d_orders_items_column.sql';
const SUBSCRIPTIONS_MIGRATION_SUFFIX = '_prompt_210d_subscriptions_table.sql';
const LIVE_TYPES_PATH = join(REPO_ROOT, 'docs', 'integrity', 'snapshot', 'live-types.ts');

// ---------------------------------------------------------------------------
// Migration file parsing (node builtins only)
// ---------------------------------------------------------------------------

function readMigrationSql(suffix: string): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(suffix));
  if (!fileName) {
    throw new Error(`No migration file ending with ${suffix} found under supabase/migrations`);
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
function statementText(sql: string): string {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const TABLE_CONSTRAINT_KEYWORDS = new Set([
  'primary',
  'unique',
  'constraint',
  'foreign',
  'check',
  'exclude',
]);

/**
 * Parses the column names of the draft create table public.subscriptions
 * statement: one column per line between the create-table line and the
 * closing ");", first identifier on each non-comment line, skipping any
 * table-level constraint lines.
 */
function parseSubscriptionsCreateColumns(sql: string): string[] {
  const lines = sql.split(/\r?\n/);
  const startIndex = lines.findIndex((line) =>
    /^create table (if not exists )?public\.subscriptions\s*\($/.test(line.trim()),
  );
  if (startIndex === -1) {
    throw new Error('create table public.subscriptions statement not found in draft migration');
  }
  const columns: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith(');')) {
      return columns;
    }
    if (line === '' || line.startsWith('--')) {
      continue;
    }
    const identifierMatch = /^([a-z_][a-z0-9_]*)\b/.exec(line);
    if (identifierMatch && !TABLE_CONSTRAINT_KEYWORDS.has(identifierMatch[1])) {
      columns.push(identifierMatch[1]);
    }
  }
  throw new Error('create table public.subscriptions statement not terminated in draft migration');
}

// ---------------------------------------------------------------------------
// Live snapshot parsing (Tables -> orders -> Row keys, at runtime)
// ---------------------------------------------------------------------------

/**
 * Parses the live orders Row keys from the drift snapshot at runtime. The
 * table matcher anchors the exact name at the Tables-entry indent level, so
 * production_orders, shop_orders, and similar names cannot match. Keys are
 * collected one per line inside the `Row: {` block until its closing brace.
 */
function parseLiveOrdersRowKeys(): string[] {
  const lines = readFileSync(LIVE_TYPES_PATH, 'utf8').split(/\r?\n/);
  const tableIndex = lines.findIndex((line) => /^ {6}orders: \{$/.test(line));
  if (tableIndex === -1) {
    throw new Error('orders table entry not found in live-types.ts');
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
    throw new Error('orders Row block not found in live-types.ts');
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
  throw new Error('orders Row block not terminated in live-types.ts');
}

/** Live orders columns UNION the columns the P0-3 orders migration adds. */
function liveOrdersUnionMigrated(): Set<string> {
  return new Set([
    ...parseLiveOrdersRowKeys(),
    ...parseAddedColumns(readMigrationSql(ORDERS_MIGRATION_SUFFIX)),
  ]);
}

// ---------------------------------------------------------------------------
// 1. Orders migration file shape
// ---------------------------------------------------------------------------

describe('P0-3 orders items migration file', () => {
  it('exists and adds exactly items via add column if not exists', () => {
    const added = parseAddedColumns(readMigrationSql(ORDERS_MIGRATION_SUFFIX));
    expect(added).toEqual(['items']);
  });

  it('is exactly the single alter table statement outside comment lines', () => {
    expect(statementText(readMigrationSql(ORDERS_MIGRATION_SUFFIX))).toBe(
      'alter table public.orders add column if not exists items jsonb;',
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Live snapshot parsing sanity
// ---------------------------------------------------------------------------

describe('live orders Row keys (parsed from live-types.ts at runtime)', () => {
  it('parses a plausible non-empty key set without duplicates', () => {
    const keys = parseLiveOrdersRowKeys();
    expect(keys.length).toBeGreaterThanOrEqual(5);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('id');
    expect(keys).toContain('user_id');
    expect(keys).toContain('status');
    expect(keys).toContain('total');
  });
});

// ---------------------------------------------------------------------------
// 3. Orders insert payload (one-time payment branch)
// ---------------------------------------------------------------------------

describe('orders insert payload (buildOrderInsertPayload)', () => {
  const payload = buildOrderInsertPayload({
    userId: 'user-1',
    sessionId: 'session-1',
    amountTotal: 28888,
    productType: undefined,
  });

  it('every payload key is a live orders column or one added by the P0-3 migration', () => {
    const union = liveOrdersUnionMigrated();
    for (const key of Object.keys(payload)) {
      expect(
        union.has(key),
        `orders insert payload key "${key}" is not a live or migrated orders column`,
      ).toBe(true);
    }
  });

  it('keeps the exact pre-210d payload keys and value shaping', () => {
    expect(Object.keys(payload).sort()).toEqual(['items', 'status', 'total', 'user_id']);
    expect(payload.user_id).toBe('user-1');
    expect(payload.status).toBe('pending');
    expect(payload.total).toBe(288.88);
    expect(payload.items).toEqual({
      type: 'genex_kit',
      session_id: 'session-1',
      product_type: 'genex_kit',
    });
  });

  it('maps a null amount to 0 and passes an explicit product type through', () => {
    const explicit = buildOrderInsertPayload({
      userId: 'user-1',
      sessionId: 'session-2',
      amountTotal: null,
      productType: 'membership',
    });
    expect(explicit.total).toBe(0);
    expect(explicit.items).toEqual({
      type: 'genex_kit',
      session_id: 'session-2',
      product_type: 'membership',
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Subscriptions draft migration file shape
// ---------------------------------------------------------------------------

describe('P0-3 subscriptions DRAFT migration file', () => {
  it('carries the required DRAFT header as its first line', () => {
    const firstLine = readMigrationSql(SUBSCRIPTIONS_MIGRATION_SUFFIX).split(/\r?\n/)[0].trim();
    expect(firstLine).toBe('-- DRAFT pending Gary store-vs-drop decision (210d P0-3)');
  });

  it('creates the table with the standard id, created_at, and updated_at columns', () => {
    const columns = parseSubscriptionsCreateColumns(
      readMigrationSql(SUBSCRIPTIONS_MIGRATION_SUFFIX),
    );
    expect(new Set(columns).size).toBe(columns.length);
    expect(columns).toContain('id');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  it('enables row level security with a single owner-scoped select policy and no insert policy', () => {
    const statement = statementText(readMigrationSql(SUBSCRIPTIONS_MIGRATION_SUFFIX));
    expect(statement).toContain('alter table public.subscriptions enable row level security;');
    expect(statement.match(/create policy/g)).toHaveLength(1);
    expect(statement).toContain('for select');
    expect(statement).toContain('using ((select auth.uid()) = user_id)');
    expect(statement).not.toContain('for insert');
    expect(statement).not.toContain('to anon');
  });

  it('is append-only: no drop or rename statements outside comment lines', () => {
    const statement = statementText(readMigrationSql(SUBSCRIPTIONS_MIGRATION_SUFFIX));
    expect(statement).not.toMatch(/\bdrop\b/);
    expect(statement).not.toMatch(/\brename\b/);
  });
});

// ---------------------------------------------------------------------------
// 5. Subscriptions upsert payload (subscription branch)
// ---------------------------------------------------------------------------

describe('subscriptions upsert payload (buildSubscriptionUpsertPayload)', () => {
  const payload = buildSubscriptionUpsertPayload({
    userId: 'user-1',
    customer: 'customer-1',
    subscriptionId: 'subscription-1',
    status: 'active',
    cancelAtPeriodEnd: false,
    unitAmount: 888,
    priceId: 'price-1',
    periodStart: '2026-07-01T00:00:00.000Z',
    periodEnd: '2026-08-01T00:00:00.000Z',
  });

  it('payload keys exactly match the draft migration columns minus id, created_at, updated_at', () => {
    const standard = new Set(['id', 'created_at', 'updated_at']);
    const writableColumns = parseSubscriptionsCreateColumns(
      readMigrationSql(SUBSCRIPTIONS_MIGRATION_SUFFIX),
    ).filter((column) => !standard.has(column));
    expect(Object.keys(payload).sort()).toEqual([...writableColumns].sort());
  });

  it('keeps the exact pre-210d payload keys and value shaping', () => {
    expect(payload).toEqual({
      user_id: 'user-1',
      stripe_customer_id: 'customer-1',
      stripe_subscription_id: 'subscription-1',
      plan_id: 'price-1',
      plan: 'gold',
      status: 'active',
      current_period_start: '2026-07-01T00:00:00.000Z',
      current_period_end: '2026-08-01T00:00:00.000Z',
      cancel_at_period_end: false,
    });
  });

  it('derives the plan from the unit amount with the pre-210d thresholds', () => {
    const base = {
      userId: 'user-1',
      customer: null,
      subscriptionId: 'subscription-1',
      status: 'active',
      cancelAtPeriodEnd: false,
      priceId: 'price-1',
      periodStart: null,
      periodEnd: null,
    };
    expect(buildSubscriptionUpsertPayload({ ...base, unitAmount: 888 }).plan).toBe('gold');
    expect(buildSubscriptionUpsertPayload({ ...base, unitAmount: 2888 }).plan).toBe('platinum');
    expect(buildSubscriptionUpsertPayload({ ...base, unitAmount: 12888 }).plan).toBe(
      'practitioner',
    );
    expect(buildSubscriptionUpsertPayload({ ...base, unitAmount: null }).plan).toBe('gold');
  });

  it('keeps the customer and plan_id fallbacks of the pre-210d inline literal', () => {
    const base = {
      userId: 'user-1',
      subscriptionId: 'subscription-1',
      status: 'trialing',
      cancelAtPeriodEnd: true,
      unitAmount: 2888,
      periodStart: null,
      periodEnd: null,
    };
    const fromObject = buildSubscriptionUpsertPayload({
      ...base,
      customer: { id: 'customer-2' },
      priceId: undefined,
    });
    expect(fromObject.stripe_customer_id).toBe('customer-2');
    expect(fromObject.plan_id).toBe('platinum');
    expect(fromObject.cancel_at_period_end).toBe(true);

    const fromNull = buildSubscriptionUpsertPayload({
      ...base,
      customer: null,
      priceId: 'price-2',
    });
    expect(fromNull.stripe_customer_id).toBe('');
    expect(fromNull.plan_id).toBe('price-2');
  });
});
