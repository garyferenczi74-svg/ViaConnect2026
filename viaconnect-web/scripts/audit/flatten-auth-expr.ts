// Collapse runs of 2 or more `( SELECT auth.<fn>() AS <alias>)` wrappers
// down to a single wrapper. Postgres deparses a wrapped auth call as
// `( SELECT auth.uid() AS uid)`, and the retired autoheal guard looked for
// `(SELECT auth.`, so each committed run added another level.
//
// Byte-stable outside the collapsed span:
// - bare `auth.uid()` / `auth.jwt()` / `auth.role()` stay as written
// - depth-1 wrappers stay as written
// - surrounding operators, casts, and parentheses stay as written
//
// A balanced-paren walk is required. Expressions in the 2026-09-26 catalog
// reach 46,502 characters and 908 wrapper levels; a greedy regex is not used.

export type AuthFnName = 'uid' | 'jwt' | 'role';

export interface AuthWrapper {
  readonly fn: AuthFnName;
  readonly call: string;
  readonly alias: string;
}

export const AUTH_WRAPPERS: readonly AuthWrapper[] = [
  { fn: 'uid', call: 'auth.uid()', alias: 'uid' },
  { fn: 'jwt', call: 'auth.jwt()', alias: 'jwt' },
  { fn: 'role', call: 'auth.role()', alias: 'role' },
];

const SELECT_PREFIX = '( SELECT ';

export interface WrapperSpan {
  readonly fn: AuthFnName;
  readonly depth: number;
  readonly start: number;
  readonly end: number;
  /** True when the call is followed by ` AS <alias>)` and preceded by `( SELECT `. */
  readonly wrapped: boolean;
}

function findNextCall(input: string, from: number): { index: number; wrapper: AuthWrapper } | null {
  let bestIndex = -1;
  let best: AuthWrapper | null = null;
  for (const wrapper of AUTH_WRAPPERS) {
    const index = input.indexOf(wrapper.call, from);
    if (index === -1) continue;
    if (bestIndex === -1 || index < bestIndex) {
      bestIndex = index;
      best = wrapper;
    }
  }
  if (best === null || bestIndex < 0) return null;
  return { index: bestIndex, wrapper: best };
}

/**
 * Locate one auth.*() call and, when it is a `( SELECT ... AS alias)` wrapper,
 * the full run of identical wrappers around it.
 * Depth 0 means a bare call (not followed by ` AS <alias>)`).
 * Depth -1 means it is followed by the alias suffix but not preceded by `( SELECT `.
 */
export function measureWrapperSpan(input: string, callIndex: number, wrapper: AuthWrapper): WrapperSpan {
  const suffix = ` AS ${wrapper.alias})`;
  const callEnd = callIndex + wrapper.call.length;
  if (!input.startsWith(suffix, callEnd)) {
    return { fn: wrapper.fn, depth: 0, start: callIndex, end: callEnd, wrapped: false };
  }
  const preceded =
    callIndex >= SELECT_PREFIX.length &&
    input.slice(callIndex - SELECT_PREFIX.length, callIndex) === SELECT_PREFIX;
  if (!preceded) {
    return { fn: wrapper.fn, depth: -1, start: callIndex, end: callEnd, wrapped: false };
  }
  let depth = 1;
  let start = callIndex - SELECT_PREFIX.length;
  let end = callEnd + suffix.length;
  while (
    start >= SELECT_PREFIX.length &&
    input.slice(start - SELECT_PREFIX.length, start) === SELECT_PREFIX &&
    input.startsWith(suffix, end)
  ) {
    start -= SELECT_PREFIX.length;
    end += suffix.length;
    depth += 1;
  }
  return { fn: wrapper.fn, depth, start, end, wrapped: true };
}

export function flatWrapper(wrapper: AuthWrapper): string {
  return `( SELECT ${wrapper.call} AS ${wrapper.alias})`;
}

/** Collapse wrapper runs of depth >= 2. Depth 0 and depth 1 are copied through. */
export function flattenAuthExpr(input: string): string {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < input.length) {
    const next = findNextCall(input, cursor);
    if (next === null) {
      parts.push(input.slice(cursor));
      break;
    }
    const span = measureWrapperSpan(input, next.index, next.wrapper);
    if (!span.wrapped || span.depth < 2) {
      const through = span.wrapped ? span.end : next.index + next.wrapper.call.length;
      parts.push(input.slice(cursor, through));
      cursor = through;
      continue;
    }
    parts.push(input.slice(cursor, span.start));
    parts.push(flatWrapper(next.wrapper));
    cursor = span.end;
  }
  return parts.join('');
}

export function flattenAuthExprNullable(input: string | null): string | null {
  if (input === null) return null;
  return flattenAuthExpr(input);
}

/** Deepest wrapper run in the expression. Bare calls contribute 0. */
export function maxWrapperDepth(input: string): number {
  let max = 0;
  let cursor = 0;
  while (cursor < input.length) {
    const next = findNextCall(input, cursor);
    if (next === null) break;
    const span = measureWrapperSpan(input, next.index, next.wrapper);
    if (span.depth > max) max = span.depth;
    cursor = span.wrapped ? span.end : next.index + next.wrapper.call.length;
  }
  return max;
}

export function buildNestedWrapper(fn: AuthFnName, depth: number): string {
  const wrapper = AUTH_WRAPPERS.find((item) => item.fn === fn);
  if (wrapper === undefined) {
    throw new Error(`unknown auth function ${fn}`);
  }
  if (depth < 1) {
    throw new Error('depth must be >= 1');
  }
  let expr = wrapper.call;
  for (let level = 0; level < depth; level += 1) {
    expr = `( SELECT ${expr} AS ${wrapper.alias})`;
  }
  return expr;
}
