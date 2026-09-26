// Diff two pg_policies snapshots, or check that one snapshot is fully flattened.
//
//   node --experimental-strip-types scripts/audit/diff-auth-policies.ts --check <snapshot.json>
//   node --experimental-strip-types scripts/audit/diff-auth-policies.ts --before <before.json> --after <after.json> [--held schema.table]
//   node --experimental-strip-types scripts/audit/diff-auth-policies.ts --snapshot <snapshot.json> --template <flatten.sql> [--held schema.table]
//
// --check exits 0 only when every qual/with_check is already equal to its
// flattened form and every expression is under 2,000 characters.
//
// --before/--after and --snapshot/--template compare every policy: roles, cmd,
// permissive, qual, and with_check. The only allowed difference is the
// intended auth-wrapper flatten (clauses the template emits). Held tables
// and already-flat policies must stay byte for byte. Exit 1 on any other difference.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { exprMd5, planPolicyAlter } from './emit-alter-policy.ts';
import { flattenAuthExpr, maxWrapperDepth } from './flatten-auth-expr.ts';

interface PolicyRow {
  readonly schemaname: string;
  readonly tablename: string;
  readonly policyname: string;
  readonly permissive: string;
  readonly roles: readonly string[];
  readonly cmd: string;
  readonly qual: string | null;
  readonly with_check: string | null;
}

const MAX_EXPR_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parsePolicy(value: unknown): PolicyRow {
  if (!isRecord(value)) throw new Error('policy row is not an object');
  if (typeof value.schemaname !== 'string') throw new Error('schemaname');
  if (typeof value.tablename !== 'string') throw new Error('tablename');
  if (typeof value.policyname !== 'string') throw new Error('policyname');
  if (typeof value.permissive !== 'string') throw new Error('permissive');
  if (!isStringArray(value.roles)) throw new Error('roles');
  if (typeof value.cmd !== 'string') throw new Error('cmd');
  if (!isNullableString(value.qual)) throw new Error('qual');
  if (!isNullableString(value.with_check)) throw new Error('with_check');
  return {
    schemaname: value.schemaname,
    tablename: value.tablename,
    policyname: value.policyname,
    permissive: value.permissive,
    roles: value.roles,
    cmd: value.cmd,
    qual: value.qual,
    with_check: value.with_check,
  };
}

function readPolicies(filePath: string): PolicyRow[] {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.policies)) {
    throw new Error(`${filePath} is missing a policies array`);
  }
  return parsed.policies.map((row) => parsePolicy(row));
}

function keyOf(policy: PolicyRow): string {
  return `${policy.schemaname}\t${policy.tablename}\t${policy.policyname}`;
}

