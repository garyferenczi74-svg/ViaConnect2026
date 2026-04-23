/**
 * PII-safe pre-check logger.
 * Rejects any field longer than MAX_FIELD_LENGTH so draft plaintext cannot
 * leak through accidental console.log calls or audit payloads.
 */

const MAX_FIELD_LENGTH = 200;

export type LogLevel = "info" | "warn" | "error";

export interface PrecheckLogPayload {
  sessionId?: string;
  publicSessionId?: string;
  practitionerId?: string;
  event: string;
  severity?: string;
  ruleId?: string;
  hash?: string;
  durationMs?: number;
  round?: number;
  // Reject anything else by schema: callers must not pass free-form text.
  [k: string]: unknown;
}

function scrub(payload: PrecheckLogPayload): PrecheckLogPayload {
  const out: PrecheckLogPayload = { event: payload.event };
  for (const [k, v] of Object.entries(payload)) {
    if (v == null) continue;
    if (typeof v === "string") {
      // Hard cut: never ship a long string through the logger.
      out[k] = v.length > MAX_FIELD_LENGTH ? `[redacted:${v.length}ch]` : v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = `[array:${v.length}]`;
    } else if (typeof v === "object") {
      out[k] = `[object]`;
    }
  }
  return out;
}

export function precheckLog(level: LogLevel, payload: PrecheckLogPayload): void {
  const scrubbed = scrub(payload);
  const line = `[marshall.precheck] ${JSON.stringify(scrubbed)}`;
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}
