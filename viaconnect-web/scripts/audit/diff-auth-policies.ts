// Diff two pg_policies snapshots, or check that one snapshot is fully flattened.
//
//   node --experimental-strip-types scripts/audit/diff-auth-policies.ts --check <snapshot.json>
//   node --experimental-strip-types scripts/audit/diff-auth-policies.ts --before <before.json> --after <after.json>
//
// --check exits 0 only when every qual/with_check is already equal to its
// flattened form and every expression is under 2,000 characters.
// The unflattened 2026-09-26 snapshot fails that check.
//
// --before/--after exits 0 only when names, roles, cmd, permissive, and count
// are identical, only qual/with_check differ, flatten(before) equals after
// for every row, and the after snapshot's longest expression is under 2,000.

import { readFileSync } from 'node:fs';

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

function diffPair(before: readonly PolicyRow[], after: readonly PolicyRow[]): string[] {
  const failures: string[] = [];
  if (before.length !== after.length) {
    failures.push(`count differs: before ${before.length}, after ${after.length}`);
  }
  const afterByKey = new Map<string, PolicyRow>();
  for (const policy of after) afterByKey.set(keyOf(policy), policy);
  const seen = new Set<string>();
  let exprMismatches = 0;
  let identityMismatches = 0;
  for (const policy of before) {
    const key = keyOf(policy);
    seen.add(key);
    const next = afterByKey.get(key);
    if (next === undefined) {
      identityMismatches += 1;
      continue;
    }
    if (
      next.permissive !== policy.permissive ||
      next.cmd !== policy.cmd ||
      !sameRoles(next.roles, policy.roles)
    ) {
      identityMismatches += 1;
    }
    const expectQual = clauseFlat(policy.qual);
    const expectCheck = clauseFlat(policy.with_check);
    if (next.qual !== expectQual || next.with_check !== expectCheck) exprMismatches += 1;
  }
  for (const policy of after) {
    if (!seen.has(keyOf(policy))) identityMismatches += 1;
  }
  if (identityMismatches > 0) {
    failures.push(`${identityMismatches} identity mismatches (name, roles, cmd, permissive, or missing row)`);
  }
  if (exprMismatches > 0) {
    failures.push(`${exprMismatches} rows where flatten(before) does not equal after`);
  }
  const afterFailures = checkOne(after);
  for (const failure of afterFailures) failures.push(`after: ${failure}`);
  return failures;
}

function argValue(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function main(): void {
  const argv = process.argv.slice(2);
  const checkPath = argValue(argv, '--check');
  const beforePath = argValue(argv, '--before');
  const afterPath = argValue(argv, '--after');
  let failures: string[] = [];
  if (checkPath !== undefined) {
    failures = checkOne(readPolicies(checkPath));
  } else if (beforePath !== undefined && afterPath !== undefined) {
    failures = diffPair(readPolicies(beforePath), readPolicies(afterPath));
  } else {
    process.stderr.write('usage: diff-auth-policies.ts --check <snapshot> | --before <a> --after <b>\n');
    process.exit(2);
  }
  if (failures.length === 0) {
    process.stdout.write('ok\n');
    process.exit(0);
  }
  for (const failure of failures) process.stdout.write(`${failure}\n`);
  process.exit(1);
}

main();
