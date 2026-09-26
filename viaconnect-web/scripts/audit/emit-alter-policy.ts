// Emit ALTER POLICY statements. Never DROP or CREATE.
// The manual flatten template is one transaction with a per-policy md5 drift guard.

import { createHash } from 'node:crypto';

import { flattenAuthExprNullable } from './flatten-auth-expr.ts';

export interface PolicyRow {
  readonly schemaname: string;
  readonly tablename: string;
  readonly policyname: string;
  readonly permissive: string;
  readonly roles: readonly string[];
  readonly cmd: string;
  readonly qual: string | null;
  readonly with_check: string | null;
}

export interface PolicyAlter {
  readonly policy: PolicyRow;
  readonly usingExpr: string | null;
  readonly checkExpr: string | null;
}

export function quoteIdent(ident: string): string {
  return `"${ident.replaceAll('"', '""')}"`;
}

export function expressionHasBareSemicolon(expr: string): boolean {
  let inString = false;
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i] ?? '';
    if (inString) {
      if (ch === "'" && expr[i + 1] === "'") {
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
    if (ch === ';') return true;
  }
  return false;
}

/**
 * INSERT emits WITH CHECK only. SELECT and DELETE emit USING only.
 * ALL and UPDATE emit each clause that is non-null.
 * Returns null when every emitted clause is unchanged.
 */
export function planPolicyAlter(policy: PolicyRow): PolicyAlter | 'semicolon' | null {
  const flatQual = flattenAuthExprNullable(policy.qual);
  const flatCheck = flattenAuthExprNullable(policy.with_check);
  const cmd = policy.cmd.toUpperCase();
  let usingExpr: string | null = null;
  let checkExpr: string | null = null;
  if (cmd === 'INSERT') {
    if (policy.with_check !== null) checkExpr = flatCheck;
  } else if (cmd === 'SELECT' || cmd === 'DELETE') {
    if (policy.qual !== null) usingExpr = flatQual;
  } else if (cmd === 'ALL' || cmd === 'UPDATE') {
    if (policy.qual !== null) usingExpr = flatQual;
    if (policy.with_check !== null) checkExpr = flatCheck;
  } else {
    if (policy.qual !== null) usingExpr = flatQual;
    if (policy.with_check !== null) checkExpr = flatCheck;
  }
  const usingChanged = usingExpr !== null && usingExpr !== policy.qual;
  const checkChanged = checkExpr !== null && checkExpr !== policy.with_check;
  if (!usingChanged && !checkChanged) return null;
  const pieces = [usingExpr, checkExpr].filter((expr): expr is string => expr !== null);
  if (pieces.some((expr) => expressionHasBareSemicolon(expr))) return 'semicolon';
  return { policy, usingExpr, checkExpr };
}

export function renderAlter(alter: PolicyAlter): string {
  const { policy, usingExpr, checkExpr } = alter;
  const lines = [
    `ALTER POLICY ${quoteIdent(policy.policyname)} ON ${quoteIdent(policy.schemaname)}.${quoteIdent(policy.tablename)}`,
  ];
  if (usingExpr !== null) lines.push(`  USING (${usingExpr})`);
  if (checkExpr !== null) lines.push(`  WITH CHECK (${checkExpr})`);
  return `${lines.join('\n')};`;
}

export function exprMd5(expr: string | null): string | null {
  if (expr === null) return null;
  return createHash('md5').update(expr, 'utf8').digest('hex');
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlHash(hash: string | null): string {
  return hash === null ? 'NULL' : sqlLiteral(hash);
}

/** RAISE if this policy is missing or its expressions are not the snapshot text. */
export function renderDriftGuard(policy: PolicyRow): string {
  const qualHash = exprMd5(policy.qual);
  const checkHash = exprMd5(policy.with_check);
  const rel = sqlLiteral(`${quoteIdent(policy.schemaname)}.${quoteIdent(policy.tablename)}`);
  const name = sqlLiteral(policy.policyname);
  const qualExpected = sqlHash(qualHash);
  const checkExpected = sqlHash(checkHash);
  return `DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = ${rel}::regclass
     AND polname = ${name};
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', ${name};
  END IF;
  IF qual_hash IS DISTINCT FROM ${qualExpected} OR check_hash IS DISTINCT FROM ${checkExpected} THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', ${name}, qual_hash, ${qualExpected}, check_hash, ${checkExpected};
  END IF;
END
$guard$;`;
}

export function renderGuardedAlter(alter: PolicyAlter): string {
  const { policy } = alter;
  const marker = `-- policy ${policy.schemaname}.${policy.tablename} :: ${policy.policyname}`;
  return `${marker}\n${renderDriftGuard(policy)}\n${renderAlter(alter)}`;
}

export interface ManualTemplateInfo {
  readonly sha256: string;
  readonly capturedMt: string;
  readonly held: readonly string[];
}

export function renderManualTemplate(info: ManualTemplateInfo, alters: readonly PolicyAlter[]): string {
  const held = info.held.length === 0 ? '(none)' : info.held.join(', ');
  const header = `-- MANUAL TEMPLATE. Not a migration. Gary applies this file by hand.
-- Regenerate it from a fresh pg_policies snapshot immediately before applying.
-- Each policy has an md5 drift guard. Any mismatch or missing policy RAISES
-- and the single transaction rolls every change back.
--
-- Snapshot id (sha256): ${info.sha256}
-- Captured: ${info.capturedMt}
--
-- Generator (run from viaconnect-web):
--   node --experimental-strip-types scripts/audit/flatten-auth-policies.ts \\
--     --snapshot <pg_policies.json> \\
--     --backup <policy-rewrite-backup-earliest.json> \\
--     --merges <autoheal-merges.json> \\
--     --migrations supabase/migrations \\
--     --out supabase/manual/flatten_auth_uid_policies.sql \\
--     --summary-out <summary.json>
--
-- ALTER POLICY only. No DROP POLICY, no CREATE POLICY.
-- One transaction. SET LOCAL lock_timeout and statement_timeout.
-- No per-table commit. No session-level SET.
-- Held tables are omitted: ${held}.
-- See supabase/audit/2026-09-26-policy-diff.md.
--
-- Needs Gary approval before applying.`;
  const body = alters.map((alter) => renderGuardedAlter(alter)).join('\n\n');
  return `${header}\nBEGIN;\nSET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '60s';\n\n${body}\n\nCOMMIT;\n`;
}