function sameRoles(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function clauseFlat(expr: string | null): string | null {
  if (expr === null) return null;
  return flattenAuthExpr(expr);
}

function maxLen(policy: PolicyRow): number {
  return Math.max(policy.qual === null ? 0 : policy.qual.length, policy.with_check === null ? 0 : policy.with_check.length);
}

function checkOne(policies: readonly PolicyRow[]): string[] {
  const failures: string[] = [];
  let nested = 0;
  let over = 0;
  let maxDepth = 0;
  let maxSingle = 0;
  for (const policy of policies) {
    const qualFlat = clauseFlat(policy.qual);
    const checkFlat = clauseFlat(policy.with_check);
    const depth = Math.max(maxWrapperDepth(policy.qual ?? ''), maxWrapperDepth(policy.with_check ?? ''));
    if (depth > maxDepth) maxDepth = depth;
    if (depth >= 2 || qualFlat !== policy.qual || checkFlat !== policy.with_check) nested += 1;
    const len = maxLen(policy);
    if (len > maxSingle) maxSingle = len;
    if (len >= MAX_EXPR_LENGTH) over += 1;
  }
  if (nested > 0) failures.push(`${nested} policies are not flattened (max depth ${maxDepth})`);
  if (over > 0) failures.push(`${over} policies have an expression of ${MAX_EXPR_LENGTH} characters or more (max ${maxSingle})`);
  return failures;
}

export interface CompareResult {
  readonly compared: number;
  readonly intendedChanges: number;
  readonly unchanged: number;
  readonly mismatches: readonly string[];
}

function tableKey(policy: PolicyRow): string {
  return `${policy.schemaname}.${policy.tablename}`;
}

/** Clauses the flatten template rewrites become the flat form. Everything else stays byte for byte. */
export function expectedExpressions(
  policy: PolicyRow,
  held: ReadonlySet<string>,
): { qual: string | null; withCheck: string | null; changed: boolean } {
  if (held.has(tableKey(policy))) {
    return { qual: policy.qual, withCheck: policy.with_check, changed: false };
  }
  const planned = planPolicyAlter(policy);
  if (planned === null || planned === 'semicolon') {
    return { qual: policy.qual, withCheck: policy.with_check, changed: false };
  }
  return {
    qual: planned.usingExpr !== null ? planned.usingExpr : policy.qual,
    withCheck: planned.checkExpr !== null ? planned.checkExpr : policy.with_check,
    changed: true,
  };
}

export function compareFlattenedPolicies(
  before: readonly PolicyRow[],
  after: readonly PolicyRow[],
  held: ReadonlySet<string>,
): CompareResult {
  const mismatches: string[] = [];
  if (before.length !== after.length) {
    mismatches.push(`count differs: before ${before.length}, after ${after.length}`);
  }
  const afterByKey = new Map<string, PolicyRow>();
  for (const policy of after) afterByKey.set(keyOf(policy), policy);
  const seen = new Set<string>();
  let intendedChanges = 0;
  let unchanged = 0;
  for (const policy of before) {
    const key = keyOf(policy);
    seen.add(key);
    const next = afterByKey.get(key);
    if (next === undefined) {
      mismatches.push(`missing after ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
      continue;
    }
    if (next.permissive !== policy.permissive || next.cmd !== policy.cmd || !sameRoles(next.roles, policy.roles)) {
      mismatches.push(`identity changed ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
    }
    const expected = expectedExpressions(policy, held);
    if (expected.changed) intendedChanges += 1;
    else unchanged += 1;
    if (next.qual !== expected.qual || next.with_check !== expected.withCheck) {
      mismatches.push(`expression changed beyond flatten ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
    }
  }
  for (const policy of after) {
    if (!seen.has(keyOf(policy))) {
      mismatches.push(`extra after ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
    }
  }
  return { compared: before.length, intendedChanges, unchanged, mismatches };
}

interface ParsedAlter {
  readonly schemaname: string;
  readonly tablename: string;
  readonly policyname: string;
  readonly usingExpr: string | null;
  readonly checkExpr: string | null;
  readonly guard: string;
}

function parseQuotedIdent(sql: string, start: number): { value: string; next: number } {
  if (sql[start] !== '"') throw new Error(`expected quoted ident at ${start}`);
  let value = '';
  let i = start + 1;
  while (i < sql.length) {
    const ch = sql[i] ?? '';
    if (ch === '"' && sql[i + 1] === '"') {
      value += '"';
      i += 2;
      continue;
    }
    if (ch === '"') return { value, next: i + 1 };
    value += ch;
    i += 1;
  }
  throw new Error('unterminated identifier');
}

function parseParenBody(sql: string, open: number): { expr: string; next: number } {
  let depth = 0;
  let inString = false;
  for (let i = open; i < sql.length; i += 1) {
    const ch = sql[i] ?? '';
    if (inString) {
      if (ch === "'" && sql[i + 1] === "'") {
        i += 1;
        continue;
      }
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return { expr: sql.slice(open + 1, i), next: i + 1 };
    }
  }
  throw new Error('unterminated expression');
}

function skipWs(sql: string, index: number): number {
  let i = index;
  while (i < sql.length && (sql[i] === ' ' || sql[i] === '\n' || sql[i] === '\r' || sql[i] === '\t')) i += 1;
  return i;
}

export function parseTemplateAlters(sql: string): ParsedAlter[] {
  const alters: ParsedAlter[] = [];
  const needle = '\nALTER POLICY ';
  let from = 0;
  let guardFrom = 0;
  while (from < sql.length) {
    const at = sql.indexOf(needle, from);
    if (at === -1) break;
    const guard = sql.slice(guardFrom, at);
    let i = at + needle.length;
    const policyname = parseQuotedIdent(sql, i);
    i = skipWs(sql, policyname.next);
    if (sql.slice(i, i + 2).toUpperCase() !== 'ON') throw new Error('ALTER POLICY missing ON');
    i = skipWs(sql, i + 2);
    const schema = parseQuotedIdent(sql, i);
    i = schema.next;
    if (sql[i] !== '.') throw new Error('ALTER POLICY missing schema dot');
    const table = parseQuotedIdent(sql, i + 1);
    i = skipWs(sql, table.next);
    let usingExpr: string | null = null;
    let checkExpr: string | null = null;
    if (sql.slice(i, i + 5).toUpperCase() === 'USING') {
      i = skipWs(sql, i + 5);
      if (sql[i] !== '(') throw new Error('USING missing paren');
      const body = parseParenBody(sql, i);
      usingExpr = body.expr;
      i = skipWs(sql, body.next);
    }
    if (sql.slice(i, i + 10).toUpperCase() === 'WITH CHECK') {
      i = skipWs(sql, i + 10);
      if (sql[i] !== '(') throw new Error('WITH CHECK missing paren');
      const body = parseParenBody(sql, i);
      checkExpr = body.expr;
      i = skipWs(sql, body.next);
    }
    if (sql[i] !== ';') throw new Error(`ALTER POLICY missing semicolon near ${sql.slice(i, i + 20)}`);
    alters.push({
      schemaname: schema.value,
      tablename: table.value,
      policyname: policyname.value,
      usingExpr,
      checkExpr,
      guard,
    });
    from = i + 1;
    guardFrom = from;
  }
  return alters;
}

export function compareSnapshotToTemplate(
  policies: readonly PolicyRow[],
  sql: string,
  held: ReadonlySet<string>,
): CompareResult {
  const parsed = parseTemplateAlters(sql);
  const byKey = new Map<string, ParsedAlter>();
  const mismatches: string[] = [];
  for (const alter of parsed) {
    const key = `${alter.schemaname}\t${alter.tablename}\t${alter.policyname}`;
    if (byKey.has(key)) mismatches.push(`duplicate alter ${alter.schemaname}.${alter.tablename}.${alter.policyname}`);
    byKey.set(key, alter);
  }
  const after: PolicyRow[] = [];
  for (const policy of policies) {
    const key = keyOf(policy);
    const alter = byKey.get(key);
    const expected = expectedExpressions(policy, held);
    if (held.has(tableKey(policy)) && alter !== undefined) {
      mismatches.push(`held table was altered ${tableKey(policy)}.${policy.policyname}`);
    }
    if (expected.changed && alter === undefined) {
      mismatches.push(`missing template alter ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
    }
    if (!expected.changed && alter !== undefined) {
      mismatches.push(`unexpected template alter ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
    }
    if (alter !== undefined) {
      const qualMd5 = exprMd5(policy.qual);
      const checkMd5 = exprMd5(policy.with_check);
      if (qualMd5 !== null && !alter.guard.includes(qualMd5)) {
        mismatches.push(`guard missing qual md5 ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
      }
      if (checkMd5 !== null && !alter.guard.includes(checkMd5)) {
        mismatches.push(`guard missing check md5 ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
      }
      if (!alter.guard.includes('RAISE EXCEPTION')) {
        mismatches.push(`guard missing RAISE ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
      }
      const qual = alter.usingExpr !== null ? alter.usingExpr : policy.qual;
      const withCheck = alter.checkExpr !== null ? alter.checkExpr : policy.with_check;
      if (qual !== expected.qual || withCheck !== expected.withCheck) {
        mismatches.push(`template expression is not the flatten ${policy.schemaname}.${policy.tablename}.${policy.policyname}`);
      }
      after.push({ ...policy, qual, with_check: withCheck });
      byKey.delete(key);
    } else {
      after.push(policy);
    }
  }
  for (const alter of byKey.values()) {
    mismatches.push(`template alter not in snapshot ${alter.schemaname}.${alter.tablename}.${alter.policyname}`);
  }
  const compared = compareFlattenedPolicies(policies, after, held);
  return {
    compared: policies.length,
    intendedChanges: compared.intendedChanges,
    unchanged: compared.unchanged,
    mismatches: [...mismatches, ...compared.mismatches],
  };
}

function formatCompare(result: CompareResult): string[] {
  return [
    `compared ${result.compared} policies`,
    `intended expression changes ${result.intendedChanges}`,
    `unchanged ${result.unchanged}`,
    `mismatches ${result.mismatches.length}`,
    ...result.mismatches.slice(0, 30),
  ];
}

function argValue(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function heldSet(argv: readonly string[]): Set<string> {
  const held = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--held' && argv[i + 1] !== undefined) held.add(argv[i + 1] ?? '');
  }
  return held;
}

function main(): void {
  const argv = process.argv.slice(2);
  const checkPath = argValue(argv, '--check');
  const beforePath = argValue(argv, '--before');
  const afterPath = argValue(argv, '--after');
  const snapshotPath = argValue(argv, '--snapshot');
  const templatePath = argValue(argv, '--template');
  const held = heldSet(argv);
  if (checkPath !== undefined) {
    const failures = checkOne(readPolicies(checkPath));
    if (failures.length === 0) {
      process.stdout.write('ok\n');
      process.exit(0);
    }
    for (const failure of failures) process.stdout.write(`${failure}\n`);
    process.exit(1);
  }
  let lines: string[] = [];
  let mismatches = 0;
  if (beforePath !== undefined && afterPath !== undefined) {
    const result = compareFlattenedPolicies(readPolicies(beforePath), readPolicies(afterPath), held);
    lines = formatCompare(result);
    mismatches = result.mismatches.length;
  } else if (snapshotPath !== undefined && templatePath !== undefined) {
    const result = compareSnapshotToTemplate(readPolicies(snapshotPath), readFileSync(templatePath, 'utf8'), held);
    lines = formatCompare(result);
    mismatches = result.mismatches.length;
  } else {
    process.stderr.write(
      'usage: diff-auth-policies.ts --check <snapshot> | --before <a> --after <b> [--held schema.table] | --snapshot <json> --template <sql> [--held schema.table]\n',
    );
    process.exit(2);
  }
  for (const line of lines) process.stdout.write(`${line}\n`);
  if (mismatches === 0) {
    process.stdout.write('ok\n');
    process.exit(0);
  }
  process.exit(1);
}

const isDirectRun = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();
