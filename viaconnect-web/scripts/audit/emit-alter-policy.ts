// Emit ALTER POLICY statements. Never DROP or CREATE.

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

export function renderTableBlock(alters: readonly PolicyAlter[]): string {
  const body = alters.map((alter) => renderAlter(alter)).join('\n');
  return `BEGIN;\n${body}\nCOMMIT;`;
}
