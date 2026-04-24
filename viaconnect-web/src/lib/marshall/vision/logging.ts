// Prompt #124 P3: PII-safe logger for the Marshall Vision pipeline.
//
// Emits structured events suitable for log-based auditing without ever
// including image bytes, consumer emails, or practitioner identifiers.
// Fields pass through a filter that strips any key matching a PII-suspect
// name or whose value exceeds a size threshold (indicative of a raw image
// or buffer that slipped in by accident).
//
// Not a replacement for the compliance_audit_log hash-chain (that is the
// official ledger). This logger is for runtime debugging + ops dashboards.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  step: string;
  evaluationId?: string;
  reportId?: string;
  testBuyId?: string;
  sku?: string;
  verdict?: string;
  confidence?: number;
  durationMs?: number;
  source?: string;
  note?: string;
  error?: string;
}

// All entries are lowercase; the scanner lowercases keys before lookup.
const PII_KEY_BLOCKLIST: ReadonlySet<string> = new Set([
  'email', 'email_address', 'user_email', 'consumer_email',
  'phone', 'phone_number',
  'address', 'street', 'zip',
  'full_name', 'first_name', 'last_name', 'display_name', 'patient_name',
  'dob', 'date_of_birth',
  'rx_number', 'dea_number', 'mrn', 'ssn',
  'ip_address',
  // raw media guardrails (any key matching these is dropped; bytes are also
  // elided via the binary-type check below when a non-blocklisted key
  // accidentally carries a Buffer / Uint8Array / ArrayBuffer):
  'image_bytes', 'imagebytes', 'bytes', 'buffer', 'base64', 'raw',
  // credentials:
  'authorization', 'api_key', 'token', 'password', 'secret',
]);

const MAX_VALUE_LEN = 500;

/**
 * Emit a structured log event. In production this feeds whatever log drain
 * the runtime is wired to (Vercel logs, structured stdout). Caller supplies
 * a dictionary of fields; this function filters PII-suspect keys and
 * oversize values before printing.
 */
export function logEvent(evt: LogEvent): void {
  const sanitized = sanitizeFields(evt as unknown as Record<string, unknown>);
  const payload = {
    ts: new Date().toISOString(),
    agent: 'marshall_vision',
    ...sanitized,
  };
  const line = JSON.stringify(payload);
  switch (evt.level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(line);
      return;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(line);
      return;
    default:
      // eslint-disable-next-line no-console
      console.log(line);
      return;
  }
}

/**
 * Strip PII-suspect keys and oversize values from a field dictionary. Safe
 * for direct emission to log drains.
 */
export function sanitizeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (PII_KEY_BLOCKLIST.has(key.toLowerCase())) continue;
    if (value === null || value === undefined) continue;
    // Never log raw binary.
    if (value instanceof Uint8Array) {
      out[key] = `[${value.byteLength} bytes elided]`;
      continue;
    }
    if (Buffer.isBuffer(value)) {
      out[key] = `[${value.byteLength} bytes elided]`;
      continue;
    }
    if (value instanceof ArrayBuffer) {
      out[key] = `[${value.byteLength} bytes elided]`;
      continue;
    }
    if (typeof value === 'string' && value.length > MAX_VALUE_LEN) {
      out[key] = value.slice(0, MAX_VALUE_LEN) + '…';
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Shortcut helpers. */
export const log = {
  debug: (step: string, fields: Omit<LogEvent, 'level' | 'step'> = {}) =>
    logEvent({ level: 'debug', step, ...fields }),
  info: (step: string, fields: Omit<LogEvent, 'level' | 'step'> = {}) =>
    logEvent({ level: 'info', step, ...fields }),
  warn: (step: string, fields: Omit<LogEvent, 'level' | 'step'> = {}) =>
    logEvent({ level: 'warn', step, ...fields }),
  error: (step: string, fields: Omit<LogEvent, 'level' | 'step'> = {}) =>
    logEvent({ level: 'error', step, ...fields }),
};
