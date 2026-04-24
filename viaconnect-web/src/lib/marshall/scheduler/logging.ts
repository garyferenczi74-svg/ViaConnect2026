// Prompt #125 P1: PII-safe logger for the scheduler bridge.
//
// Pre-write filter rejects:
//   - Values that look like OAuth access tokens (JWT, opaque bearer, refresh)
//   - Email addresses (in header values, payloads)
//   - Draft caption text over 200 characters (first 100 chars kept for debug)
//
// The filter is applied to every value recursively; keys are retained as-is.
// This is the single approved logger for anything in lib/marshall/scheduler.
// Callers do not use console.* directly; see spec §14.1 / §14.2 / §14.3.

const OAUTH_TOKEN_PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /^[A-Za-z0-9._~+/-]{40,}={0,2}$/,
  /\b(?:bearer|access_token|refresh_token|client_secret|signing_secret)[=:\s"']+[A-Za-z0-9._~+/-]{16,}/i,
];

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const DRAFT_KEY_HINT = /caption|body|text|content|message/i;

export interface RedactionStats {
  redacted: number;
  truncated: number;
}

function looksLikeToken(value: string): boolean {
  return OAUTH_TOKEN_PATTERNS.some((re) => re.test(value));
}

function looksLikeEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function redactString(key: string, value: string, stats: RedactionStats): string {
  // Content-typed fields take the truncation path first so a long caption
  // doesn't match the opaque-bearer regex by accident.
  if (DRAFT_KEY_HINT.test(key) && value.length > 200) {
    stats.truncated += 1;
    return `${value.slice(0, 100)}... [TRUNCATED ${value.length - 100} chars]`;
  }
  if (looksLikeToken(value)) {
    stats.redacted += 1;
    return '[REDACTED:oauth_token]';
  }
  if (looksLikeEmail(value)) {
    stats.redacted += 1;
    return value.replace(EMAIL_PATTERN, '[REDACTED:email]');
  }
  return value;
}

function deepRedact(input: unknown, key = '', stats: RedactionStats): unknown {
  if (input == null) return input;
  if (typeof input === 'string') return redactString(key, input, stats);
  if (typeof input === 'number' || typeof input === 'boolean') return input;
  if (Array.isArray(input)) return input.map((v, i) => deepRedact(v, `${key}[${i}]`, stats));
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = deepRedact(v, k, stats);
    }
    return out;
  }
  return '[REDACTED:unknown_type]';
}

function emit(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const stats: RedactionStats = { redacted: 0, truncated: 0 };
  const safeCtx = context ? deepRedact(context, '', stats) : undefined;
  const payload = {
    ts: new Date().toISOString(),
    level,
    subsystem: 'marshall-scheduler',
    message,
    context: safeCtx,
    redactions: stats.redacted + stats.truncated > 0 ? stats : undefined,
  };
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(JSON.stringify(payload));
}

export const schedulerLogger = {
  info(message: string, context?: Record<string, unknown>): void {
    emit('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    emit('error', message, context);
  },
};

/**
 * Utility for tests: run a value through the same redaction pipeline and
 * return the sanitized form + stats. Not used at runtime.
 */
export function redactForTest(input: unknown): { value: unknown; stats: RedactionStats } {
  const stats: RedactionStats = { redacted: 0, truncated: 0 };
  return { value: deepRedact(input, '', stats), stats };
}
