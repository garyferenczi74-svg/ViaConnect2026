// Last CREATE POLICY definition of each policy in supabase/migrations.
// Later files win. DROP POLICY does not erase the last definition: the
// comparison needs the expression, and a later DROP has none.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface MigrationPolicyDef {
  readonly file: string;
  readonly policyname: string;
  readonly schemaname: string;
  readonly tablename: string;
  readonly cmd: string;
  readonly qual: string | null;
  readonly withCheck: string | null;
}

function skipWsAndComments(sql: string, index: number): number {
  let i = index;
  while (i < sql.length) {
    const ch = sql[i] ?? '';
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      i += 1;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      i += 2;
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    break;
  }
  return i;
}

function startsKeyword(sql: string, index: number, keyword: string): boolean {
  if (sql.slice(index, index + keyword.length).toUpperCase() !== keyword.toUpperCase()) return false;
  const next = sql[index + keyword.length] ?? '';
  return next === '' || !/[A-Za-z0-9_]/.test(next);
}

function readQuotedIdent(sql: string, index: number): { value: string; next: number } | null {
  if (sql[index] !== '"') return null;
  let value = '';
  let i = index + 1;
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
  return null;
}

function readBareIdent(sql: string, index: number): { value: string; next: number } | null {
  const ch = sql[index] ?? '';
  if (!/[A-Za-z_]/.test(ch)) return null;
  let i = index + 1;
  while (i < sql.length && /[A-Za-z0-9_]/.test(sql[i] ?? '')) i += 1;
  return { value: sql.slice(index, i), next: i };
}

function readIdent(sql: string, index: number): { value: string; next: number; quoted: boolean } | null {
  const i = skipWsAndComments(sql, index);
  const quoted = readQuotedIdent(sql, i);
  if (quoted !== null) return { value: quoted.value, next: quoted.next, quoted: true };
  const bare = readBareIdent(sql, i);
  if (bare === null) return null;
  return { value: bare.value.toLowerCase(), next: bare.next, quoted: false };
}

function readBalanced(sql: string, openIndex: number): { value: string; next: number } | null {
  if (sql[openIndex] !== '(') return null;
  let depth = 0;
  let inString = false;
  for (let i = openIndex; i < sql.length; i += 1) {
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
    if (ch === '-' && sql[i + 1] === '-') {
      i += 2;
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return { value: sql.slice(openIndex + 1, i), next: i + 1 };
      }
    }
  }
  return null;
}

function parseCreatePolicyAt(sql: string, keywordIndex: number, file: string): MigrationPolicyDef | null {
  let i = keywordIndex + 'CREATE'.length;
  i = skipWsAndComments(sql, i);
  if (!startsKeyword(sql, i, 'POLICY')) return null;
  i = skipWsAndComments(sql, i + 'POLICY'.length);
  if (startsKeyword(sql, i, 'IF')) {
    i = skipWsAndComments(sql, i + 'IF'.length);
    if (!startsKeyword(sql, i, 'NOT')) return null;
    i = skipWsAndComments(sql, i + 'NOT'.length);
    if (!startsKeyword(sql, i, 'EXISTS')) return null;
    i = skipWsAndComments(sql, i + 'EXISTS'.length);
  }
  const name = readIdent(sql, i);
  if (name === null) return null;
  i = skipWsAndComments(sql, name.next);
  if (!startsKeyword(sql, i, 'ON')) return null;
  i = skipWsAndComments(sql, i + 'ON'.length);
  const first = readIdent(sql, i);
  if (first === null) return null;
  i = first.next;
  let schemaname = 'public';
  let tablename = first.value;
  const afterFirst = skipWsAndComments(sql, i);
  if (sql[afterFirst] === '.') {
    const second = readIdent(sql, afterFirst + 1);
    if (second === null) return null;
    schemaname = first.value;
    tablename = second.value;
    i = second.next;
  }
  i = skipWsAndComments(sql, i);
  if (startsKeyword(sql, i, 'AS')) {
    i = skipWsAndComments(sql, i + 'AS'.length);
    if (startsKeyword(sql, i, 'PERMISSIVE')) i += 'PERMISSIVE'.length;
    else if (startsKeyword(sql, i, 'RESTRICTIVE')) i += 'RESTRICTIVE'.length;
    else return null;
    i = skipWsAndComments(sql, i);
  }
  let cmd = 'ALL';
  if (startsKeyword(sql, i, 'FOR')) {
    i = skipWsAndComments(sql, i + 'FOR'.length);
    const cmdTok = readBareIdent(sql, i);
    if (cmdTok === null) return null;
    cmd = cmdTok.value.toUpperCase();
    i = cmdTok.next;
    i = skipWsAndComments(sql, i);
  }
  if (startsKeyword(sql, i, 'TO')) {
    i = skipWsAndComments(sql, i + 'TO'.length);
    while (i < sql.length) {
      const role = readIdent(sql, i);
      if (role === null) break;
      i = skipWsAndComments(sql, role.next);
      if (sql[i] === ',') {
        i = skipWsAndComments(sql, i + 1);
        continue;
      }
      break;
    }
  }
  let qual: string | null = null;
  let withCheck: string | null = null;
  while (i < sql.length) {
    i = skipWsAndComments(sql, i);
    if (startsKeyword(sql, i, 'USING')) {
      i = skipWsAndComments(sql, i + 'USING'.length);
      if (sql[i] !== '(') return null;
      const expr = readBalanced(sql, i);
      if (expr === null) return null;
      qual = expr.value;
      i = expr.next;
      continue;
    }
    if (startsKeyword(sql, i, 'WITH')) {
      const next = skipWsAndComments(sql, i + 'WITH'.length);
      if (!startsKeyword(sql, next, 'CHECK')) return null;
      i = skipWsAndComments(sql, next + 'CHECK'.length);
      if (sql[i] !== '(') return null;
      const expr = readBalanced(sql, i);
      if (expr === null) return null;
      withCheck = expr.value;
      i = expr.next;
      continue;
    }
    break;
  }
  return {
    file,
    policyname: name.value,
    schemaname,
    tablename,
    cmd,
    qual,
    withCheck,
  };
}

export function parseCreatePolicies(sql: string, file: string): MigrationPolicyDef[] {
  const found: MigrationPolicyDef[] = [];
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i] ?? '';
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && sql[i + 1] === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
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
    if (ch === '-' && sql[i + 1] === '-') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (!startsKeyword(sql, i, 'CREATE')) continue;
    const parsed = parseCreatePolicyAt(sql, i, file);
    if (parsed !== null) found.push(parsed);
  }
  return found;
}

export function policyKey(schemaname: string, tablename: string, policyname: string): string {
  return `${schemaname}.${tablename}.${policyname}`;
}

export function loadMigrationPolicyHistory(migrationsDir: string): Map<string, MigrationPolicyDef> {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const history = new Map<string, MigrationPolicyDef>();
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    for (const policy of parseCreatePolicies(sql, file)) {
      history.set(policyKey(policy.schemaname, policy.tablename, policy.policyname), policy);
    }
  }
  return history;
}
