// Semantic comparison for the autoheal merge HOLD check.
// The flatten migration itself uses flattenAuthExpr byte output.
// This module is only for deciding whether a merged policy still means the
// OR of its originals. Initplan wrapping is treated as equivalent:
// `( SELECT auth.uid() AS uid)` and `(SELECT auth.uid())` both reduce to `auth.uid()`.

import { AUTH_WRAPPERS, flattenAuthExpr, type AuthWrapper } from './flatten-auth-expr.ts';
import { normalizeSqlParens } from './sql-expr-normalize.ts';

function isIdentChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

/** Collapse whitespace that sits outside single-quoted string literals. */
export function stripWsOutsideStrings(input: string): string {
  let out = '';
  let inString = false;
  let pendingSpace = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? '';
    if (inString) {
      out += ch;
      if (ch === "'" && input[i + 1] === "'") {
        out += "'";
        i += 1;
        continue;
      }
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      if (pendingSpace && out.length > 0) out += ' ';
      pendingSpace = false;
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      pendingSpace = out.length > 0;
      continue;
    }
    if (pendingSpace) out += ' ';
    pendingSpace = false;
    out += ch;
  }
  return out.trim();
}

function matchingParenEnd(input: string, openIndex: number): number {
  let depth = 0;
  let inString = false;
  for (let i = openIndex; i < input.length; i += 1) {
    const ch = input[i] ?? '';
    if (inString) {
      if (ch === "'" && input[i + 1] === "'") {
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
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function stripOuterParens(input: string): string {
  let current = input.trim();
  while (current.startsWith('(') && current.endsWith(')')) {
    const end = matchingParenEnd(current, 0);
    if (end !== current.length - 1) break;
    current = current.slice(1, -1).trim();
  }
  return current;
}

/** Split a boolean expression on top-level OR keywords. */
export function splitTopLevelOr(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? '';
    if (inString) {
      if (ch === "'" && input[i + 1] === "'") {
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
    if (ch === '(') {
      depth += 1;
      continue;
    }
    if (ch === ')') {
      depth -= 1;
      continue;
    }
    if (depth !== 0) continue;
    if (ch !== 'O' && ch !== 'o') continue;
    if (!input.slice(i, i + 2).toUpperCase().startsWith('OR')) continue;
    const prev = i === 0 ? '' : (input[i - 1] ?? '');
    const next = input[i + 2] ?? '';
    if (prev !== '' && isIdentChar(prev)) continue;
    if (next !== '' && isIdentChar(next)) continue;
    parts.push(input.slice(start, i));
    const gap = input[i + 2] === ' ' ? 3 : 2;
    start = i + gap;
    i += gap - 1;
  }
  parts.push(input.slice(start));
  return parts;
}

function unwrapOneAliasForm(input: string, wrapper: AuthWrapper): string {
  const needle = `( SELECT ${wrapper.call} AS ${wrapper.alias})`;
  return input.split(needle).join(wrapper.call);
}

/**
 * Reduce initplan forms to the bare call so a pre-rewrite `auth.uid()`
 * compares equal to a depth-1 `( SELECT auth.uid() AS uid)`.
 * Also accepts the migration spelling `(SELECT auth.uid())`.
 */
export function unwrapAuthForCompare(input: string): string {
  let current = input;
  for (const wrapper of AUTH_WRAPPERS) {
    current = unwrapOneAliasForm(current, wrapper);
  }
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < current.length) {
    const next = findBareWrappedCall(current, cursor);
    if (next === null) {
      parts.push(current.slice(cursor));
      break;
    }
    parts.push(current.slice(cursor, next.start));
    parts.push(next.call);
    cursor = next.end;
  }
  return parts.join('');
}

function findBareWrappedCall(
  input: string,
  from: number,
): { start: number; end: number; call: string } | null {
  let best: { start: number; end: number; call: string; index: number } | null = null;
  for (const wrapper of AUTH_WRAPPERS) {
    let searchFrom = from;
    while (searchFrom < input.length) {
      const index = input.indexOf(wrapper.call, searchFrom);
      if (index === -1) break;
      const wrapped = matchSelectParen(input, index, wrapper.call);
      if (wrapped !== null && (best === null || wrapped.start < best.start)) {
        best = { ...wrapped, index, call: wrapper.call };
        break;
      }
      searchFrom = index + wrapper.call.length;
    }
  }
  if (best === null) return null;
  return { start: best.start, end: best.end, call: best.call };
}

/** `( SELECT auth.uid() )` or `(SELECT auth.uid())` with flexible whitespace, no alias. */
function matchSelectParen(input: string, callIndex: number, call: string): { start: number; end: number } | null {
  let i = callIndex - 1;
  while (i >= 0 && (input[i] === ' ' || input[i] === '\n' || input[i] === '\t' || input[i] === '\r')) i -= 1;
  const select = 'SELECT';
  if (i - select.length + 1 < 0) return null;
  const word = input.slice(i - select.length + 1, i + 1);
  if (word.toUpperCase() !== select) return null;
  let open = i - select.length;
  while (open >= 0 && (input[open] === ' ' || input[open] === '\n' || input[open] === '\t')) open -= 1;
  if (input[open] !== '(') return null;
  let end = callIndex + call.length;
  while (end < input.length && (input[end] === ' ' || input[end] === '\n' || input[end] === '\t' || input[end] === '\r')) {
    end += 1;
  }
  if (input[end] !== ')') return null;
  return { start: open, end: end + 1 };
}

/** Drop a leading `public.` qualifier outside string literals. Deparse omits it; migrations often include it. */
export function stripPublicSchema(input: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? '';
    if (inString) {
      out += ch;
      if (ch === "'" && input[i + 1] === "'") {
        out += "'";
        i += 1;
        continue;
      }
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      out += ch;
      continue;
    }
    if (input.slice(i, i + 'public.'.length).toLowerCase() === 'public.') {
      const prev = out.length === 0 ? '' : (out[out.length - 1] ?? '');
      if (prev === '' || !isIdentChar(prev)) {
        i += 'public.'.length - 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

export function canonicalOrBranches(expr: string | null): string[] | null {
  if (expr === null) return null;
  if (expr.trim() === '') return null;
  const flattened = flattenAuthExpr(expr);
  const unwrapped = unwrapAuthForCompare(flattened);
  const unqualified = stripPublicSchema(unwrapped);
  const compact = stripWsOutsideStrings(unqualified);
  const stripped = stripOuterParens(compact);
  const branches = splitTopLevelOr(stripped).map((part) => stripOuterParens(part.trim()));
  branches.sort();
  return branches;
}

const QUALIFIER_KEEP = new Set([
  'auth',
  'extensions',
  'pg_catalog',
  'information_schema',
  'storage',
  'realtime',
  'vault',
  'graphql',
]);

function mapOutsideStrings(input: string, visit: (code: string) => string): string {
  let out = '';
  let code = '';
  let inString = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? '';
    if (inString) {
      if (code.length > 0) {
        out += visit(code);
        code = '';
      }
      out += ch;
      if (ch === "'" && input[i + 1] === "'") {
        out += "'";
        i += 1;
        continue;
      }
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      if (code.length > 0) {
        out += visit(code);
        code = '';
      }
      inString = true;
      out += ch;
      continue;
    }
    code += ch;
  }
  if (code.length > 0) out += visit(code);
  return out;
}

/** `'active'::text` is how pg_get_expr prints a text literal. Migration source usually omits the cast. */
function stripTextLiteralCasts(code: string): string {
  return code.replaceAll('::text', '');
}

function stripQualifiers(code: string): string {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i] ?? '';
    if (!/[A-Za-z_]/.test(ch)) {
      out += ch;
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < code.length && /[A-Za-z0-9_]/.test(code[j] ?? '')) j += 1;
    const ident = code.slice(i, j);
    const prev = i === 0 ? '' : (code[i - 1] ?? '');
    const precededOk = prev === '' || !isIdentChar(prev);
    if (precededOk && code[j] === '.' && !QUALIFIER_KEEP.has(ident.toLowerCase())) {
      i = j + 1;
      continue;
    }
    out += ident;
    i = j;
  }
  return out;
}

/** pg_get_expr renames a subquery on the policy's own table to `table table_1`. */
function stripSelfAliases(code: string): string {
  return code.replaceAll(/\b([A-Za-z_][A-Za-z0-9_]*) \1_[0-9]+\b/g, '$1');
}

function tryNormalizeParens(input: string): string {
  try {
    return normalizeSqlParens(input);
  } catch {
    // Keep the parentheses. Deleting every parenthesis makes different
    // expressions compare equal, for example (a + b) * c and a + b * c.
    return input;
  }
}

/**
 * Comparison key for migration source versus a pg_policies deparse.
 * Drops text-literal casts, table qualifiers other than auth.*, self-aliases,
 * and whitespace. Parentheses are removed only when a parse shows they do
 * not change the expression. Backup-to-live comparison does not use this;
 * both of those sides are already deparsed.
 */
export function migrationCompareKey(expr: string | null): string | null {
  const branches = canonicalOrBranches(expr);
  if (branches === null) return null;
  const normalized = branches.map((branch) => {
    const prepared = mapOutsideStrings(branch, (code) => stripSelfAliases(stripQualifiers(stripTextLiteralCasts(code))));
    return tryNormalizeParens(prepared);
  });
  const compact = normalized.map((branch) => stripWsOutsideStrings(branch).replaceAll(' ', ''));
  compact.sort();
  return compact.join(' OR ');
}

export function migrationKeysEqual(left: string | null, right: string | null): boolean {
  return left === right;
}

export function branchesEqual(left: string[] | null, right: string[] | null): boolean {
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

/**
 * Reconstruct the autoheal merge: each non-empty expression is parenthesized
 * and joined with OR, in policyname order. Empty and null clauses are skipped,
 * which is the WITH CHECK bug for ALL/UPDATE originals that omitted WITH CHECK.
 */
export function orMergeClause(exprs: readonly (string | null)[]): string | null {
  const present = exprs.filter((expr): expr is string => expr !== null && expr.trim() !== '');
  if (present.length === 0) return null;
  return present.map((expr) => `(${expr})`).join(' OR ');
}

export interface OriginalClause {
  readonly policyname: string;
  readonly cmd: string;
  readonly qual: string | null;
  readonly withCheck: string | null;
}

/**
 * Postgres uses USING as WITH CHECK when WITH CHECK is omitted on ALL or UPDATE.
 * The autoheal only ORs WITH CHECK clauses that were actually present.
 */
export function effectiveWithCheck(original: OriginalClause): string | null {
  if (original.withCheck !== null && original.withCheck.trim() !== '') return original.withCheck;
  const cmd = original.cmd.toUpperCase();
  if ((cmd === 'ALL' || cmd === 'UPDATE') && original.qual !== null && original.qual.trim() !== '') {
    return original.qual;
  }
  return original.withCheck;
}
