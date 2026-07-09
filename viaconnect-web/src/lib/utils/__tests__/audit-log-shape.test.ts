/**
 * src/lib/utils/__tests__/audit-log-shape.test.ts
 *
 * Task P0-2 (Prompt 210d): mechanical append-only proof for the audit_logs
 * new-shape-columns migration, plus documentation of the two coexisting
 * audit_logs writer shapes.
 *
 * Why two shapes coexist on public.audit_logs:
 *
 * - Trigger shape (live schema today): table_name, record_id, old_data,
 *   new_data (plus id, user_id, action, created_at). Written by DB triggers
 *   and by src/app/api/genex/genemetrics/route.ts. These writers keep
 *   working untouched.
 * - Route shape (added by the P0-2 migration): resource_type, resource_id,
 *   metadata, ip_address. Written by the seven route-level audit inserts
 *   (ai/[provider], auth/callback, genex/upload x2, notifications,
 *   stripe/checkout, stripe/webhook), whose rows were previously rejected
 *   whole by PostgREST (PGRST204, missing column) and silently swallowed.
 *
 * Decision (recommended to Gary): ADD the route-shape columns append-only so
 * both writer generations succeed, with no code churn and no impact on the
 * trigger-based writers. This test parses the migration file text and fails
 * on anything that is not an additive statement, so review can trust the
 * append-only property mechanically instead of by eyeball.
 *
 * NOT covered here (by design): applying the migration. Migrations created
 * by tasks are presented to Gary by the controller and applied after
 * sign-off; this suite only proves the file is safe to apply.
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'supabase',
  'migrations',
)

const MIGRATION_NAME_PATTERN = /^\d{14}_prompt_210d_audit_logs_new_shape_columns\.sql$/

/** Route-shape columns the migration must add, with their exact types. */
const ROUTE_SHAPE_COLUMNS: ReadonlyArray<{ column: string; type: string }> = [
  { column: 'resource_type', type: 'text' },
  { column: 'resource_id', type: 'text' },
  { column: 'metadata', type: 'jsonb' },
  { column: 'ip_address', type: 'text' },
]

/**
 * Trigger-shape columns that no DDL clause may reference. The comment
 * statement is allowed to NAME them inside its string literal (it documents
 * the coexistence), so the DDL check below scopes to alter statements only.
 */
const TRIGGER_SHAPE_COLUMNS = ['table_name', 'record_id', 'old_data', 'new_data'] as const

function findMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((name) => MIGRATION_NAME_PATTERN.test(name))
}

function readMigrationText(): string {
  const files = findMigrationFiles()
  expect(files, 'exactly one P0-2 audit_logs migration file must exist').toHaveLength(1)
  return readFileSync(path.join(MIGRATIONS_DIR, files[0]), 'utf8')
}

/** Strip -- line comments, lowercase, and collapse whitespace runs. */
function normalizeSql(sql: string): string {
  return sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ''))
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split normalized SQL into statements on ';'. Mechanical simplification
 * that is valid here because the assertions below pin the only string
 * literal in the file (the column comment) and it contains no semicolon.
 */
function statementsOf(sql: string): string[] {
  return normalizeSql(sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

describe('P0-2 audit_logs migration: append-only proof', () => {
  it('exists exactly once under supabase/migrations with the P0-2 slug', () => {
    expect(findMigrationFiles()).toHaveLength(1)
  })

  it('contains only ASCII text (repo no-dashes, no-emoji convention)', () => {
    const raw = readMigrationText()
    expect(
      /^[\x09\x0a\x0d\x20-\x7e]*$/.test(raw),
      'migration must contain only printable ASCII, tab, CR, and LF',
    ).toBe(true)
  })

  it('every statement is additive: alter-table-add-column or comment-on-column', () => {
    const statements = statementsOf(readMigrationText())
    expect(statements.length).toBeGreaterThan(0)
    for (const statement of statements) {
      const additive =
        statement.startsWith('alter table public.audit_logs add column if not exists ') ||
        statement.startsWith('comment on column public.audit_logs.')
      expect(additive, `non-additive statement: "${statement}"`).toBe(true)
    }
  })

  it('the alter statement carries only bare add column if not exists clauses', () => {
    const statements = statementsOf(readMigrationText())
    const alters = statements.filter((statement) => statement.startsWith('alter table'))
    expect(alters, 'exactly one alter table statement').toHaveLength(1)

    const clauses = alters[0]
      .replace('alter table public.audit_logs ', '')
      .split(',')
      .map((clause) => clause.trim())

    expect(clauses).toHaveLength(ROUTE_SHAPE_COLUMNS.length)
    for (const clause of clauses) {
      expect(
        clause,
        `clause is not a bare "add column if not exists <name> <type>": "${clause}"`,
      ).toMatch(/^add column if not exists [a-z_]+ (text|jsonb)$/)
    }
  })

  it('adds exactly the four route-shape columns with their expected types', () => {
    const statements = statementsOf(readMigrationText())
    const alter = statements.find((statement) => statement.startsWith('alter table')) ?? ''
    for (const { column, type } of ROUTE_SHAPE_COLUMNS) {
      expect(alter).toContain(`add column if not exists ${column} ${type}`)
    }
  })

  it('contains zero destructive or mutating tokens', () => {
    const sql = normalizeSql(readMigrationText())
    const forbidden: ReadonlyArray<RegExp> = [
      /\bdrop\b/,
      /\brename\b/,
      /\balter column\b/,
      /\balter type\b/,
      /\bset data type\b/,
      /\bnot null\b/,
      /\bdefault\b/,
      /\btruncate\b/,
      /\bdelete\b/,
      /\bupdate\b/,
      /\binsert\b/,
      /\busing\b/,
      /\bcascade\b/,
    ]
    for (const pattern of forbidden) {
      expect(pattern.test(sql), `forbidden token ${pattern} present in migration`).toBe(false)
    }
  })

  it('DDL never references the trigger-shape columns', () => {
    const statements = statementsOf(readMigrationText())
    const ddl = statements.filter((statement) => statement.startsWith('alter table'))
    expect(ddl.length).toBeGreaterThan(0)
    for (const statement of ddl) {
      for (const column of TRIGGER_SHAPE_COLUMNS) {
        expect(
          statement.includes(column),
          `DDL must not reference trigger-shape column "${column}"`,
        ).toBe(false)
      }
    }
  })

  it('documents disjoint shapes: route-shape adds none of the trigger-shape names', () => {
    const routeNames = ROUTE_SHAPE_COLUMNS.map((entry) => entry.column)
    for (const triggerColumn of TRIGGER_SHAPE_COLUMNS) {
      expect(routeNames).not.toContain(triggerColumn)
    }
  })
})
